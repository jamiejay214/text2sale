-- Text2Sale's own prospects, separate from customers' imported CRM contacts.
create table public.text2sale_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  phone text,
  kind text not null check (kind in ('signup','inquiry')),
  industry text,
  message text,
  path text not null default '/',
  source text not null default 'direct',
  campaign text,
  consent_text text not null,
  consent_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','contacted','follow_up','won','not_interested','do_not_contact')),
  notes text not null default '' check (length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index text2sale_prospects_recent on public.text2sale_prospects(created_at desc);
alter table public.text2sale_prospects enable row level security;
revoke all on public.text2sale_prospects from anon, authenticated;
grant all on public.text2sale_prospects to service_role;

create table public.prospect_capture_limits (
  ip_hash text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
create index prospect_capture_limits_expiry on public.prospect_capture_limits(window_start);
alter table public.prospect_capture_limits enable row level security;
revoke all on public.prospect_capture_limits from anon, authenticated;
grant all on public.prospect_capture_limits to service_role;

-- Server-only, invoker security. Atomic limit and insert; public API cannot
-- overwrite prior contact information, owner notes, status, or consent.
create function public.capture_text2sale_prospect(payload jsonb, ip_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.prospect_capture_limits as limits(ip_hash, window_start, attempts)
  values (ip_hash, now(), 1)
  on conflict on constraint prospect_capture_limits_pkey do update set
    attempts = case when limits.window_start < now() - interval '15 minutes' then 1 else limits.attempts + 1 end,
    window_start = case when limits.window_start < now() - interval '15 minutes' then now() else limits.window_start end
  returning attempts into n;
  if n > 10 then return false; end if;
  delete from public.prospect_capture_limits where window_start < now() - interval '1 day';
  insert into public.text2sale_prospects(name,email,phone,kind,industry,message,path,source,campaign,consent_text)
  values(payload->>'name',payload->>'email',payload->>'phone',payload->>'kind',payload->>'industry',payload->>'message',payload->>'path',payload->>'source',payload->>'campaign',payload->>'consent_text')
  on conflict (email) do nothing;
  return true;
end;
$$;
revoke all on function public.capture_text2sale_prospect(jsonb,text) from public, anon, authenticated;
grant execute on function public.capture_text2sale_prospect(jsonb,text) to service_role;
