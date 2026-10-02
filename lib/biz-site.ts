// ── Per-customer website: shared context ───────────────────────────────────
//
// Every page of a customer's generated site (home, opt-in, privacy, terms)
// needs the same things: who the business is, what industry wording to use,
// and — because the same pages are served both on the customer's own domain
// and under text2sale.com/biz/<slug> — how to link to each other and what the
// canonical address is. This is the one place that works those out.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchBusiness, getBusinessContact, getBusinessName, type BusinessProfile } from "./biz-fetch";
import { getIndustry, type Industry } from "./industries";
import { isBrandedHost } from "./custom-domains";

/**
 * When the policy and terms templates last changed. These pages used to print
 * today's date, which made every visit look like a fresh edit — to a reviewer
 * comparing what they saw last week, and to anyone relying on the date as a
 * record of when the terms took effect. Bump this when the wording changes.
 */
export const BIZ_LEGAL_UPDATED = "October 2, 2026";

export type SiteContext = {
  slug: string;
  biz: BusinessProfile;
  name: string;
  contact: ReturnType<typeof getBusinessContact>;
  industry: Industry;
  /** The customer's own description, or the industry default. */
  description: string;
  /** True when this request came in on the customer's own domain. */
  onOwnDomain: boolean;
  /** Build an href to one of this business's pages. */
  href: (path: "" | "/opt-in" | "/privacy-policy" | "/terms") => string;
  /** Absolute canonical URL for one of this business's pages. */
  canonical: (path: "" | "/opt-in" | "/privacy-policy" | "/terms") => string;
};

export async function loadSite(slug: string, opts: { required?: boolean } = {}): Promise<SiteContext | null> {
  const biz = await fetchBusiness(slug);
  if (!biz) {
    if (opts.required) notFound();
    return null;
  }

  const host = (await headers()).get("host");
  const onOwnDomain = isBrandedHost(host);
  const name = getBusinessName(biz);
  const industry = getIndustry(biz.industry);
  const prefix = onOwnDomain ? "" : `/biz/${slug}`;
  const origin = biz.custom_domain ? `https://${biz.custom_domain}` : `https://text2sale.com/biz/${slug}`;

  return {
    slug,
    biz,
    name,
    contact: getBusinessContact(biz),
    industry,
    description: biz.business_description?.trim() || industry.defaultDescription(name),
    onOwnDomain,
    href: (path) => `${prefix}${path}` || "/",
    canonical: (path) => `${origin}${path}`,
  };
}

/** The wording shown beside the unchecked consent box, and recorded with each opt-in. */
export function consentText(name: string, industry: Industry): string {
  return `By checking this box and entering my mobile number, I agree to receive recurring text messages from ${name} (${industry.messageTypes}) at the number provided. Message frequency varies. Message and data rates may apply. Reply STOP to cancel at any time or HELP for help. Consent is not a condition of any purchase. Mobile information will not be shared with third parties or affiliates for marketing or promotional purposes.`;
}
