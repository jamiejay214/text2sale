/**
 * Admin SMS alerts — pings the owner's cell whenever something noteworthy
 * happens on the public site (new signup, new visitor). Uses the admin's
 * own Telnyx-owned number as the "from" so the message routes through the
 * approved 10DLC profile without extra config.
 *
 * Shared by: app/api/track-view (visitor alerts, rate-limited),
 *            app/api/welcome-email (signup alerts, never rate-limited).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const telnyxApiKey = process.env.TELNYX_API_KEY || "";
const telnyxMessagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

// Owner's cell — keep in sync with ALERT_EMAIL in track-view. Hardcoded
// because this is a single-tenant admin address, not something a user
// toggles from the dashboard.
const ADMIN_ALERT_PHONE_E164 = "+19548057882";

// Cache the from-number per cold start so we don't hit Supabase on every
// alert. Admin buys phone numbers rarely; 10 min TTL is plenty.
let cachedFromDigits: string | null = null;
let cachedFromExpiresAt = 0;
const FROM_NUMBER_TTL_MS = 10 * 60 * 1000;

async function getAdminFromNumber(): Promise<string | null> {
  const now = Date.now();
  if (cachedFromDigits && now < cachedFromExpiresAt) return cachedFromDigits;

  // Allow an env-var override for setups where the admin hasn't been
  // resolved yet (early deploy, test env, etc.).
  const envOverride = process.env.ADMIN_ALERT_FROM_NUMBER || "";
  if (envOverride) {
    const digits = envOverride.replace(/\D/g, "");
    if (digits) {
      cachedFromDigits = digits;
      cachedFromExpiresAt = now + FROM_NUMBER_TTL_MS;
      return digits;
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the admin's user id, then their first owned number.
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminProfile?.id) return null;

    const { data: owned } = await supabase
      .from("owned_phone_numbers")
      .select("digits")
      .eq("user_id", adminProfile.id)
      .limit(1)
      .single();

    const digits = (owned?.digits as string | undefined) || null;
    if (digits) {
      cachedFromDigits = digits;
      cachedFromExpiresAt = now + FROM_NUMBER_TTL_MS;
    }
    return digits;
  } catch {
    return null;
  }
}

export async function sendAdminAlertSMS(body: string): Promise<void> {
  if (!telnyxApiKey) {
    console.warn("[admin-alert] TELNYX_API_KEY not set — skipping SMS");
    return;
  }

  const fromDigits = await getAdminFromNumber();
  if (!fromDigits) {
    console.warn("[admin-alert] No owned from-number resolved — skipping SMS");
    return;
  }

  const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

  const payload: Record<string, string> = {
    from: fromE164,
    to: ADMIN_ALERT_PHONE_E164,
    text: body.slice(0, 1500), // stay well under MMS/long-SMS limits
    type: "SMS",
  };
  if (telnyxMessagingProfileId) {
    payload.messaging_profile_id = telnyxMessagingProfileId;
  }

  try {
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[admin-alert] Telnyx send failed:", res.status, text);
    }
  } catch (err) {
    console.error("[admin-alert] Telnyx send threw:", err);
  }
}
