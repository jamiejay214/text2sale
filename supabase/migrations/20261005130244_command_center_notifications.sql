-- Configure command_push_secret in Supabase Vault separately; no credentials
-- belong in this migration. Reuses the owner's existing push subscriptions.
create table public.command_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null check (kind in ('visit', 'signup', 'test')),
  title text not null,
  body text not null,
  url text not null default '/command',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_status text not null default 'pending' check (push_status in ('pending','queued','sent','failed')),
  push_attempts integer not null default 0,
  push_request_id bigint,
  push_requested_at timestamptz,
  push_next_attempt_at timestamptz not null default now(),
  push_error text
);
alter table public.command_notifications enable row level security;
revoke all on public.command_notifications from anon, authenticated;
grant select on public.command_notifications to authenticated;
grant all on public.command_notifications to service_role;
create policy owner_read_notifications on public.command_notifications for select to authenticated
  using ((select auth.jwt()->>'email') = 'johnsonhealthquotes@gmail.com');
create index command_notifications_recent on public.command_notifications(created_at desc);
create index command_notifications_unread on public.command_notifications(created_at desc) where read_at is null;
create index command_notifications_pending on public.command_notifications(push_next_attempt_at)
  where push_status in ('pending','queued');

-- Internal worker: private schema and revoked EXECUTE keep this off the public
-- API. It runs only as the DB trigger owner or the postgres cron job.
create or replace function private.dispatch_command_notifications()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  item record;
  response record;
  result jsonb;
  secret text;
  request_id bigint;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'command_push_secret' limit 1;
  if secret is null or secret = '' then return; end if;

  for item in
    select * from public.command_notifications
    where push_status in ('pending','queued') and push_next_attempt_at <= now()
    order by created_at limit 50 for update skip locked
  loop
    if item.push_status = 'queued' then
      select * into response from net._http_response where id = item.push_request_id;
      if found then
        begin result := response.content::jsonb; exception when others then result := '{}'::jsonb; end;
        if response.status_code between 200 and 299 and coalesce((result->>'sent')::int,0) > 0 then
          update public.command_notifications set push_status = 'sent', push_error = null where id = item.id;
          continue;
        end if;
        update public.command_notifications set push_error =
          case when response.status_code between 200 and 299 then 'No registered device accepted the notification'
               else 'Push service request failed' end
          where id = item.id;
      elsif item.push_requested_at > now() - interval '2 minutes' then
        continue;
      end if;
      if item.push_attempts >= 5 then
        update public.command_notifications set push_status = 'failed',
          push_error = coalesce(push_error, 'Push service timed out') where id = item.id;
        continue;
      end if;
    end if;

    begin
      select net.http_post(
        url := 'https://owdfzratwvneslwhiqvb.supabase.co/functions/v1/push-send',
        headers := jsonb_build_object('Content-Type','application/json','x-push-secret',secret),
        body := jsonb_build_object('title',item.title,'body',item.body,'url',item.url,'tag','command-' || item.id),
        timeout_milliseconds := 15000
      ) into request_id;
      update public.command_notifications set push_status = 'queued',
        push_attempts = push_attempts + 1, push_request_id = request_id, push_requested_at = now(),
        push_next_attempt_at = now() + make_interval(secs => (60 * power(2, least(push_attempts,4)))::int)
        where id = item.id;
    exception when others then
      update public.command_notifications set push_attempts = push_attempts + 1,
        push_status = case when push_attempts >= 4 then 'failed' else 'pending' end,
        push_next_attempt_at = now() + interval '1 minute',
        push_error = 'Unable to queue push notification' where id = item.id;
    end;
  end loop;
end;
$$;
revoke all on function private.dispatch_command_notifications() from public, anon, authenticated, service_role;

create or replace function private.capture_command_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  notification_id uuid;
  page text;
  location text;
  event_id text;
  display_name text;
begin
  -- A real persisted account is authoritative, not the public welcome-email API.
  if tg_table_schema = 'public' and tg_table_name = 'profiles' then
    if lower(coalesce(new.email,'')) = 'johnsonhealthquotes@gmail.com' then return new; end if;
    display_name := coalesce(nullif(btrim(concat_ws(' ',new.first_name,new.last_name)),''),'New account');
    insert into public.command_notifications(event_key,kind,title,body,url)
      values ('signup:' || new.id,'signup','New Text2Sale CRM signup',
        left(display_name,120) || ' · ' || left(coalesce(new.email,''),254),'/command?biz=text2sale')
      on conflict (event_key) do nothing returning id into notification_id;
  elsif tg_table_schema = 'public' and tg_table_name = 'page_views' then
    -- A session entry is a visit. Page navigation/reloads are not new visits.
    if new.is_entry is distinct from true then return new; end if;
    if coalesce(new.user_agent,'') ~* '(bot|crawler|spider|headless|lighthouse|uptime|monitor|curl|wget)' then return new; end if;
    page := split_part(coalesce(new.path,'/'),'?',1);
    if page !~ '^/' or page ~ '^/(api|admin|command|dashboard|biz)(/|$)' then return new; end if;
    location := coalesce(nullif(concat_ws(', ',nullif(new.city,''),nullif(new.region,''),nullif(new.country,'')),''),'Location unavailable');
    event_id := case when nullif(new.session_id,'') is not null
      then 'visit:' || md5(coalesce(new.visitor_id,'') || ':' || new.session_id)
      else 'visit-row:' || new.id end;
    insert into public.command_notifications(event_key,kind,title,body,url)
      values (event_id,'visit','New Text2Sale website visit',
        left(location,160) || ' · ' || left(page,300),'/command?biz=text2sale')
      on conflict (event_key) do nothing returning id into notification_id;
  end if;
  if notification_id is not null then
    -- Push I/O starts after commit. Failure leaves a durable pending record.
    begin perform private.dispatch_command_notifications();
    exception when others then raise warning 'Command notification pending for retry'; end;
  end if;
  return new;
end;
$$;
revoke all on function private.capture_command_notification() from public, anon, authenticated, service_role;
create trigger command_visit_notification after insert on public.page_views
  for each row execute function private.capture_command_notification();
create trigger command_signup_notification after insert on public.profiles
  for each row execute function private.capture_command_notification();

select cron.schedule('command-notification-delivery','* * * * *','select private.dispatch_command_notifications()');
