import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/verify"],
      },
    ],
    sitemap: "https://text2sale.com/sitemap.xml",
    host: "https://text2sale.com",
  };
}
