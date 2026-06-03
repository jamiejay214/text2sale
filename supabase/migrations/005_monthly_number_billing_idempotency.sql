-- 005_monthly_number_billing_idempotency.sql
-- Applied to prod 2026-05-31.
--
-- Fix: the monthly per-number billing cron (/api/billing/numbers) had no
-- per-period idempotency, so a cron retry or replay could charge every user
-- $1/number a SECOND time in the same month. This adds a period marker and an
-- atomic "charge + claim the period" RPC so a given (user, month) can only be
-- billed once, no matter how many times the cron fires. The Stripe webhook's
-- invoice.payment_succeeded number-fee path also calls this RPC, so the cron
-- and the webhook can never double-bill each other either.

alter table public.profiles
  add column if not exists last_number_billed_period text;

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
  update public.profiles
     set wallet_balance = coalesce(wallet_balance, 0) - p_amount,
         last_number_billed_period = p_period
   where id = p_user_id
     and last_number_billed_period is distinct from p_period
     and coalesce(wallet_balance, 0) >= p_amount
  returning wallet_balance into new_balance;

  return new_balance; -- NULL when already billed this period OR insufficient funds
end;
$function$;

revoke execute on function public.bill_number_fee(uuid, numeric, text) from anon, public;
grant execute on function public.bill_number_fee(uuid, numeric, text) to service_role;
