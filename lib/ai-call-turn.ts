// ── AI call assistant: session + turn orchestration ──────────────────────
// The stateful half of the voice assistant. lib/ai-call.ts holds the pure
// pieces (Telnyx actions, prompt, tools, speech shaping); this file owns
// the session row, the wallet, and what happens when the model asks for
// something.
//
// Money rule, per the operator's standing instruction: nothing that costs
// money runs before it is paid for. The reserve is debited BEFORE the
// assistant answers, topped up before the call outruns it, and the unused
// remainder is credited back at hangup. An empty wallet means the call
// falls through to the normal ring path — it never means a free call.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  type AvailableHours,
  type AvailableSlot,
  DEFAULT_AVAILABLE_HOURS,
  formatDateNice,
  formatTime12,
  getAvailableSlots,
} from "@/lib/availability";
import {
  AI_CALL_MIN_RESERVE,
  AI_CALL_RATE_PER_MIN,
  AI_CALL_RESERVE_MINUTES,
  calcAiCallCharge,
} from "@/lib/call-pricing";
import {
  type AiCallSession,
  type AiCallSettings,
  MAX_TURNS,
  TURN_DEBOUNCE_MS,
  TURN_LEASE_SECONDS,
  buildVoicePrompt,
  buildVoiceTools,
  businessNameFor,
  defaultGreeting,
  hangupCall,
  runModelTurn,
  settingsFromProfile,
  speak,
  speakableTime,
  startTranscription,
  stopTranscription,
  transferCall,
} from "@/lib/ai-call";
import { checkCalendarConflict, createCalendarEvent } from "@/lib/google-calendar";
import { inferTimezone } from "@/lib/quiet-hours";

type Db = any;

/** What the caller hears when the wallet runs dry mid-call. */
const OUT_OF_FUNDS_LINE =
  "I'm sorry, I have to let you go. Someone will call you back shortly. Thanks for calling.";

const FALLBACK_LINE =
  "Sorry, I didn't catch that. Could you say it once more?";

export function encodeState(state: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

// ─── Funding ─────────────────────────────────────────────────────────────

/**
 * Debit `amount` from the wallet. `decrement_wallet` returns NULL when the
 * balance would go negative, which is how we detect underfunding without a
 * read-then-write race.
 */
async function debit(db: Db, userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const { data, error } = await db.rpc("decrement_wallet", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) {
    console.error("[ai-call] decrement_wallet failed:", error.message);
    return false;
  }
  return data !== null && data !== undefined;
}

async function refund(
  db: Db,
  userId: string,
  amount: number,
  idempotencyKey: string,
  description: string
) {
  if (amount <= 0) return;
  const { error } = await db.rpc("credit_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_description: description,
  });
  if (error) console.error("[ai-call] credit_wallet failed:", error.message);
}

/**
 * Take the up-front reserve and record it on the session.
 *
 * This runs AFTER the session row exists and only for the webhook that
 * created it. Telnyx retries call.initiated, and debiting before the row
 * existed meant every retry took another reserve off the same caller.
 *
 * Returns the amount reserved, or 0 if the wallet could not cover it — in
 * which case the caller must NOT be handed to the assistant.
 */
export async function reserveForAiCall(
  db: Db,
  userId: string,
  sessionId: string
): Promise<number> {
  const ok = await debit(db, userId, AI_CALL_MIN_RESERVE);
  if (!ok) return 0;
  await db
    .from("ai_call_sessions")
    .update({ reserved_amount: AI_CALL_MIN_RESERVE })
    .eq("id", sessionId);
  return AI_CALL_MIN_RESERVE;
}

/**
 * Keep the reserve ahead of the clock. Called before each model turn: if
 * the call has used more than the reserve buys, take another block. A
 * failed top-up ends the call politely rather than running up a bill.
 */
async function topUpReserve(
  db: Db,
  session: AiCallSession
): Promise<{ funded: boolean; reserved: number }> {
  const elapsedMin = Math.ceil(
    (Date.now() - new Date(session.started_at).getTime()) / 60000
  );
  const minutesCovered = session.reserved_amount / AI_CALL_RATE_PER_MIN;
  // Top up one minute before the reserve is spent so we're never billing
  // against money we haven't taken.
  if (elapsedMin < minutesCovered - 1) {
    return { funded: true, reserved: session.reserved_amount };
  }

  const block = +(AI_CALL_RATE_PER_MIN * AI_CALL_RESERVE_MINUTES).toFixed(4);
  const ok = await debit(db, session.user_id, block);
  if (!ok) return { funded: false, reserved: session.reserved_amount };

  const reserved = +(session.reserved_amount + block).toFixed(4);
  await db.from("ai_call_sessions").update({ reserved_amount: reserved }).eq("id", session.id);
  return { funded: true, reserved };
}

// ─── Session start ───────────────────────────────────────────────────────

export type StartSessionArgs = {
  db: Db;
  userId: string;
  callRowId: string | null;
  contactId: string | null;
  callControlId: string;
  fromNumber: string;
  toNumber: string;
  profile: any;
};

/**
 * Create the session row. Idempotent on call_control_id, so a Telnyx
 * webhook retry resumes the existing session instead of starting a second
 * greeting on the same leg.
 */
export async function ensureSession(
  args: StartSessionArgs
): Promise<{ session: AiCallSession; created: boolean } | null> {
  const { db, callControlId } = args;

  const { data: existing } = await db
    .from("ai_call_sessions")
    .select("*")
    .eq("call_control_id", callControlId)
    .maybeSingle();
  if (existing) return { session: existing as AiCallSession, created: false };

  const { data, error } = await db
    .from("ai_call_sessions")
    .insert({
      user_id: args.userId,
      call_id: args.callRowId,
      contact_id: args.contactId,
      call_control_id: callControlId,
      from_number: args.fromNumber,
      to_number: args.toNumber,
      state: "greeting",
      reserved_amount: 0,
    })
    .select("*")
    .single();

  if (error) {
    // Lost an insert race with a concurrent retry — read the winner's row.
    const { data: raced } = await db
      .from("ai_call_sessions")
      .select("*")
      .eq("call_control_id", callControlId)
      .maybeSingle();
    if (raced) return { session: raced as AiCallSession, created: false };
    console.error("[ai-call] could not create session:", error.message);
    return null;
  }
  return { session: data as AiCallSession, created: true };
}

/** Start transcription and speak the opening line. */
export async function openConversation(
  db: Db,
  session: AiCallSession,
  settings: AiCallSettings,
  profile: any
) {
  const ccid = session.call_control_id;
  const clientState = encodeState({ v: 1, aiSessionId: session.id, callRowId: session.call_id });

  // If Telnyx won't start transcribing, the assistant is deaf: it would
  // greet the caller and then sit in silence, because nothing would ever
  // arrive to advance the turn loop. Say so honestly and take a message
  // instead of burning the caller's time and the operator's wallet.
  const listening = await startTranscription(ccid, clientState);
  if (!listening) {
    console.error(`[ai-call] transcription failed to start on ${ccid}`);
    await db
      .from("ai_call_sessions")
      .update({
        state: "speaking",
        next_action: "hangup",
        outcome: "message_taken",
        summary: `Missed call from ${session.from_number || "unknown number"} — the assistant could not hear the caller. Call them back.`,
      })
      .eq("id", session.id);
    const spoke = await speak(
      ccid,
      "Sorry, I'm having trouble hearing you. Someone will call you right back. Thanks for calling.",
      settings.voice,
      clientState
    );
    if (!spoke) await hangupCall(ccid);
    return;
  }

  const greeting =
    settings.greeting?.trim() || defaultGreeting(businessNameFor(profile));

  await db
    .from("ai_call_sessions")
    .update({
      state: "speaking",
      turns: [{ role: "assistant", content: greeting }],
    })
    .eq("id", session.id);

  await speakOrListen(db, session.id, ccid, greeting, settings.voice, clientState);
}

/**
 * Speak, and if Telnyx refused the action drop back to listening. Telnyx
 * only emits call.speak.ended for a speak that actually started, so a
 * failed one would otherwise strand the session in "speaking" and the
 * caller would hear nothing for the rest of the call.
 */
async function speakOrListen(
  db: Db,
  sessionId: string,
  ccid: string,
  line: string,
  voice: string,
  clientState: string
) {
  const ok = await speak(ccid, line, voice, clientState);
  if (!ok) {
    await db
      .from("ai_call_sessions")
      .update({ state: "listening", next_action: null })
      .eq("id", sessionId);
  }
}

// ─── Turn handling ───────────────────────────────────────────────────────

/**
 * A caller's speech fragment arrived. Append it, and if nothing else is
 * mid-turn, take the lease and answer.
 */
export async function onTranscript(
  db: Db,
  ccid: string,
  transcript: string
): Promise<void> {
  const text = (transcript || "").trim();
  if (!text) return;

  await db.rpc("ai_call_append_transcript", { p_ccid: ccid, p_text: text });

  const { data: session } = await db
    .from("ai_call_sessions")
    .select("*")
    .eq("call_control_id", ccid)
    .maybeSingle();
  if (!session || session.state === "done") return;

  // Only listen while we are listening. If the assistant is mid-sentence
  // or mid-thought the fragment stays banked and the speak.ended handler
  // picks it up.
  if (session.state !== "listening") return;

  const { data: claimed } = await db.rpc("ai_call_claim_turn", {
    p_ccid: ccid,
    p_lease_seconds: TURN_LEASE_SECONDS,
  });
  if (!claimed) return;

  // Hold the lease briefly so the rest of the caller's sentence lands.
  await new Promise((r) => setTimeout(r, TURN_DEBOUNCE_MS));

  await runTurn(db, ccid);
}

/**
 * Called when a spoken line finishes. Either we owe the caller an action
 * (hang up, transfer), there is banked speech to answer, or we go quiet
 * and listen.
 */
export async function onSpeakEnded(db: Db, ccid: string): Promise<void> {
  const { data: session } = await db
    .from("ai_call_sessions")
    .select("*")
    .eq("call_control_id", ccid)
    .maybeSingle();
  if (!session || session.state === "done") return;

  if (session.next_action === "hangup") {
    await db
      .from("ai_call_sessions")
      .update({ state: "done", next_action: null })
      .eq("id", session.id);
    await stopTranscription(ccid);
    await hangupCall(ccid);
    return;
  }

  if (session.next_action === "transfer") {
    const target = (session.collected as any)?.transferTo;
    await db
      .from("ai_call_sessions")
      .update({ state: "transferring", next_action: null, outcome: "transferred" })
      .eq("id", session.id);
    await stopTranscription(ccid);
    if (target && session.to_number) {
      await transferCall(ccid, target, session.to_number);
    } else {
      await hangupCall(ccid);
    }
    return;
  }

  // Anything the caller said while we were talking is answered now.
  if ((session.pending_transcript || "").trim()) {
    const { data: claimed } = await db.rpc("ai_call_claim_turn", {
      p_ccid: ccid,
      p_lease_seconds: TURN_LEASE_SECONDS,
    });
    if (claimed) {
      await new Promise((r) => setTimeout(r, TURN_DEBOUNCE_MS));
      await runTurn(db, ccid);
      return;
    }
  }

  await db.from("ai_call_sessions").update({ state: "listening" }).eq("id", session.id);
}

/**
 * One full turn: consume what the caller said, ask the model, carry out
 * whatever tool it called, and say the line. Runs while holding the turn
 * lease — see the comment at the top of lib/ai-call.ts for why.
 */
async function runTurn(db: Db, ccid: string): Promise<void> {
  const { data: raw } = await db
    .from("ai_call_sessions")
    .select("*")
    .eq("call_control_id", ccid)
    .maybeSingle();
  if (!raw || raw.state === "done") return;
  const session = raw as AiCallSession;

  const { data: heard } = await db.rpc("ai_call_consume_transcript", { p_ccid: ccid });
  const callerSaid = ((heard as string) || "").trim();

  const { data: profile } = await db
    .from("profiles")
    .select(
      "first_name, last_name, industry, a2p_registration, available_hours, " +
        "ai_call_enabled, ai_call_greeting, ai_call_instructions, ai_call_voice, " +
        "ai_call_transfer_number, ai_call_after_hours_only, ai_call_max_minutes"
    )
    .eq("id", session.user_id)
    .maybeSingle();

  const settings = settingsFromProfile(profile);
  const clientState = encodeState({
    v: 1,
    aiSessionId: session.id,
    callRowId: session.call_id,
  });

  // ── Guards that end the call rather than let it run on ──
  const elapsedMin = (Date.now() - new Date(session.started_at).getTime()) / 60000;
  if (elapsedMin >= settings.maxMinutes || session.turn_count >= MAX_TURNS) {
    await endWithLine(
      db,
      session,
      settings,
      clientState,
      "I want to make sure you get taken care of properly, so let me have someone call you right back. Thanks for calling.",
      "message_taken"
    );
    await recordMessage(db, session, {
      caller_name: (session.collected as any)?.caller_name || "",
      callback_number: session.from_number || "",
      reason: "Call reached the time limit before it was resolved.",
    });
    return;
  }

  const funding = await topUpReserve(db, session);
  if (!funding.funded) {
    console.warn(`[ai-call] wallet exhausted mid-call for user ${session.user_id}`);
    await endWithLine(db, session, settings, clientState, OUT_OF_FUNDS_LINE, "message_taken");
    await recordMessage(db, session, {
      caller_name: (session.collected as any)?.caller_name || "",
      callback_number: session.from_number || "",
      reason: "Call ended early — account balance ran out mid-call.",
    });
    return;
  }

  if (!callerSaid) {
    // Silence. Nudge once and go back to listening rather than burn a
    // model turn on nothing.
    await db
      .from("ai_call_sessions")
      .update({ state: "speaking", turn_lock_at: null })
      .eq("id", session.id);
    await speakOrListen(db, session.id, ccid, FALLBACK_LINE, settings.voice, clientState);
    return;
  }

  // ── Context ──
  const hours: AvailableHours = (profile?.available_hours as AvailableHours) || DEFAULT_AVAILABLE_HOURS;
  const slots: AvailableSlot[] = hours.enabled
    ? await getAvailableSlots(db, session.user_id, hours, 6)
    : [];

  let contact: any = null;
  if (session.contact_id) {
    const { data } = await db
      .from("contacts")
      .select("first_name, last_name, phone, state")
      .eq("id", session.contact_id)
      .maybeSingle();
    contact = data;
  }

  const canTransfer = !!settings.transferNumber;
  const systemPrompt = buildVoicePrompt({
    businessName: businessNameFor(profile),
    agentName: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "the office",
    industry: profile?.industry || "other",
    instructions: settings.instructions || "",
    callerName: contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() : "",
    callerPhone: session.from_number || "",
    slots,
    timezone: hours.timezone || "America/New_York",
    slotDuration: hours.slotDuration || 30,
    canTransfer,
  });

  const turns = [
    ...(session.turns || []),
    { role: "user" as const, content: callerSaid },
  ];

  const result = await runModelTurn({
    systemPrompt,
    tools: buildVoiceTools({ hasSlots: slots.length > 0, canTransfer }),
    turns,
  });

  if (!result) {
    // Model unreachable. Don't leave the caller in silence.
    await endWithLine(
      db,
      session,
      settings,
      clientState,
      "I'm having trouble on my end. Let me have someone call you right back. Thanks for your patience.",
      "message_taken"
    );
    await recordMessage(db, session, {
      caller_name: (session.collected as any)?.caller_name || "",
      callback_number: session.from_number || "",
      reason: "Assistant could not complete the call — follow up needed.",
    });
    return;
  }

  // ── Carry out the tool, if any ──
  let say = result.say;
  let nextAction: "hangup" | "transfer" | null = null;
  let outcome: string | null = null;
  const collected: Record<string, unknown> = { ...(session.collected || {}) };
  let appointmentId: string | null = session.appointment_id;

  if (result.toolName === "book_appointment") {
    const input = result.toolInput as { date: string; time: string; caller_name?: string; title?: string };
    collected.caller_name = input.caller_name || collected.caller_name;

    const booking = await bookFromCall(db, session, hours, slots, input, contact);
    if (booking.booked) {
      appointmentId = booking.appointmentId;
      outcome = "booked";
      if (!say) {
        say = `You're all set for ${formatDateNice(input.date)} at ${speakableTime(input.time)}. We'll see you then.`;
      }
    } else if (!say) {
      say = booking.conflict
        ? "It looks like that time just got taken. Would the next opening work instead?"
        : "I couldn't get that time to hold. Let me offer you another one.";
    }
  } else if (result.toolName === "take_message") {
    const input = result.toolInput as {
      caller_name?: string;
      callback_number?: string;
      reason?: string;
      urgency?: string;
    };
    Object.assign(collected, {
      caller_name: input.caller_name || collected.caller_name,
      callback_number: input.callback_number || session.from_number,
      reason: input.reason,
      urgency: input.urgency || "normal",
    });
    await recordMessage(db, session, {
      caller_name: input.caller_name || "",
      callback_number: input.callback_number || session.from_number || "",
      reason: input.reason || "",
      urgency: input.urgency,
    });
    outcome = "message_taken";
    if (!say) say = "Got it. I'll pass that along and someone will call you back shortly.";
  } else if (result.toolName === "transfer_to_human" && canTransfer) {
    collected.transferTo = settings.transferNumber;
    nextAction = "transfer";
    if (!say) say = "Sure, let me put you through. One moment.";
  } else if (result.toolName === "end_call") {
    nextAction = "hangup";
    outcome = (result.toolInput?.outcome as string) || session.outcome || null;
    if (!say) say = "Thanks for calling. Have a good one.";
  }

  if (!say) say = FALLBACK_LINE;

  // ── Persist the turn, release the lease, speak ──
  await db
    .from("ai_call_sessions")
    .update({
      state: "speaking",
      turns: [...turns, { role: "assistant", content: say }],
      turn_count: session.turn_count + 1,
      turn_lock_at: null,
      next_action: nextAction,
      outcome: outcome || session.outcome,
      collected,
      appointment_id: appointmentId,
    })
    .eq("id", session.id);

  await speakOrListen(db, session.id, session.call_control_id, say, settings.voice, clientState);
}

/** Say one last line and arrange to hang up when it finishes playing. */
async function endWithLine(
  db: Db,
  session: AiCallSession,
  settings: AiCallSettings,
  clientState: string,
  line: string,
  outcome: string
) {
  await db
    .from("ai_call_sessions")
    .update({
      state: "speaking",
      next_action: "hangup",
      outcome,
      turn_lock_at: null,
      turns: [...(session.turns || []), { role: "assistant", content: line }],
    })
    .eq("id", session.id);
  const spoke = await speak(session.call_control_id, line, settings.voice, clientState);
  if (!spoke) {
    // Nothing will arrive to trigger the queued hangup, so do it now.
    await db.from("ai_call_sessions").update({ state: "done", next_action: null }).eq("id", session.id);
    await stopTranscription(session.call_control_id);
    await hangupCall(session.call_control_id);
  }
}

// ─── Booking ─────────────────────────────────────────────────────────────

async function bookFromCall(
  db: Db,
  session: AiCallSession,
  hours: AvailableHours,
  slots: AvailableSlot[],
  input: { date: string; time: string; caller_name?: string; title?: string },
  contact: any
): Promise<{ booked: boolean; conflict: boolean; appointmentId: string | null }> {
  // Same rule as the SMS path: the model may only book a slot we offered.
  const slotValid = slots.some((s) => s.date === input.date && s.time === input.time);
  if (!slotValid) return { booked: false, conflict: false, appointmentId: null };

  const tz = hours.timezone || inferTimezone(contact?.state) || "America/New_York";
  const conflict = await checkCalendarConflict(
    session.user_id,
    input.date,
    input.time,
    hours.slotDuration || 30,
    tz
  );
  if (conflict) return { booked: false, conflict: true, appointmentId: null };

  const callerName = (input.caller_name || "").trim();
  const { data: apt, error } = await db
    .from("appointments")
    .insert({
      user_id: session.user_id,
      contact_id: session.contact_id || null,
      title: input.title || "Phone appointment",
      date: input.date,
      time: input.time,
      duration_minutes: hours.slotDuration || 30,
      notes: [
        "Booked by the AI call assistant during an inbound call.",
        callerName ? `Caller: ${callerName}` : null,
        session.from_number ? `From: ${session.from_number}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      status: "confirmed",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[ai-call] appointment insert failed:", error.message);
    return { booked: false, conflict: false, appointmentId: null };
  }

  // Fire-and-forget calendar sync, same as the SMS booking path.
  createCalendarEvent(session.user_id, {
    date: input.date,
    time: input.time,
    title: input.title || "Phone appointment",
    contactName: callerName || `${contact?.first_name || "Caller"} ${contact?.last_name || ""}`.trim(),
    contactPhone: session.from_number || contact?.phone || "",
    duration: hours.slotDuration || 30,
    timeZone: tz,
  })
    .then((googleEventId) => {
      if (googleEventId) {
        db.from("appointments")
          .update({ google_event_id: googleEventId })
          .eq("id", apt.id)
          .then(({ error: e }: any) => {
            if (e) console.error("[ai-call] google_event_id save failed:", e.message);
          });
      }
    })
    .catch((err: unknown) => console.error("[ai-call] calendar sync failed:", err));

  return { booked: true, conflict: false, appointmentId: apt.id as string };
}

// ─── Messages ────────────────────────────────────────────────────────────

/**
 * Persist a callback message. The session row is the record of truth; we
 * also create a contact for an unknown caller so the message shows up
 * somewhere the operator already looks.
 */
async function recordMessage(
  db: Db,
  session: AiCallSession,
  msg: { caller_name: string; callback_number: string; reason: string; urgency?: string }
) {
  const summary = [
    msg.caller_name ? `${msg.caller_name} called` : "Caller",
    msg.reason ? `— ${msg.reason}` : "",
    msg.callback_number ? `Call back: ${msg.callback_number}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  await db
    .from("ai_call_sessions")
    .update({
      summary,
      collected: {
        ...(session.collected || {}),
        caller_name: msg.caller_name || (session.collected as any)?.caller_name,
        callback_number: msg.callback_number,
        reason: msg.reason,
        urgency: msg.urgency || "normal",
      },
    })
    .eq("id", session.id);

  if (session.contact_id || !session.from_number) return;

  const first = (msg.caller_name || "").split(/\s+/)[0] || "Caller";
  const last = (msg.caller_name || "").split(/\s+/).slice(1).join(" ");
  const { data: created } = await db
    .from("contacts")
    .insert({
      user_id: session.user_id,
      first_name: first,
      last_name: last,
      phone: session.from_number,
      lead_source: "Inbound call",
      notes: summary,
    })
    .select("id")
    .maybeSingle();

  if (created?.id) {
    await db.from("ai_call_sessions").update({ contact_id: created.id }).eq("id", session.id);
    await db.from("calls").update({ contact_id: created.id }).eq("id", session.call_id);
  }
}

// ─── Settle ──────────────────────────────────────────────────────────────

/**
 * Close out an AI session at hangup: bill the real duration at the AI rate
 * and credit back whatever the reserve over-collected. Idempotent — a
 * second hangup event for the same leg is a no-op.
 */
export async function finalizeAiSession(
  db: Db,
  ccid: string,
  durationSeconds: number
): Promise<{ charged: number } | null> {
  const { data: raw } = await db
    .from("ai_call_sessions")
    .select("*")
    .eq("call_control_id", ccid)
    .maybeSingle();
  if (!raw || raw.ended_at) return null;
  const session = raw as AiCallSession & { ended_at: string | null };

  const charged = calcAiCallCharge(durationSeconds);
  const reserved = Number(session.reserved_amount) || 0;

  // Claim the settlement by stamping ended_at conditionally, so two
  // hangup events can't both refund.
  const { data: settled } = await db
    .from("ai_call_sessions")
    .update({
      state: "done",
      ended_at: new Date().toISOString(),
      charged_amount: charged,
      outcome: session.outcome || "abandoned",
    })
    .eq("id", session.id)
    .is("ended_at", null)
    .select("id")
    .maybeSingle();
  if (!settled) return null;

  if (reserved > charged) {
    await refund(
      db,
      session.user_id,
      +(reserved - charged).toFixed(4),
      `ai_call_refund_${session.id}`,
      "Unused AI call reserve"
    );
  } else if (charged > reserved) {
    // The last partial minute can land past the reserve. Small, and the
    // top-up loop keeps it to one minute at most.
    await debit(db, session.user_id, +(charged - reserved).toFixed(4));
  }

  return { charged };
}

export { formatDateNice, formatTime12 };
