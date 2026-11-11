-- Passing dialer calls between the owner and their agents
-- (lib/dialer.ts spillToTeammate / sendToTeammate).
--
-- team_answered_at: when the teammate's phone picked up a lead passed to
-- them, so a hand-off nobody answered can come back to the sender.
-- inbound_label: what the held teammate's dialer shows about the call.

alter table public.dialer_queue
  add column if not exists team_answered_at timestamptz;

alter table public.dialer_sessions
  add column if not exists inbound_label text;
