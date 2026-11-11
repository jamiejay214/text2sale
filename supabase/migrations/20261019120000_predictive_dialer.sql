-- Predictive dialer (owner-only calling feature, see lib/dialer.ts).
--
-- A dialer session dials a queue of leads several at a time and connects
-- the first live answer to the agent's browser phone. Every lead leg has a
-- dialer_queue row; its result feeds the pacing (live-answer rate) and the
-- 30-day abandoned-call rate the FTC caps at 3%.

create table if not exists public.dialer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'stopped', 'completed')),
  max_lines int not null default 2 check (max_lines between 1 and 3),
  lines int not null default 1 check (lines between 1 and 3),
  from_numbers jsonb not null default '[]'::jsonb,
  -- ready: waiting for a live answer; connecting: a lead is being put
  -- through to the browser; on_call; wrap: after a call, before Next; away.
  agent_state text not null default 'away' check (agent_state in ('ready', 'connecting', 'on_call', 'wrap', 'away')),
  active_item uuid,
  agent_seen_at timestamptz,
  pause_reason text,
  sip_username text,
  business_name text not null,
  agent_name text not null,
  audience text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- One open session per account.
create unique index if not exists dialer_sessions_one_open
  on public.dialer_sessions (user_id) where status in ('active', 'paused');

create table if not exists public.dialer_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dialer_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  phone text not null,
  position int not null,
  status text not null default 'queued' check (status in ('queued', 'dialing', 'done')),
  -- connected, abandoned, voicemail, no-answer, busy, failed, skipped
  result text,
  call_row_id uuid,
  call_control_id text,
  from_number text,
  dialed_at timestamptz,
  answered_at timestamptz,
  human_at timestamptz,
  ended_at timestamptz,
  disposition text,
  opted_out boolean not null default false
);

create index if not exists dialer_queue_next on public.dialer_queue (session_id, status, position);
create index if not exists dialer_queue_user_recent on public.dialer_queue (user_id, dialed_at desc);
create index if not exists dialer_queue_ccid on public.dialer_queue (call_control_id) where call_control_id is not null;

-- Server-only tables: the app reads and writes them with the service role.
alter table public.dialer_sessions enable row level security;
alter table public.dialer_queue enable row level security;

-- Take up to the free lines' worth of queued leads for dialing. The session
-- row lock serializes concurrent webhooks, so two events can't both fill
-- the same free line.
create or replace function public.dialer_reserve(p_session uuid, p_limit int)
returns setof public.dialer_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dialer_sessions;
  in_flight int;
  free_lines int;
begin
  select * into s from public.dialer_sessions where id = p_session for update;
  if not found or s.status <> 'active' or s.agent_state <> 'ready'
     or s.agent_seen_at is null or s.agent_seen_at < now() - interval '45 seconds' then
    return;
  end if;
  select count(*) into in_flight from public.dialer_queue
    where session_id = p_session and status = 'dialing';
  free_lines := least(p_limit, s.lines) - in_flight;
  if free_lines <= 0 then
    return;
  end if;
  return query
    update public.dialer_queue q
       set status = 'dialing', dialed_at = now()
     where q.id in (
       select id from public.dialer_queue
        where session_id = p_session and status = 'queued'
        order by position
        limit free_lines
        for update skip locked
     )
    returning q.*;
end;
$$;

-- Hand the agent to one live answer. Only one lead can win; the others hear
-- the abandoned-call message.
create or replace function public.dialer_claim_agent(p_session uuid, p_item uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dialer_sessions
     set agent_state = 'connecting', active_item = p_item
   where id = p_session
     and agent_state = 'ready'
     and status in ('active', 'paused')
     and agent_seen_at > now() - interval '45 seconds';
  return found;
end;
$$;

-- Counts for pacing and the live dashboard, in one round trip.
create or replace function public.dialer_stats(p_session uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with session_items as (
    select * from public.dialer_queue where session_id = p_session
  ), recent as (
    select q.result from public.dialer_queue q
     where q.user_id = (select user_id from public.dialer_sessions where id = p_session)
       and q.dialed_at > now() - interval '30 days'
       and q.result in ('connected', 'abandoned')
  )
  select jsonb_build_object(
    'queued', (select count(*) from session_items where status = 'queued'),
    'in_flight', (select count(*) from session_items where status = 'dialing'),
    'dials', (select count(*) from session_items where dialed_at is not null and coalesce(result, '') <> 'skipped'),
    'connected', (select count(*) from session_items where result = 'connected'),
    'abandoned', (select count(*) from session_items where result = 'abandoned'),
    'voicemail', (select count(*) from session_items where result = 'voicemail'),
    'no_answer', (select count(*) from session_items where result in ('no-answer', 'busy')),
    'failed', (select count(*) from session_items where result = 'failed'),
    'skipped', (select count(*) from session_items where result = 'skipped'),
    'opted_out', (select count(*) from session_items where opted_out),
    'abandoned_30d', (select count(*) from recent where result = 'abandoned'),
    'connected_30d', (select count(*) from recent where result = 'connected')
  );
$$;

revoke all on function public.dialer_reserve(uuid, int) from public, anon, authenticated;
revoke all on function public.dialer_claim_agent(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dialer_reserve(uuid, int) to service_role;
grant execute on function public.dialer_claim_agent(uuid, uuid) to service_role;
revoke all on function public.dialer_stats(uuid) from public, anon, authenticated;
grant execute on function public.dialer_stats(uuid) to service_role;
