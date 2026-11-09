-- Platform-wide operational health, one row per signal (e.g. 'telnyx_balance').
-- Lets the balance-check cron remember the last level and when it last alerted,
-- so overlapping/frequent runs don't re-nag the owner. Service-role only.
create table if not exists public.platform_health (
  id text primary key,
  level text,
  value numeric,
  detail jsonb not null default '{}'::jsonb,
  alerted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.platform_health enable row level security;
revoke all on public.platform_health from anon, authenticated;
grant all on public.platform_health to service_role;
