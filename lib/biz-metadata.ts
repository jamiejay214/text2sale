import type { Metadata } from "next";

// ─── Clean metadata for per-user compliance pages ────────────────────────
// The root layout exports SEO metadata for text2sale.com (description
// mentioning "mass texting CRM", author/publisher/creator = Text2Sale,
// canonical URL to text2sale.com, etc). When /biz/<slug>/* pages inherit
// that, MNO reviewers crawling the opt-in page for 10DLC verification see
// machine-readable metadata contradicting the brand and reject the
// campaign. This helper returns a Metadata object that explicitly null's
// out every leaky parent field so only the branded title/description
// remain. Pass it the business-specific title + description.
//
// `canonical` is the page's address on the business's own domain when it has
// one. The same page is also reachable under text2sale.com/biz/<slug>; naming
// the customer's domain as canonical keeps search engines (and reviewers
// following the canonical link) on the address the business is registered
// under.

export function cleanBizMetadata(opts: {
  title: string;
  description: string;
  canonical?: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    // Null-out every field the root layout sets so the parent metadata
    // can't leak through to compliance pages.
    keywords: null,
    authors: null,
    creator: null,
    publisher: null,
    alternates: { canonical: opts.canonical ?? null },
    openGraph: {
      title: opts.title,
      description: opts.description,
      type: "website",
      ...(opts.canonical ? { url: opts.canonical } : {}),
    },
    twitter: {
      card: "summary",
      title: opts.title,
      description: opts.description,
    },
    robots: { index: true, follow: true },
  };
}
