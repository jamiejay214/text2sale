-- 006_auto_recharge_claim_lock.sql
-- Applied to prod 2026-05-31.
--
-- Fix: /api/auto-recharge keyed its Stripe idempotency on a 60-second wall
-- clock bucket, so two browser tabs (or a send crossing a minute boundary)
-- could each fire a recharge for the same low-balance episode -> two card
-- charges. This adds an atomic per-user cooldown claim: only one recharge can
-- be initiated per cooldown window, regardless of how many callers race.

create or replace function public.claim_auto_recharge(
  p_user_id uuid,
  p_cooldown_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  claimed boolean;
begin
  update public.profiles
     set auto_recharge = coalesce(auto_recharge, '{}'::jsonb)
       || jsonb_build_object(
            'lastTriggeredAt',
            to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
   where id = p_user_id
     and (
       auto_recharge->>'lastTriggeredAt' is null
       or (auto_recharge->>'lastTriggeredAt')::timestamptz
            < now() - make_interval(secs => p_cooldown_seconds)
     )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$function$;

revoke execute on function public.claim_auto_recharge(uuid, integer) from anon, public;
grant execute on function public.claim_auto_recharge(uuid, integer) to authenticated, service_role;
