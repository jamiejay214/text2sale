-- ── First-class messaging activation status ────────────────────────────────
--
-- Activation state previously lived only inside the profiles.a2p_registration
-- JSONB blob, which the browser advanced by polling. That meant the flow
-- stalled whenever the customer closed the tab, and there was no indexable
-- column a background job could use to find accounts needing work.
--
-- This promotes status to a real column so /api/messaging/advance can select
-- exactly the accounts that need polling, and adds the bookkeeping columns a
-- retry loop needs (attempt count, last error, next attempt time).
--
-- The JSONB blob stays as the source of truth for registration *detail*
-- (brand/campaign IDs, sample messages). This column is the state machine.

alter table public.profiles
  add column if not exists messaging_status text not null default 'NOT_STARTED',
  add column if not exists messaging_status_at timestamptz not null default now(),
  add column if not exists messaging_error text,
  add column if not exists messaging_attempts integer not null default 0,
  add column if not exists messaging_next_attempt_at timestamptz;

-- Guard the enum at the database level. A typo in application code should
-- fail loudly rather than silently park an account in an unreachable state
-- that the driver never picks up again.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_messaging_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_messaging_status_check
      check (messaging_status in (
        'NOT_STARTED',
        'BUSINESS_SUBMITTED',
        'BRAND_PENDING',
        'BRAND_APPROVED',
        'CAMPAIGN_PENDING',
        'CAMPAIGN_APPROVED',
        'NUMBER_ASSIGNED',
        'ACTIVE',
        'AWAITING_PAYMENT',
        'REJECTED'
      ));
  end if;
end $$;

-- The driver's hot query is "accounts in a waiting state whose next attempt is
-- due", so index exactly that. Partial index keeps it small: the overwhelming
-- majority of rows settle in ACTIVE or NOT_STARTED and never need scanning.
create index if not exists profiles_messaging_pending_idx
  on public.profiles (messaging_next_attempt_at)
  where messaging_status in (
    'BUSINESS_SUBMITTED',
    'BRAND_PENDING',
    'BRAND_APPROVED',
    'CAMPAIGN_PENDING',
    'CAMPAIGN_APPROVED',
    'NUMBER_ASSIGNED',
    'AWAITING_PAYMENT'
  );

-- Backfill from the existing JSONB so accounts mid-registration are picked up
-- by the driver rather than stranded. Ordering matters: later statements win,
-- so these run from earliest stage to latest.
update public.profiles
   set messaging_status = 'BRAND_PENDING'
 where messaging_status = 'NOT_STARTED'
   and a2p_registration->>'status' = 'brand_pending';

update public.profiles
   set messaging_status = 'BRAND_APPROVED'
 where messaging_status = 'NOT_STARTED'
   and a2p_registration->>'status' = 'brand_approved';

update public.profiles
   set messaging_status = 'CAMPAIGN_PENDING'
 where messaging_status = 'NOT_STARTED'
   and a2p_registration->>'status' = 'campaign_pending';

update public.profiles
   set messaging_status = 'CAMPAIGN_APPROVED'
 where messaging_status = 'NOT_STARTED'
   and a2p_registration->>'status' = 'campaign_approved';

update public.profiles
   set messaging_status = 'REJECTED',
       messaging_error = coalesce(a2p_registration->'errors'->>0, 'Registration failed')
 where messaging_status = 'NOT_STARTED'
   and a2p_registration->>'status' in ('brand_failed', 'campaign_failed');

-- An account that already holds a campaign-assigned number is live today;
-- don't make it re-run the flow.
update public.profiles
   set messaging_status = 'ACTIVE'
 where messaging_status in ('CAMPAIGN_APPROVED', 'NOT_STARTED')
   and a2p_registration->>'campaignSid' is not null
   and jsonb_array_length(coalesce(owned_numbers, '[]'::jsonb)) > 0;

-- Start every backfilled row due immediately so the first driver run picks
-- up the whole in-flight backlog.
update public.profiles
   set messaging_next_attempt_at = now()
 where messaging_next_attempt_at is null
   and messaging_status not in ('NOT_STARTED', 'ACTIVE', 'REJECTED');
