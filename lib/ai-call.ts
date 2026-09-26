// ── AI call assistant ────────────────────────────────────────────────────
// A turn-based voice agent built on Telnyx Call Control. No always-on
// service and no extra vendors: Telnyx does the speech-to-text and the
// text-to-speech, each caller utterance arrives as an ordinary webhook, and
// we answer it with one Claude round trip.
//
// The turn loop, in webhook events:
//
//   call.answered      → start transcription, speak the greeting
//   call.speak.ended   → the line is ours to listen on again
//   call.transcription → caller said something; run a model turn
//   call.speak.ended   → ...and around again
//   call.hangup        → settle the wallet, write the summary
//
// Two things make that loop survive real traffic:
//
//  1. A caller's one sentence arrives as several `is_final` fragments.
//     The first webhook to see one claims a lease, waits out
//     TURN_DEBOUNCE_MS, then consumes everything that landed in the
//     meantime. Fragments that arrive while the lease is held are just
//     appended by their own webhook, which then exits.
//
//  2. We never run a turn while we are talking. Telnyx is asked to
//     transcribe the inbound track only, but a misconfigured connection
//     that echoed our own speech back would have the assistant answering
//     itself, so the state check is the real guard.
//
// Not interruptible: the caller cannot talk over the assistant mid
// sentence. That is the trade for having no streaming infrastructure.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  type AvailableHours,
  type AvailableSlot,
  formatDateNice,
  formatTime12,
} from "@/lib/availability";

const apiKey = process.env.TELNYX_API_KEY!;

// Haiku, not a bigger model, on purpose: a caller hears every millisecond of
// latency as dead air. Undated model id so we track the current Haiku 4.5
// snapshot. Thinking is deliberately left off for the same reason.
export const AI_CALL_MODEL = "claude-haiku-4-5";

/** How long we hold the turn lease. Longer than a worst-case model turn. */
export const TURN_LEASE_SECONDS = 25;

/**
 * How long to keep collecting speech fragments after the first final one
 * before handing the utterance to the model. Short enough not to feel like
 * a pause, long enough to catch "...uh, tomorrow morning" as one thought.
 */
export const TURN_DEBOUNCE_MS = 1200;

/** Stop taking turns well before any sane call would need them. */
export const MAX_TURNS = 40;

export const DEFAULT_VOICE = "Telnyx.KokoroTTS.af";

// Telnyx's transcription engine. Google handles phone-quality audio better
// than the built-in engine, and its `phone_call` model is trained on
// exactly this: 8kHz narrowband speech over a carrier. Override per
// deployment to try a different engine.
const TRANSCRIPTION_ENGINE = process.env.TELNYX_TRANSCRIPTION_ENGINE || "Google";

export type AiCallSession = {
  id: string;
  user_id: string;
  call_id: string | null;
  contact_id: string | null;
  call_control_id: string;
  from_number: string | null;
  to_number: string | null;
  state: "greeting" | "listening" | "thinking" | "speaking" | "transferring" | "done";
  turns: { role: "user" | "assistant"; content: string }[];
  pending_transcript: string;
  turn_count: number;
  appointment_id: string | null;
  outcome: string | null;
  next_action: "hangup" | "transfer" | null;
  collected: Record<string, unknown>;
  reserved_amount: number;
  charged_amount: number;
  started_at: string;
};

export type AiCallSettings = {
  enabled: boolean;
  greeting: string | null;
  instructions: string | null;
  voice: string;
  transferNumber: string | null;
  afterHoursOnly: boolean;
  maxMinutes: number;
};

// ─── Telnyx Call Control actions ─────────────────────────────────────────

async function callAction(
  ccid: string,
  action: string,
  body: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`https://api.telnyx.com/v2/calls/${ccid}/actions/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // A 422 on a call that has already hung up is normal and not worth a
    // stack trace; anything else is worth seeing in the logs.
    console.error(`[ai-call] ${action} failed ${res.status}: ${detail.slice(0, 300)}`);
    return false;
  }
  return true;
}

export async function answerCall(ccid: string, clientState: string) {
  return callAction(ccid, "answer", { client_state: clientState });
}

/**
 * Speak a line to the caller. `clientState` rides along so the
 * call.speak.ended webhook knows which session it belongs to.
 */
export async function speak(
  ccid: string,
  text: string,
  voice: string,
  clientState: string
) {
  return callAction(ccid, "speak", {
    payload: sanitizeForSpeech(text),
    voice: voice || DEFAULT_VOICE,
    language: "en-US",
    // Telnyx defaults this to "premium" anyway; set explicitly because it
    // is the single biggest cost line on an AI call (TTS is billed per
    // character, premium at 16x basic) and it should be a visible choice.
    // Premium wins here: this is the first thing a customer's caller
    // hears. See the cost build-up in lib/call-pricing.ts.
    service_level: "premium",
    client_state: clientState,
  });
}

export async function startTranscription(ccid: string, clientState: string) {
  // `language` and `interim_results` are NOT top-level fields on this
  // action — they live inside transcription_engine_config, and the shape of
  // that object depends on which engine is selected. Passing them at the
  // top level (as an earlier version of this did) silently drops them.
  const engineConfig: Record<string, unknown> = {
    transcription_engine: TRANSCRIPTION_ENGINE,
    language: "en",
  };
  if (TRANSCRIPTION_ENGINE === "Google") {
    engineConfig.interim_results = false;
    // Trained on 8kHz narrowband carrier audio, which is exactly what a
    // phone call is. Materially better than the default on this input.
    engineConfig.model = "phone_call";
    engineConfig.use_enhanced = true;
  }

  return callAction(ccid, "transcription_start", {
    transcription_engine: TRANSCRIPTION_ENGINE,
    transcription_engine_config: engineConfig,
    // Caller audio only. Transcribing our own track would feed the
    // assistant's own words back to it as caller speech. This is the
    // documented default; set explicitly because the cost of being wrong
    // is the assistant holding a conversation with itself.
    transcription_tracks: "inbound",
    client_state: clientState,
  });
}

export async function stopTranscription(ccid: string) {
  return callAction(ccid, "transcription_stop", {});
}

export async function transferCall(ccid: string, to: string, from: string) {
  return callAction(ccid, "transfer", { to, from });
}

export async function hangupCall(ccid: string) {
  return callAction(ccid, "hangup", {});
}

// ─── Speech shaping ──────────────────────────────────────────────────────

/**
 * Text-to-speech reads punctuation and markup literally. Strip anything
 * the model might emit that a person would never say out loud.
 */
export function sanitizeForSpeech(text: string): string {
  return (text || "")
    // Emoji and pictographs.
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, "")
    // Markdown emphasis and code fences.
    .replace(/[*_`#>]/g, "")
    // Bullets and list markers at the start of a line.
    .replace(/^\s*[-•]\s*/gm, "")
    // Collapse whitespace — a newline becomes an audible stumble.
    .replace(/\s+/g, " ")
    .trim()
    // Telnyx caps a single speak payload; a long answer is a bug anyway.
    .slice(0, 800);
}

/** Say "2:00 PM" as "2 PM" so TTS doesn't read "two colon zero zero". */
export function speakableTime(time: string): string {
  const pretty = formatTime12(time);
  return pretty.replace(":00", "");
}

export function speakableSlot(slot: AvailableSlot): string {
  return `${formatDateNice(slot.date)} at ${speakableTime(slot.time)}`;
}

// ─── Prompt ──────────────────────────────────────────────────────────────

export function defaultGreeting(businessName: string): string {
  return `Thanks for calling ${businessName}. I'm the scheduling assistant. How can I help you today?`;
}

export function buildVoicePrompt(opts: {
  businessName: string;
  agentName: string;
  industry: string;
  instructions: string;
  callerName: string;
  callerPhone: string;
  slots: AvailableSlot[];
  timezone: string;
  slotDuration: number;
  canTransfer: boolean;
}): string {
  const slotList = opts.slots.length
    ? opts.slots.map((s, i) => `${i + 1}. ${speakableSlot(s)}  [book as date=${s.date} time=${s.time}]`).join("\n")
    : "(no open times in the next two weeks)";

  const custom = opts.instructions?.trim()
    ? `
════════════════════════════════════════════════════
${opts.agentName.toUpperCase()}'S INSTRUCTIONS — HIGHEST PRIORITY
These override anything else below whenever they conflict:

${opts.instructions.trim()}
════════════════════════════════════════════════════
`
    : "";

  return `You are the scheduling assistant answering the phone for ${opts.businessName}${
    opts.industry && opts.industry !== "other" ? `, a ${opts.industry} business` : ""
  }. Someone has just called in. Your job is to find out what they need and get them on the calendar.

YOU ARE ON A PHONE CALL. Everything you write is read aloud to the caller by a speech synthesizer.
- One or two short sentences per turn. Never more.
- Ask ONE question at a time, then stop and wait for the answer.
- No lists, no bullet points, no numbers-as-digits-in-a-row, no emoji, no markdown, no formatting of any kind.
- Plain spoken English. Contractions are good. "Sure thing", "got it", "no problem".
- Never read out a URL, an email address spelled letter by letter, or a phone number unless the caller asks for it.
- Speech-to-text is imperfect. If a name or number came through garbled, ask them to repeat it rather than guessing.
- If the caller goes quiet or says something you can't make sense of, ask a simple clarifying question. Don't fill the silence with chatter.

HONESTY — NOT OPTIONAL:
- You are an automated assistant. If the caller asks whether you are a person, a robot, a recording, or an AI, tell them the truth plainly and immediately: you're an automated assistant for ${opts.businessName}. Then carry straight on with helping them. One short sentence, no apology, no lecture.
- Never claim to be a specific human being, and never claim to be ${opts.agentName}.
- Never invent prices, coverage, medical or legal advice, policy details, or anything about the caller's account. If you don't know, say you'll have ${opts.agentName} follow up, and take a message.
- Never promise a time that isn't in the list below.

WHAT YOU CAN DO:
1. Book an appointment from the open times listed below (book_appointment).
2. Take a message for ${opts.agentName} when nothing on the list works, when the caller doesn't want to book, or when they're asking something you can't answer (take_message).
${opts.canTransfer ? "3. Put the caller through to a person when they ask for one, or when they're upset (transfer_to_human).\n4. End the call once they're done (end_call)." : "3. End the call once they're done (end_call). You have no way to transfer to a person — if they insist on a human, take a message and tell them someone will call back."}

HOW THE CALL SHOULD GO:
- Find out why they're calling. Just listen first.
- If they want to be seen, talked to, quoted, or scheduled: get their name, then offer the SOONEST open time. One time, not a menu of them.
- If that time doesn't work, offer the next one. Two or three tries, then take a message instead of grinding.
- Before you book, make sure you have their name. Confirm the day and time back to them in plain words after booking.
- Always close by telling them what happens next.

OPEN TIMES (${opts.timezone}, ${opts.slotDuration} minutes each, soonest first):
${slotList}

BOOKING RULES:
- Only ever book one of the exact times listed. The bracketed date and time are what you pass to the tool.
- If the caller asks for a time that isn't listed, tell them it's taken and offer the closest one that is.
- Call the tool AND say your line in the same turn. Your spoken line is what the caller hears — it must never describe what you're doing ("let me book that"), it must be the thing you'd actually say ("you're all set for Thursday at 2").

CALLER:
- Calling from: ${opts.callerPhone || "unknown number"}
${opts.callerName ? `- Known to you as: ${opts.callerName}` : "- Not in the contact list. Ask for their name."}
${custom}`;
}

// ─── Tools ───────────────────────────────────────────────────────────────

export function buildVoiceTools(opts: { hasSlots: boolean; canTransfer: boolean }) {
  const tools: Record<string, unknown>[] = [];

  if (opts.hasSlots) {
    tools.push({
      name: "book_appointment",
      description:
        "Book one of the listed open times. Use as soon as the caller agrees to a specific time. Requires their name.",
      input_schema: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD, exactly as listed in the open times." },
          time: { type: "string", description: "HH:MM:SS, exactly as listed in the open times." },
          caller_name: { type: "string", description: "The caller's name as they gave it." },
          title: { type: "string", description: "Short reason for the appointment, e.g. 'New patient visit'." },
        },
        required: ["date", "time", "caller_name"],
      },
    });
  }

  tools.push({
    name: "take_message",
    description:
      "Record a callback message. Use when no listed time works, when the caller doesn't want to book, or when they asked something you cannot answer.",
    input_schema: {
      type: "object",
      properties: {
        caller_name: { type: "string", description: "The caller's name." },
        callback_number: {
          type: "string",
          description: "Best number to call back. Default to the number they're calling from if they don't give another.",
        },
        reason: { type: "string", description: "What they need, in one or two sentences." },
        urgency: { type: "string", enum: ["normal", "urgent"], description: "Urgent only if they said it was." },
      },
      required: ["caller_name", "reason"],
    },
  });

  if (opts.canTransfer) {
    tools.push({
      name: "transfer_to_human",
      description:
        "Put the caller through to a real person. Use when they ask for one, or when they are upset or the matter is clearly beyond scheduling.",
      input_schema: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Why you're transferring." },
        },
        required: [],
      },
    });
  }

  tools.push({
    name: "end_call",
    description: "Hang up. Use only once the caller's business is finished and you've said goodbye.",
    input_schema: {
      type: "object",
      properties: {
        outcome: {
          type: "string",
          enum: ["booked", "message_taken", "declined"],
          description: "How the call resolved.",
        },
      },
      required: [],
    },
  });

  return tools;
}

// ─── Model turn ──────────────────────────────────────────────────────────

export type ModelTurn = {
  say: string;
  toolName: string | null;
  toolInput: Record<string, any>;
  toolUseId: string | null;
  rawContent: unknown[];
};

export async function runModelTurn(opts: {
  systemPrompt: string;
  tools: Record<string, unknown>[];
  turns: { role: "user" | "assistant"; content: any }[];
}): Promise<ModelTurn | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("[ai-call] ANTHROPIC_API_KEY is not set");
    return null;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AI_CALL_MODEL,
      // A spoken turn is one or two sentences. Capping this low keeps the
      // model from monologuing at someone on a phone, and keeps latency
      // inside the window where a pause still feels like a pause.
      max_tokens: 200,
      system: opts.systemPrompt,
      tools: opts.tools.length ? opts.tools : undefined,
      messages: opts.turns,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    console.error("[ai-call] Claude error:", JSON.stringify(data)?.slice(0, 400));
    return null;
  }

  const content: any[] = data.content || [];
  const textBlock = content.find((c) => c.type === "text");
  const toolUse = content.find((c) => c.type === "tool_use");

  return {
    say: sanitizeForSpeech(textBlock?.text || ""),
    toolName: toolUse?.name || null,
    toolInput: (toolUse?.input as Record<string, any>) || {},
    toolUseId: toolUse?.id || null,
    rawContent: content,
  };
}

// ─── Settings ────────────────────────────────────────────────────────────

export function settingsFromProfile(profile: any): AiCallSettings {
  return {
    enabled: !!profile?.ai_call_enabled,
    greeting: profile?.ai_call_greeting || null,
    instructions: profile?.ai_call_instructions || null,
    voice: profile?.ai_call_voice || DEFAULT_VOICE,
    transferNumber: profile?.ai_call_transfer_number || null,
    afterHoursOnly: !!profile?.ai_call_after_hours_only,
    maxMinutes: Number(profile?.ai_call_max_minutes) || 10,
  };
}

export function businessNameFor(profile: any): string {
  const a2p = profile?.a2p_registration;
  const company = typeof a2p?.companyName === "string" ? a2p.companyName.trim() : "";
  if (company) return company;
  const person = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  return person || "our office";
}

/**
 * True when the current moment falls inside the operator's configured
 * business hours. Used only by the after-hours-only mode, which wants the
 * assistant to stay out of the way while someone is actually at the desk.
 */
export function isWithinBusinessHours(hours: AvailableHours | null): boolean {
  if (!hours?.enabled || !hours.slots) return false;
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: hours.timezone || "America/New_York" })
  );
  const day = hours.slots[names[now.getDay()]];
  if (!day?.enabled) return false;
  const [sh, sm] = day.start.split(":").map(Number);
  const [eh, em] = day.end.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins < eh * 60 + em;
}
