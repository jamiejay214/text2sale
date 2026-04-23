import type { NextConfig } from "next";
import { CUSTOM_DOMAINS } from "./lib/custom-domains";

// ─── Custom-domain rewrites for per-user 10DLC compliance sites ──────────
// Each user has a /biz/<slug> page that satisfies Telnyx + TCR brand /
// campaign requirements. Some users point their own domain at our Vercel
// project (Namecheap → Vercel DNS), and we transparently serve their
// /biz/<slug> page when the host matches. URL stays on their domain (no
// visible redirect) so TCR/Telnyx are happy with the domain match.
//
// Domain list lives in lib/custom-domains.ts so app/layout.tsx can read
// the same set at request time to suppress Text2Sale SaaS schema.org
// markup on compliance sites (carriers reject opt-in pages tagged as
// mass-texting CRMs).
//
// To add a new custom domain:
//   1. Add the domain in Vercel → Settings → Domains
//   2. Point DNS at Vercel (A 76.76.21.21 or CNAME cname.vercel-dns.com)
//   3. Add a new { domain, slug } entry in lib/custom-domains.ts + redeploy

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
