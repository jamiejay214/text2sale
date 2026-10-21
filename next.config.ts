import type { NextConfig } from "next";

// ─── Custom-domain routing happens in middleware.ts ──────────────────────
// Previously next.config.ts held hardcoded host-based rewrites for
// /biz/<slug>. That required a redeploy for every new customer domain.
// Now middleware.ts looks up the host against Supabase at request time, so
// users can self-serve a domain from the dashboard. See middleware.ts for
// the routing logic and lib/custom-domains.ts for the launch-customer
// static list.

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Merged into the main insurance-agent page (same search intent).
      { source: "/best-sms-crm-for-insurance-agents", destination: "/sms-crm-for-insurance-agents", permanent: true },
      // Consumer health-insurance article: off-topic for a texting CRM; the same
      // comparison lives on TrustedQuotes, where consumers can act on it.
      {
        source: "/private-health-insurance-vs-marketplace-insurance/:path*",
        destination: "https://trustedquotes.org/private-health-insurance-vs-marketplace.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
