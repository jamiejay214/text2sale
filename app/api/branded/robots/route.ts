import { NextRequest } from "next/server";
import { normalizeHost } from "@/lib/custom-domains";

// robots.txt for a customer's own domain. The middleware rewrites /robots.txt
// here for any host that isn't text2sale.com, so a customer's site advertises
// its own four pages and its own sitemap instead of inheriting Text2Sale's.

export function GET(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host")) || "localhost";
  const body = [
    "User-agent: *",
    "Allow: /$",
    "Allow: /opt-in",
    "Allow: /privacy-policy",
    "Allow: /terms",
    "Disallow: /api/",
    "Disallow: /biz/",
    "Disallow: /admin",
    "Disallow: /dashboard",
    "",
    `Sitemap: https://${host}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
