import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CALL_RATE_OUTBOUND_PER_MIN } from "@/lib/call-pricing";

// TEMP DISABLED
export async function POST() {
  return NextResponse.json({ error: "Calling temporarily disabled" }, { status: 503 });
}

const apiKey = process.env.TELNYX_API_KEY!;
const voiceAppId =
  process.env.TELNYX_VOICE_APP_ID ||
  process.env.TELNYX_CALL_CONTROL_APP_ID ||
  "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Auth ────────────────────────────────────────────────────────────────
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

// ─── POST /api/initiate-call ─────────────────────────────────────────────
// Two-leg bridged outbound call. The user picks a contact to dial and a
// from-number they own. We:
//   1. Insert a `calls` row in 'initiating' state
//   2. Call Telnyx Call Control `POST /v2/calls` with the user's cell as
//      the A leg (client_state carries the call row id), and a webhook
//      pointed at /api/call-webhook
//   3. When the A leg answers, the webhook bridges in the contact as B
// The browser polls/realtime-subscribes to the `calls` row so the UI
// reflects status without the browser needing to stream audio.
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const { to, from, contactId } = await req.json();
    if (!to || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, from" },
        { status: 400 }
      );
    }

    // Normalize numbers to E.164
    const toDigits = String(to).replace(/\D/g, "");
    const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;
    const fromDigits = String(from).replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1")
      ? fromDigits.slice(1)
      : fromDigits;
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Verify the caller owns the from-number — same defense as send-sms.
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

    // Pull the user's cell (the A-leg destination) + wallet balance.
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("phone, wallet_balance, role")
      .eq("id", userId)
      .single();

    if (!profile?.phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your cell phone isn't on file. Add it in Settings → Profile so we know what to ring for outbound calls.",
        },
        { status: 400 }
      );
    }

    // Low-balance guard — need at least one minute of call time on deposit.
    // Admins get a free pass.
    if (
      profile.role !== "admin" &&
      Number(profile.wallet_balance || 0) < CALL_RATE_OUTBOUND_PER_MIN
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Low balance — add funds in Settings → Billing before placing calls.",
        },
        { status: 402 }
      );
    }

    const agentDigits = String(profile.phone).replace(/\D/g, "");
    const agentE164 = `+${
      agentDigits.startsWith("1") ? agentDigits : `1${agentDigits}`
    }`;

    // Insert call row FIRST so we have an id to thread through Telnyx client_state.
    const { data: callRow, error: insertError } = await adminSupabase
      .from("calls")
      .insert({
        user_id: userId,
        contact_id: contactId || null,
        direction: "outbound",
        from_number: fromE164,
        to_number: toE164,
        status: "initiating",
        cost_per_min: CALL_RATE_OUTBOUND_PER_MIN,
      })
      .select("id")
      .single();

    if (insertError || !callRow) {
      return NextResponse.json(
        { success: false, error: "Could not create call record." },
        { status: 500 }
      );
    }

    const callRowId = callRow.id as string;

    // client_state is base64-encoded JSON Telnyx round-trips on every event.
    // We stuff our own call-row id + the destination (B leg) so the webhook
    // knows where to bridge when the A leg answers.
    const clientState = Buffer.from(
      JSON.stringify({
        v: 1,
        callRowId,
        userId,
        contactE164: toE164,
        agentE164,
        fromE164,
      })
    ).toString("base64");

    // Call Control API — we dial the agent (rep) first. Their answer
    // triggers the webhook, which then dials the contact and bridges.
    const origin = req.nextUrl.origin;
    const webhookUrl = `${origin}/api/call-webhook`;

    const telnyxPayload: Record<string, unknown> = {
      to: agentE164,
      from: fromE164,
      // Caller-ID name so the rep sees the contact's # on their screen.
      from_display_name: "Text2Sale",
      webhook_url: webhookUrl,
      webhook_url_method: "POST",
      timeout_secs: 30,
      answering_machine_detection: "disabled",
      client_state: clientState,
      record: "record-from-answer",
      record_channels: "dual",
      record_format: "mp3",
    };
    if (voiceAppId) telnyxPayload.connection_id = voiceAppId;

    const res = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(telnyxPayload),
    });

    const data = await res.json();

    if (!res.ok || data.errors) {
      const errMsg =
        data.errors?.[0]?.detail || data.errors?.[0]?.title || "Failed to start call";
      console.error("[initiate-call] Telnyx error:", JSON.stringify(data.errors));

      // Mark the row failed so the UI reflects reality.
      await adminSupabase
        .from("calls")
        .update({
          status: "failed",
          hangup_cause: errMsg,
          ended_at: new Date().toISOString(),
        })
        .eq("id", callRowId);

      // Helpful guidance if Voice API isn't configured yet.
      let hint = "";
      if (/voice api|connection|application|call control|not enabled/i.test(errMsg)) {
        hint =
          " — make sure Voice is enabled on your Telnyx number and TELNYX_VOICE_APP_ID is set in env.";
      }

      return NextResponse.json(
        { success: false, error: errMsg + hint },
        { status: 500 }
      );
    }

    // Save the call_control_id now so webhook matches work even before the
    // first call-initiated event lands.
    const callControlId = data.data?.call_control_id || null;
    if (callControlId) {
      await adminSupabase
        .from("calls")
        .update({
          call_control_id: callControlId,
          call_session_id: data.data?.call_session_id || null,
          call_leg_id: data.data?.call_leg_id || null,
          status: "ringing",
        })
        .eq("id", callRowId);
    }

    return NextResponse.json({
      success: true,
      callId: callRowId,
      callControlId,
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error starting call";
    console.error("[initiate-call] error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
