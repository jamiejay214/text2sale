import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-guard";
import { isDomainAvailable, suggestDomains } from "@/lib/vercel-domains";
import { priceToCharge, purchaseDomainForUser, type DomainPurchaseFailure } from "@/lib/domain-purchase";
import { isValidDomain, normalizeDomain } from "@/lib/business-site";
import { createServiceClient } from "@/lib/messaging-driver";

// ── Website addresses ──────────────────────────────────────────────────────
//
// Carriers reject compliance pages hosted on a shared domain, so every
// customer needs a real address of their own. During activation the customer
// picks one from the suggestions here and the driver registers it once their
// balance covers it (lib/messaging-driver.ts); "buy" is the direct route for
// buying one on demand.
//
//   suggest  candidate names from their business name, with live availability
//            and price
//   check    availability and price for one specific name
//   buy      charge the wallet, then register and attach the domain
//
// Nothing is purchased without money in hand: "buy" debits the wallet first
// and refunds if registration fails, and it requires the caller to echo back
// the price they were shown so a quote that moves between check and buy can
// never charge more than the customer agreed to.

// Suggestions fan out to the registrar; keep one customer from hammering it.
const SUGGEST_LIMIT = 15;
const SUGGEST_WINDOW_MS = 60 * 60 * 1000;
const suggestCalls = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (suggestCalls.get(userId) || []).filter((t) => now - t < SUGGEST_WINDOW_MS);
  if (recent.length >= SUGGEST_LIMIT) {
    suggestCalls.set(userId, recent);
    return true;
  }
  recent.push(now);
  suggestCalls.set(userId, recent);
  return false;
}

const FAILURE_STATUS: Record<DomainPurchaseFailure["code"], number> = {
  invalid: 400,
  missing_details: 400,
  insufficient: 402,
  pending: 202,
  unavailable: 409,
  price_changed: 409,
  not_configured: 503,
  registrar: 502,
};

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  // ── suggest ─────────────────────────────────────────────────────────────
  if (action === "suggest") {
    const businessName = typeof body.businessName === "string" ? body.businessName : "";
    const industry = typeof body.industry === "string" ? body.industry : null;
    if (!businessName.trim()) {
      return NextResponse.json({ success: false, error: "Business name is required" }, { status: 400 });
    }
    if (rateLimited(auth.user.id)) {
      return NextResponse.json(
        { success: false, error: "Too many searches — try again in a little while." },
        { status: 429 }
      );
    }

    const candidates = suggestDomains(businessName, industry).slice(0, 8);
    let registrarProblem: string | null = null;
    const results = await Promise.all(
      candidates.map(async (domain) => {
        try {
          const status = await isDomainAvailable(domain);
          return {
            domain,
            available: status.available,
            premium: status.premium ?? false,
            price: status.price != null ? priceToCharge(status.price) : null,
            renewalPrice: status.renewalPrice != null ? priceToCharge(status.renewalPrice) : null,
          };
        } catch (e) {
          // Remember why, so "nothing available" and "registrar not set up"
          // aren't the same message to the customer.
          registrarProblem = e instanceof Error ? e.message : "Registrar unavailable";
          return { domain, available: false, premium: false, price: null, renewalPrice: null };
        }
      })
    );

    const suggestions = results
      .filter((r) => r.available && r.price != null && !r.premium)
      .sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
      .slice(0, 8);
    if (registrarProblem && suggestions.length === 0) {
      console.error("[domains] registrar unavailable:", registrarProblem);
    }
    return NextResponse.json({
      success: true,
      suggestions,
      // True when the registrar isn't configured or rejected us: the screen
      // then falls back to "I already own a domain".
      registrarAvailable: !(registrarProblem && suggestions.length === 0),
      registrarProblem:
        suggestions.length === 0 && registrarProblem
          ? "Automatic domain registration is not connected yet. Please try again shortly."
          : null,
    });
  }

  // ── check ───────────────────────────────────────────────────────────────
  if (action === "check") {
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
    if (!isValidDomain(domain)) {
      return NextResponse.json({ success: false, error: "That doesn't look like a valid domain" }, { status: 400 });
    }
    try {
      const status = await isDomainAvailable(domain);
      return NextResponse.json({
        success: true,
        domain,
        available: status.available,
        premium: status.premium ?? false,
        price: status.price != null ? priceToCharge(status.price) : null,
        renewalPrice: status.renewalPrice != null ? priceToCharge(status.renewalPrice) : null,
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Availability check failed" },
        { status: 502 }
      );
    }
  }

  // ── buy ─────────────────────────────────────────────────────────────────
  if (action === "buy") {
    const domain = normalizeDomain(typeof body.domain === "string" ? body.domain : "");
    const agreedPrice = typeof body.agreedPrice === "number" ? body.agreedPrice : null;
    if (!isValidDomain(domain)) {
      return NextResponse.json({ success: false, error: "That doesn't look like a valid domain" }, { status: 400 });
    }
    // Explicit consent to a specific figure is required — we never pick a
    // price for the customer and charge it.
    if (agreedPrice == null) {
      return NextResponse.json({ success: false, error: "Confirm the price before purchase" }, { status: 400 });
    }

    const result = await purchaseDomainForUser(createServiceClient(), auth.user.id, domain, agreedPrice);
    if (!result.ok) {
      if (result.code === "pending") {
        return NextResponse.json({
          success: true,
          pending: true,
          domain,
          charged: result.price ?? agreedPrice,
          message: result.message,
        }, { status: 202 });
      }
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          price: result.price,
          priceChanged: result.code === "price_changed",
          amountNeeded: result.amountNeeded,
          missing: result.missing,
        },
        { status: FAILURE_STATUS[result.code] }
      );
    }
    return NextResponse.json({
      success: true,
      domain: result.domain,
      charged: result.charged,
      balance: result.balance,
      attachWarning: result.attachWarning,
    });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
