-- 007_lockdown_wallet_rpcs.sql
-- Applied to prod 2026-05-31.
--
-- SECURITY (critical): decrement_wallet, bill_number_fee and claim_auto_recharge
-- were EXECUTE-able by the `authenticated` role, exposing them at
-- /rest/v1/rpc/<fn>. Two of them mutate wallet_balance via `balance - p_amount`,
-- so a signed-in user could POST a NEGATIVE p_amount and ADD funds to a wallet
-- (free money), and bill_number_fee had no caller check so it could target any
-- user. All real callers are server-side API routes using the service-role key,
-- so we (1) reject negative amounts as defense-in-depth and (2) revoke execute
-- from anon/authenticated/public, leaving only service_role.

create or replace function public.decrement_wallet(p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_balance numeric;
begin
  -- A negative decrement would ADD funds — refuse it outright.
  if coalesce(p_amount, 0) < 0 then
    return null;
  end if;

  if auth.role() = 'authenticated' then
    if not (
      p_user_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from public.profiles where id = p_user_id and manager_id = auth.uid())
    ) then
      raise exception 'decrement_wallet: not authorized to modify this wallet';
    end if;
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = p_user_id
    and coalesce(wallet_balance, 0) >= p_amount
  returning wallet_balance into new_balance;

  return new_balance; -- null if insufficient funds
end;
$function$;

create or replace function public.bill_number_fee(
  p_user_id uuid,
  p_amount numeric,
  p_period text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_balance numeric;
begin
  if coalesce(p_amount, 0) < 0 then
    return null;
  end if;

  update public.profiles
     set wallet_balance = coalesce(wallet_balance, 0) - p_amount,
         last_number_billed_period = p_period
   where id = p_user_id
     and last_number_billed_period is distinct from p_period
     and coalesce(wallet_balance, 0) >= p_amount
  returning wallet_balance into new_balance;

  return new_balance;
end;
$function$;

revoke execute on function public.decrement_wallet(uuid, numeric) from anon, authenticated, public;
grant  execute on function public.decrement_wallet(uuid, numeric) to service_role;

revoke execute on function public.bill_number_fee(uuid, numeric, text) from anon, authenticated, public;
grant  execute on function public.bill_number_fee(uuid, numeric, text) to service_role;

revoke execute on function public.claim_auto_recharge(uuid, integer) from anon, authenticated, public;
grant  execute on function public.claim_auto_recharge(uuid, integer) to service_role;
