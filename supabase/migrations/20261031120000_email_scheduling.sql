-- Scheduled email campaigns, sent in the background.
--
-- Scheduling or sending a campaign queues one email_sends row per recipient
-- (status 'queued', send_after = when it may go out). A cron job sends due
-- rows, at most hourly_limit per campaign per hour, charging the wallet for
-- each wave before anything is handed to Telnyx.
--
-- audience     {"lists": [...], "tags": [...]}: contacts in any of these lead
--              lists or carrying any of these tags; null = everyone with an email
-- locked_until a short lease so overlapping cron runs never send the same wave
-- local_time   'YYYY-MM-DDTHH:MM' to send at that time in each contact's own
--              time zone; null = send at scheduled_at

alter table public.email_campaigns
  add column if not exists audience jsonb,
  add column if not exists scheduled_at timestamptz,
  add column if not exists local_time text check (local_time is null or local_time ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  add column if not exists hourly_limit integer not null default 500 check (hourly_limit between 50 and 5000),
  add column if not exists locked_until timestamptz;

alter table public.email_campaigns drop constraint if exists email_campaigns_status_check;
alter table public.email_campaigns add constraint email_campaigns_status_check
  check (status in ('Draft', 'Scheduled', 'Sending', 'Sent', 'Paused', 'Cancelled'));

alter table public.email_sends
  add column if not exists send_after timestamptz,
  add column if not exists sent_at timestamptz;

alter table public.email_sends drop constraint if exists email_sends_status_check;
alter table public.email_sends add constraint email_sends_status_check
  check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped'));

create index if not exists email_sends_queue_idx on public.email_sends (campaign_id, send_after) where status = 'queued';
create index if not exists email_campaigns_due_idx on public.email_campaigns (status) where status in ('Scheduled', 'Sending');
