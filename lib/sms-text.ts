// ============================================================
// SMS text sanitization
// ------------------------------------------------------------
// A single Unicode character (curly quote, em-dash, ellipsis, …) in an
// otherwise ASCII message forces the entire SMS into UCS-2 encoding, which
// drops the per-segment limit from 160 chars (GSM-7) to 70 chars. At scale
// this can double or triple the segment count — and the cost — of a blast.
//
// The top offenders are almost always typographic substitutions that
// macOS / iOS / Word / LLM output introduce silently:
//   • curly single quotes:  ' '   → '
//   • curly double quotes:  " "   → "
//   • em-dash / en-dash:    — –   → -
//   • ellipsis:             …     → ...
//   • non-breaking space:   \u00A0 → regular space
//
// This module runs the same normalization everywhere a message body is
// touched before Telnyx sees it: dashboard composer (so the segment
// counter reflects real cost), /api/send-sms, /api/send-campaign,
// /api/scheduled-send, and both AI response endpoints (/api/ai-reply,
// /api/agent/run) so AI-generated text never pushes us into UCS-2 in the
// first place.
// ============================================================

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Single quotes / apostrophes
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  // Double quotes
  [/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'],
  // Dashes
  [/[\u2013\u2014\u2015]/g, "-"],
  // Ellipsis → three dots
  [/\u2026/g, "..."],
  // Bullet → asterisk
  [/[\u2022\u25CF\u2023]/g, "*"],
  // Non-breaking / thin / zero-width spaces → regular space (or strip ZWSP)
  [/[\u00A0\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F]/g, " "],
  [/[\u200B\u200C\u200D\uFEFF]/g, ""],
  // Soft hyphen → strip (invisible, burns a unicode slot for nothing)
  [/\u00AD/g, ""],
];

/**
 * Returns the message body with the typographic substitutions above
 * normalized back to ASCII equivalents. Safe to call on any string —
 * non-matching text passes through untouched.
 */
export function sanitizeForSms(body: string): string {
  if (!body) return body;
  let out = body;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Returns true if the (post-sanitized) body still contains any non-ASCII
 * character that would force UCS-2 encoding. The composer uses this to
 * show the "Unicode detected" warning only when there's a real reason.
 */
export function hasNonGsmChars(body: string): boolean {
  return /[^\x00-\x7F]/.test(body);
}

// ------------------------------------------------------------
// Chain-of-thought / reasoning-leak defense
// ------------------------------------------------------------
// Even with a strict system prompt, LLMs sometimes emit planning or
// narration prose as their text block ("Looking at the conversation,
// Charles just confirmed Ok. Before I send another message, I need to
// actually book that appointment..."). If that slips into Telnyx, the
// customer sees the AI talking to itself, which is a trust-destroying
// failure mode. This function catches the common leak patterns and
// returns a clean SMS — or an empty string if the entire reply was
// meta-commentary and there's nothing salvageable.

// Phrases that almost always mean "the model is narrating, not texting".
// We scan the start of the string (case-insensitive) and strip up to the
// next sentence boundary when we find one.
const REASONING_PREFIXES = [
  /^looking at (the|this) (conversation|thread|chat|history|message)[^.!?]*[.!?]\s*/i,
  /^based on (the|this) (conversation|thread|chat|history|message)[^.!?]*[.!?]\s*/i,
  /^(ok|okay|alright|so|well),?\s*(looking at|based on|given)[^.!?]*[.!?]\s*/i,
  /^(before i|first,? i|i('|\s)ll need to|i need to|let me|i('|\s)m going to|i will)[^.!?]*[.!?]\s*/i,
  /^(here('|\s)s (what|my|the)|i('|\s)ll (send|reply|respond|text))[^.!?]*[.!?]\s*/i,
  /^(my (response|reply|message|plan|approach) (is|will be|should be))[^.!?]*[.!?:]\s*/i,
  /^(i should|i would|i'd)[^.!?]*[.!?]\s*/i,
];

// Lines that are purely meta-commentary and can be dropped entirely.
const META_LINE = /^(thinking:|plan:|reasoning:|note:|step \d+:)/i;

// Trailing "Let me book the appointment first:" style hand-off phrases.
const TRAILING_HANDOFF = /\b(let me|i('|\s)ll|i will|i'm going to|i am going to)\s+(book|schedule|send|reply|respond|text|message|draft|write|check|look|verify|confirm)[^.!?]*:\s*$/i;

// ------------------------------------------------------------
// Refusal / operator-addressed output detection
// ------------------------------------------------------------
// Sometimes the model breaks the fourth wall entirely and addresses the
// user of the product (the agent running the campaign) instead of the
// customer on the other end of the SMS. Example leak:
//   "I appreciate you wanting me to continue the conversation, but I
//    need to point out something: the conversation history shows I
//    (jamie johnson) have been sending a lot of repetitive messages...
//    What would you like me to do?"
// That text MUST NEVER reach the lead. If we see any of these patterns
// we consider the entire output a refusal and return "" — the caller
// will then treat it as "no reply generated" (502 for the dashboard,
// silent no-op for webhook auto-replies).
const REFUSAL_PATTERNS: RegExp[] = [
  /\bI appreciate you\b/i,
  /\bI need to point out\b/i,
  /\bthe conversation history shows\b/i,
  /\bwhat would you like me to do\b/i,
  /\bif you want me to\b/i,
  /\blet me know what (they|he|she) said\b/i,
  /\bthe (best|natural|right) (next )?move is\b/i,
  /\bsince I don'?t have (their|his|her) (response|reply|answer)\b/i,
  /\bwithout (their|his|her) (response|reply|answer)\b/i,
  /\bI('| a)m (the|an?) (AI|bot|assistant|language model)\b/i,
  /\bas an AI\b/i,
  /\bI can'?t (continue|respond|reply|help with)\b/i,
  /\bI won'?t (continue|respond|send|reply)\b/i,
  /\bI('| wi)ll not (continue|send|reply|respond)\b/i,
  /\bI don'?t feel comfortable\b/i,
  /\bI'?m not (comfortable|able) (to|with)\b/i,
  /\b(pushy|repetitive|inappropriate) (and|to)\b/i,
  /\bIf they'?ve responded and I missed it\b/i,
  /\bwould be (pushy|spammy|inappropriate)\b/i,
];

/**
 * Return true if the output reads like the model is talking to the
 * operator (refusing, asking clarifying questions, narrating its own
 * reasoning about what to send) rather than producing an SMS aimed at
 * the customer.
 */
export function looksLikeRefusal(body: string): boolean {
  if (!body) return false;
  for (const rx of REFUSAL_PATTERNS) {
    if (rx.test(body)) return true;
  }
  return false;
}

/**
 * Strip chain-of-thought / planning prose from a model-generated SMS.
 * Safe to call on any string. Returns the cleaned body.
 */
export function stripReasoningLeaks(body: string): string {
  if (!body) return body;
  let out = body.trim();

  // Hard stop: if the reply reads like the model is addressing the
  // operator (refusing, asking "what would you like me to do?", etc.)
  // then NOTHING in it is safe to send as an SMS. Return "" so the
  // caller treats it as "no reply generated".
  if (looksLikeRefusal(out)) return "";

  // Drop whole lines that are obviously meta.
  out = out
    .split(/\r?\n/)
    .filter((line) => !META_LINE.test(line.trim()))
    .join("\n")
    .trim();

  // Peel off reasoning prefixes iteratively — the model sometimes
  // chains two ("Looking at the conversation, Charles confirmed. Before
  // I send another message, I need to book..."). Cap at 3 passes so we
  // never loop forever.
  for (let i = 0; i < 3; i++) {
    let matched = false;
    for (const rx of REASONING_PREFIXES) {
      if (rx.test(out)) {
        out = out.replace(rx, "").trim();
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }

  // Drop a trailing "Let me book the appointment first:" style hand-off.
  out = out.replace(TRAILING_HANDOFF, "").trim();

  return out;
}

/**
 * Convenience: sanitize + strip reasoning in one pass. Use this on
 * anything coming out of an LLM before it hits Telnyx or the composer.
 */
export function cleanAiSms(body: string): string {
  return stripReasoningLeaks(sanitizeForSms(body || "")).trim();
}
