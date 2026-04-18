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
