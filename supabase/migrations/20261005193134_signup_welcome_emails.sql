create table public.welcome_email_jobs (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','sending','sent','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 payload jsonb, first_attempt_at timestamptz, sent_at timestamptz, provider_id text, last_error text,
 created_at timestamptz not null default now()
);
alter table public.welcome_email_jobs enable row level security;
revoke all on public.welcome_email_jobs from public,anon,authenticated;
grant all on public.welcome_email_jobs to service_role;
create index welcome_email_due on public.welcome_email_jobs(next_attempt_at) where status in('pending','sending');
create function private.queue_welcome_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.welcome_email_jobs(user_id) values(new.id) on conflict do nothing;
 return new;
end; $$;
revoke all on function private.queue_welcome_email() from public,anon,authenticated,service_role;
create trigger queue_signup_welcome after insert on public.profiles for each row execute function private.queue_welcome_email();
create function public.claim_welcome_emails() returns setof public.welcome_email_jobs language sql security invoker set search_path='' as $$
 update public.welcome_email_jobs j set status='sending',next_attempt_at=now()+interval '5 minutes'
 where j.user_id in (select q.user_id from public.welcome_email_jobs q where q.status in('pending','sending') and q.next_attempt_at<=now() order by q.created_at limit 5 for update skip locked)
 returning j.*;
$$;
revoke all on function public.claim_welcome_emails() from public,anon,authenticated;
grant execute on function public.claim_welcome_emails() to service_role;
