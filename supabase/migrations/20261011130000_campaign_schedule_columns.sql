-- Campaign columns the scheduler (enqueue_campaign_sequence, scheduled-send,
-- send-campaign) reads and writes. Production's campaigns table was built by
-- hand and is missing some of them, so launching failed with
-- 'column "scheduled_at" of relation "campaigns" does not exist'.
-- Safe to run more than once.
alter table public.campaigns add column if not exists scheduled_at timestamptz;
alter table public.campaigns add column if not exists audience integer not null default 0;
alter table public.campaigns add column if not exists sent integer not null default 0;
alter table public.campaigns add column if not exists failed integer not null default 0;
alter table public.campaigns add column if not exists replies integer not null default 0;
alter table public.campaigns add column if not exists status text not null default 'Draft';
alter table public.campaigns add column if not exists logs jsonb not null default '[]'::jsonb;

-- A launch with a future start sets status to 'Scheduled', which the original
-- check constraint (Draft/Sending/Completed/Paused) rejects. Replace it.
-- NOT VALID: existing rows are left alone; only new writes are checked.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.campaigns'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.campaigns drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('Draft', 'Sending', 'Scheduled', 'Paused', 'Completed')) not valid;

notify pgrst, 'reload schema';
