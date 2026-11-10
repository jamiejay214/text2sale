-- A real batch ID keeps simultaneous imports and older campaign audiences separate.
alter table public.contacts add column if not exists upload_batch_id uuid;
create index if not exists contacts_upload_batch on public.contacts(user_id,upload_batch_id,id) where upload_batch_id is not null;
alter table public.csv_uploads add column if not exists campaign_ready boolean not null default false;

create or replace function public.queue_csv_campaign(p_user uuid,p_campaign uuid,p_upload uuid,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  c public.campaigns;
  run uuid := md5(p_user::text || ':' || p_campaign::text || ':' || p_upload::text)::uuid;
  n integer; recipients integer;
begin
  select * into strict c from public.campaigns where id=p_campaign and user_id=p_user for update;
  if not exists(select 1 from public.csv_uploads where id=p_upload and user_id=p_user and campaign_ready)
    then raise exception 'This upload is unavailable for texting.'; end if;
  if exists(select 1 from public.scheduled_messages where campaign_run_id=run) then
    raise exception 'This upload was already queued for this campaign.'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 100000 then
    raise exception 'Invalid upload audience.'; end if;
  insert into public.scheduled_messages(user_id,contact_id,body,from_number,scheduled_at,status,campaign_id,cancel_on_reply,campaign_run_id,campaign_step_index,campaign_delay_minutes)
    select p_user,m.contact_id,m.body,m.from_number,m.scheduled_at,'pending',p_campaign,true,run,m.step_index,m.delay_minutes
    from jsonb_to_recordset(p_rows) as m(contact_id uuid,body text,from_number text,scheduled_at timestamptz,step_index integer,delay_minutes numeric)
    join public.contacts t on t.id=m.contact_id and t.user_id=p_user and t.upload_batch_id=p_upload and t.dnc=false
    where length(btrim(m.body)) between 1 and 5000 and exists(select 1 from public.owned_phone_numbers o where o.user_id=p_user and o.digits=right(regexp_replace(m.from_number,'\D','','g'),10));
  get diagnostics n=row_count;
  if n<>jsonb_array_length(p_rows) then raise exception 'A lead or sender changed. Review the upload again.'; end if;
  select count(distinct v->>'contact_id') into recipients from jsonb_array_elements(p_rows) v;
  update public.campaigns set status=case when c.status in ('Paused','Scheduled') then c.status else 'Sending' end,
    audience=case when c.status in ('Paused','Sending','Scheduled') then coalesce(c.audience,0)+recipients else recipients end where id=p_campaign;
  return jsonb_build_object('queued',n,'recipients',recipients,'paused',c.status='Paused');
end;
$$;
revoke all on function public.queue_csv_campaign(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.queue_csv_campaign(uuid,uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
