create table public.welcome_offer_claims (
  email text primary key,
  claimed_at timestamptz not null default now(),
  marketing_consent_at timestamptz,
  consent_text text,
  source text not null
);
alter table public.welcome_offer_claims enable row level security;
revoke all on public.welcome_offer_claims from public, anon, authenticated;
grant select, insert, update on public.welcome_offer_claims to service_role;

create function public.claim_welcome_offer(claim_email text, source_path text, consent_notice text, request_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempts_count integer;
begin
  insert into public.prospect_capture_limits as limits(ip_hash,window_start,attempts)
  values(request_hash,now(),1)
  on conflict (ip_hash) do update set
    attempts = case when limits.window_start < now()-interval '15 minutes' then 1 else limits.attempts+1 end,
    window_start = case when limits.window_start < now()-interval '15 minutes' then now() else limits.window_start end
  returning attempts into attempts_count;
  if attempts_count > 10 then return false; end if;
  insert into public.welcome_offer_claims(email,source,marketing_consent_at,consent_text)
  values(claim_email,source_path,case when consent_notice is not null then now() end,consent_notice)
  on conflict (email) do update set marketing_consent_at=excluded.marketing_consent_at, consent_text=excluded.consent_text
  where welcome_offer_claims.marketing_consent_at is null and excluded.marketing_consent_at is not null;
  return true;
end;
$$;
revoke all on function public.claim_welcome_offer(text,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_welcome_offer(text,text,text,text) to service_role;

create view public.welcome_offer_audience with (security_invoker=true) as
select c.*, (c.marketing_consent_at is not null and not exists
  (select 1 from public.text2sale_prospects p where p.email=c.email and p.status='do_not_contact')
  and not exists (select 1 from public.email_suppressions s join public.profiles p on p.id=s.user_id
    where lower(p.email)='johnsonhealthquotes@gmail.com' and s.email=c.email)
) as marketable from public.welcome_offer_claims c;
revoke all on public.welcome_offer_audience from public,anon,authenticated;
grant select on public.welcome_offer_audience to service_role;
