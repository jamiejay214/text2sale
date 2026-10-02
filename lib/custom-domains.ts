// ─── Shared list of per-user compliance domains ──────────────────────────
// Both next.config.ts (host rewrites) and app/layout.tsx (schema suppression)
// need to know which hostnames are "branded compliance sites" vs the main
// text2sale.com marketing site. Keep in sync when onboarding a new user.

export const CUSTOM_DOMAINS: { domain: string; slug: string }[] = [
  { domain: "jjjohnsonhealth.org",       slug: "jjjohnsonhealth" },
  { domain: "www.jjjohnsonhealth.org",   slug: "jjjohnsonhealth" },
  { domain: "northernlegacyia.info",     slug: "northernlegacy"  },
  { domain: "www.northernlegacyia.info", slug: "northernlegacy"  },
];

export const CUSTOM_DOMAIN_HOSTS = new Set(CUSTOM_DOMAINS.map((d) => d.domain));

export function isCustomComplianceHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Strip port if present (e.g., "example.com:3000" during dev)
  const h = host.split(":")[0].toLowerCase();
  return CUSTOM_DOMAIN_HOSTS.has(h);
}

// ── Branded hosts ──────────────────────────────────────────────────────────
// The list above only covers the launch customers. Every customer who gets a
// domain through the activation flow is looked up in the database instead, so
// "is this a customer's site?" can't be answered from a hard-coded list.
// Everything that isn't Text2Sale's own host (or a preview/dev host) is one.

const MAIN_HOSTS = new Set(["text2sale.com", "www.text2sale.com", "localhost", "127.0.0.1"]);

export function normalizeHost(host: string | null | undefined): string {
  return (host || "").split(":")[0].toLowerCase();
}

export function isMainSiteHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return !h || MAIN_HOSTS.has(h) || h.endsWith(".vercel.app");
}

/** True for a customer's own domain (their compliance site), false for Text2Sale. */
export function isBrandedHost(host: string | null | undefined): boolean {
  return !isMainSiteHost(host);
}
