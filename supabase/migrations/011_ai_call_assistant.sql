-- ── AI call assistant ────────────────────────────────────────────────────
-- Adds the per-user settings for the voice assistant and a session table
-- that holds one row per AI-handled call: the running transcript, the
-- turn lock, and the outcome.
--
-- Safe to re-run.

-- ─── Profile settings ───────────────────────────────────────────────────
alter table public.profiles
  add column if not exists ai_call_enabled boolean not null default false,
  -- Spoken first line. Null falls back to a generated greeting built from
  -- the business name.
  add column if not exists ai_call_greeting text,
  -- Free-text operator instructions, same role as ai_instructions has for
  -- SMS. Authoritative over the default playbook.
  add column if not exists ai_call_instructions text,
  -- Telnyx TTS voice id, e.g. "Telnyx.KokoroTTS.af" or "AWS.Polly.Joanna".
  add column if not exists ai_call_voice text not null default 'Telnyx.KokoroTTS.af',
  -- Where "let me talk to a person" transfers to. E.164.
  add column if not exists ai_call_transfer_number text,
  -- When true the assistant only answers outside available_hours; inside
  -- business hours the call rings through as it does today.
  add column if not exists ai_call_after_hours_only boolean not null default false,
  -- Hard ceiling so a stuck or abusive call cannot bill indefinitely.
  add column if not exists ai_call_max_minutes integer not null default 10;

-- ─── Sessions ───────────────────────────────────────────────────────────
create table if not exists public.ai_call_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  contact_id uuid,
  -- One session per Telnyx leg. The unique constraint is what makes
  -- session creation idempotent under webhook retries.
  call_control_id text not null unique,
  from_number text,
  to_number text,
  state text not null default 'greeting'
    check (state in ('greeting','listening','thinking','speaking','transferring','done')),
  -- Anthropic message turns: [{"role":"user"|"assistant","content":"..."}]
  turns jsonb not null default '[]'::jsonb,
  -- Speech fragments accumulated since the last model turn.
  pending_transcript text not null default '',
  -- Lease timestamp. A webhook may only run a model turn if it wins a
  -- conditional update on this column; Telnyx delivers transcription
  -- events faster than a turn completes, so without the lease two
  -- webhooks would both call the model and both speak over each other.
  turn_lock_at timestamptz,
  turn_count integer not null default 0,
  appointment_id uuid references public.appointments(id) on delete set null,
  outcome text check (outcome in ('booked','message_taken','transferred','abandoned','declined')),
  -- What to do once the current sentence finishes playing. Set by a model
  -- turn, consumed by the call.speak.ended handler, so the caller always
  -- hears the whole sentence before the line moves or drops.
  next_action text check (next_action in ('hangup','transfer')),
  -- Caller-supplied details the assistant gathered, for the callback card.
  collected jsonb not null default '{}'::jsonb,
  summary text,
  -- What we debited up front (see AI_CALL_MIN_RESERVE) and what the call
  -- actually came to. reserved - charged is refunded at hangup.
  reserved_amount numeric(10,4) not null default 0,
  charged_amount numeric(10,4) not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_sessions_user_idx
  on public.ai_call_sessions (user_id, started_at desc);

create index if not exists ai_call_sessions_ccid_idx
  on public.ai_call_sessions (call_control_id);

-- ─── RLS ────────────────────────────────────────────────────────────────
-- Owners read their own sessions. All writes happen through the Telnyx
-- webhook on the service-role key, so no insert/update/delete policy is
-- granted to end users.
alter table public.ai_call_sessions enable row level security;

drop policy if exists "ai_call_sessions_select_own" on public.ai_call_sessions;
create policy "ai_call_sessions_select_own"
  on public.ai_call_sessions for select
  using (auth.uid() = user_id);

-- ─── Outcome column on calls ────────────────────────────────────────────
-- Lets the calls list show "AI answered" without joining.
alter table public.calls
  add column if not exists handled_by_ai boolean not null default false;

-- ─── Turn plumbing (service-role only) ──────────────────────────────────
-- Telnyx delivers transcription events faster than a model turn completes,
-- and a caller's single sentence often arrives as several final fragments.
-- These three functions are what keep that from turning into two models
-- talking over each other or a half-read sentence.

-- Append a speech fragment without a read-then-write race.
create or replace function public.ai_call_append_transcript(p_ccid text, p_text text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out text;
begin
  update public.ai_call_sessions
     set pending_transcript = btrim(coalesce(pending_transcript, '') || ' ' || coalesce(p_text, ''))
   where call_control_id = p_ccid
  returning pending_transcript into v_out;
  return coalesce(v_out, '');
end;
$$;

-- Win the right to run a model turn. Returns false when another webhook
-- already holds the lease, in which case the loser just appends and exits.
create or replace function public.ai_call_claim_turn(p_ccid text, p_lease_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  update public.ai_call_sessions
     set turn_lock_at = now(),
         state = 'thinking'
   where call_control_id = p_ccid
     and state <> 'done'
     and (turn_lock_at is null
          or turn_lock_at < now() - make_interval(secs => greatest(p_lease_seconds, 1)))
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Read and clear the accumulated speech in one statement.
create or replace function public.ai_call_consume_transcript(p_ccid text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
begin
  select pending_transcript into v_text
    from public.ai_call_sessions
   where call_control_id = p_ccid
   for update;

  update public.ai_call_sessions
     set pending_transcript = ''
   where call_control_id = p_ccid;

  return btrim(coalesce(v_text, ''));
end;
$$;

revoke all on function public.ai_call_append_transcript(text, text) from public, anon, authenticated;
revoke all on function public.ai_call_claim_turn(text, integer) from public, anon, authenticated;
revoke all on function public.ai_call_consume_transcript(text) from public, anon, authenticated;
