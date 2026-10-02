// ── Business details validation ────────────────────────────────────────────
//
// What a customer tells us once, and what every later step (website, brand,
// campaign, domain WHOIS) is built from. Validating it properly at the door
// matters more than it looks: a bad EIN or a mismatched address is rejected by
// the carriers hours later, and the retry costs a second brand fee. Catching
// the obvious mistakes here costs nothing.
//
// Pure — no I/O — so the same checks run in the route and the test script.

import { isIndustryId, type IndustryId } from "./industries";

export type WebsiteChoice =
  | { mode: "own"; url: string }
  /** A domain they already own and will point at us. */
  | { mode: "hosted"; customDomain: string }
  /** A domain we register for them, paid from their balance. */
  | { mode: "hosted"; domainRequest: { domain: string; price: number } }
  /** Keep the website address they already have (re-submitting after a rejection). */
  | { mode: "hosted"; keepExisting: true };

export type BusinessDetails = {
  businessName: string;
  businessType: "llc" | "corporation" | "partnership" | "non_profit" | "sole_proprietor";
  ein: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  contactEmail: string;
  contactPhone: string;
  industry: IndustryId;
  businessDescription: string;
  areaCode: string | null;
  website: WebsiteChoice;
};

export type Validated = { ok: true; value: BusinessDetails } | { ok: false; error: string };

const BUSINESS_TYPES = ["llc", "corporation", "partnership", "non_profit", "sole_proprietor"] as const;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 10-digit US number, or "" when it isn't one. */
export function usPhoneDigits(raw: unknown): string {
  const d = String(raw ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? d : "";
}

export function normalizeWebsiteUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!u.hostname.includes(".")) return null;
    return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function domainOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/^www\./, "");
}

const isOurDomain = (domain: string) => domain === "text2sale.com" || domain.endsWith(".text2sale.com") || domain.endsWith(".vercel.app");

export function validateBusinessDetails(body: Record<string, unknown>): Validated {
  const businessName = str(body.businessName, 100);
  if (businessName.length < 2) return { ok: false, error: "Enter your legal business name." };

  const einDigits = str(body.ein, 20).replace(/\D/g, "");
  if (einDigits.length !== 9) return { ok: false, error: "Your EIN must be 9 digits (XX-XXXXXXX)." };

  const businessAddress = str(body.businessAddress, 100);
  const businessCity = str(body.businessCity, 100);
  // Not truncated: "Texas" would otherwise pass as "TE".
  const businessState = str(body.businessState, 30).toUpperCase();
  const businessZip = str(body.businessZip, 10);
  if (businessAddress.length < 3) return { ok: false, error: "Enter your business street address." };
  if (businessCity.length < 2) return { ok: false, error: "Enter your business city." };
  if (!/^[A-Z]{2}$/.test(businessState)) return { ok: false, error: "Enter your 2-letter state, like FL." };
  if (!/^\d{5}(-\d{4})?$/.test(businessZip)) return { ok: false, error: "Enter a 5-digit ZIP code." };

  const phoneDigits = usPhoneDigits(body.contactPhone);
  if (!phoneDigits) return { ok: false, error: "Enter a 10-digit US business phone number." };

  const contactEmail = str(body.contactEmail, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, error: "Enter a valid business email." };

  const businessType = (BUSINESS_TYPES as readonly string[]).includes(String(body.businessType))
    ? (body.businessType as BusinessDetails["businessType"])
    : "llc";

  const industry: IndustryId = isIndustryId(body.industry) ? body.industry : "other";
  const businessDescription = str(body.businessDescription, 500);
  const area = str(body.areaCode, 3).replace(/\D/g, "");
  const areaCode = area.length === 3 ? area : null;

  // ── Website ────────────────────────────────────────────────────────────
  let website: WebsiteChoice;
  if (body.hasWebsite === "yes") {
    const url = normalizeWebsiteUrl(str(body.website, 200));
    if (!url) return { ok: false, error: "Enter your website address, like https://yourbusiness.com." };
    if (isOurDomain(domainOf(url))) {
      return { ok: false, error: "Use your own website address — Text2Sale addresses can't be used as your business website." };
    }
    if (url.length > 100) return { ok: false, error: "That website address is too long." };
    website = { mode: "own", url };
  } else {
    const req = body.domainRequest as { domain?: unknown; price?: unknown } | null | undefined;
    const requested = typeof req?.domain === "string" ? domainOf(req.domain.toLowerCase()) : "";
    const owned = domainOf(str(body.customDomain, 120).toLowerCase());
    if (requested) {
      const price = Number(req?.price);
      if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/.test(requested) || isOurDomain(requested)) {
        return { ok: false, error: "That doesn't look like a valid website address." };
      }
      if (!Number.isFinite(price) || price <= 0 || price > 500) {
        return { ok: false, error: "Confirm the price of your website address and try again." };
      }
      website = { mode: "hosted", domainRequest: { domain: requested, price: Math.round(price * 100) / 100 } };
    } else if (owned) {
      if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/.test(owned) || isOurDomain(owned)) {
        return { ok: false, error: "That doesn't look like a valid domain. Use the format yourbusiness.com." };
      }
      website = { mode: "hosted", customDomain: owned };
    } else {
      website = { mode: "hosted", keepExisting: true };
    }
  }

  return {
    ok: true,
    value: {
      businessName,
      businessType,
      ein: `${einDigits.slice(0, 2)}-${einDigits.slice(2)}`,
      businessAddress,
      businessCity,
      businessState,
      businessZip,
      contactEmail,
      contactPhone: `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`,
      industry,
      businessDescription,
      areaCode,
      website,
    },
  };
}
