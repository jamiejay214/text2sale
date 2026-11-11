-- Set when the agent moved a live dialer call to their cell phone
-- (lib/dialer.ts transferToCell): the call must outlive the browser leg,
-- Next/Stop and the stopped-session cleanup.
alter table public.dialer_queue add column if not exists transferred_to text;
