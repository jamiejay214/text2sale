import type { NextConfig } from "next";

// ─── Custom-domain routing happens in middleware.ts ──────────────────────
// Previously next.config.ts held hardcoded host-based rewrites for
// /biz/<slug>. That required a redeploy for every new customer domain.
// Now middleware.ts looks up the host against Supabase at request time, so
// users can self-serve a domain from the dashboard. See middleware.ts for
// the routing logic and lib/custom-domains.ts for the launch-customer
// static list.

const nextConfig: NextConfig = {};

export default nextConfig;
