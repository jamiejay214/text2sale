// ── Free trial ─────────────────────────────────────────────────────────────
// New subscribers get a 7-day free trial. Checkout collects a card; Stripe
// takes the first monthly payment when the trial ends (day 8) unless the
// subscription is canceled first. One trial per Stripe customer.
// What a trial unlocks is described in lib/entitlements.ts.

export const TRIAL_DAYS = 7;

/** Short date for customer copy, e.g. "Nov 24". */
export function trialEndLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}
