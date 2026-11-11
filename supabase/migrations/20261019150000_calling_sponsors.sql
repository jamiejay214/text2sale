-- Calling on someone else's account (lib/calling-access.ts).
--
-- An agent listed here may use the browser phone and predictive dialer on
-- their own leads, calling from the sponsor's business numbers, with every
-- call minute charged to the sponsor's wallet. Callbacks to those numbers
-- reach the sponsor (forwarding / AI receptionist), as for any other call.
--
-- Rows are added by the operator only. Users can read their own row (to
-- show the Calling page) but never write: a self-made row would bill
-- another account.

create table if not exists public.calling_sponsors (
  agent_id uuid primary key references public.profiles(id) on delete cascade,
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (agent_id <> sponsor_id)
);

alter table public.calling_sponsors enable row level security;

drop policy if exists calling_sponsors_read_own on public.calling_sponsors;
create policy calling_sponsors_read_own on public.calling_sponsors
  for select to authenticated
  using (agent_id = auth.uid());

revoke insert, update, delete, truncate on public.calling_sponsors from anon, authenticated;
