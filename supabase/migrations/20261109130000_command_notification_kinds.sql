-- Add operator alert kinds so the Command Center can push more than visits,
-- signups and support: low customer balance, money in, messaging approved or
-- rejected, and platform-wide warnings. The per-minute cron already delivers.
alter table public.command_notifications drop constraint command_notifications_kind_check;
alter table public.command_notifications add constraint command_notifications_kind_check
  check (kind in ('visit','signup','support','test','low_balance','payment','approved','rejected','platform'));
