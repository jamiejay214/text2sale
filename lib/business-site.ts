// ── Per-customer website helpers ───────────────────────────────────────────
//
// Every customer gets a compliance website generated from their details (the
// /biz/<slug> pages). Carriers read it during brand and campaign review, so
// the driver must not submit a registration until the site is actually
// reachable — a brand whose website 404s or fails DNS is rejected, and a
// rejection costs a fresh brand fee to retry.

import type { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = ReturnType<typeof createClient<any, any, any>>;

export const MAIN_SITE = "https://text2sale.com";

/** A URL-safe slug from a business name. */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug that no other account uses: appends -2, -3, … on collision. */
export async function getUniqueSlug(db: Db, base: string, userId: string): Promise<string> {
  let slug = base;
  let suffix = 1;
  for (;;) {
    const { data } = await db
      .from("profiles")
      .select("id")
      .eq("business_slug", slug)
      .neq("id", userId)
      .maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

/** Lower-case host with scheme, path, port and leading www removed. */
export function normalizeDomain(input: string | null | undefined): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export function isValidDomain(domain: string): boolean {
  return /^(?=.{4,100}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(domain);
}

/**
 * Where a customer's pages live: their own domain when they have one,
 * otherwise a path on the main site.
 */
export function siteBase(opts: { customDomain?: string | null; slug: string }): string {
  const domain = normalizeDomain(opts.customDomain);
  return domain ? `https://${domain}` : `${MAIN_SITE}/biz/${opts.slug}`;
}

export function siteUrls(base: string) {
  const b = base.replace(/\/+$/, "");
  return { home: b, optIn: `${b}/opt-in`, privacy: `${b}/privacy-policy`, terms: `${b}/terms` };
}

export type ProbeResult = { live: boolean; status: number; reason: string };

/**
 * Is this page up, and is it the right page?
 *
 * `expectText` guards against a domain that resolves but serves something
 * else (a registrar parking page, or our own marketing homepage because the
 * slug lookup missed) — both of which a reviewer would reject.
 */
export async function probeSite(url: string, expectText?: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Text2SaleSiteCheck/1.0", accept: "text/html" },
      cache: "no-store",
    });
    if (res.status >= 500) return { live: false, status: res.status, reason: `Site returned HTTP ${res.status}` };
    if (!expectText) {
      // Any answer below 500 proves DNS and hosting work. A 401/403 is a
      // site that blocks bots, not a site that is down.
      return { live: true, status: res.status, reason: "reachable" };
    }
    if (res.status !== 200) return { live: false, status: res.status, reason: `Page returned HTTP ${res.status}` };
    const html = (await res.text()).toLowerCase();
    const needle = expectText.toLowerCase().replace(/&/g, "&amp;");
    if (!html.includes(expectText.toLowerCase()) && !html.includes(needle)) {
      return { live: false, status: 200, reason: "Page is up but does not show the business name yet" };
    }
    return { live: true, status: 200, reason: "live" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "request failed";
    return { live: false, status: 0, reason: /enotfound|getaddrinfo|dns/i.test(msg) ? "Domain is not resolving yet (DNS)" : `Could not reach the site (${msg})` };
  }
}
