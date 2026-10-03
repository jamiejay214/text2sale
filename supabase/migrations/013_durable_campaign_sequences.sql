-- Queue every step atomically so sequences survive closed tabs and request failures.
begin;
alter table public.scheduled_messages add column if not exists campaign_run_id uuid;
alter table public.scheduled_messages add column if not exists campaign_step_index integer;
alter table public.scheduled_messages add column if not exists campaign_delay_minutes numeric;
alter table public.scheduled_messages add column if not exists dispatch_started_at timestamptz;
alter table public.scheduled_messages add column if not exists provider_message_id text;
alter table public.scheduled_messages add column if not exists charged_amount numeric;
alter table public.scheduled_messages add column if not exists last_error text;
alter table public.scheduled_messages add column if not exists processing_at timestamptz;
create index if not exists scheduled_messages_run_contact_step_idx
  on public.scheduled_messages(campaign_run_id, contact_id, campaign_step_index)
  where campaign_run_id is not null;

create or replace function public.enqueue_campaign_sequence(
  p_user_id uuid, p_campaign_id uuid, p_messages jsonb, p_starts_at timestamptz, p_resume boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  campaign public.campaigns;
  run_id uuid := gen_random_uuid();
  pending_count integer;
  audience_count integer;
  next_status text;
begin
  select * into campaign from public.campaigns where id=p_campaign_id and user_id=p_user_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  select count(*) into pending_count from public.scheduled_messages
    where campaign_id=p_campaign_id and status='pending' and campaign_run_id is not null;
  if p_resume and campaign.status='Paused' and pending_count>0 then
    update public.campaigns set status='Sending' where id=p_campaign_id;
    return jsonb_build_object('queued',pending_count,'audience',campaign.audience,'status','Sending','resumed',true);
  end if;
  if pending_count>0 or campaign.status='Sending' then raise exception 'This campaign already has an active sequence. Pause or finish it before launching again.'; end if;
  if jsonb_typeof(p_messages)<>'array' or jsonb_array_length(p_messages)=0 or jsonb_array_length(p_messages)>100000 then raise exception 'Invalid campaign audience'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_messages) as m(contact_id uuid, body text, from_number text)
    where length(btrim(m.body))=0 or length(m.body)>5000 or not exists (
      select 1 from public.contacts c where c.id=m.contact_id and c.user_id=p_user_id and not c.dnc
    ) or not exists (
      select 1 from public.owned_phone_numbers n where n.user_id=p_user_id
      and n.digits=right(regexp_replace(m.from_number,'\D','','g'),10)
    )
  ) then raise exception 'The contact or sending number is not eligible'; end if;
  insert into public.scheduled_messages(user_id,contact_id,body,from_number,scheduled_at,status,campaign_id,cancel_on_reply,campaign_run_id,campaign_step_index,campaign_delay_minutes)
  select p_user_id,m.contact_id,m.body,m.from_number,m.scheduled_at,'pending',p_campaign_id,true,run_id,m.step_index,m.delay_minutes
    from jsonb_to_recordset(p_messages) as m(contact_id uuid,body text,from_number text,scheduled_at timestamptz,step_index integer,delay_minutes numeric);
  select count(distinct value->>'contact_id') into audience_count from jsonb_array_elements(p_messages);
  next_status := case when p_starts_at>now() then 'Scheduled' else 'Sending' end;
  update public.campaigns set status=next_status,audience=audience_count,sent=0,failed=0,scheduled_at=p_starts_at where id=p_campaign_id;
  return jsonb_build_object('queued',jsonb_array_length(p_messages),'audience',audience_count,'status',next_status,'resumed',false);
end;
$$;
revoke all on function public.enqueue_campaign_sequence(uuid,uuid,jsonb,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.enqueue_campaign_sequence(uuid,uuid,jsonb,timestamptz,boolean) to service_role;

-- Claiming remains compatible with manual reminders and existing conversation workflows.
drop function if exists public.claim_scheduled_messages(integer);
create function public.claim_scheduled_messages(p_limit integer default 200)
returns setof public.scheduled_messages language sql security definer set search_path = '' as $$
  with candidates as (
    select m.id from public.scheduled_messages m
    where m.status='pending' and m.scheduled_at<=now() and m.dispatch_started_at is null
      and (m.processing_at is null or m.processing_at<now()-interval '5 minutes')
      and (m.campaign_run_id is null or (
        exists (select 1 from public.campaigns c where c.id=m.campaign_id and c.status in ('Sending','Scheduled'))
        and not exists (select 1 from public.scheduled_messages prev
          where prev.campaign_run_id=m.campaign_run_id and prev.contact_id=m.contact_id
          and prev.campaign_step_index<m.campaign_step_index and prev.status<>'sent')
      ))
    order by m.scheduled_at,m.id limit greatest(1,least(p_limit,200)) for update skip locked
  )
  update public.scheduled_messages m set processing_at=now()
  from candidates where m.id=candidates.id returning m.*;
$$;
revoke all on function public.claim_scheduled_messages(integer) from public,anon,authenticated;
grant execute on function public.claim_scheduled_messages(integer) to service_role;

create or replace function public.refresh_campaign_run(p_campaign_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.campaigns c set
    sent=(select count(*) from public.scheduled_messages m where m.campaign_run_id=(select x.campaign_run_id from public.scheduled_messages x where x.campaign_id=c.id and x.campaign_run_id is not null order by x.created_at desc,x.id desc limit 1) and m.status='sent'),
    failed=(select count(*) from public.scheduled_messages m where m.campaign_run_id=(select x.campaign_run_id from public.scheduled_messages x where x.campaign_id=c.id and x.campaign_run_id is not null order by x.created_at desc,x.id desc limit 1) and m.status='failed'),
    status=case when exists (select 1 from public.scheduled_messages m where m.campaign_id=c.id and m.campaign_run_id is not null and m.status='pending') then c.status else 'Completed' end
  where c.id=p_campaign_id and c.status in ('Sending','Scheduled','Paused');
$$;
revoke all on function public.refresh_campaign_run(uuid) from public,anon,authenticated;
grant execute on function public.refresh_campaign_run(uuid) to service_role;
-- A reservation survives a worker crash and can be reused without a second debit.
create or replace function public.reserve_scheduled_message(p_message_id uuid,p_amount numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare m public.scheduled_messages; balance numeric;
begin
  if p_amount is null or p_amount<0 then raise exception 'Invalid charge'; end if;
  select * into m from public.scheduled_messages where id=p_message_id for update;
  if not found or m.status<>'pending' or m.dispatch_started_at is not null then return null; end if;
  if not exists (select 1 from public.profiles p where p.id=m.user_id and not coalesce(p.paused,false)) then return null; end if;
  if m.charged_amount is not null then
    select wallet_balance into balance from public.profiles where id=m.user_id;
    return balance;
  end if;
  select public.decrement_wallet(m.user_id,p_amount) into balance;
  if balance is null then return null; end if;
  update public.scheduled_messages set charged_amount=p_amount where id=m.id;
  return balance;
end;
$$;
revoke all on function public.reserve_scheduled_message(uuid,numeric) from public,anon,authenticated;
grant execute on function public.reserve_scheduled_message(uuid,numeric) to service_role;

-- Mark accepted delivery and start the NEXT delay in one transaction. Quiet-hour
-- deferrals never collapse a one-hour gap into two messages a minute apart.
create or replace function public.accept_scheduled_message(p_message_id uuid,p_provider_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.scheduled_messages;
begin
  select * into m from public.scheduled_messages where id=p_message_id for update;
  if not found or m.status='sent' then return; end if;
  update public.scheduled_messages set status='sent',provider_message_id=p_provider_id,last_error=null where id=m.id;
  if m.campaign_run_id is not null then
    update public.scheduled_messages set scheduled_at=now()+coalesce(campaign_delay_minutes,0)*interval '1 minute'
    where campaign_run_id=m.campaign_run_id and contact_id=m.contact_id and status='pending'
      and campaign_step_index=m.campaign_step_index+1;
  end if;
end;
$$;
revoke all on function public.accept_scheduled_message(uuid,text) from public,anon,authenticated;
grant execute on function public.accept_scheduled_message(uuid,text) to service_role;
create or replace function public.reconcile_campaign_sequences()
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  update public.scheduled_messages set status='failed',last_error='Provider outcome requires review; automatic retry is disabled.'
    where status='pending' and dispatch_started_at<now()-interval '5 minutes';
  update public.scheduled_messages m set status='cancelled'
    where m.status='pending' and m.campaign_run_id is not null and exists (
      select 1 from public.scheduled_messages prev where prev.campaign_run_id=m.campaign_run_id
      and prev.contact_id=m.contact_id and prev.campaign_step_index<m.campaign_step_index
      and prev.status in ('cancelled','failed')
    );
  for campaign_id in select distinct c.id from public.campaigns c
    where c.status in ('Sending','Scheduled','Paused') and exists (
      select 1 from public.scheduled_messages m where m.campaign_id=c.id and m.campaign_run_id is not null
    ) loop
    perform public.refresh_campaign_run(campaign_id);
  end loop;
end;
$$;
revoke all on function public.reconcile_campaign_sequences() from public,anon,authenticated;
grant execute on function public.reconcile_campaign_sequences() to service_role;
-- Compare canonical digits so adding punctuation cannot bypass an opt-out.
create index if not exists contacts_user_phone_digits_idx on public.contacts
  (user_id,(right(regexp_replace(phone,'\D','','g'),10)));
create or replace function public.find_sms_contacts(p_user_id uuid,p_digits text)
returns table(state text,dnc boolean) language sql security definer set search_path = '' as $$
  select c.state,c.dnc from public.contacts c
    where c.user_id=p_user_id and right(regexp_replace(c.phone,'\D','','g'),10)=p_digits;
$$;
revoke all on function public.find_sms_contacts(uuid,text) from public,anon,authenticated;
grant execute on function public.find_sms_contacts(uuid,text) to service_role;
commit;
