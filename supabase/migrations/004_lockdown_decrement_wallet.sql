-- 004_lockdown_decrement_wallet.sql
-- Applied to prod 2026-06-03.
--
-- Security: public.decrement_wallet was EXECUTE-able by anon + PUBLIC and
-- decremented ANY user's wallet by p_user_id with no caller check — so anyone
-- with the public anon key could zero out any user's balance (sabotage/DoS,
-- since wallet_balance gates SMS sending). (credit_wallet was already locked
-- to service_role only.)
--
-- Fix:
--   1. Re-create with an authorization guard mirroring the app's impersonation
--      rules (self / admin / manager-of-target). service_role skips the guard.
--   2. Add SET search_path = public (also clears the mutable-search_path lint).
--   3. REVOKE EXECUTE from anon + PUBLIC; keep authenticated + service_role.
-- Body logic unchanged. Verified: anon DENIED (42501), service_role OK,
-- authenticated-own-wallet OK, balances untouched (tested with amount=0).

create or replace function public.decrement_wallet(p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_balance numeric;
begin
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

revoke execute on function public.decrement_wallet(uuid, numeric) from anon, public;
grant execute on function public.decrement_wallet(uuid, numeric) to authenticated, service_role;
