import type { MetadataRoute } from "next";
import { getAllPosts, getIndexableTags, getPostsByTag } from "@/lib/blog-posts";
import { HOME_UPDATED, SITE_PAGES, SITE_URL } from "@/lib/site-pages";

// lastmod values track real content changes. Stamping every URL with the
// build date teaches search engines to ignore lastmod entirely, which slows
// down recrawls of the pages that did change.

const LEGAL_UPDATED = "2026-04-18"; // LEGAL_EFFECTIVE_DATE in lib/legal-text.ts
const TAG_INTROS_ADDED = "2026-09-28";

// Landing pages with their own opengraph-image.tsx (the rest share the
// site-wide card, which is already listed once on the homepage entry).
const PAGES_WITH_OWN_IMAGE = new Set(["/private-health-insurance-vs-marketplace-insurance"]);

function newest(dates: string[]): Date {
  return new Date(dates.reduce((a, b) => (a > b ? a : b)));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getAllPosts();
  const blogTags = getIndexableTags();

  return [
    {
      url: SITE_URL,
      lastModified: new Date(HOME_UPDATED),
      changeFrequency: "weekly",
      priority: 1.0,
      images: [`${SITE_URL}/opengraph-image`],
    },
    ...SITE_PAGES.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: new Date(page.updated),
      changeFrequency: "monthly" as const,
      priority: page.priority,
      ...(PAGES_WITH_OWN_IMAGE.has(page.path) && { images: [`${SITE_URL}${page.path}/opengraph-image`] }),
    })),
    {
      url: `${SITE_URL}/blog`,
      lastModified: newest(blogPosts.map((post) => post.dateModified)),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      // Image sitemap entry so the per-post cards can surface in image search.
      images: [`${SITE_URL}/blog/${post.slug}/opengraph-image`],
    })),
    ...blogTags.map((tag) => ({
      url: `${SITE_URL}/blog/tag/${tag.slug}`,
      lastModified: newest([...getPostsByTag(tag.slug).map((post) => post.dateModified), TAG_INTROS_ADDED]),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date(LEGAL_UPDATED),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(LEGAL_UPDATED),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
