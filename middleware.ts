import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CUSTOM_DOMAIN_HOSTS, CUSTOM_DOMAINS } from "@/lib/custom-domains";

// ─── Dynamic custom-domain routing ────────────────────────────────────────
// Serves each user's /biz/<slug> page under their own domain without us
// having to edit next.config.ts + redeploy every time someone connects a
// new one. When a request comes in:
//   1. Read the Host header
//   2. If it's text2sale.com (or a Vercel preview), pass through unchanged
//   3. If it's a known custom domain, look up the matching slug and rewrite
//      the URL to /biz/<slug>/<same-subpath>
//
// Lookup strategy, cheapest-first:
//   a) hardcoded CUSTOM_DOMAINS (covers launch customers without a DB hit)
//   b) Supabase profiles.custom_domain (covers everyone else — self-serve)
// Supabase hits are rare because middleware runs on every request and the
// hardcoded list matches first. We cache Supabase lookups in a module-level
// Map for the lifetime of the edge instance (minutes to hours) so a busy
// domain doesn't spam the DB.
//
// Only the compliance subpaths are whitelisted (/, /opt-in, /privacy-policy,
// /terms) to avoid accidentally exposing the app dashboard under a branded
// domain — if you navigate to jjjohnsonhealth.org/dashboard we let you
// through to the normal app so admin users visiting their own custom domain
// still work.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Lowercased compliance paths we're willing to rewrite. Anything else is
// passed through so the app's normal routes still work on the apex domain
// (useful when admins log in from a branded URL).
const COMPLIANCE_PATHS = new Set(["/", "/opt-in", "/privacy-policy", "/terms"]);

// Hardcoded slug lookup — checked before Supabase to save a round-trip.
const STATIC_SLUG_BY_HOST = new Map(
  CUSTOM_DOMAINS.map((d) => [d.domain, d.slug] as const)
);

// Supabase-backed lookup cache. Keys are lower-cased hosts; value `null`
// means "definitely not one of ours, don't re-query." Populated lazily.
const dynamicSlugByHost = new Map<string, string | null>();

async function lookupSlugForHost(host: string): Promise<string | null> {
  // Fast path: hardcoded launch customers
  if (STATIC_SLUG_BY_HOST.has(host)) return STATIC_SLUG_BY_HOST.get(host)!;

  // Memoized Supabase lookup
  if (dynamicSlugByHost.has(host)) return dynamicSlugByHost.get(host)!;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Match either the exact host or its www-stripped form so both
    // example.com and www.example.com resolve to the same slug without
    // forcing users to save both rows.
    const apex = host.replace(/^www\./, "");
    const { data } = await supabase
      .from("profiles")
      .select("business_slug, custom_domain")
      .or(`custom_domain.eq.${host},custom_domain.eq.${apex}`)
      .limit(1)
      .maybeSingle();
    const slug = data?.business_slug || null;
    dynamicSlugByHost.set(host, slug);
    return slug;
  } catch {
    // DB down / anon role misconfig — cache null briefly to avoid thrashing
    dynamicSlugByHost.set(host, null);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];

  // Main app + Vercel previews: pass through untouched.
  if (
    !host ||
    host === "text2sale.com" ||
    host === "www.text2sale.com" ||
    host.endsWith(".vercel.app") ||
    host === "localhost"
  ) {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname.toLowerCase();
  if (!COMPLIANCE_PATHS.has(path)) return NextResponse.next();

  // Known launch-customer domains short-circuit the DB entirely.
  if (CUSTOM_DOMAIN_HOSTS.has(host)) {
    const slug = STATIC_SLUG_BY_HOST.get(host)!;
    const url = req.nextUrl.clone();
    url.pathname = path === "/" ? `/biz/${slug}` : `/biz/${slug}${path}`;
    return NextResponse.rewrite(url);
  }

  // Self-serve custom domain → Supabase lookup
  const slug = await lookupSlugForHost(host);
  if (!slug) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = path === "/" ? `/biz/${slug}` : `/biz/${slug}${path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip middleware for static + API routes so we don't pay the host-check
  // cost on every asset fetch. The matcher runs before middleware itself.
  matcher: ["/((?!api|_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|txt|xml|woff2?|ttf)).*)"],
};
