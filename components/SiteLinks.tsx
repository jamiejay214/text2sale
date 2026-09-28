import Link from "next/link";
import { SITE_PAGES, SITE_PAGE_GROUP_LABELS, type SitePageGroup } from "@/lib/site-pages";

// Crawlable links from the homepage to every landing page. The homepage is
// the most-linked URL on the site, so linking out from it is how search
// engines discover the landing pages and judge them worth indexing.

const GROUPS: SitePageGroup[] = ["product", "industry", "compare", "guide"];

export default function SiteLinks() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 border-b border-zinc-800 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {GROUPS.map((group) => (
        <div key={group}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {SITE_PAGE_GROUP_LABELS[group]}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {SITE_PAGES.filter((page) => page.group === group).map((page) => (
              <li key={page.path}>
                <Link href={page.path} className="text-zinc-400 transition hover:text-white">
                  {page.label}
                </Link>
              </li>
            ))}
            {group === "guide" && (
              <li>
                <Link href="/blog" className="text-zinc-400 transition hover:text-white">
                  Text2Sale blog
                </Link>
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
