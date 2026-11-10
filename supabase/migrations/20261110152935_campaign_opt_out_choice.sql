alter table public.campaigns add column if not exists omit_first_opt_out boolean not null default false;
