import type { MetadataRoute } from "next";
import { PRIORITY_PAGES } from "@/lib/seo-priority";
import { SITE_URL } from "@/lib/site-pages";

// Only the priority pages (lib/seo-priority.ts). Every other page is still
// live and indexable; holding it out of the sitemap concentrates crawling on
// the pages that sell to insurance agents until those are indexed.

export default function sitemap(): MetadataRoute.Sitemap {
  return PRIORITY_PAGES.map((page) => ({
    url: page.path === "/" ? SITE_URL : `${SITE_URL}${page.path}`,
    lastModified: new Date(page.updated),
    priority: page.priority,
  }));
}
