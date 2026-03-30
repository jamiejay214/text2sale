-- ============================================================
-- Text2Sale Supabase Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'user' check (role in ('user', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  referral_code text default '',
  credits integer not null default 0,
  verified boolean not null default false,
  paused boolean not null default false,
  workflow_note text default '',
  wallet_balance numeric(10,2) not null default 0,
  usage_history jsonb not null default '[]'::jsonb,
  owned_numbers jsonb not null default '[]'::jsonb,
  plan jsonb not null default '{"name":"Text2Sale Package","price":39.99,"messageCost":0.012}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. CONTACTS TABLE
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  email text default '',
  city text default '',
  state text default '',
  tags jsonb not null default '[]'::jsonb,
  notes text default '',
  dnc boolean not null default false,
  campaign text default '',
  address text default '',
  zip text default '',
  lead_source text default '',
  quote text default '',
  policy_id text default '',
  timeline text default '',
  household_size text default '',
  date_of_birth text default '',
  age text default '',
  created_at timestamptz not null default now()
);

-- 3. CAMPAIGNS TABLE
create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null default '',
  audience integer not null default 0,
  sent integer not null default 0,
  replies integer not null default 0,
  failed integer not null default 0,
  status text not null default 'Draft' check (status in ('Draft', 'Sending', 'Completed', 'Paused')),
  message text default '',
  logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. CONVERSATIONS TABLE
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  preview text not null default '',
  unread integer not null default 0,
  last_message_at timestamptz not null default now(),
  starred boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. MESSAGES TABLE
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null default '',
  status text default 'sent' check (status in ('sent', 'delivered', 'failed', 'received')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.campaigns enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- PROFILES
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert" on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id);

-- CONTACTS
create policy "contacts_select" on public.contacts for select
  using (auth.uid() = user_id);

create policy "contacts_insert" on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "contacts_update" on public.contacts for update
  using (auth.uid() = user_id);

create policy "contacts_delete" on public.contacts for delete
  using (auth.uid() = user_id);

-- CAMPAIGNS
create policy "campaigns_select" on public.campaigns for select
  using (auth.uid() = user_id);

create policy "campaigns_insert" on public.campaigns for insert
  with check (auth.uid() = user_id);

create policy "campaigns_update" on public.campaigns for update
  using (auth.uid() = user_id);

create policy "campaigns_delete" on public.campaigns for delete
  using (auth.uid() = user_id);

-- CONVERSATIONS
create policy "conversations_select" on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations_insert" on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations_update" on public.conversations for update
  using (auth.uid() = user_id);

create policy "conversations_delete" on public.conversations for delete
  using (auth.uid() = user_id);

-- MESSAGES (check via parent conversation)
create policy "messages_select" on public.messages for select
  using (exists (
    select 1 from public.conversations
    where public.conversations.id = public.messages.conversation_id
    and public.conversations.user_id = auth.uid()
  ));

create policy "messages_insert" on public.messages for insert
  with check (exists (
    select 1 from public.conversations
    where public.conversations.id = conversation_id
    and public.conversations.user_id = auth.uid()
  ));

create policy "messages_update" on public.messages for update
  using (exists (
    select 1 from public.conversations
    where public.conversations.id = public.messages.conversation_id
    and public.conversations.user_id = auth.uid()
  ));

create policy "messages_delete" on public.messages for delete
  using (exists (
    select 1 from public.conversations
    where public.conversations.id = public.messages.conversation_id
    and public.conversations.user_id = auth.uid()
  ));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, referral_code)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'referral_code', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_contacts_user_id on public.contacts(user_id);
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
