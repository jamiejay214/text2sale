import { NextRequest } from "next/server";
import { normalizeHost } from "@/lib/custom-domains";
import { BIZ_LEGAL_UPDATED } from "@/lib/biz-site";

// sitemap.xml for a customer's own domain: the four pages the site has.

const PAGES: { path: string; priority: string }[] = [
  { path: "", priority: "1.0" },
  { path: "/opt-in", priority: "0.8" },
  { path: "/privacy-policy", priority: "0.5" },
  { path: "/terms", priority: "0.5" },
];

export function GET(req: NextRequest) {
  const host = normalizeHost(req.headers.get("host")) || "localhost";
  const lastmod = new Date(BIZ_LEGAL_UPDATED).toISOString().slice(0, 10);
  const urls = PAGES.map(
    (p) =>
      `  <url><loc>https://${host}${p.path || "/"}</loc><lastmod>${lastmod}</lastmod><priority>${p.priority}</priority></url>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
