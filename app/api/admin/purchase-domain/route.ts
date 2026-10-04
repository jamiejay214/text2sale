import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { isDomainAvailable, buyDomain, DomainContactError, getDomainOrder, suggestDomains, suggestDomainBase } from "@/lib/vercel-domains";
import { ensureDomainAttached } from "@/lib/domain-purchase";
import { getUniqueSlug, isValidDomain, normalizeDomain, toSlug } from "@/lib/business-site";

// Owner-sponsored purchases preserve the old billing model: Vercel bills
// the platform, not the customer's wallet. They share the same registrar
// validation as customer purchases and persist an order before attaching.
const PRICE_CEILING_USD = 25;
type Marker = {
  domain: string;
  state: "charged" | "ordered" | "bought" | "refunded";
  charged: number;
  at: string;
  orderId?: string;
  registrarPrice?: number;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const adminFail = await requireAdmin(auth.user);
    if (adminFail) return adminFail;

    const body = (await req.json().catch(() => ({}))) as { userId?: string; domain?: string; dryRun?: boolean };
    if (!body.userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    const userId = body.userId;
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile, error: profErr } = await svc.from("profiles")
      .select("id, first_name, last_name, email, phone, business_slug, custom_domain, a2p_registration")
      .eq("id", userId).single();
    if (profErr || !profile) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const registration = (profile.a2p_registration || {}) as Record<string, unknown>;
    const a2p = registration as Record<string, string | undefined>;
    let marker = registration.domainPurchase as Marker | undefined;
    const active = marker && ["charged", "ordered", "bought"].includes(marker.state);
    let domain = normalizeDomain(body.domain) || (active ? marker!.domain : "");
    if (domain && !isValidDomain(domain)) return NextResponse.json({ success: false, error: "Invalid domain" }, { status: 400 });
    if (marker && ["charged", "ordered"].includes(marker.state) && domain !== marker.domain) {
      return NextResponse.json({ success: false, error: "Finish or reconcile the existing domain order before starting another." }, { status: 409 });
    }
    if (profile.custom_domain && (!domain || domain === profile.custom_domain)) {
      const attachError = body.dryRun ? null : await ensureDomainAttached(profile.custom_domain);
      return NextResponse.json({ success: !attachError, domain: profile.custom_domain, skipReason: "already_registered", attachError });
    }

    const businessName = a2p.businessName || "";
    if (!businessName && !domain) return NextResponse.json({ success: false, error: "Complete the user's business details before choosing a website." }, { status: 400 });
    const suggestions = businessName ? suggestDomains(businessName) : [];
    let quotedPrice = marker?.domain === domain && active ? marker.registrarPrice : undefined;
    const resuming = marker?.domain === domain && active;
    if (resuming && marker?.state === "charged") {
      return NextResponse.json({ success: true, pending: true, domain, note: "An earlier wallet purchase is awaiting reconciliation. No new order was placed." }, { status: 202 });
    }

    if (!resuming) {
      if (!domain) {
        for (const candidate of suggestions) {
          const status = await isDomainAvailable(candidate);
          if (!status.available || status.price == null || status.price <= 0 || status.premium || status.price > PRICE_CEILING_USD) continue;
          domain = candidate;
          quotedPrice = status.price;
          break;
        }
        if (!domain) return NextResponse.json({ success: false, error: "No affordable domain available from suggestions", suggestions, base: suggestDomainBase(businessName) });
      } else {
        const status = await isDomainAvailable(domain);
        if (!status.available) return NextResponse.json({ success: false, error: `${domain} is not available`, suggestions });
        quotedPrice = status.price;
        if (quotedPrice == null || quotedPrice <= 0) throw new Error("The registrar did not return a valid purchase price.");
        if (status.premium || quotedPrice > PRICE_CEILING_USD) return NextResponse.json({ success: false, error: `${domain} exceeds the $${PRICE_CEILING_USD} purchase ceiling.`, suggestions, price: quotedPrice });
      }
    }
    if (body.dryRun) return NextResponse.json({ success: true, dryRun: true, domain, price: quotedPrice, suggestions });

    const saveMarker = async (next: Marker) => {
      const { data: current, error: readErr } = await svc.from("profiles").select("a2p_registration").eq("id", userId).single();
      if (readErr) throw new Error("Could not read domain order tracking.");
      const { error } = await svc.from("profiles").update({ a2p_registration: { ...(current?.a2p_registration || {}), domainPurchase: next } }).eq("id", userId);
      if (error) throw new Error(`Could not save domain order tracking: ${error.message}`);
      marker = next;
    };

    if (!resuming) {
      const order = await buyDomain({
        domain, expectedPrice: quotedPrice!,
        firstName: a2p.contactFirstName || profile.first_name || a2p.firstName || "",
        lastName: a2p.contactLastName || profile.last_name || a2p.lastName || "",
        email: a2p.contactEmail || profile.email || a2p.email || "",
        phone: a2p.contactPhone || profile.phone || a2p.phone || "",
        address1: a2p.businessAddress || a2p.address1 || "",
        city: a2p.businessCity || a2p.city || "",
        state: a2p.businessState || a2p.state || "",
        postalCode: a2p.businessZip || a2p.postalCode || a2p.zip || "",
        country: a2p.businessCountry || a2p.country || "US",
        orgName: businessName, businessType: a2p.businessType, period: 1, renew: true,
      });
      const ordered: Marker = { domain, state: "ordered", charged: 0, registrarPrice: quotedPrice, at: new Date().toISOString(), orderId: order.orderId };
      try {
        await saveMarker(ordered);
      } catch (error) {
        return NextResponse.json({ success: false, pending: true, domain, orderId: order.orderId, error: error instanceof Error ? error.message : "Could not save order" }, { status: 500 });
      }
    }

    if (marker?.state === "ordered" && marker.orderId) {
      const order = await getDomainOrder(marker.orderId, domain);
      if (order.status === "pending") return NextResponse.json({ success: true, pending: true, domain, orderId: marker.orderId, note: "Registration is processing. Retry this action to check the same order; it will not purchase again." }, { status: 202 });
      if (order.status === "failed") return NextResponse.json({ success: false, domain, orderId: marker.orderId, error: order.message || "Registration failed. Reconcile this order before retrying." }, { status: 502 });
      await saveMarker({ ...marker, state: "bought" });
    }
    if (marker?.state !== "bought") throw new Error("Domain registration is not confirmed; no site was attached.");

    const attachError = await ensureDomainAttached(domain);
    const slug = profile.business_slug || await getUniqueSlug(svc, toSlug(businessName || domain.split(".")[0]) || "site", userId);
    const { error: updateErr } = await svc.from("profiles").update({ custom_domain: domain, business_slug: slug }).eq("id", userId);
    if (updateErr) return NextResponse.json({ success: false, error: `Domain purchased but DB update failed: ${updateErr.message}`, domain, orderId: marker.orderId }, { status: 500 });
    return NextResponse.json({ success: true, domain, price: quotedPrice, orderId: marker.orderId, slug, attachError, note: attachError ? "Domain registered; project attachment needs a retry." : "Domain registered. The website becomes live once DNS and SSL finish provisioning." });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error", ...(error instanceof DomainContactError ? { missing: error.missing } : {}) }, { status: error instanceof DomainContactError ? 400 : 502 });
  }
}
