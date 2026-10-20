-- Scheduled callbacks from the predictive dialer (lib/dialer.ts
-- enqueueDueCallbacks). A lead who says "call me back at 3:30" gets a row
-- here; when it's due and the agent's dialer is waiting for a lead, it is
-- dialed next, on its own line, from the number that first called them.

create table if not exists public.dialer_callbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  phone text not null,
  -- The business number the lead already knows: the callback comes from it.
  from_number text,
  due_at timestamptz not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'dialed', 'cancelled')),
  queue_item uuid,
  created_at timestamptz not null default now()
);

create index if not exists dialer_callbacks_due
  on public.dialer_callbacks (user_id, due_at) where status = 'scheduled';

-- Server-only, like the rest of the dialer's tables.
alter table public.dialer_callbacks enable row level security;

alter table public.dialer_queue
  add column if not exists callback_id uuid,
  add column if not exists callback_due_at timestamptz,
  add column if not exists call_from text;
