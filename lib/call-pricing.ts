// ── Call pricing ─────────────────────────────────────────────────────────
// Flat wholesale markup on top of Telnyx's per-minute outbound/inbound
// rates. Telnyx's published US long-distance rate hovers around $0.007/min
// outbound + $0.0045/min inbound; we charge a simple flat to make the
// receipt easy to read and give ourselves margin on the toll-free variant
// that's more expensive to carry. Keep this in one place so pricing UI,
// wallet debits, and admin dashboards all stay in sync.

export const CALL_RATE_OUTBOUND_PER_MIN = 0.045;
export const CALL_RATE_INBOUND_PER_MIN = 0.025;

/** Round seconds up to the next minute (per-minute billing). */
export function minutesBilled(seconds: number): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.ceil(seconds / 60);
}

/** Compute charge in USD for a call of `seconds` in the given direction. */
export function calcCallCharge(
  direction: "inbound" | "outbound",
  seconds: number
): number {
  const rate =
    direction === "outbound"
      ? CALL_RATE_OUTBOUND_PER_MIN
      : CALL_RATE_INBOUND_PER_MIN;
  return +(minutesBilled(seconds) * rate).toFixed(4);
}

// ── AI voice assistant ───────────────────────────────────────────────────
// An AI-answered call costs materially more to carry than a plain inbound
// leg: on top of the carrier minute we pay Telnyx for real-time
// transcription and text-to-speech, and Anthropic for each reasoning turn.
//
// Cost build-up per minute, from Telnyx's published voice pricing and
// Anthropic's Haiku 4.5 rates (checked 2026-09; re-check before repricing):
//
//   carrier      $0.0052  inbound US local $0.002 + SIP inbound $0.0032
//   transcription ~$0.015  real-time STT ranges $0.0015 (Parakeet) to
//                          $0.027 (Azure); Google sits in between
//   TTS          ~$0.014  billed per CHARACTER, not per minute:
//                          $0.000048/char on the premium tier, and the
//                          assistant speaks roughly 300 chars in a minute
//                          of a turn-taking call
//   LLM          ~$0.008  Haiku 4.5 at $1/MTok in, $5/MTok out; ~2.5k
//                          input + ~60 output tokens, about 3 turns/min
//                          ───────
//                          ~$0.043
//
// So the rate below carries roughly a 4x margin. The dominant variable is
// TTS, because it is per-character: a chatty assistant costs more than a
// terse one, which is another reason the prompt caps answers at one or two
// sentences. Dropping speak() to `service_level: "basic"` would cut TTS
// 16x ($0.000003/char) at a real cost in how the voice sounds — a lever if
// margin ever matters more than the first impression a caller gets.
//
// Worth measuring later: the system prompt is resent every turn, so prompt
// caching could take a bite out of the LLM line if the prefix clears
// Haiku's minimum cacheable size.
//
// This rate supersedes (does not stack with) CALL_RATE_INBOUND_PER_MIN for
// calls the assistant handles.
export const AI_CALL_RATE_PER_MIN = 0.18;

// Minutes of AI-call time debited from the wallet BEFORE the assistant is
// allowed to answer. Nothing bills after the fact on this path: an empty
// wallet must not be able to run up a transcription + TTS + LLM bill. Any
// unused portion of the reserve is credited back at hangup.
export const AI_CALL_RESERVE_MINUTES = 2;
export const AI_CALL_MIN_RESERVE = +(AI_CALL_RATE_PER_MIN * AI_CALL_RESERVE_MINUTES).toFixed(4);

/** Compute the charge for `seconds` of AI-handled call time. */
export function calcAiCallCharge(seconds: number): number {
  return +(minutesBilled(seconds) * AI_CALL_RATE_PER_MIN).toFixed(4);
}
