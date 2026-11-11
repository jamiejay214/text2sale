-- The account holder can choose to always dial their maximum lines,
-- bypassing abandoned-call pacing (lib/dialer.ts linesFor).
alter table public.dialer_sessions add column if not exists force_lines boolean not null default false;
