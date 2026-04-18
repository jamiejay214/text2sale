-- Run this in the Supabase SQL editor after 001_stripe_events.sql.
--
-- Lock down `profiles` so authenticated users can only update their own row
-- AND cannot tamper with sensitive columns — wallet balance, credits, plan,
-- role, subscription flags, A2P state, etc. Any server code that needs to
-- write these fields must go through the service role (never the anon/auth
-- client). This migration is load-bearing: without it, a motivated user can
-- open devtools and `update profiles set wallet_balance=9999 where id=self`
-- because RLS (as currently written) permits self-updates on any column.

-- 1. Ensure RLS is on.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop permissive policies that may allow full-column self-update.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 3. Recreate tight policies.
-- Everyone authenticated can SELECT their own row.
CREATE POLICY profiles_self_read ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can read anyone.
CREATE POLICY profiles_admin_read ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Authenticated users can INSERT their own profile (the signup trigger also
-- does this as service role; this is belt-and-suspenders).
CREATE POLICY profiles_self_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Authenticated users can UPDATE their own row. Sensitive columns are
-- protected by the trigger below, not the policy (policies can't gate
-- individual columns conveniently on UPDATE with both rows visible).
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update anyone.
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (true);

-- 4. BEFORE UPDATE trigger: block non-admin users from changing sensitive
-- columns via the auth client. Service-role bypasses RLS so server routes
-- that need to write these fields will continue to work. We detect the
-- caller identity via auth.uid(); service role returns NULL here.
CREATE OR REPLACE FUNCTION profiles_block_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  -- Service role has no auth.uid() — allow.
  IF caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins can change anything.
  SELECT role INTO caller_role FROM profiles WHERE id = caller_id;
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- For self-updates, reject changes to any sensitive column.
  IF NEW.wallet_balance        IS DISTINCT FROM OLD.wallet_balance        THEN RAISE EXCEPTION 'cannot self-modify wallet_balance'; END IF;
  IF NEW.credits               IS DISTINCT FROM OLD.credits               THEN RAISE EXCEPTION 'cannot self-modify credits'; END IF;
  IF NEW.plan                  IS DISTINCT FROM OLD.plan                  THEN RAISE EXCEPTION 'cannot self-modify plan'; END IF;
  IF NEW.role                  IS DISTINCT FROM OLD.role                  THEN RAISE EXCEPTION 'cannot self-modify role'; END IF;
  IF NEW.verified              IS DISTINCT FROM OLD.verified              THEN RAISE EXCEPTION 'cannot self-modify verified'; END IF;
  IF NEW.paused                IS DISTINCT FROM OLD.paused                THEN RAISE EXCEPTION 'cannot self-modify paused'; END IF;
  IF NEW.usage_history         IS DISTINCT FROM OLD.usage_history         THEN RAISE EXCEPTION 'cannot self-modify usage_history'; END IF;
  IF NEW.total_deposited       IS DISTINCT FROM OLD.total_deposited       THEN RAISE EXCEPTION 'cannot self-modify total_deposited'; END IF;
  IF NEW.owned_numbers         IS DISTINCT FROM OLD.owned_numbers         THEN RAISE EXCEPTION 'cannot self-modify owned_numbers'; END IF;
  IF NEW.a2p_registration      IS DISTINCT FROM OLD.a2p_registration      THEN RAISE EXCEPTION 'cannot self-modify a2p_registration'; END IF;
  IF NEW.subscription_status   IS DISTINCT FROM OLD.subscription_status   THEN RAISE EXCEPTION 'cannot self-modify subscription_status'; END IF;
  IF NEW.stripe_customer_id    IS DISTINCT FROM OLD.stripe_customer_id    THEN RAISE EXCEPTION 'cannot self-modify stripe_customer_id'; END IF;
  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN RAISE EXCEPTION 'cannot self-modify stripe_subscription_id'; END IF;
  IF NEW.free_subscription     IS DISTINCT FROM OLD.free_subscription     THEN RAISE EXCEPTION 'cannot self-modify free_subscription'; END IF;
  IF NEW.ai_plan               IS DISTINCT FROM OLD.ai_plan               THEN RAISE EXCEPTION 'cannot self-modify ai_plan'; END IF;
  IF NEW.agent_plan            IS DISTINCT FROM OLD.agent_plan            THEN RAISE EXCEPTION 'cannot self-modify agent_plan'; END IF;
  IF NEW.referral_code         IS DISTINCT FROM OLD.referral_code         THEN RAISE EXCEPTION 'cannot self-modify referral_code'; END IF;
  IF NEW.referral_rewarded     IS DISTINCT FROM OLD.referral_rewarded     THEN RAISE EXCEPTION 'cannot self-modify referral_rewarded'; END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_block_sensitive_self_update_trg ON profiles;
CREATE TRIGGER profiles_block_sensitive_self_update_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_block_sensitive_self_update();

-- 5. Wallet RPCs — atomic, SECURITY DEFINER, bypass the trigger because they
-- run as owner. Use these from server code instead of read-modify-write.
CREATE OR REPLACE FUNCTION decrement_wallet(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_balance numeric;
BEGIN
  UPDATE profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount
  WHERE id = p_user_id
    AND COALESCE(wallet_balance, 0) >= p_amount
  RETURNING wallet_balance INTO new_balance;
  RETURN new_balance; -- NULL if insufficient funds
END $$;

-- Idempotent credit: same (user, key) only credits once. Key is any
-- external-transaction id — PaymentIntent.id, Stripe event.id, invoice id.
CREATE TABLE IF NOT EXISTS wallet_credit_keys (
  p_user_id uuid NOT NULL,
  p_key text NOT NULL,
  credited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (p_user_id, p_key)
);

CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_idempotency_key text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_balance numeric;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    BEGIN
      INSERT INTO wallet_credit_keys (p_user_id, p_key) VALUES (p_user_id, p_idempotency_key);
    EXCEPTION WHEN unique_violation THEN
      SELECT wallet_balance INTO new_balance FROM profiles WHERE id = p_user_id;
      RETURN new_balance;
    END;
  END IF;

  UPDATE profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount,
        total_deposited = COALESCE(total_deposited, 0) + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;
  RETURN new_balance;
END $$;
