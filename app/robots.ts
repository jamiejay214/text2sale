import type { MetadataRoute } from "next";

const PUBLIC_ALLOW = ["/"];
const PRIVATE_PATHS = ["/api/", "/admin", "/dashboard", "/verify", "/command"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_PATHS,
      },
      // Search-oriented AI crawlers are listed explicitly so our intent is
      // unambiguous even though the wildcard rule already allows public pages.
      { userAgent: "OAI-SearchBot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "GPTBot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "bingbot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "Googlebot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "Google-Extended", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "PerplexityBot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "ClaudeBot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: "Applebot", allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
    ],
    sitemap: "https://text2sale.com/sitemap.xml",
    host: "https://text2sale.com",
  };
}
