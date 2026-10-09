import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyTelnyxSignature, allowUnverifiedInDev } from "@/lib/telnyx-verify";
import { CALL_RATE_INBOUND_PER_MIN, CALL_RATE_OUTBOUND_PER_MIN, minutesBilled } from "@/lib/call-pricing";
import { bindBrowserCall } from "@/lib/browser-calls";
import { chargeStartedMinutes, settleCallCharge } from "@/lib/call-metering";
import { hangupLeg, routeInboundCall } from "@/lib/call-routing";
import {
  type AvailableHours,
  DEFAULT_AVAILABLE_HOURS,
} from "@/lib/availability";
import { isWithinBusinessHours, settingsFromProfile } from "@/lib/ai-call";
import {
  ensureSession,
  finalizeAiSession,
  onSpeakEnded,
  onTranscript,
  openConversation,
  reserveForAiCall,
} from "@/lib/ai-call-turn";

// A model turn plus the transcript debounce plus the Telnyx round trip
// fits comfortably in 30s. Without this the platform can cut a turn off
// mid-thought and the caller hears silence.
export const maxDuration = 30;

// Everything the assistant needs off the profile row. Kept as one literal
// (not a concatenation) so supabase-js can still infer the row type.
const AI_PROFILE_COLUMNS =
  "first_name, last_name, industry, a2p_registration, available_hours, ai_plan, free_ai_plan, ai_call_enabled, ai_call_greeting, ai_call_instructions, ai_call_voice, ai_call_transfer_number, ai_call_after_hours_only, ai_call_max_minutes";

const apiKey = process.env.TELNYX_API_KEY!;
// The old B-leg dial path used TELNYX_VOICE_APP_ID to stamp newly-created
// legs with a Call Control app. That whole bridged-outbound path is dead
// (see /api/initiate-call) and phone numbers now live on our credential
// connection (see /api/buy-number), so we no longer have a Voice API app
// to reference here. If a future feature needs to originate Call Control
// legs, read TELNYX_CREDENTIAL_CONNECTION_ID instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  // Present when the AI assistant is handling this leg. See lib/ai-call.ts.
  aiSessionId?: string;
  // Set on forwarded / browser-routed inbound calls (lib/call-routing.ts);
  // leg:"target" marks the leg ringing the owner's cell or browser.
  route?: string;
  leg?: string;
};

const FINAL_STATUSES = ["completed", "failed", "no-answer", "busy", "canceled"];

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
  const supabase = createClient(supabaseUrl, supabaseKey);
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

      // ── Should the AI assistant take this call? ──
      // The assistant is opt-in per user, can be limited to after hours,
      // and — per the operator's standing rule that nothing is bought
      // before it's paid for — only runs once the wallet has actually
      // covered the reserve. Any "no" here falls through to the normal
      // ring path, so a billing problem never drops a customer's call.
      let aiSessionId: string | undefined;
      if (ccid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select(AI_PROFILE_COLUMNS)
          .eq("id", ownership.user_id)
          .maybeSingle();

        const settings = settingsFromProfile(profile);
        const hours = (profile?.available_hours as AvailableHours) || DEFAULT_AVAILABLE_HOURS;
        const inHours = isWithinBusinessHours(hours);
        const shouldAnswer =
          !!(profile?.ai_plan || profile?.free_ai_plan) &&
          settings.enabled &&
          !(settings.afterHoursOnly && inHours);

        if (shouldAnswer) {
          // Session first, reserve second. The session row is unique per
          // call_control_id, so a retried call.initiated finds the existing
          // one and takes no second reserve off the caller's wallet.
          const opened = await ensureSession({
            db: supabase,
            userId: ownership.user_id,
            callRowId: row?.id || null,
            contactId: contactMatch?.id || null,
            callControlId: ccid,
            fromNumber: fromE164,
            toNumber: toE164,
            profile,
          });

          if (opened?.created) {
            const reserved = await reserveForAiCall(
              supabase,
              ownership.user_id,
              opened.session.id
            );
            if (reserved > 0) {
              aiSessionId = opened.session.id;
              if (row?.id) {
                await supabase
                  .from("calls")
                  .update({ handled_by_ai: true })
                  .eq("id", row.id);
              }
            } else {
              // Wallet can't cover it. Mark the session settled so nothing
              // later mistakes it for a live call, and ring through instead.
              console.warn(
                `[call-webhook] AI assistant skipped for ${ownership.user_id}: wallet cannot cover the reserve`
              );
              await supabase
                .from("ai_call_sessions")
                .update({
                  state: "done",
                  outcome: "declined",
                  ended_at: new Date().toISOString(),
                })
                .eq("id", opened.session.id);
            }
          } else if (opened) {
            // A retry of an event we already handled — resume, don't re-charge.
            aiSessionId = opened.session.id;
          }
        }
      }

      // Answer only when the assistant has the leg; call.answered then starts
      // transcription and speaks the greeting (see openConversation).
      // Answering any other call connected the caller to dead air (and billed
      // the minutes) because nothing picks inbound calls up in the browser.
      // Leaving it unanswered lets it ring out as a normal missed call; the
      // hangup is matched back to this row by call_control_id.
      if (ccid && aiSessionId) {
        const newState = encodeClientState({
          v: 1,
          inboundUserId: ownership.user_id,
          inboundContactId: contactMatch?.id || null,
          callRowId: row?.id,
          aiSessionId,
        });
        await telnyx(`/calls/${ccid}/actions/answer`, { client_state: newState });
      } else if (ccid && row?.id) {
        await routeInboundCall(supabase, {
          ccid,
          rowId: row.id,
          userId: ownership.user_id,
          callerNumber: fromE164,
          businessNumber: toE164,
        });
      }

      return NextResponse.json({ status: "ok" });
    }

    // ───────── BROWSER OUTBOUND: bind the leg to the logged call ─────────
    if (type === "call.initiated" && p.direction === "outgoing" && !state?.callRowId && !state?.aiSessionId && ccid) {
      await bindBrowserCall(supabase, {
        ccid,
        from: p.from,
        to: p.to,
        sessionId: p.call_session_id,
        legId: p.call_leg_id,
      });
      return NextResponse.json({ status: "ok" });
    }

    if (type === "call.answered" && !state?.callRowId && !state?.aiSessionId && ccid) {
      const { data: answered } = await supabase
        .from("calls")
        .update({ status: "answered", answered_at: new Date().toISOString() })
        .eq("call_control_id", ccid)
        .eq("direction", "outbound")
        .in("status", ["initiating", "ringing"])
        .select("id, user_id, answered_at, cost_per_min, cost_charged")
        .maybeSingle();
      // Pay for the first minute as it starts; no funds, no call.
      if (answered && (await chargeStartedMinutes(supabase, answered)) === "insufficient") {
        await hangupLeg(ccid);
      }
      return NextResponse.json({ status: "ok" });
    }

    // ───────── FORWARDED / BROWSER INBOUND: connected ─────────
    // The cell or browser picked up. Start the clock and pay the first
    // minute. (An AI leg transferring to a human keeps its own billing.)
    if (type === "call.bridged" && state?.callRowId && !state.aiSessionId) {
      const { data: connected } = await supabase
        .from("calls")
        .update({ status: "answered", answered_at: new Date().toISOString() })
        .eq("id", state.callRowId)
        .is("answered_at", null)
        .not("status", "in", `(${FINAL_STATUSES.map((v) => `"${v}"`).join(",")})`)
        .select("id, user_id, answered_at, cost_per_min, cost_charged, call_control_id")
        .maybeSingle();
      if (connected && (await chargeStartedMinutes(supabase, connected)) === "insufficient" && connected.call_control_id) {
        await hangupLeg(connected.call_control_id);
      }
      return NextResponse.json({ status: "ok" });
    }

    // The leg ringing the owner's cell or browser ended. Whether it never
    // connected (no answer, browser closed) or the conversation is over,
    // end the caller's leg too so they aren't left in silence; that leg's
    // own hangup closes and bills the row.
    if (type === "call.hangup" && state?.leg === "target") {
      if (state.callRowId) {
        const { data: callRow } = await supabase
          .from("calls")
          .select("call_control_id, status")
          .eq("id", state.callRowId)
          .maybeSingle();
        if (callRow?.call_control_id && !FINAL_STATUSES.includes(callRow.status)) {
          await hangupLeg(callRow.call_control_id);
        }
      }
      return NextResponse.json({ status: "ok" });
    }

    // ───────── AI ASSISTANT: greet, listen, answer, repeat ─────────
    // Ordered before the outbound bridge branch because an AI leg has no
    // contactE164 and must never fall into the dial-the-B-leg path.
    if (type === "call.answered" && state?.aiSessionId && ccid) {
      if (state.callRowId) {
        await supabase
          .from("calls")
          .update({ status: "answered", answered_at: new Date().toISOString() })
          .eq("id", state.callRowId);
      }

      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("*")
        .eq("id", state.aiSessionId)
        .maybeSingle();

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select(AI_PROFILE_COLUMNS)
          .eq("id", session.user_id)
          .maybeSingle();
        await openConversation(supabase, session, settingsFromProfile(profile), profile);
      }
      return NextResponse.json({ status: "ok" });
    }

    // Caller finished saying something.
    if (type === "call.transcription" && state?.aiSessionId && ccid) {
      const td = p.transcription_data || {};
      // Interim results are off, but Telnyx will still send partials on
      // some engines. Acting on a partial means answering half a sentence.
      if (td.is_final === false) return NextResponse.json({ status: "ok" });
      await onTranscript(supabase, ccid, String(td.transcript || ""));
      return NextResponse.json({ status: "ok" });
    }

    // The assistant finished a sentence — hand the line back to the caller
    // (or carry out the hangup/transfer it queued).
    if (type === "call.speak.ended" && state?.aiSessionId && ccid) {
      // p.status is "completed", or "call_hangup" / "cancelled_amd" when
      // the line dropped mid-sentence.
      await onSpeakEnded(supabase, ccid, p.status as string | undefined);
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
      // NB: no connection_id — this branch is dead (see /api/initiate-call).
      // Leaving the POST in place only so any in-flight events from legacy
      // deploys still resolve.

      await telnyx(`/calls`, bLegPayload);
      return NextResponse.json({ status: "ok" });
    }

    // ───────── HANGUP — finalize row, compute duration, charge wallet ─────────
    if (type === "call.hangup") {
      // Browser calls and unanswered inbound calls carry no client_state, so
      // find their row by the call_control_id recorded for the leg.
      let rowId = state?.callRowId;
      if (!rowId && ccid) {
        const { data: byLeg } = await supabase
          .from("calls")
          .select("id")
          .eq("call_control_id", ccid)
          .maybeSingle();
        rowId = byLeg?.id;
      }
      if (!rowId) return NextResponse.json({ status: "ok" });

      // Avoid double-charging: only the FIRST hangup event closes the row.
      const { data: existing } = await supabase
        .from("calls")
        .select("id, status, started_at, answered_at, direction, user_id, cost_per_min, outcome, call_control_id")
        .eq("id", rowId)
        .maybeSingle();

      if (!existing || FINAL_STATUSES.includes(existing.status)) {
        return NextResponse.json({ status: "ok" });
      }
      // Only the leg recorded on the row may close (and bill) it.
      if (existing.call_control_id && ccid && existing.call_control_id !== ccid) {
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

      // Close the row first, conditional on it still being open: a duplicate
      // hangup event finds nothing to close, and the minute meter (which
      // only charges live "answered" rows) stops touching it.
      const { data: closed } = await supabase
        .from("calls")
        .update({
          status: finalStatus,
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSec,
          hangup_cause: hangupCause,
        })
        .eq("id", rowId)
        .not("status", "in", `(${FINAL_STATUSES.map((v) => `"${v}"`).join(",")})`)
        .select("cost_charged, cost_per_min, outcome")
        .maybeSingle();
      if (!closed) return NextResponse.json({ status: "ok" });

      // An AI-handled leg bills at the AI rate instead of the plain
      // inbound rate, and settles against the reserve that was taken up
      // front. finalizeAiSession is idempotent and returns null if another
      // hangup event already settled this leg.
      // finalizeAiSession also runs when the hangup arrived without
      // client_state, so a reserve taken for a caller who hung up before the
      // answer landed is still credited back.
      const settled = ccid ? await finalizeAiSession(supabase, ccid, durationSec) : null;
      if (settled) {
        // Settled against the AI reserve inside finalizeAiSession.
        await supabase.from("calls").update({ cost_charged: settled.charged }).eq("id", rowId);
      } else if (!state?.aiSessionId) {
        // Per started minute at the row's rate (outbound, inbound, or
        // forwarded), reconciled against what the meter already took.
        // Calls answered by voicemail aren't billed.
        const rate = Number(closed.cost_per_min) || (direction === "outbound" ? CALL_RATE_OUTBOUND_PER_MIN : CALL_RATE_INBOUND_PER_MIN);
        const finalCharge = closed.outcome === "voicemail" ? 0 : +(minutesBilled(durationSec) * rate).toFixed(4);
        await settleCallCharge(supabase, { id: rowId, user_id: existing.user_id }, finalCharge, Number(closed.cost_charged) || 0);
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
