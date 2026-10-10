// ── Yearly renewal of customer website domains ────────────────────────────
// Domains bought for customers are registered on the platform's Vercel
// account, and Vercel auto-renews them on the platform's card every year.
// The customer only ever paid for the first year, so every renewal after
// that was a platform cost.
//
// Now the platform keeps control of renewals:
//   1. Vercel auto-renew is switched OFF (it can only be switched off more
//      than 30 days before expiry; inside that window Vercel's own renewal
//      is already running and gets billed to the customer afterwards).
//   2. From RENEWAL_WINDOW_DAYS before expiry the customer's wallet is
//      charged the registrar renewal price + DOMAIN_MARKUP, and only then is
//      the renewal ordered. A failed order is refunded.
//   3. If the wallet can't cover it, the customer is emailed once and the
//      charge is retried daily until expiry. If it is never paid, the domain
//      simply expires — nothing renews on the platform's card.
//
// State lives on a2p_registration.domainRenewal (no extra columns).

export const RENEWAL_WINDOW_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RenewalMarker = {
  domain: string;
  /** Expiry date (ISO) the customer has paid through. */
  coveredUntil: string;
  /** A paid renewal waiting for the expiry date to move. */
  pending?: { fromExpiry: string; charged: number; orderId?: string; at: string } | null;
  lastError?: string | null;
  lastAttemptAt?: string | null;
  /** Expiry (ISO) the customer was last emailed about, to send one notice per cycle. */
  notifiedFor?: string | null;
};

export type RenewalDeps = {
  getInfo: (domain: string) => Promise<{ expiresAt: number | null; renew: boolean | null }>;
  setAutoRenew: (domain: string, on: boolean) => Promise<"ok" | "renewing" | "error">;
  getRenewalPrice: (domain: string) => Promise<number>;
  renew: (domain: string, expectedPrice: number) => Promise<{ ok: true; orderId: string } | { ok: false; code: string; message: string }>;
  getOrder: (orderId: string, domain: string) => Promise<{ status: "completed" | "failed" | "pending"; message?: string }>;
  /** Debit the wallet; true only if the full amount was taken. */
  charge: (amount: number) => Promise<boolean>;
  refund: (amount: number, key: string) => Promise<void>;
  save: (marker: RenewalMarker) => Promise<void>;
  notifyInsufficient: (domain: string, amount: number, expiresAt: Date) => Promise<void>;
  recordCharge: (domain: string, amount: number, catchUp: boolean) => Promise<void>;
  priceToCharge: (registrarPrice: number) => number;
};

export type RenewalOutcome =
  | "not_due"
  | "renewed"
  | "ordered"
  | "awaiting_order"
  | "caught_up"
  | "insufficient"
  | "inactive"
  | "expired"
  | "failed"
  | "skipped";

/** Run one domain's renewal step. Safe to run daily; every step is idempotent. */
export async function processDomainRenewal(
  input: { domain: string; marker: RenewalMarker | null; entitled: boolean; now?: Date },
  deps: RenewalDeps
): Promise<RenewalOutcome> {
  const now = input.now || new Date();
  const info = await deps.getInfo(input.domain);
  if (!info.expiresAt) return "skipped";
  const expiry = new Date(info.expiresAt);
  const expiryIso = expiry.toISOString();

  // First time this domain is seen: the current term was paid at purchase.
  let marker: RenewalMarker = input.marker && input.marker.domain === input.domain
    ? { ...input.marker }
    : { domain: input.domain, coveredUntil: expiryIso };
  let dirty = !input.marker || input.marker.domain !== input.domain;
  const save = async () => {
    if (dirty) await deps.save(marker);
    dirty = false;
  };

  // 1. Take renewals off the platform's card.
  if (info.renew !== false) {
    const result = await deps.setAutoRenew(input.domain, false);
    if (result === "error") {
      marker = { ...marker, lastError: "Could not turn off auto-renew" };
      dirty = true;
    }
  }

  // 2. A renewal we ordered has landed (expiry moved), or failed.
  if (marker.pending) {
    if (expiry.getTime() > new Date(marker.pending.fromExpiry).getTime()) {
      marker = { ...marker, coveredUntil: expiryIso, pending: null, lastError: null };
      dirty = true;
      await save();
      return "renewed";
    }
    // Charged but no order id was saved (interrupted before Vercel answered).
    // Refund and start over: if that order did go through, the expiry moves
    // and step 3 bills it once.
    if (!marker.pending.orderId && now.getTime() - new Date(marker.pending.at).getTime() > 60 * 60 * 1000) {
      await deps.refund(marker.pending.charged, `domain_renewal_refund_${input.domain}_${marker.pending.fromExpiry}`);
      marker = { ...marker, pending: null, lastError: "Renewal order was interrupted; it will be retried" };
      dirty = true;
      await save();
      return "failed";
    }
    if (marker.pending.orderId) {
      const order = await deps.getOrder(marker.pending.orderId, input.domain).catch(() => ({ status: "pending" as const }));
      if (order.status === "failed") {
        await deps.refund(marker.pending.charged, `domain_renewal_refund_${input.domain}_${marker.pending.fromExpiry}`);
        marker = { ...marker, pending: null, lastError: ("message" in order && order.message) || "Renewal order failed" };
        dirty = true;
        await save();
        return "failed";
      }
    }
    await save();
    return "awaiting_order";
  }

  const coveredUntil = new Date(marker.coveredUntil).getTime();

  // 3. Vercel renewed on its own (its window had already opened when auto-
  //    renew was switched off). The platform has paid; bill the customer.
  if (expiry.getTime() > coveredUntil + DAY_MS) {
    const amount = deps.priceToCharge(await deps.getRenewalPrice(input.domain));
    marker = { ...marker, lastAttemptAt: now.toISOString() };
    dirty = true;
    if (await deps.charge(amount)) {
      await deps.recordCharge(input.domain, amount, true);
      marker = { ...marker, coveredUntil: expiryIso, lastError: null };
      await save();
      return "caught_up";
    }
    marker = { ...marker, lastError: "Insufficient funds for the renewal Vercel already processed" };
    await save();
    return "insufficient";
  }

  // 4. Not due yet, or already expired.
  const daysLeft = (expiry.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft <= 0) {
    marker = { ...marker, lastError: "Expired without a paid renewal" };
    dirty = true;
    await save();
    return "expired";
  }
  if (daysLeft > RENEWAL_WINDOW_DAYS) {
    await save();
    return "not_due";
  }

  // 5. Due: charge first, then renew.
  if (!input.entitled) {
    marker = { ...marker, lastError: "Subscription inactive — domain will not be renewed" };
    dirty = true;
    await save();
    return "inactive";
  }
  const registrarPrice = await deps.getRenewalPrice(input.domain);
  const amount = deps.priceToCharge(registrarPrice);
  marker = { ...marker, lastAttemptAt: now.toISOString() };
  dirty = true;
  if (!(await deps.charge(amount))) {
    if (marker.notifiedFor !== expiryIso) {
      await deps.notifyInsufficient(input.domain, amount, expiry);
      marker = { ...marker, notifiedFor: expiryIso };
    }
    marker = { ...marker, lastError: `Insufficient funds — renewal costs $${amount.toFixed(2)}` };
    await save();
    return "insufficient";
  }
  // Record the charge before ordering, so a crash can't charge twice.
  marker = { ...marker, pending: { fromExpiry: expiryIso, charged: amount, at: now.toISOString() }, lastError: null };
  await save();

  const order = await deps.renew(input.domain, registrarPrice);
  if (!order.ok) {
    await deps.refund(amount, `domain_renewal_refund_${input.domain}_${expiryIso}`);
    marker = { ...marker, pending: null, lastError: order.message };
    dirty = true;
    await save();
    return "failed";
  }
  await deps.recordCharge(input.domain, amount, false);
  marker = { ...marker, pending: { ...marker.pending!, orderId: order.orderId } };
  dirty = true;
  await save();
  return "ordered";
}
