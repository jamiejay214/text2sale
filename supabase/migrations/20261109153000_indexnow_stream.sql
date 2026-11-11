create table public.indexnow_stream (
  id boolean primary key default true check (id),
  acknowledged jsonb,
  available_at timestamptz not null default now()
);
alter table public.indexnow_stream enable row level security;
revoke all on public.indexnow_stream from public, anon, authenticated;
grant select, update on public.indexnow_stream to service_role;
insert into public.indexnow_stream (id) values (true);
