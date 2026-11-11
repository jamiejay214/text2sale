-- Inbound overflow (lib/call-routing.ts routeOverflow).
--
-- While the sponsor is running the predictive dialer, a call to their
-- business numbers rings an agent they've opted in here instead of going
-- straight to the AI receptionist. The agent's own dialer session is held
-- on that call (inbound_from) and handed back in its previous state after.

alter table public.calling_sponsors
  add column if not exists take_overflow boolean not null default false;

alter table public.dialer_sessions
  add column if not exists inbound_from text,
  add column if not exists inbound_prev_state text;
