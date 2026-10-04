// ── Customer messaging pricing ────────────────────────────────────────────
// Public rates. Carrier/provider costs are intentionally not exposed as
// customer wallet charges. Inbound SMS is free to the customer.
export const STANDARD_SMS_RATE_PER_SEGMENT = 0.015;
export const VOLUME_SMS_RATE_PER_SEGMENT = 0.0135;
export const VOLUME_SMS_UNLOCK_AMOUNT = 500;
export const AI_REPLY_FEE = 0.02;

export function customerSmsRate(plan: { messageCost?: number | null } | null | undefined): number {
  // Only the exact approved volume rate is honored from stored legacy plan
  // JSON. Old $0.012 plans normalize to the current standard price.
  const stored = Number(plan?.messageCost);
  if (Math.abs(stored - VOLUME_SMS_RATE_PER_SEGMENT) < 0.000001) {
    return VOLUME_SMS_RATE_PER_SEGMENT;
  }
  return STANDARD_SMS_RATE_PER_SEGMENT;
}

// Provider-cost helpers are retained for internal reporting/forecasting only.
// They must never be used to debit a customer's wallet for inbound messages.
export const INBOUND_SMS_COST_PER_SEGMENT = 0.004;

type TelnyxCost = { amount?: string | number | null; currency?: string | null } | null | undefined;

export function inboundSmsCost(reportedCost: TelnyxCost, parts: number): number {
  const amt = reportedCost?.amount;
  const reported = amt == null ? NaN : Number(amt);
  if (Number.isFinite(reported) && reported > 0) {
    return Number(reported.toFixed(4));
  }
  const segs = Math.max(1, Math.floor(parts) || 1);
  return Number((segs * INBOUND_SMS_COST_PER_SEGMENT).toFixed(4));
}
