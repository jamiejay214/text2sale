-- Owner outreach: one-to-one prospecting emails that the morning growth
-- routine personalizes and queues here, and /api/outreach/send delivers
-- through the owner's verified Telnyx email sender.
create table if not exists public.outreach_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  to_email text not null,
  to_name text,
  business text,
  subject text not null,
  html text not null,
  text_body text not null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- One outreach email per address per account, ever: re-queuing the same
-- prospect is a no-op instead of a second cold email.
create unique index if not exists outreach_emails_user_email_key on public.outreach_emails (user_id, lower(to_email));
create index if not exists outreach_emails_due_idx on public.outreach_emails (send_after) where status = 'queued';

-- Service role only (the cron and the routine); no client access.
alter table public.outreach_emails enable row level security;
