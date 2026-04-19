import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTelnyxSignature, allowUnverifiedInDev } from "@/lib/telnyx-verify";
import { calcCallCharge, CALL_RATE_INBOUND_PER_MIN } from "@/lib/call-pricing";

const apiKey = process.env.TELNYX_API_KEY!;
const voiceAppId =
  process.env.TELNYX_VOICE_APP_ID ||
  process.env.TELNYX_CALL_CONTROL_APP_ID ||
  "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Telnyx Call Control webhook ─────────────────────────────────────────
// Every call event Telnyx emits (call.initiated / answered / hangup /
// bridged / machine.detected) hits this endpoint. For OUTBOUND calls we
// started via /api/initiate-call, the flow is:
//   call.initiated     → status=ringing   (no-op, already set by initiator)
//   call.answered (A)  → dial the B leg so the contact's phone rings
//   call.answered (B)  → bridge A + B together
//   call.hangup (any)  → compute duration, debit wallet, mark complete
//
// For INBOUND calls (contact rings a user's number):
//   call.initiated     → find owning user by `to`, insert calls row,
//                        answer + forward to that user's cell
//   call.hangup        → same accounting path as outbound

async function telnyx(path: string, body: Record<string, unknown>) {
  return fetch(`https://api.telnyx.com/v2${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

type ClientState = {
  v?: number;
  callRowId?: string;
  userId?: string;
  contactE164?: string;
  agentE164?: string;
  fromE164?: string;
  inboundUserId?: string;
  inboundContactId?: string | null;
};

function decodeClientState(raw?: string): ClientState | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function encodeClientState(state: ClientState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("telnyx-signature-ed25519") || "";
    const sigTs = req.headers.get("telnyx-timestamp") || "";
    const verified = await verifyTelnyxSignature(rawBody, sig, sigTs);
    if (!verified && !allowUnverifiedInDev("call-webhook")) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.data;
    if (!event) return NextResponse.json({ status: "ok" });

    const type: string = event.event_type || "";
    const p = event.payload || {};
    const ccid: string | undefined = p.call_control_id;
    const state = decodeClientState(p.client_state);

    // ───────── INBOUND: the very first event is call.initiated ─────────
    if (type === "call.initiated" && p.direction === "incoming" && !state?.callRowId) {
      const toE164 = p.to as string;
      const fromE164 = p.from as string;
      const toDigits = (toE164 || "").replace(/\D/g, "");
      const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;

      // Find the user who owns this number.
      const { data: ownership } = await supabase
        .from("owned_phone_numbers")
        .select("user_id")
        .eq("digits", toNormalized)
        .maybeSingle();

      if (!ownership?.user_id) {
        // Unknown destination — reject.
        if (ccid) await telnyx(`/calls/${ccid}/actions/reject`, { cause: "REJECTED" });
        return NextResponse.json({ status: "ignored" });
      }

      // Match inbound to a contact by phone if possible.
      const { data: contactMatch } = await supabase
        .from("contacts")
        .select("id")
        .eq("user_id", ownership.user_id)
        .eq("phone", fromE164)
        .maybeSingle();

      const { data: row } = await supabase
        .from("calls")
        .insert({
          user_id: ownership.user_id,
          contact_id: contactMatch?.id || null,
          direction: "inbound",
          from_number: fromE164,
          to_number: toE164,
          call_control_id: ccid || null,
          call_session_id: p.call_session_id || null,
          call_leg_id: p.call_leg_id || null,
          status: "ringing",
          cost_per_min: CALL_RATE_INBOUND_PER_MIN,
        })
        .select("id")
        .single();

      // Answer the call and play a brief ringing tone. The dashboard's
      // browser WebRTC session handles the actual audio — we no longer
      // forward inbound calls to the agent's cell phone. The calls row
      // with status="ringing" is enough to notify the UI via Supabase
      // realtime so the agent can pick up in the browser.
      if (ccid) {
        const newState = encodeClientState({
          v: 1,
          inboundUserId: ownership.user_id,
          inboundContactId: contactMatch?.id || null,
          callRowId: row?.id,
        });
        await telnyx(`/calls/${ccid}/actions/answer`, { client_state: newState });
      }

      return NextResponse.json({ status: "ok" });
    }

    // ───────── OUTBOUND: A leg answered, dial the B leg + bridge ─────────
    if (type === "call.answered" && state?.callRowId && state.contactE164 && ccid) {
      // Mark the call-row as answered on A-leg pickup.
      await supabase
        .from("calls")
        .update({
          status: "answered",
          answered_at: new Date().toISOString(),
        })
        .eq("id", state.callRowId);

      // If we don't yet have a B-leg, create one and bridge.
      // We encode a child state marking this as the B leg.
      const bLegState = encodeClientState({
        v: 1,
        callRowId: state.callRowId,
        userId: state.userId,
        agentE164: state.agentE164,
        fromE164: state.fromE164,
        contactE164: state.contactE164,
      });

      const origin = req.nextUrl.origin;
      const bLegPayload: Record<string, unknown> = {
        to: state.contactE164,
        from: state.fromE164,
        webhook_url: `${origin}/api/call-webhook`,
        webhook_url_method: "POST",
        client_state: bLegState,
        timeout_secs: 30,
        answering_machine_detection: "premium",
        // Bridge to the existing A-leg as soon as the B-leg answers.
        link_to: ccid,
      };
      if (voiceAppId) bLegPayload.connection_id = voiceAppId;

      await telnyx(`/calls`, bLegPayload);
      return NextResponse.json({ status: "ok" });
    }

    // ───────── HANGUP — finalize row, compute duration, charge wallet ─────────
    if (type === "call.hangup") {
      const rowId = state?.callRowId;
      if (!rowId) return NextResponse.json({ status: "ok" });

      // Avoid double-charging: only the FIRST hangup event closes the row.
      const { data: existing } = await supabase
        .from("calls")
        .select("id, status, started_at, answered_at, direction, user_id, cost_per_min")
        .eq("id", rowId)
        .maybeSingle();

      if (!existing || ["completed", "failed", "no-answer", "busy", "canceled"].includes(existing.status)) {
        return NextResponse.json({ status: "ok" });
      }

      const hangupCause: string = p.hangup_cause || p.hangup_source || "normal_clearing";
      const answeredAt = existing.answered_at ? new Date(existing.answered_at) : null;
      const endedAt = new Date();
      const durationSec = answeredAt
        ? Math.max(0, Math.round((endedAt.getTime() - answeredAt.getTime()) / 1000))
        : 0;

      let finalStatus: string = "completed";
      if (!answeredAt) {
        if (/no[_ -]?answer|timeout/i.test(hangupCause)) finalStatus = "no-answer";
        else if (/busy/i.test(hangupCause)) finalStatus = "busy";
        else if (/reject|cancel/i.test(hangupCause)) finalStatus = "canceled";
        else finalStatus = "failed";
      }

      const direction = (existing.direction as "inbound" | "outbound") || "outbound";
      const charge = calcCallCharge(direction, durationSec);

      await supabase
        .from("calls")
        .update({
          status: finalStatus,
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSec,
          hangup_cause: hangupCause,
          cost_charged: charge,
        })
        .eq("id", rowId);

      // Debit the wallet atomically. We do a single-field RPC-style update
      // by reading-then-writing; negative balances are allowed (admin will
      // see the card go red) rather than failing the accounting.
      if (charge > 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", existing.user_id)
          .single();
        const current = Number(prof?.wallet_balance || 0);
        await supabase
          .from("profiles")
          .update({ wallet_balance: +(current - charge).toFixed(4) })
          .eq("id", existing.user_id);
      }

      return NextResponse.json({ status: "ok" });
    }

    // ───────── Machine detection — mark voicemail when it lands ─────────
    if (type === "call.machine.detection.ended" && state?.callRowId) {
      const result = p.result as string | undefined;
      if (result && /machine|voicemail/i.test(result)) {
        await supabase
          .from("calls")
          .update({ outcome: "voicemail" })
          .eq("id", state.callRowId);
      }
      return NextResponse.json({ status: "ok" });
    }

    // ───────── Recording saved — link it for playback ─────────
    if (type === "call.recording.saved" && state?.callRowId) {
      const url =
        p?.recording_urls?.mp3 ||
        p?.recording_urls?.wav ||
        p?.public_recording_urls?.mp3 ||
        null;
      if (url) {
        await supabase
          .from("calls")
          .update({ recording_url: url })
          .eq("id", state.callRowId);
      }
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[call-webhook] error:", msg);
    return NextResponse.json({ status: "error" }, { status: 200 }); // swallow so Telnyx doesn't retry-storm
  }
}
