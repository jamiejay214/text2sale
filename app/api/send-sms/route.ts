import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferTimezone, isQuietHours } from "@/lib/quiet-hours";
import { sanitizeForSms, hasNonGsmChars } from "@/lib/sms-text";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client (service role) for ownership lookups + quiet-hours config.
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

// Validate the caller's Supabase session. Previously this endpoint was
// unauthenticated — anyone who guessed a user's 10DLC number could send
// SMS on their behalf (and drain the wallet). We now require a Bearer
// token and verify the caller actually owns the `from` number before
// forwarding to Telnyx.
async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const { to, body, from } = await req.json();

    if (!to || !body || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, from" },
        { status: 400 }
      );
    }

    // Normalize to E.164 format (+1XXXXXXXXXX)
    const toDigits = to.replace(/\D/g, "");
    const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

    const fromDigits = from.replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1") ? fromDigits.slice(1) : fromDigits;
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Verify the caller actually owns this from-number. Anyone can spoof
    // `from` over HTTP, but they can't fake the ownership row in the DB.
    const { data: ownership } = await adminSupabase
      .from("owned_phone_numbers")
      .select("user_id")
      .eq("digits", fromNormalized)
      .maybeSingle();

    if (!ownership?.user_id || ownership.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not own this number." },
        { status: 403 }
      );
    }

    // Look up the contact we're texting (for state → timezone → quiet hours).
    // If we can't find a matching contact, we still allow the send — a user
    // manually texting a brand-new number that isn't in contacts yet is valid.
    const { data: contactRow } = await adminSupabase
      .from("contacts")
      .select("state, dnc")
      .eq("user_id", userId)
      .eq("phone", to)
      .maybeSingle();

    if (contactRow?.dnc) {
      return NextResponse.json(
        { success: false, error: "This contact has opted out (DNC). Message not sent." },
        { status: 400 }
      );
    }

    // Quiet hours check for single sends. Respects profile toggle; no
    // per-campaign override here because this is an ad-hoc reply/send.
    const { data: profileCfg } = await adminSupabase
      .from("profiles")
      .select("quiet_hours_enabled, quiet_hours_start_hour, quiet_hours_end_hour")
      .eq("id", userId)
      .single();

    const qhEnabled = profileCfg?.quiet_hours_enabled ?? true;
    const qhStart = profileCfg?.quiet_hours_start_hour ?? 21;
    const qhEnd = profileCfg?.quiet_hours_end_hour ?? 8;

    if (qhEnabled) {
      const tz = inferTimezone(contactRow?.state || undefined);
      if (isQuietHours(tz, qhStart, qhEnd)) {
        return NextResponse.json(
          {
            success: false,
            quietHours: true,
            error: `It's quiet hours in the recipient's timezone (${tz}). To stay TCPA-compliant, messages can only be sent between ${qhEnd}:00 and ${qhStart}:00 local time. You can disable quiet hours in Settings.`,
          },
          { status: 400 }
        );
      }
    }

    // Sanitize smart quotes / em-dashes / ellipsis back to ASCII equivalents
    // BEFORE Telnyx sees the text. A single curly apostrophe forces the
    // whole SMS into UCS-2 (70 chars/segment instead of 160) and silently
    // 2-3× the bill. macOS, iOS keyboards, and LLM-generated replies all
    // introduce these substitutions by default — this normalizes them.
    const sanitizedBody = sanitizeForSms(body);

    // Hard block UCS-2: after sanitization, if any non-GSM-7 character
    // remains (emoji, accented letters, exotic punctuation), refuse the
    // send. UCS-2 cuts segment size from 160 → 70 chars, so a single
    // emoji can 2-3× the Telnyx + carrier-fee cost of a campaign. The
    // dashboard composer warns users beforehand; this is the backstop.
    if (hasNonGsmChars(sanitizedBody)) {
      return NextResponse.json(
        {
          error:
            "Message contains characters (emoji or special symbols) that would more than double the per-message cost. Please remove emojis and accented characters and try again.",
        },
        { status: 400 }
      );
    }

    // Build Telnyx payload — include messaging_profile_id when available
    // so messages route through the correct 10DLC campaign.
    const telnyxPayload: Record<string, string> = {
      from: fromE164,
      to: toE164,
      text: sanitizedBody,
      type: "SMS",
    };
    if (messagingProfileId) {
      telnyxPayload.messaging_profile_id = messagingProfileId;
    }

    // Send via Telnyx Messaging API
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(telnyxPayload),
    });

    const data = await res.json();

    if (data.errors) {
      const errMsg = data.errors[0]?.detail || "Failed to send";
      console.error("Telnyx send error:", JSON.stringify(data.errors));
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    console.log("Telnyx send OK:", data.data?.id, "from:", fromE164, "to:", toE164);

    // ── Charge the wallet for this 1:1 message ────────────────────────────
    // Campaigns already decrement via send-campaign; this is the matching
    // path for ad-hoc replies/DMs from the conversation view. We charge
    // AFTER a successful Telnyx accept so a rejected send doesn't bill the
    // user. messageCost comes from the profile's plan shape (default
    // $0.012 — matches the Standard/AI plan rate). Decrement is
    // best-effort: a failed RPC (e.g. zero balance) is logged but doesn't
    // fail the send since Telnyx has already queued it. The real hard gate
    // on zero-balance senders is the campaign loop + auto-recharge cron.
    try {
      const { data: planRow } = await adminSupabase
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single();
      const planObj = (planRow?.plan as Record<string, unknown> | null) || null;
      const messageCost = Number((planObj?.messageCost as number) ?? 0.012);
      await adminSupabase.rpc("decrement_wallet", {
        p_user_id: userId,
        p_amount: messageCost,
      });
    } catch (e) {
      console.error("[send-sms] wallet decrement failed:", e);
    }

    return NextResponse.json({
      success: true,
      sid: data.data?.id || "",
      status: "sent",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx send error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
