-- 003_enable_rls_internal_tables.sql
-- Applied to prod 2026-06-03.
--
-- Security fix: stripe_events and notify_state had RLS DISABLED, so the public
-- anon key (shipped to every browser) could read or modify every row. Both
-- tables are internal and written ONLY by server-side code that uses the
-- service-role key:
--   • stripe_events → app/api/stripe-webhook (idempotency ledger)
--   • notify_state  → the `visit-notify` Supabase edge function (SMS rate-limit)
--
-- The service-role key BYPASSES RLS, so enabling RLS with NO permissive
-- policies blocks anon/authenticated entirely while leaving all server +
-- edge-function code fully functional. No policies are added on purpose.

alter table public.stripe_events enable row level security;
alter table public.notify_state enable row level security;
