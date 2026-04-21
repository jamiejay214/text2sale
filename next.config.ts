import type { NextConfig } from "next";

// ─── Custom-domain rewrites for per-user 10DLC compliance sites ──────────
// Each user has a /biz/<slug> page that satisfies Telnyx + TCR brand /
// campaign requirements. Some users point their own domain at our Vercel
// project (Namecheap → Vercel DNS), and we transparently serve their
// /biz/<slug> page when the host matches. URL stays on their domain (no
// visible redirect) so TCR/Telnyx are happy with the domain match.
//
// To add a new custom domain:
//   1. Add the domain in Vercel → Settings → Domains
//   2. Point DNS at Vercel (A 76.76.21.21 or CNAME cname.vercel-dns.com)
//   3. Add a new { domain, slug } entry below and redeploy
const CUSTOM_DOMAINS: { domain: string; slug: string }[] = [
  { domain: "jjjohnsonhealth.org",      slug: "jjjohnsonhealth" },
  { domain: "www.jjjohnsonhealth.org",  slug: "jjjohnsonhealth" },
  { domain: "northernlegacyia.info",     slug: "northernlegacy" },
  { domain: "www.northernlegacyia.info", slug: "northernlegacy" },
];

const nextConfig: NextConfig = {
  async rewrites() {
    // Two rules per domain:
    //   / → /biz/<slug>
    //   /(opt-in|privacy-policy|terms) → /biz/<slug>/<that>
    // We explicitly whitelist the subpaths instead of catch-all `:path*`
    // because Next.js's beforeFiles chain re-applies rules to already-
    // rewritten URLs, which would double-prefix us to
    // /biz/<slug>/biz/<slug>.
    const biz = CUSTOM_DOMAINS.flatMap(({ domain, slug }) => [
      {
        source: "/",
        has: [{ type: "host" as const, value: domain }],
        destination: `/biz/${slug}`,
      },
      {
        source: "/:path(opt-in|privacy-policy|terms)",
        has: [{ type: "host" as const, value: domain }],
        destination: `/biz/${slug}/:path`,
      },
    ]);
    return { beforeFiles: biz, afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
