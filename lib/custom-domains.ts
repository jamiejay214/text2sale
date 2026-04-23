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
