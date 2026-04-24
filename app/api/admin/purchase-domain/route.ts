import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import {
  isDomainAvailable,
  buyDomain,
  attachDomainToProject,
  suggestDomains,
  suggestDomainBase,
} from "@/lib/vercel-domains";

// ─── Admin: buy a real TLD domain for a user + wire it up ─────────────────
// This is the one-click "give this user their own website" button. Flow:
//   1. If caller didn't pass a domain, we suggest candidates from the user's
//      business name (e.g. "Northern Legacy Insurance Agency LLC" →
//      northernlegacyins.com / .info / .org …) and probe Vercel for the
//      first one that's actually available + not premium-priced.
//   2. Buy the winning domain through Vercel (registrar). WHOIS contact info
//      comes from the user's a2p_registration so ICANN registers it in the
//      user's name, not ours. Registration is 1yr, auto-renew on.
//   3. Attach the domain to this Vercel project so DNS + SSL get configured
//      automatically — the compliance page is live within ~1min.
//   4. Write profiles.custom_domain so middleware.ts routes the new host to
//      /biz/<slug> on subsequent requests.
//
// The buy is charged to whatever card is on the Vercel billing profile —
// i.e. us. ~$12/yr for .com, less for .info/.org. Treat it as CAC — the
// alternative is asking users to buy + point DNS themselves which kills
// activation.
//
// Modes:
//   - { userId } alone → auto-pick a domain from suggestions
//   - { userId, domain } → use that exact domain (admin override)
//   - { userId, dryRun: true } → only probe availability, don't buy
//
// Response shape:
//   { success, domain, price, orderId?, suggestions?, skipReason? }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cap on what we'll spend automatically. Anything pricier (premium domain,
// .io quirks, etc.) gets bounced back with a price quote so the admin can
// decide manually.
const PRICE_CEILING_USD = 25;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const adminFail = await requireAdmin(auth.user);
    if (adminFail) return adminFail;

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      domain?: string;
      dryRun?: boolean;
    };
    const { userId, domain: pickedDomain, dryRun } = body;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await svc
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, business_slug, custom_domain, a2p_registration"
      )
      .eq("id", userId)
      .single();
    if (profErr || !profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (profile.custom_domain && !pickedDomain) {
      return NextResponse.json({
        success: false,
        error: `User already has custom domain: ${profile.custom_domain}`,
      });
    }

    // WHOIS contact info — registrar needs a real human on record. Prefer
    // a2p_registration since that's where they supplied business + mailing
    // address during compliance; fall back to profile basics.
    const a2p = (profile.a2p_registration || {}) as Record<string, string>;
    const businessName = a2p.businessName || "";
    if (!businessName && !pickedDomain) {
      return NextResponse.json({
        success: false,
        error:
          "User hasn't completed 10DLC registration yet — no business name to generate a domain from. Pass an explicit `domain` to override.",
      });
    }

    // Decide which domain to buy.
    let domain = pickedDomain?.toLowerCase().trim() || "";
    const suggestions = businessName ? suggestDomains(businessName) : [];
    let quotedPrice: number | undefined;

    if (!domain) {
      // Probe candidates in order until we find one that's available + under
      // the ceiling. Stop at first hit to save API calls.
      for (const candidate of suggestions) {
        const status = await isDomainAvailable(candidate);
        if (!status.available) continue;
        const price = status.price ?? 0;
        if (status.premium || price > PRICE_CEILING_USD) continue;
        domain = candidate;
        quotedPrice = price;
        break;
      }
      if (!domain) {
        return NextResponse.json({
          success: false,
          error: "No affordable domain available from suggestions",
          suggestions,
          base: suggestDomainBase(businessName),
        });
      }
    } else {
      const status = await isDomainAvailable(domain);
      if (!status.available) {
        return NextResponse.json({
          success: false,
          error: `${domain} is not available`,
          suggestions,
        });
      }
      quotedPrice = status.price ?? 0;
      if (status.premium || (quotedPrice ?? 0) > PRICE_CEILING_USD) {
        return NextResponse.json({
          success: false,
          error: `${domain} is premium ($${quotedPrice}) — exceeds $${PRICE_CEILING_USD} ceiling. Confirm manually.`,
          suggestions,
          price: quotedPrice,
        });
      }
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        domain,
        price: quotedPrice,
        suggestions,
      });
    }

    // WHOIS fields. Vercel rejects the order if any of the required ones
    // are missing — we surface a clear error rather than letting their
    // generic "invalid contact" bubble up.
    const required = {
      firstName: profile.first_name || a2p.firstName || "",
      lastName: profile.last_name || a2p.lastName || "",
      email: profile.email || a2p.email || "",
      phone: profile.phone || a2p.phone || "",
      address1: a2p.address1 || a2p.businessAddress || "",
      city: a2p.city || "",
      state: a2p.state || "",
      postalCode: a2p.postalCode || a2p.zip || "",
    };
    const missing = Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json({
        success: false,
        error: `Missing WHOIS fields on user profile: ${missing.join(", ")}`,
      });
    }

    // Normalize phone to E.164 (Vercel is strict). If already starts with +
    // we trust it; otherwise assume US.
    const phoneDigits = required.phone.replace(/\D/g, "");
    const phoneE164 = required.phone.startsWith("+")
      ? required.phone
      : phoneDigits.length === 10
        ? `+1${phoneDigits}`
        : `+${phoneDigits}`;

    const order = await buyDomain({
      domain,
      expectedPrice: quotedPrice ?? 0,
      firstName: required.firstName,
      lastName: required.lastName,
      email: required.email,
      phone: phoneE164,
      address1: required.address1,
      city: required.city,
      state: required.state,
      postalCode: required.postalCode,
      country: a2p.country || "US",
      orgName: businessName,
      period: 1,
      renew: true,
    });

    // Attach + persist. Do these sequentially — if attach fails we still
    // want the custom_domain saved so admin can retry attach without
    // re-buying.
    let attachError: string | null = null;
    try {
      await attachDomainToProject(domain);
    } catch (e) {
      attachError = e instanceof Error ? e.message : String(e);
    }

    // Slug: use existing business_slug; if user doesn't have one, derive
    // from the domain label (everything before the TLD).
    const slug =
      profile.business_slug ||
      domain.split(".")[0].replace(/[^a-z0-9-]/g, "") ||
      null;

    const { error: updateErr } = await svc
      .from("profiles")
      .update({
        custom_domain: domain,
        ...(profile.business_slug ? {} : { business_slug: slug }),
      })
      .eq("id", userId);
    if (updateErr) {
      return NextResponse.json({
        success: false,
        error: `Domain purchased but DB update failed: ${updateErr.message}`,
        domain,
        orderId: order.orderId,
      });
    }

    return NextResponse.json({
      success: true,
      domain,
      price: quotedPrice,
      orderId: order.orderId,
      slug,
      attachError,
      note: attachError
        ? "Domain purchased but attach to project failed — retry manually."
        : "Live in ~60s once DNS + SSL provision.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
