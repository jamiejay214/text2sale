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
// leg, because on top of the carrier minute we pay Telnyx for real-time
// transcription and text-to-speech and Anthropic for each reasoning turn.
// Rough per-minute floor at the time of writing: ~$0.005 carrier +
// ~$0.05 transcription + ~$0.01 TTS + ~$0.005 LLM ≈ $0.07. The rate below
// keeps a working margin on top of that. It supersedes (does not stack
// with) CALL_RATE_INBOUND_PER_MIN for calls the assistant handles.
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
