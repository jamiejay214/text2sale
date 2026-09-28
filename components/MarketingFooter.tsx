import Link from "next/link";
import SiteLinks from "@/components/SiteLinks";

// Footer for public marketing pages (landing pages and the blog). Linking
// every landing page from every marketing page is what tells search engines
// those pages matter; before this, several had only two to five internal
// links pointing at them.
export default function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-white">
      <SiteLinks />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="text-sm text-zinc-500">© {new Date().getFullYear()} Text2Sale. All rights reserved.</div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="text-zinc-400 transition hover:text-white">Home</Link>
          <Link href="/blog" className="text-zinc-400 transition hover:text-white">Blog</Link>
          <Link href="/terms" className="text-zinc-400 transition hover:text-white">Terms</Link>
          <Link href="/privacy-policy" className="text-zinc-400 transition hover:text-white">Privacy</Link>
          <a href="mailto:support@text2sale.com" className="text-zinc-400 transition hover:text-white">Support</a>
        </nav>
      </div>
    </footer>
  );
}
