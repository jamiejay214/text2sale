-- Call forwarding: ring the owner's cell for inbound calls the AI
-- receptionist isn't taking. See lib/call-routing.ts.
alter table public.profiles add column if not exists call_forward_enabled boolean not null default false;
alter table public.profiles add column if not exists call_forward_number text;
