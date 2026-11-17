import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingHeader from "@/components/MarketingHeader";
import { INTEGRATION_PAGES } from "@/lib/integrations-pages";
import { SITE_URL } from "@/lib/site-pages";

export const metadata: Metadata = {
  title: "Text2Sale Integrations: Lead Vendors, Google Calendar, CSV & Zapier",
  description:
    "Connect Text2Sale to your lead vendors with a webhook, sync booked appointments to Google Calendar, import any CSV, and bring in leads from Zapier or Make.",
  alternates: { canonical: "/integrations" },
};

const breadcrumbs = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Text2Sale", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Integrations", item: `${SITE_URL}/integrations` },
  ],
};

export default function IntegrationsPage() {
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Integrations</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">Get leads in and appointments out, without copy and paste.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale connects to where your leads come from and where your appointments live. Every connection on this page is built into the product today and set up from Settings in a few minutes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/?signup=1#auth-form" className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300">Start free trial</Link>
          <Link href="/demo" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-emerald-300">Book a demo</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto grid max-w-5xl gap-5 px-6 py-16 md:grid-cols-2">
          {INTEGRATION_PAGES.map((page) => (
            <Link key={page.slug} href={`/integrations/${page.slug}`} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-emerald-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/home/icons/${page.icon}.svg`} alt={`${page.name} icon`} width={48} height={48} className="rounded-xl" />
              <h2 className="mt-4 text-xl font-bold">{page.name}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{page.summary}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-emerald-300">How it works →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-black">Do not see your tool?</h2>
        <p className="mt-4 leading-8 text-zinc-300">
          Two connections cover almost everything. If a tool can send a webhook when a new lead arrives, point it at your Text2Sale URL. If it cannot, export a CSV and upload it. Between those two, leads from any vendor, form, ad platform or CRM can reach your inbox.
        </p>
        <p className="mt-4 leading-8 text-zinc-300">
          Not sure which fits your setup? <Link href="/demo" className="font-semibold text-emerald-300 underline underline-offset-4">Book a demo</Link> and we will walk through it with your actual lead sources.
        </p>
      </section>
      <MarketingFooter />
    </main>
  );
}
