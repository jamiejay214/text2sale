-- Durable outbox: one notification per customer/campaign, never a historical blast.
create schema if not exists private;
create table public.campaign_approval_email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  payload jsonb,
  first_attempt_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, campaign_id)
);
alter table public.campaign_approval_email_jobs enable row level security;
revoke all on public.campaign_approval_email_jobs from public, anon, authenticated;
grant all on public.campaign_approval_email_jobs to service_role;
grant usage on schema private to service_role;
create index campaign_approval_email_due on public.campaign_approval_email_jobs(next_attempt_at)
  where status in ('pending','sending');

create function private.queue_campaign_approval_email() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  campaign text := nullif(new.a2p_registration->>'campaignSid', '');
  approved boolean := coalesce(upper(new.a2p_registration->>'campaignStatus') in ('MNO_ACCEPTED','MNO_PROVISIONED','ACTIVE'), false);
begin
  -- Only backend/provider status writes may queue mail; client profile edits cannot.
  if current_user not in ('postgres','service_role') then return new; end if;
  if campaign is null or not approved then return new; end if;
  if tg_op = 'UPDATE' then
    if old.a2p_registration->>'campaignSid' = campaign
       and upper(old.a2p_registration->>'campaignStatus') in ('MNO_ACCEPTED','MNO_PROVISIONED','ACTIVE') then
      return new;
    end if;
  end if;
  insert into public.campaign_approval_email_jobs(user_id,campaign_id)
    values (new.id,campaign)
    on conflict (user_id,campaign_id) do update
      set status='pending',next_attempt_at=now(),last_error=null
      where campaign_approval_email_jobs.status='cancelled'
        and campaign_approval_email_jobs.first_attempt_at is null;
  return new;
end;
$$;
revoke all on function private.queue_campaign_approval_email() from public,anon,authenticated;
grant execute on function private.queue_campaign_approval_email() to service_role;
create trigger queue_campaign_approval_email
  after insert or update of a2p_registration on public.profiles
  for each row execute function private.queue_campaign_approval_email();

create function public.claim_campaign_approval_emails()
returns setof public.campaign_approval_email_jobs
language sql security invoker set search_path = '' as $$
  update public.campaign_approval_email_jobs j
    set status='sending',lease_id=gen_random_uuid(),next_attempt_at=now()+interval '5 minutes'
    where j.id in (
      select q.id from public.campaign_approval_email_jobs q
      where q.status in ('pending','sending') and q.next_attempt_at <= now()
      order by q.created_at limit 3 for update skip locked
    ) returning j.*;
$$;
revoke all on function public.claim_campaign_approval_emails() from public,anon,authenticated;
grant execute on function public.claim_campaign_approval_emails() to service_role;
