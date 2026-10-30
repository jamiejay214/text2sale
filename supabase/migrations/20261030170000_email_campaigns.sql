-- Email campaigns, sent through Telnyx Email from each customer's own domain.
--
-- email_senders       one verified sending domain per customer
-- email_campaigns     a campaign: subject, body, audience, totals
-- email_sends         one row per email sent (for results and Telnyx email events)
-- email_suppressions  addresses a customer must never email again
--                     (unsubscribed, hard bounce, spam complaint)
--
-- Customers read their own rows; every write goes through server routes
-- using the service role, so wallet charges and suppression can't be
-- bypassed from the browser.

create table if not exists public.email_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null check (domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  from_name text not null default '' check (length(from_name) <= 120),
  from_local text not null default 'hello' check (from_local ~ '^[a-z0-9._-]{1,64}$'),
  reply_to text check (reply_to is null or length(reply_to) <= 254),
  provider_domain_id text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  dns_records jsonb not null default '[]'::jsonb,
  dns_managed boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  subject text not null check (length(subject) between 1 and 200),
  preview_text text not null default '' check (length(preview_text) <= 200),
  body text not null default '' check (length(body) <= 20000),
  audience_campaign text,
  design jsonb,
  status text not null default 'Draft' check (status in ('Draft', 'Sending', 'Sent', 'Paused')),
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0,
  cost numeric(12, 4) not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_campaigns_user_idx on public.email_campaigns (user_id, created_at desc);

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  email text not null,
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'bounced', 'complained', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);
create index if not exists email_sends_message_idx on public.email_sends (provider_message_id);
create index if not exists email_sends_campaign_idx on public.email_sends (campaign_id);

create table if not exists public.email_suppressions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null check (email = lower(email)),
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint')),
  created_at timestamptz not null default now(),
  primary key (user_id, email)
);

alter table public.email_senders enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_sends enable row level security;
alter table public.email_suppressions enable row level security;

drop policy if exists "email_senders owner read" on public.email_senders;
create policy "email_senders owner read" on public.email_senders for select using (auth.uid() = user_id);
drop policy if exists "email_campaigns owner read" on public.email_campaigns;
create policy "email_campaigns owner read" on public.email_campaigns for select using (auth.uid() = user_id);
drop policy if exists "email_sends owner read" on public.email_sends;
create policy "email_sends owner read" on public.email_sends for select using (auth.uid() = user_id);
drop policy if exists "email_suppressions owner read" on public.email_suppressions;
create policy "email_suppressions owner read" on public.email_suppressions for select using (auth.uid() = user_id);
