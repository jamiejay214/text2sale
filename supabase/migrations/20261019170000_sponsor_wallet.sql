-- Sponsored agents (calling_sponsors) use the sponsor's wallet for texts as
-- well as calls. Every server-side charge and refund goes through these two
-- functions (reserve_scheduled_message calls decrement_wallet), so the switch
-- is made once here and debits and refunds always land on the same wallet.
--
-- Only server calls (service role) are redirected: a signed-in agent calling
-- decrement_wallet directly still only touches their own wallet.

create or replace function public.wallet_payer(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select sponsor_id from public.calling_sponsors where agent_id = p_user_id), p_user_id);
$$;

revoke all on function public.wallet_payer(uuid) from public, anon, authenticated;

create or replace function public.decrement_wallet(p_user_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance numeric;
  v_wallet uuid := p_user_id;
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
  else
    v_wallet := public.wallet_payer(p_user_id);
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where id = v_wallet
    and coalesce(wallet_balance, 0) >= p_amount
  returning wallet_balance into new_balance;

  return new_balance; -- null if insufficient funds
end;
$$;

create or replace function public.credit_wallet(p_user_id uuid, p_amount numeric, p_idempotency_key text, p_description text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_new_balance numeric;
  v_wallet uuid := p_user_id;
begin
  if p_amount <= 0 then
    raise exception 'credit_wallet: amount must be positive';
  end if;
  if coalesce(auth.role(), '') <> 'authenticated' then
    v_wallet := public.wallet_payer(p_user_id);
  end if;

  -- If we've already processed this idempotency key, return current balance.
  select * into v_existing from public.wallet_topups where idempotency_key = p_idempotency_key;
  if found then
    select wallet_balance into v_new_balance from public.profiles where id = v_wallet;
    return v_new_balance;
  end if;

  insert into public.wallet_topups (user_id, amount, idempotency_key, description)
  values (v_wallet, p_amount, p_idempotency_key, p_description);

  update public.profiles
  set wallet_balance = coalesce(wallet_balance, 0) + p_amount
  where id = v_wallet
  returning wallet_balance into v_new_balance;

  return v_new_balance;
exception
  when unique_violation then
    select wallet_balance into v_new_balance from public.profiles where id = v_wallet;
    return v_new_balance;
end;
$$;
