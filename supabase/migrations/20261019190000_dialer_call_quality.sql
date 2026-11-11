-- Audio stats for each dialer leg (lib/dialer.ts recordLegAudio), to tell a
-- silent agent microphone from audio that never reached their speakers.
alter table public.dialer_queue add column if not exists call_quality jsonb;
