-- Delivery, bounce, spam-complaint, open and click tracking for email.
--
-- Each verified sending domain gets a Telnyx webhook (/api/email/events);
-- events are matched to email_sends by Telnyx message id. Bounces and spam
-- complaints are suppressed automatically, and a campaign pauses itself if
-- its bounce or complaint rate climbs (pause_reason says why).

alter table public.email_sends
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz;

alter table public.email_senders
  add column if not exists webhook_id text,
  add column if not exists events_backfilled_at timestamptz;

alter table public.email_campaigns
  add column if not exists pause_reason text check (pause_reason is null or length(pause_reason) <= 300),
  -- Set when the owner resumes a campaign that paused itself, so it isn't re-paused.
  add column if not exists health_override boolean not null default false;

-- Per-campaign results in one query, for the campaign list.
create or replace function public.email_campaign_stats(p_user_id uuid)
returns table (
  campaign_id uuid,
  sent bigint,
  delivered bigint,
  bounced bigint,
  complained bigint,
  opened bigint,
  clicked bigint
)
language sql
stable
set search_path = public
as $$
  select
    s.campaign_id,
    count(*) filter (where s.status in ('sent', 'delivered', 'bounced', 'complained')),
    count(*) filter (where s.status in ('delivered', 'complained') or s.delivered_at is not null),
    count(*) filter (where s.status = 'bounced'),
    count(*) filter (where s.status = 'complained'),
    count(*) filter (where s.opened_at is not null),
    count(*) filter (where s.clicked_at is not null)
  from public.email_sends s
  where s.user_id = p_user_id
  group by s.campaign_id
$$;

revoke all on function public.email_campaign_stats(uuid) from public, anon, authenticated;
grant execute on function public.email_campaign_stats(uuid) to service_role;
