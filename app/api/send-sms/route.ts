import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferTimezone, isQuietHours } from "@/lib/quiet-hours";
import { sanitizeForSms, hasNonGsmChars, countSegments } from "@/lib/sms-text";
import { withFirstMessageOptOut } from "@/lib/opt-out";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Admin client is created inside the handler to avoid build-time evaluation
// of env vars (NEXT_PUBLIC_SUPABASE_URL is not available during next build).

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
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  let chargedAmount = 0;
  let chargedUserId: string | null = null;
  let providerMayHaveAccepted = false;
  const attemptId = crypto.randomUUID();
  const refund = async () => {
    if (!chargedUserId || !chargedAmount || providerMayHaveAccepted) return;
    await adminSupabase.rpc("credit_wallet",{p_user_id:chargedUserId,p_amount:chargedAmount,p_idempotency_key:`refund_sms_${attemptId}`,p_description:"Refund — message rejected before delivery"});
  };
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const { to, body, from, conversationId } = await req.json();

    if (typeof to !== "string" || typeof body !== "string" || !body.trim() || body.length > 5000 || typeof from !== "string") {
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
    if (!/^1?\d{10}$/.test(toDigits) || !/^1?\d{10}$/.test(fromDigits)) {
      return NextResponse.json({success:false,error:"Enter a valid 10-digit US phone number."},{status:400});
    }
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Verify the caller actually owns this from-number. Anyone can spoof
    // `from` over HTTP, but they can't fake the ownership row in the DB.
    // We filter by both user_id AND digits so shared numbers (multiple users
    // on the same Telnyx number) don't cause maybeSingle() to throw.
    const { data: ownershipRows } = await adminSupabase
      .from("owned_phone_numbers")
      .select("user_id")
      .eq("digits", fromNormalized)
      .eq("user_id", userId);

    if (!ownershipRows || ownershipRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "You do not own this number." },
        { status: 403 }
      );
    }

    // Look up the contact we're texting (for state → timezone → quiet hours).
    // If we can't find a matching contact, we still allow the send — a user
    // manually texting a brand-new number that isn't in contacts yet is valid.
    const {data:contactRows,error:contactError}=await adminSupabase.rpc("find_sms_contacts",{p_user_id:userId,p_digits:toDigits.slice(-10)});
    if (contactError) return NextResponse.json({success:false,error:"Could not verify opt-out status. Message not sent."},{status:503});
    const contactRow=contactRows?.[0];

    if (contactRows?.some((contact: {dnc:boolean})=>contact.dnc)) {
      return NextResponse.json(
        { success: false, error: "This contact has opted out (DNC). Message not sent." },
        { status: 400 }
      );
    }

    // Quiet hours check for single sends. Respects profile toggle; no
    // per-campaign override here because this is an ad-hoc reply/send.
    const { data: profileCfg } = await adminSupabase
      .from("profiles")
      .select("quiet_hours_enabled, quiet_hours_start_hour, quiet_hours_end_hour, plan, paused, subscription_status, free_subscription, opt_out_settings")
      .eq("id", userId)
      .single();

    if (!profileCfg || profileCfg.paused || (!profileCfg.free_subscription && !["active","canceling"].includes(profileCfg.subscription_status))) {
      return NextResponse.json({success:false,error:"An active account and subscription are required."},{status:403});
    }
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

    let outboundBody = body;
    if (typeof conversationId === "string" && conversationId) {
      const { data: conversation, error: conversationError } = await adminSupabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (conversationError || !conversation) {
        return NextResponse.json(
          { success: false, error: "Could not verify this conversation. Message not sent." },
          { status: 403 },
        );
      }
      const { count: outboundCount, error: outboundCountError } = await adminSupabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("direction", "outbound");
      if (outboundCountError) {
        return NextResponse.json(
          { success: false, error: "Could not verify the first-message opt-out. Message not sent." },
          { status: 503 },
        );
      }
      if ((outboundCount || 0) === 0) {
        try {
          outboundBody = withFirstMessageOptOut(body, profileCfg.opt_out_settings);
        } catch (error) {
          return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Add opt-out instructions before sending." },
            { status: 400 },
          );
        }
      }
    }

    // Sanitize smart quotes / em-dashes / ellipsis back to ASCII equivalents
    // BEFORE Telnyx sees the text. A single curly apostrophe forces the
    // whole SMS into UCS-2 (70 chars/segment instead of 160) and silently
    // 2-3× the bill. macOS, iOS keyboards, and LLM-generated replies all
    // introduce these substitutions by default — this normalizes them.
    const sanitizedBody = sanitizeForSms(outboundBody);

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

    // Reserve funds before contacting the provider. A zero balance never sends.
    const messageCost=Number(profileCfg.plan?.messageCost ?? 0.012);
    if (!Number.isFinite(messageCost) || messageCost<0) throw new Error("Invalid messaging price");
    const totalCost=Number((messageCost*Math.max(1,countSegments(sanitizedBody))).toFixed(4));
    const {data:newBalance,error:debitError}=await adminSupabase.rpc("decrement_wallet",{p_user_id:userId,p_amount:totalCost});
    if (debitError) return NextResponse.json({success:false,error:"Could not reserve funds. Message not sent."},{status:503});
    if (newBalance === null) return NextResponse.json({success:false,error:"Insufficient funds. Add funds before sending."},{status:402});
    chargedAmount=totalCost; chargedUserId=userId;

    // Send via Telnyx Messaging API
    providerMayHaveAccepted = true;
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(telnyxPayload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();

    if (data.errors || !res.ok) {
      providerMayHaveAccepted = res.status >= 500;
      await refund();
      const errMsg = data.errors?.[0]?.detail || "Failed to send";
      console.error("Telnyx send error:", JSON.stringify(data.errors));
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    console.log("Telnyx send OK:", data.data?.id, "from:", fromE164, "to:", toE164);

    return NextResponse.json({
      success: true,
      sid: data.data?.id || "",
      status: "sent",
      body: sanitizedBody,
    });
  } catch (error: unknown) {
    await refund();
    const errMsg = providerMayHaveAccepted ? "Delivery could not be confirmed. Avoid retrying until support checks this message." : (error instanceof Error ? error.message : "Unknown error");
    console.error("Telnyx send error:", attemptId, errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
