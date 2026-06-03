// ── Inbound SMS carrier cost ───────────────────────────────────────────────
// Inbound texts are billed at the CARRIER's actual pass-through cost — what
// Telnyx charges us to RECEIVE a message — NOT the outbound price. Outbound
// pricing is set by the admin per user via `plan.messageCost`; inbound is a
// straight cost pass-through and must never use that number.
//
// Telnyx reports the exact cost on the message payload when it can; when it
// doesn't (inbound `cost` is frequently null), we fall back to this per-segment
// rate. Set this to match your Telnyx inbound SMS rate.
export const INBOUND_SMS_COST_PER_SEGMENT = 0.004; // USD per inbound segment

type TelnyxCost = { amount?: string | number | null; currency?: string | null } | null | undefined;

/**
 * Cost to charge for one inbound message.
 * Prefers Telnyx's reported `cost.amount` (the real carrier charge); otherwise
 * estimates from the segment/part count × the configured carrier rate above.
 */
export function inboundSmsCost(reportedCost: TelnyxCost, parts: number): number {
  const amt = reportedCost?.amount;
  const reported = amt == null ? NaN : Number(amt);
  if (Number.isFinite(reported) && reported > 0) {
    return Number(reported.toFixed(4));
  }
  const segs = Math.max(1, Math.floor(parts) || 1);
  return Number((segs * INBOUND_SMS_COST_PER_SEGMENT).toFixed(4));
}
