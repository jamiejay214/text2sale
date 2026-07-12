-- Home WiFi monitor: live snapshot storage.
--
-- A home-network collector (see /collector) POSTs a metadata snapshot to
-- /api/wifi/ingest every minute; the dashboard reads the latest from here.
-- One row per household (default 'home' for a single-home setup).
--
-- Only the service role touches this table (the API routes run server-side
-- with SUPABASE_SERVICE_ROLE_KEY), so RLS is enabled with no public policies.

create table if not exists public.wifi_live (
  household   text primary key default 'home',
  snapshot    jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.wifi_live enable row level security;

-- No policies: anon/authenticated clients get nothing. The server uses the
-- service role, which bypasses RLS. This keeps raw network metadata off the
-- public API surface.
