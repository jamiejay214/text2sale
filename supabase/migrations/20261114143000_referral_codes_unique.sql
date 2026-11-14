-- Referral program hardening:
--  1. Every account's referral code is unique (case-insensitive).
--  2. Signup matches a code case-insensitively and always generates a code
--     nobody else has.
--  3. Who referred an account is fixed at signup: users can't set or change
--     their own referred_by afterwards (a code is used once, at signup).

create unique index if not exists profiles_referral_code_unique
  on public.profiles (upper(referral_code))
  where referral_code is not null and referral_code <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  generated_code text;
  used_code text;
  referrer_id uuid;
  new_phone text;
  existing_phone_user uuid;
BEGIN
  -- Generate a referral code no other account has
  LOOP
    generated_code := 'T2S-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE upper(referral_code) = generated_code);
  END LOOP;

  -- Get the referral code used during signup (if any)
  used_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  -- Normalize the phone number (digits only)
  new_phone := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');

  -- Check for duplicate phone number
  IF new_phone <> '' THEN
    SELECT id INTO existing_phone_user
    FROM public.profiles
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') = new_phone
    LIMIT 1;

    IF existing_phone_user IS NOT NULL THEN
      RAISE EXCEPTION 'A user with this phone number already exists.'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Look up referrer
  IF used_code <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE upper(referral_code) = used_code
    LIMIT 1;
  END IF;

  -- Insert the new profile
  INSERT INTO public.profiles (id, email, first_name, last_name, phone, referral_code, referred_by, manager_id)
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    generated_code,
    referrer_id,
    -- Auto-join team if referrer is a manager/admin
    CASE WHEN referrer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = referrer_id AND role IN ('manager', 'admin')
    ) THEN referrer_id ELSE NULL END
  );

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_block_sensitive_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  IF NEW.wallet_balance         IS DISTINCT FROM OLD.wallet_balance         THEN RAISE EXCEPTION 'cannot self-modify wallet_balance'; END IF;
  IF NEW.credits                IS DISTINCT FROM OLD.credits                THEN RAISE EXCEPTION 'cannot self-modify credits'; END IF;
  IF NEW.plan                   IS DISTINCT FROM OLD.plan                   THEN RAISE EXCEPTION 'cannot self-modify plan'; END IF;
  IF NEW.role                   IS DISTINCT FROM OLD.role                   THEN RAISE EXCEPTION 'cannot self-modify role'; END IF;
  IF NEW.verified               IS DISTINCT FROM OLD.verified               THEN RAISE EXCEPTION 'cannot self-modify verified'; END IF;
  IF NEW.paused                 IS DISTINCT FROM OLD.paused                 THEN RAISE EXCEPTION 'cannot self-modify paused'; END IF;
  IF NEW.usage_history          IS DISTINCT FROM OLD.usage_history          THEN RAISE EXCEPTION 'cannot self-modify usage_history'; END IF;
  IF NEW.total_deposited        IS DISTINCT FROM OLD.total_deposited        THEN RAISE EXCEPTION 'cannot self-modify total_deposited'; END IF;
  IF NEW.owned_numbers          IS DISTINCT FROM OLD.owned_numbers          THEN RAISE EXCEPTION 'cannot self-modify owned_numbers'; END IF;
  IF NEW.a2p_registration       IS DISTINCT FROM OLD.a2p_registration       THEN RAISE EXCEPTION 'cannot self-modify a2p_registration'; END IF;
  IF NEW.subscription_status    IS DISTINCT FROM OLD.subscription_status    THEN RAISE EXCEPTION 'cannot self-modify subscription_status'; END IF;
  IF NEW.stripe_customer_id     IS DISTINCT FROM OLD.stripe_customer_id     THEN RAISE EXCEPTION 'cannot self-modify stripe_customer_id'; END IF;
  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN RAISE EXCEPTION 'cannot self-modify stripe_subscription_id'; END IF;
  IF NEW.free_subscription      IS DISTINCT FROM OLD.free_subscription      THEN RAISE EXCEPTION 'cannot self-modify free_subscription'; END IF;
  IF NEW.ai_plan                IS DISTINCT FROM OLD.ai_plan                THEN RAISE EXCEPTION 'cannot self-modify ai_plan'; END IF;
  IF NEW.agent_plan             IS DISTINCT FROM OLD.agent_plan             THEN RAISE EXCEPTION 'cannot self-modify agent_plan'; END IF;
  IF NEW.referral_code          IS DISTINCT FROM OLD.referral_code          THEN RAISE EXCEPTION 'cannot self-modify referral_code'; END IF;
  IF NEW.referral_rewarded      IS DISTINCT FROM OLD.referral_rewarded      THEN RAISE EXCEPTION 'cannot self-modify referral_rewarded'; END IF;
  IF NEW.referred_by            IS DISTINCT FROM OLD.referred_by            THEN RAISE EXCEPTION 'cannot self-modify referred_by'; END IF;
  IF NEW.manager_id             IS DISTINCT FROM OLD.manager_id             THEN RAISE EXCEPTION 'cannot self-modify manager_id'; END IF;

  RETURN NEW;
END $function$;
