// ── Paying for and registering a customer's website domain ────────────────
//
// Used by the activation driver (hands-off path) and by /api/domains (manual
// path). Validate contact details + live extension requirements first, then
// charge BEFORE placing an order and refund definitive registration failures.
//
// The driver can be interrupted between "charged" and "registered" (a function
// timeout, a deploy). A marker is written to the registration right after the
// charge so a later attempt resumes the purchase instead of charging a second
// time.

import { attachDomainToProject, buyDomain, DomainContactError, DomainPurchasePendingError, getDomainOrder, isDomainAvailable, isDomainOwned, prepareDomainPurchase, type BuyDomainArgs } from "./vercel-domains";
import { getUniqueSlug, isValidDomain, normalizeDomain, toSlug, type Db } from "./business-site";

/** What we add to the registrar price, covering renewal and handling. */
export const DOMAIN_MARKUP = 5;

/** Reject a quote that rose more than this above what the customer agreed to. */
const PRICE_TOLERANCE = 0.01;

export function priceToCharge(registrarPrice: number): number {
  return Math.round((registrarPrice + DOMAIN_MARKUP) * 100) / 100;
}

export type DomainPurchaseFailure = {
  ok: false;
  code:
    | "invalid"
    | "unavailable"
    | "price_changed"
    | "missing_details"
    | "insufficient"
    | "pending"
    | "registrar"
    | "not_configured";
  message: string;
  /** Current price, when it differs from what the customer agreed to. */
  price?: number;
  /** What the wallet is short by, when the code is "insufficient". */
  amountNeeded?: number;
  missing?: string[];
};

export type DomainPurchaseSuccess = {
  ok: true;
  domain: string;
  charged: number;
  balance: number | null;
  slug: string;
  attachWarning: string | null;
};

type Marker = {
  domain: string;
  state: "charged" | "ordered" | "bought" | "refunded";
  charged: number;
  at: string;
  orderId?: string;
};

type Reg = Record<string, unknown> & { domainPurchase?: Marker };

const refundPending = (price: number): DomainPurchaseFailure => ({
  ok: false,
  code: "pending",
  message: "We’re restoring your balance before retrying domain registration.",
  price,
});

export async function patchRegistration(db: Db, userId: string, patch: Record<string, unknown>) {
  const { data } = await db.from("profiles").select("a2p_registration").eq("id", userId).single();
  const reg = ((data?.a2p_registration as Reg | null) || {}) as Reg;
  await db
    .from("profiles")
    .update({ a2p_registration: { ...reg, ...patch, updatedAt: new Date().toISOString() } })
    .eq("id", userId);
}

/** Attach the apex and send www to it. Safe to call repeatedly. */
export async function ensureDomainAttached(domain: string): Promise<string | null> {
  try {
    await attachDomainToProject(domain);
  } catch (e) {
    return e instanceof Error ? e.message : "Domain attach failed";
  }
  try {
    await attachDomainToProject(`www.${domain}`, { redirectTo: domain });
  } catch {
    /* www is a convenience; the apex is what carriers load */
  }
  return null;
}

export async function purchaseDomainForUser(
  db: Db,
  userId: string,
  rawDomain: string,
  agreedPrice: number
): Promise<DomainPurchaseSuccess | DomainPurchaseFailure> {
  const domain = normalizeDomain(rawDomain);
  if (!isValidDomain(domain)) {
    return { ok: false, code: "invalid", message: "That doesn't look like a valid domain" };
  }
  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    return { ok: false, code: "invalid", message: "Confirm a valid price before purchase." };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("first_name, last_name, email, phone, a2p_registration, business_slug")
    .eq("id", userId)
    .single();
  if (!profile) return { ok: false, code: "registrar", message: "Account not found" };

  const reg = ((profile.a2p_registration as Reg | null) || {}) as Reg & Record<string, string | undefined>;
  if (reg.domainPurchase && reg.domainPurchase.domain !== domain && ["charged", "ordered"].includes(reg.domainPurchase.state)) {
    return { ok: false, code: "pending", message: "Your existing domain order must finish before another can begin.", price: reg.domainPurchase.charged };
  }
  const marker = reg.domainPurchase && reg.domainPurchase.domain === domain ? reg.domainPurchase : null;
  const resuming = marker?.state === "charged" || marker?.state === "ordered" || marker?.state === "bought";

  // ── Registrant details (before any money moves) ─────────────────────────
  // ICANN requires real WHOIS contact details, and they must be the
  // customer's own — the domain belongs to them, not to us. These come from
  // the business details they already gave us, so nothing extra to fill in.
  const registrant = {
    firstName: reg.contactFirstName || profile.first_name || "",
    lastName: reg.contactLastName || profile.last_name || "",
    email: reg.contactEmail || profile.email || "",
    phone: reg.contactPhone || profile.phone || "",
    address1: reg.businessAddress || "",
    city: reg.businessCity || "",
    state: reg.businessState || "",
    postalCode: reg.businessZip || "",
    orgName: reg.businessName || undefined,
    country: reg.businessCountry || reg.country || "US",
    businessType: reg.businessType,
  };

  // ── Quote ───────────────────────────────────────────────────────────────
  let quote: Awaited<ReturnType<typeof isDomainAvailable>> | null = null;
  let owned = marker?.state === "bought";

  // Registrar purchases are asynchronous. Once an order ID exists, check it
  // instead of attempting another purchase or re-quoting a now-reserved name.
  if (marker?.state === "ordered" && marker.orderId) {
    let order: Awaited<ReturnType<typeof getDomainOrder>>;
    try {
      order = await getDomainOrder(marker.orderId, domain);
    } catch (error) {
      return {
        ok: false,
        code: "pending",
        message: error instanceof Error ? error.message : "Domain registration is still processing.",
        price: marker.charged,
      };
    }
    if (order.status === "pending") {
      return { ok: false, code: "pending", message: "Domain registration is still processing.", price: marker.charged };
    }
    if (order.status === "failed") {
      const refunded = await refundMarker(
        db,
        userId,
        marker,
        `domain order failed: ${order.message || "registrar rejected order"}`
      );
      if (!refunded) return refundPending(marker.charged);
      return { ok: false, code: "registrar", message: order.message || "Domain registration failed" };
    }
    owned = true;
    await patchRegistration(db, userId, { domainPurchase: { ...marker, state: "bought" } });
  } else if (marker?.state === "charged") {
    owned = await isDomainOwned(domain).catch(() => false);
  }
  if (!owned) {
    try {
      quote = await isDomainAvailable(domain);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Availability check failed";
      return { ok: false, code: /not configured/i.test(msg) ? "not_configured" : "registrar", message: msg };
    }
    if (!quote.available || quote.price == null) {
      if (resuming && marker?.state === "charged") {
        const chargedMinutes = Math.max(0, (Date.now() - new Date(marker.at).getTime()) / 60_000);
        if (chargedMinutes < 10) {
          return {
            ok: false,
            code: "pending",
            message: "The registrar is confirming your domain order.",
            price: marker.charged,
          };
        }
        // Charged earlier, and the name has since gone. Refund below via the
        // generic failure path rather than leaving the customer out of pocket.
        const refunded = await refundMarker(db, userId, marker, "domain no longer available");
        if (!refunded) return refundPending(marker.charged);
      }
      return { ok: false, code: "unavailable", message: "That domain is no longer available" };
    }
  }

  const charge = quote?.price != null ? priceToCharge(quote.price) : (marker?.charged ?? agreedPrice);
  if (!resuming && charge > agreedPrice + PRICE_TOLERANCE) {
    return {
      ok: false,
      code: "price_changed",
      message: "The price changed — please confirm the new price",
      price: charge,
    };
  }

  // A schema lookup or incomplete registrant must NEVER start a new charge.
  // Already-accepted orders skip this preflight and only poll their order ID.
  let prepared: BuyDomainArgs | null = null;
  if (!owned) {
    try {
      prepared = await prepareDomainPurchase({ domain, expectedPrice: quote!.price!, ...registrant });
    } catch (error) {
      return {
        ok: false,
        code: error instanceof DomainContactError ? "missing_details" : "registrar",
        message: error instanceof Error ? error.message : "Could not validate domain registration details.",
        ...(error instanceof DomainContactError ? { missing: error.missing } : {}),
      };
    }
  }

  // ── Charge before buying ────────────────────────────────────────────────
  let balance: number | null = null;
  let chargedAmount = marker?.charged ?? charge;
  let activeMarker = marker;
  if (!resuming) {
    const { data: newBalance, error: debitErr } = await db.rpc("decrement_wallet", {
      p_user_id: userId,
      p_amount: charge,
    });
    if (debitErr || newBalance === null) {
      // Short by the full price when the balance is unknown, so the prompt
      // never under-asks.
      const { data: bal } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
      const have = Number(bal?.wallet_balance) || 0;
      return {
        ok: false,
        code: "insufficient",
        message: `Add $${Math.max(charge - have, 0).toFixed(2)} to your balance to register ${domain}.`,
        amountNeeded: Math.max(charge - have, 0),
        price: charge,
      };
    }
    balance = Number(newBalance);
    chargedAmount = charge;
    activeMarker = {
      domain,
      state: "charged",
      charged: charge,
      at: new Date().toISOString(),
    } satisfies Marker;
    await patchRegistration(db, userId, { domainPurchase: activeMarker });
  }

  // ── Register ────────────────────────────────────────────────────────────
  let purchaseOrderId = marker?.orderId;
  if (!owned) {
    let order: Awaited<ReturnType<typeof buyDomain>>;
    try {
      order = await buyDomain(prepared!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      if (e instanceof DomainPurchasePendingError || /fetch failed|network|timeout|timed out|abort/i.test(msg)) {
        return {
          ok: false,
          code: "pending",
          message: "The registrar is confirming your domain order.",
          price: chargedAmount,
        };
      }
      if (!activeMarker) {
        console.error("[domain-purchase] missing charge marker during refund:", userId, domain);
        return refundPending(chargedAmount);
      }
      const refunded = await refundMarker(db, userId, activeMarker, `domain purchase failed: ${msg}`);
      if (!refunded) return refundPending(chargedAmount);
      return { ok: false, code: "registrar", message: msg };
    }
    purchaseOrderId = order.orderId;
    const orderedMarker: Marker = {
      domain,
      state: "ordered",
      charged: chargedAmount,
      at: new Date().toISOString(),
      orderId: order.orderId,
    };
    await patchRegistration(db, userId, { domainPurchase: orderedMarker });
    let status: Awaited<ReturnType<typeof getDomainOrder>>;
    try {
      status = await getDomainOrder(order.orderId, domain);
    } catch {
      // The purchase request already returned an order ID, so a failed status
      // lookup is uncertain. Keep the charge/order and retry; never refund an
      // order that may already be completing at the registrar.
      return { ok: false, code: "pending", message: "Domain registration is still processing.", price: chargedAmount };
    }
    if (status.status === "pending") {
      return { ok: false, code: "pending", message: "Domain registration is still processing.", price: chargedAmount };
    }
    if (status.status === "failed") {
      const refunded = await refundMarker(
        db,
        userId,
        orderedMarker,
        `domain order failed: ${status.message || "registrar rejected order"}`
      );
      if (!refunded) return refundPending(chargedAmount);
      return { ok: false, code: "registrar", message: status.message || "Domain registration failed" };
    }
    owned = true;
  }
  await patchRegistration(db, userId, {
    domainPurchase: {
      domain,
      state: "bought",
      charged: chargedAmount,
      at: new Date().toISOString(),
      orderId: purchaseOrderId,
    } satisfies Marker,
  });

  // Registered and paid for. An attach failure from here is recoverable and
  // must not refund a domain the customer now owns — the driver keeps
  // retrying the attach while it waits for the site to come up.
  const attachWarning = await ensureDomainAttached(domain);

  // The site resolves by slug, so a domain without one would serve nothing.
  let slug = profile.business_slug as string | null;
  if (!slug) {
    slug = await getUniqueSlug(db, toSlug(reg.businessName || domain.split(".")[0]) || "site", userId);
  }
  await db.from("profiles").update({ custom_domain: domain, business_slug: slug }).eq("id", userId);

  // Show the charge in the customer's history exactly once, including when
  // an asynchronous order completed on a later activation pass.
  const { data: current } = await db.from("profiles").select("usage_history").eq("id", userId).single();
  const usage = Array.isArray(current?.usage_history) ? (current!.usage_history as Array<Record<string, unknown>>) : [];
  const historyId = `domain_${domain}`;
  if (!usage.some((entry) => entry.id === historyId)) {
    await db
      .from("profiles")
      .update({
        usage_history: [
          ...usage,
          {
            id: historyId,
            type: "charge",
            amount: chargedAmount,
            description: `Website domain ${domain} (1 year)`,
            createdAt: new Date().toISOString(),
            status: "succeeded",
          },
        ],
      })
      .eq("id", userId);
  }

  return { ok: true, domain, charged: chargedAmount, balance, slug, attachWarning };
}

function refundIdempotencyKey(userId: string, marker: Marker) {
  const attempt = marker.orderId || marker.at;
  return `domain_refund_${userId}_${marker.domain}_${attempt}`;
}

async function refundMarker(db: Db, userId: string, marker: Marker, why: string): Promise<boolean> {
  const refunded = await refund(db, userId, marker, why);
  if (refunded) {
    await patchRegistration(db, userId, { domainPurchase: { ...marker, state: "refunded" } });
  }
  return refunded;
}

async function refund(db: Db, userId: string, marker: Marker, why: string): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("credit_wallet", {
      p_user_id: userId,
      p_amount: marker.charged,
      p_idempotency_key: refundIdempotencyKey(userId, marker),
      p_description: `Refund — ${why}`.slice(0, 120),
    });
    if (error || data === null) {
      console.error("[domain-purchase] refund failed — needs reconciliation:", userId, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[domain-purchase] refund failed — needs reconciliation:", userId, e);
    return false;
  }
}
