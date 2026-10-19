// ── Predictive dialer ─────────────────────────────────────────────────────
// The agent keeps the Calling page open with the browser phone registered
// and clicks Ready. The server dials up to `lines` queued leads at once
// through the inbound-calls Voice API app, with answering machine detection:
//
//   lead answers, AMD says human → claim the agent (dialer_claim_agent) and
//     transfer the lead into the browser phone, which picks up on its own
//   ...but the agent is already taken → abandoned: the lead hears who called,
//     a callback number and "press 9" to opt out (FTC/FCC abandoned-call rules)
//   AMD says machine → hang up, no charge (outcome voicemail)
//   every lead leg that ends → dial the next lead if the agent is still ready
//
// Lines are paced from the live-answer rate (lib/dialer-pacing.ts) so the
// 30-day abandon rate stays under the 3% cap. Calls bill like browser
// calls: first minute at answer, later minutes by /api/calls/meter, settled
// at hangup by the call webhook.

import { abandonMessage, chooseLines, withinCallingHours } from "./dialer-pacing";
import { toE164 } from "./browser-calls";
import { CALL_RATE_OUTBOUND_PER_MIN } from "./call-pricing";
import { chargeStartedMinutes } from "./call-metering";
import { isEntitled } from "./messaging-status";
import { callingAccess } from "./calling-access";
import { ensureCallControlApp } from "./telnyx-voice";
import { summarizeCallQuality } from "./call-quality";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type DialerLegState = {
  v: 1;
  dialer: string;
  item: string;
  callRowId: string;
  leg: "lead" | "agent";
  stage?: "abandon" | "bye";
};

export type DialerStats = {
  queued: number;
  in_flight: number;
  dials: number;
  connected: number;
  abandoned: number;
  voicemail: number;
  no_answer: number;
  failed: number;
  skipped: number;
  opted_out: number;
  abandoned_30d: number;
  connected_30d: number;
};

const ABANDON_VOICE = "AWS.Polly.Joanna-Neural";
/** Seconds a lead's phone rings before giving up (the rule's minimum is 15). */
export const RING_SECONDS = 25;
/** Seconds the browser phone has to pick up a transferred lead. */
const AGENT_PICKUP_SECONDS = 12;
/** A "dialing" lead with no news for this long is counted as failed. */
const STALE_DIAL_MS = 3 * 60 * 1000;

/** What a lead leg that ended without a decision counts as. */
export function unansweredResult(hangupCause: string): "busy" | "failed" | "no-answer" {
  if (/busy/i.test(hangupCause)) return "busy";
  if (/unallocated|invalid|not_found|incompatible|failure|error/i.test(hangupCause)) return "failed";
  return "no-answer";
}

export const encodeDialerState = (state: DialerLegState) => Buffer.from(JSON.stringify(state)).toString("base64");

async function telnyx(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  try {
    const res = await fetch(`https://api.telnyx.com/v2${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TELNYX_API_KEY || ""}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {} as any };
  }
}

const hangup = (ccid: string) => telnyx(`/calls/${ccid}/actions/hangup`, "POST", {});

const packets = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Keep each leg's audio stats on the queue item: on the agent's leg,
 * inbound packets are the agent's microphone and outbound packets what
 * reached their speakers, so a one-way or silent call shows which end
 * was quiet.
 */
async function recordLegAudio(db: Db, itemId: string, leg: "lead" | "agent", stats: any) {
  if (!stats || typeof stats !== "object") return;
  const { data } = await db.from("dialer_queue").select("call_quality").eq("id", itemId).maybeSingle();
  const audio = {
    ...(summarizeCallQuality(stats) || {}),
    inPackets: packets(stats.inbound?.packet_count),
    outPackets: packets(stats.outbound?.packet_count),
  };
  await db.from("dialer_queue").update({ call_quality: { ...(data?.call_quality || {}), [leg]: audio } }).eq("id", itemId);
}

/**
 * Hang up a session's lead legs that are still up: one item, or all of them.
 * The server does this itself rather than trusting the browser's hangup to
 * reach the lead's leg; each leg's hangup event then closes and bills it.
 */
export async function hangUpLeads(db: Db, sessionId: string, itemId?: string): Promise<number> {
  let query = db
    .from("dialer_queue")
    .select("id, call_control_id")
    .eq("session_id", sessionId)
    .eq("status", "dialing")
    .not("call_control_id", "is", null);
  if (itemId) query = query.eq("id", itemId);
  const { data } = await query;
  const legs = (data || []) as Array<{ call_control_id: string }>;
  await Promise.all(legs.map((leg) => hangup(leg.call_control_id)));
  return legs.length;
}

export async function loadDialerStats(db: Db, sessionId: string): Promise<DialerStats> {
  const { data } = await db.rpc("dialer_stats", { p_session: sessionId });
  const row = (data || {}) as Partial<DialerStats>;
  const n = (key: keyof DialerStats) => Number(row[key]) || 0;
  return {
    queued: n("queued"), in_flight: n("in_flight"), dials: n("dials"), connected: n("connected"),
    abandoned: n("abandoned"), voicemail: n("voicemail"), no_answer: n("no_answer"), failed: n("failed"),
    skipped: n("skipped"), opted_out: n("opted_out"), abandoned_30d: n("abandoned_30d"), connected_30d: n("connected_30d"),
  };
}

/** Lines the session should dial right now, from its own answer rate and the 30-day abandon rate. */
export function linesFor(session: { max_lines: number }, stats: DialerStats): number {
  return chooseLines({
    maxLines: session.max_lines,
    dials: stats.dials,
    liveAnswers: stats.connected + stats.abandoned,
    abandoned30d: stats.abandoned_30d,
    connected30d: stats.connected_30d,
  });
}

async function finishItem(db: Db, itemId: string, result: string, extra: Record<string, unknown> = {}) {
  await db
    .from("dialer_queue")
    .update({ status: "done", result, ended_at: new Date().toISOString(), ...extra })
    .eq("id", itemId)
    .neq("status", "done");
}

/** Record what a lead turned out to be while its leg is still up; the hangup closes it. */
async function setResult(db: Db, itemId: string, result: string, extra: Record<string, unknown> = {}) {
  await db.from("dialer_queue").update({ result, ...extra }).eq("id", itemId).is("result", null);
}

export async function pauseSession(db: Db, sessionId: string, reason: string, agentState: "away" | "ready" = "away") {
  await db
    .from("dialer_sessions")
    .update({ status: "paused", agent_state: agentState, pause_reason: reason })
    .eq("id", sessionId)
    .eq("status", "active");
}

/** The browser phone didn't take a lead: stop dialing until the agent is back. */
async function agentUnreachable(db: Db, sessionId: string) {
  await db
    .from("dialer_sessions")
    .update({
      status: "paused",
      agent_state: "away",
      active_item: null,
      pause_reason: "Your browser phone didn't pick up. Check it says Phone ready, then click Ready.",
    })
    .eq("id", sessionId);
}

/** Place one lead call. Returns false when the lead was skipped or the dial failed. */
async function placeLeadCall(db: Db, session: any, item: any, appId: string, now: Date): Promise<boolean> {
  const { data: contact } = item.contact_id
    ? await db.from("contacts").select("state, dnc").eq("id", item.contact_id).maybeSingle()
    : { data: null };
  if (contact?.dnc || !withinCallingHours(contact?.state, now)) {
    await finishItem(db, item.id, "skipped");
    return false;
  }
  const to = toE164(item.phone);
  const numbers = (Array.isArray(session.from_numbers) ? session.from_numbers : []).map(toE164).filter(Boolean) as string[];
  const from = numbers.length ? numbers[Math.abs(Number(item.position) || 0) % numbers.length] : null;
  if (!to || !from) {
    await finishItem(db, item.id, "failed");
    return false;
  }

  const { data: row } = await db
    .from("calls")
    .insert({
      user_id: session.user_id,
      contact_id: item.contact_id,
      direction: "outbound",
      from_number: from,
      to_number: to,
      status: "initiating",
      cost_per_min: CALL_RATE_OUTBOUND_PER_MIN,
      notes: "Predictive dialer",
    })
    .select("id")
    .single();
  if (!row?.id) {
    await finishItem(db, item.id, "failed");
    return false;
  }

  const dialed = await telnyx(`/calls`, "POST", {
    connection_id: appId,
    to,
    from,
    timeout_secs: RING_SECONDS,
    answering_machine_detection: "detect",
    client_state: encodeDialerState({ v: 1, dialer: session.id, item: item.id, callRowId: row.id, leg: "lead" }),
  });
  const leg = dialed.json?.data || {};
  if (!dialed.ok || !leg.call_control_id) {
    console.error(`[dialer] dial failed ${dialed.status}: ${JSON.stringify(dialed.json).slice(0, 300)}`);
    await db.from("calls").update({ status: "failed", hangup_cause: "dial_failed", ended_at: new Date().toISOString() }).eq("id", row.id);
    await finishItem(db, item.id, "failed", { call_row_id: row.id, from_number: from });
    return false;
  }
  await Promise.all([
    db.from("dialer_queue").update({ call_control_id: leg.call_control_id, call_row_id: row.id, from_number: from }).eq("id", item.id),
    db
      .from("calls")
      .update({ call_control_id: leg.call_control_id, call_session_id: leg.call_session_id || null, call_leg_id: leg.call_leg_id || null, status: "ringing" })
      .eq("id", row.id),
  ]);
  return true;
}

/**
 * Fill the session's free lines. Called when the agent becomes ready and
 * whenever a lead leg ends. Returns how many calls were placed.
 */
export async function dialNext(db: Db, sessionId: string, now: Date = new Date()): Promise<number> {
  const { data: session } = await db.from("dialer_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session || session.status !== "active" || session.agent_state !== "ready") return 0;

  // The dialing account may call on a sponsor's account: their wallet pays.
  const { data: caller } = await db.from("profiles").select("email, paused").eq("id", session.user_id).maybeSingle();
  const access = caller && !caller.paused ? await callingAccess(db, { id: session.user_id, email: caller.email }) : null;
  const profile = access?.payer;
  if (!profile || profile.paused || !isEntitled(profile)) {
    await pauseSession(db, sessionId, "Calling needs an active subscription.");
    return 0;
  }

  // A lead whose hangup never arrived must not hold a line forever.
  await db
    .from("dialer_queue")
    .update({ status: "done", result: "failed", ended_at: now.toISOString() })
    .eq("session_id", sessionId)
    .eq("status", "dialing")
    .is("result", null)
    .lt("dialed_at", new Date(now.getTime() - STALE_DIAL_MS).toISOString());

  const stats = await loadDialerStats(db, sessionId);
  const lines = linesFor(session, stats);
  if (lines !== session.lines) await db.from("dialer_sessions").update({ lines }).eq("id", sessionId);
  // Pay before dialing: every line that might connect needs its first minute covered.
  if ((Number(profile.wallet_balance) || 0) < lines * CALL_RATE_OUTBOUND_PER_MIN * 2) {
    await pauseSession(db, sessionId, "Add funds to your wallet to keep dialing.", "ready");
    return 0;
  }

  const app = await ensureCallControlApp().catch(() => ({ ok: false as const, error: "" }));
  if (!app.ok) return 0;

  let placed = 0;
  // Skipped leads (outside calling hours, DNC) free their line; reserve again.
  for (let round = 0; round < 8; round++) {
    const { data: items } = await db.rpc("dialer_reserve", { p_session: sessionId, p_limit: lines });
    if (!items?.length) break;
    let skipped = 0;
    for (const item of items) {
      if (await placeLeadCall(db, session, item, app.id, now)) placed++;
      else skipped++;
    }
    if (!skipped) break;
  }

  if (!placed) {
    const after = await loadDialerStats(db, sessionId);
    if (!after.queued && !after.in_flight) {
      await db
        .from("dialer_sessions")
        .update({ status: "completed", agent_state: "away", ended_at: now.toISOString() })
        .eq("id", sessionId)
        .eq("status", "active");
    }
  }
  return placed;
}

/** Tell an answered lead nobody can take the call, with an opt-out. */
async function abandonLead(db: Db, ccid: string, state: DialerLegState, session: any, item: any) {
  await setResult(db, state.item, "abandoned", { human_at: item?.human_at || new Date().toISOString() });
  await db.from("calls").update({ outcome: "abandoned" }).eq("id", state.callRowId);
  const spoken = await telnyx(`/calls/${ccid}/actions/gather_using_speak`, "POST", {
    payload: abandonMessage({
      agentName: session?.agent_name || "your agent",
      businessName: session?.business_name || "our office",
      callbackNumber: item?.from_number || "",
    }),
    voice: ABANDON_VOICE,
    language: "en-US",
    valid_digits: "9",
    minimum_digits: 1,
    maximum_digits: 1,
    timeout_millis: 5000,
    client_state: encodeDialerState({ ...state, stage: "abandon" }),
  });
  if (!spoken.ok) await hangup(ccid);
}

/** A lead picked up and AMD heard a person: connect them, or abandon if the agent is busy. */
async function connectLead(db: Db, ccid: string, state: DialerLegState) {
  const humanAt = new Date().toISOString();
  await db.from("dialer_queue").update({ human_at: humanAt }).eq("id", state.item);
  const [{ data: session }, { data: item }] = await Promise.all([
    db.from("dialer_sessions").select("*").eq("id", state.dialer).maybeSingle(),
    db.from("dialer_queue").select("*").eq("id", state.item).maybeSingle(),
  ]);

  const { data: claimed } = await db.rpc("dialer_claim_agent", { p_session: state.dialer, p_item: state.item });
  if (claimed === true && !session?.sip_username) await agentUnreachable(db, state.dialer);
  if (claimed === true && session?.sip_username) {
    const transfer = {
      to: `sip:${session.sip_username}@sip.telnyx.com`,
      from: item?.phone ? toE164(item.phone) : undefined,
      timeout_secs: AGENT_PICKUP_SECONDS,
      client_state: encodeDialerState(state),
      target_leg_client_state: encodeDialerState({ ...state, leg: "agent" }),
    };
    let moved = await telnyx(`/calls/${ccid}/actions/transfer`, "POST", transfer);
    if (!moved.ok && transfer.from) moved = await telnyx(`/calls/${ccid}/actions/transfer`, "POST", { ...transfer, from: undefined });
    if (moved.ok) return;
    console.error(`[dialer] transfer to agent failed ${moved.status}: ${JSON.stringify(moved.json).slice(0, 300)}`);
    await agentUnreachable(db, state.dialer);
  }
  await abandonLead(db, ccid, state, session, { ...(item || {}), human_at: humanAt });
}

/**
 * Handle a call event for a dialer leg. Returns true when the event is fully
 * handled; false lets the call webhook continue (lead hangups still need its
 * close-and-bill step).
 */
export async function handleDialerEvent(db: Db, type: string, p: any, state: DialerLegState): Promise<boolean> {
  const ccid: string | undefined = p?.call_control_id;
  if (!ccid || !state.item) return true;

  // ── The browser phone's leg of a transferred lead ──
  if (state.leg === "agent") {
    if (type !== "call.hangup") return true;
    await recordLegAudio(db, state.item, "agent", p.call_quality_stats);
    const { data: item } = await db.from("dialer_queue").select("*").eq("id", state.item).maybeSingle();
    if (!item) return true;
    if (item.result === "connected") {
      // The agent hung up: end the lead's leg too (its hangup bills the call).
      if (item.call_control_id && item.status !== "done") await hangup(item.call_control_id);
      return true;
    }
    if (item.status === "done") return true;
    // The browser never picked up. Pause until the agent is back, and give
    // the waiting lead the abandoned-call message instead of dead air.
    await agentUnreachable(db, state.dialer);
    const { data: session } = await db.from("dialer_sessions").select("*").eq("id", state.dialer).maybeSingle();
    if (item.call_control_id) await abandonLead(db, item.call_control_id, { ...state, leg: "lead" }, session, item);
    return true;
  }

  switch (type) {
    case "call.initiated":
      return true;

    case "call.answered": {
      const answeredAt = new Date().toISOString();
      await db.from("dialer_queue").update({ answered_at: answeredAt }).eq("id", state.item);
      const { data: answered } = await db
        .from("calls")
        .update({ status: "answered", answered_at: answeredAt })
        .eq("id", state.callRowId)
        .in("status", ["initiating", "ringing"])
        .select("id, user_id, answered_at, cost_per_min, cost_charged")
        .maybeSingle();
      // First minute is paid at answer; no funds, no call.
      if (answered && (await chargeStartedMinutes(db, answered)) === "insufficient") {
        await hangup(ccid);
        await pauseSession(db, state.dialer, "Add funds to your wallet to keep dialing.");
      }
      return true;
    }

    case "call.machine.detection.ended": {
      const result = String(p.result || "");
      if (/machine|fax/i.test(result)) {
        await setResult(db, state.item, "voicemail");
        await db.from("calls").update({ outcome: "voicemail" }).eq("id", state.callRowId);
        await hangup(ccid);
        return true;
      }
      // human, not_sure: treat as a person (dead air for a person is worse).
      await connectLead(db, ccid, state);
      return true;
    }

    case "call.bridged": {
      const { data: item } = await db.from("dialer_queue").select("result").eq("id", state.item).maybeSingle();
      if (item?.result) return true;
      await setResult(db, state.item, "connected");
      await db
        .from("dialer_sessions")
        .update({ agent_state: "on_call" })
        .eq("id", state.dialer)
        .eq("active_item", state.item);
      return true;
    }

    case "call.gather.ended": {
      if (state.stage !== "abandon") return true;
      if (String(p.digits || "").includes("9")) {
        const { data: item } = await db.from("dialer_queue").select("contact_id, user_id").eq("id", state.item).maybeSingle();
        if (item?.contact_id) await db.from("contacts").update({ dnc: true }).eq("id", item.contact_id).eq("user_id", item.user_id);
        await db.from("dialer_queue").update({ opted_out: true }).eq("id", state.item);
        const said = await telnyx(`/calls/${ccid}/actions/speak`, "POST", {
          payload: "You've been added to our do not call list. Goodbye.",
          voice: ABANDON_VOICE,
          language: "en-US",
          client_state: encodeDialerState({ ...state, stage: "bye" }),
        });
        if (said.ok) return true;
      }
      await hangup(ccid);
      return true;
    }

    case "call.speak.ended":
      if (state.stage === "bye") await hangup(ccid);
      return true;

    case "call.hangup": {
      await recordLegAudio(db, state.item, "lead", p.call_quality_stats);
      const { data: item } = await db.from("dialer_queue").select("*").eq("id", state.item).maybeSingle();
      if (item && item.status !== "done") {
        const result = item.result || unansweredResult(String(p.hangup_cause || ""));
        await db.from("dialer_queue").update({ status: "done", result, ended_at: new Date().toISOString() }).eq("id", state.item);
      }
      // Free the agent: after a real conversation they wrap up and click
      // Next; a lead lost while being put through just frees them again.
      const { data: session } = await db.from("dialer_sessions").select("agent_state, active_item").eq("id", state.dialer).maybeSingle();
      if (session?.active_item === state.item) {
        const next = item?.result === "connected" ? "wrap" : session.agent_state === "connecting" ? "ready" : session.agent_state;
        await db.from("dialer_sessions").update({ agent_state: next }).eq("id", state.dialer).eq("active_item", state.item);
      }
      await dialNext(db, state.dialer);
      return false;
    }

    default:
      return true;
  }
}
