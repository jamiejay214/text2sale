import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import {
  attachDomainToProject,
  buyDomain,
  isDomainAvailable,
  suggestDomains,
} from "@/lib/vercel-domains";

// ── Domain provisioning for activation ─────────────────────────────────────
//
// Carriers reject compliance pages hosted on a shared domain, so a customer
// without a website can't be activated on a text2sale.com/<slug> URL — that
// path was tried and removed. Instead we get them a real domain of their own
// here, host the compliance page on it, and register the brand against it.
//
// Three actions:
//   suggest  — candidate names derived from their business name, with live
//              availability and price
//   check    — availability and price for one specific name
//   buy      — charge the wallet, then register and attach the domain
//
// Nothing is purchased without money in hand: "buy" debits the wallet first
// and refunds if registration fails. It also requires the caller to echo back
// the price they were shown, so a customer can never be charged more than the
// figure they agreed to when the quote moves between check and buy.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** What we add to the registrar price, covering renewal and handling. */
const DOMAIN_MARKUP = 5;

/** Reject a quote that drifted more than this from what the customer saw. */
const PRICE_TOLERANCE = 0.01;

function priceToCharge(registrarPrice: number): number {
  return Math.round((registrarPrice + DOMAIN_MARKUP) * 100) / 100;
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  // ── suggest ─────────────────────────────────────────────────────────────
  if (action === "suggest") {
    const businessName = typeof body.businessName === "string" ? body.businessName : "";
    if (!businessName.trim()) {
      return NextResponse.json({ success: false, error: "Business name is required" }, { status: 400 });
    }

    const candidates = suggestDomains(businessName).slice(0, 6);
    const results = await Promise.all(
      candidates.map(async (domain) => {
        try {
          const status = await isDomainAvailable(domain);
          return {
            domain,
            available: status.available,
            premium: status.premium ?? false,
            price: status.price != null ? priceToCharge(status.price) : null,
          };
        } catch {
          // A registrar hiccup on one candidate shouldn't blank the whole list.
          return { domain, available: false, premium: false, price: null };
        }
      })
    );

    return NextResponse.json({
      success: true,
      suggestions: results.filter((r) => r.available && r.price != null),
      checked: results,
    });
  }

  // ── check ───────────────────────────────────────────────────────────────
  if (action === "check") {
    const domain = typeof body.domain === "string" ? body.domain.toLowerCase().trim() : "";
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
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
    const domain = typeof body.domain === "string" ? body.domain.toLowerCase().trim() : "";
    const agreedPrice = typeof body.agreedPrice === "number" ? body.agreedPrice : null;

    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      return NextResponse.json({ success: false, error: "That doesn't look like a valid domain" }, { status: 400 });
    }
    // Explicit consent to a specific figure is required — we never pick a
    // price for the customer and charge it.
    if (agreedPrice == null) {
      return NextResponse.json(
        { success: false, error: "Confirm the price before purchase" },
        { status: 400 }
      );
    }

    // Re-quote at purchase time; registrar pricing moves.
    let status: Awaited<ReturnType<typeof isDomainAvailable>>;
    try {
      status = await isDomainAvailable(domain);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Availability check failed" },
        { status: 502 }
      );
    }
    if (!status.available || status.price == null) {
      return NextResponse.json({ success: false, error: "That domain is no longer available" }, { status: 409 });
    }

    const charge = priceToCharge(status.price);
    if (Math.abs(charge - agreedPrice) > PRICE_TOLERANCE) {
      return NextResponse.json(
        {
          success: false,
          error: "The price changed — please confirm the new price",
          price: charge,
          priceChanged: true,
        },
        { status: 409 }
      );
    }

    const db = createClient(supabaseUrl, serviceKey);

    // ICANN requires real WHOIS contact details, and they must be the
    // customer's own — the domain belongs to them, not to us. These come
    // from the business details they already gave us during activation, so
    // there is nothing extra to fill in.
    const { data: profile } = await db
      .from("profiles")
      .select("first_name, last_name, email, phone, a2p_registration")
      .eq("id", auth.user.id)
      .single();

    const reg = (profile?.a2p_registration || {}) as Record<string, string | undefined>;
    const registrant = {
      firstName: profile?.first_name || reg.contactFirstName || "",
      lastName: profile?.last_name || reg.contactLastName || "",
      email: reg.contactEmail || profile?.email || "",
      phone: (reg.contactPhone || profile?.phone || "").replace(/[^\d+]/g, ""),
      address1: reg.businessAddress || "",
      city: reg.businessCity || "",
      state: reg.businessState || "",
      postalCode: reg.businessZip || "",
      orgName: reg.businessName || undefined,
    };

    const missing = (["firstName", "lastName", "email", "phone", "address1", "city", "state", "postalCode"] as const)
      .filter((k) => !registrant[k]);
    if (missing.length > 0) {
      // Fail before charging rather than taking money for a purchase the
      // registrar is certain to reject.
      return NextResponse.json(
        {
          success: false,
          error: "We need your business address and contact details before registering a domain.",
          missing,
        },
        { status: 400 }
      );
    }

    // E.164 for the registrar.
    const phone = registrant.phone.startsWith("+")
      ? registrant.phone
      : `+1${registrant.phone.replace(/^1/, "")}`;

    // ── Charge before buying ──────────────────────────────────────────────
    const { data: newBalance, error: debitErr } = await db.rpc("decrement_wallet", {
      p_user_id: auth.user.id,
      p_amount: charge,
    });
    if (debitErr || newBalance === null) {
      return NextResponse.json(
        {
          success: false,
          error: `Add $${charge.toFixed(2)} to your balance to register ${domain}.`,
          amountNeeded: charge,
        },
        { status: 402 }
      );
    }

    const refund = async (why: string) => {
      try {
        await db.rpc("credit_wallet", {
          p_user_id: auth.user.id,
          p_amount: charge,
          p_idempotency_key: null,
          p_description: `Refund — domain purchase failed: ${why.slice(0, 80)}`,
        });
      } catch (e) {
        console.error("[domains] refund failed — needs reconciliation:", auth.user.id, e);
      }
    };

    try {
      await buyDomain({
        domain,
        expectedPrice: status.price,
        ...registrant,
        phone,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      await refund(msg);
      return NextResponse.json({ success: false, error: msg }, { status: 502 });
    }

    // Registered and paid for. An attach failure from here is recoverable and
    // must not refund a domain the customer now owns.
    let attachWarning: string | null = null;
    try {
      await attachDomainToProject(domain);
    } catch (e) {
      attachWarning = e instanceof Error ? e.message : "Domain attach failed";
      console.error("[domains] attach failed:", domain, attachWarning);
    }

    await db.from("profiles").update({ custom_domain: domain }).eq("id", auth.user.id);

    return NextResponse.json({
      success: true,
      domain,
      charged: charge,
      balance: newBalance,
      attachWarning,
    });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
