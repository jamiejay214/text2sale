-- Run this in the Supabase SQL editor before deploying.
--
-- Stripe webhook idempotency table. Every webhook invocation inserts a row
-- keyed on the Stripe event.id. A unique-violation on retry short-circuits
-- the handler so retries never double-credit wallets or re-award referral
-- bonuses. Stripe retries for up to 3 days on non-2xx responses, so this is
-- load-bearing.

CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,
  event_type text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- credit_wallet RPC already exists in production (used by
-- app/api/auto-recharge/route.ts). Definition below is a safe
-- CREATE OR REPLACE in case the function is missing in a given environment.
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_balance numeric;
BEGIN
  UPDATE profiles SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO new_balance;
  RETURN new_balance;
END $$;
