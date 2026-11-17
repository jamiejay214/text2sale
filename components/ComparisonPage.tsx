import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingHeader from "@/components/MarketingHeader";
import { COMPETITORS, PRICING_CHECKED, type Competitor } from "@/lib/competitors";

export function comparisonMetadata(competitor: Competitor): Metadata {
  return {
    title: competitor.metaTitle,
    description: competitor.metaDescription,
    alternates: { canonical: `/text2sale-vs-${competitor.slug}` },
  };
}

export default function ComparisonPage({ competitor }: { competitor: Competitor }) {
  const path = `/text2sale-vs-${competitor.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: competitor.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Text2Sale", item: "https://text2sale.com" },
          { "@type": "ListItem", position: 2, name: `Text2Sale vs ${competitor.name}`, item: `https://text2sale.com${path}` },
        ],
      },
    ],
  };
  const others = COMPETITORS.filter((item) => item.slug !== competitor.slug);
  // Lead the table with what Text2Sale includes that the other pricing page
  // does not list. Nothing is added, removed or reworded: the rows and both
  // companies' figures are exactly as recorded in lib/competitors.ts.
  const notListed = (value: string) => /^(not listed|not shown|no\b)/i.test(value);
  const rows = [...competitor.rows.filter((row) => notListed(row.competitor)), ...competitor.rows.filter((row) => !notListed(row.competitor))];

  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-violet-300 hover:text-violet-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-violet-300">Text2Sale vs {competitor.name}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">{competitor.headline}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{competitor.summary}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/?signup=1#auth-form" className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500">Try Text2Sale</Link>
          <Link href="/pricing" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-violet-300">See Text2Sale pricing</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-violet-400/40 bg-violet-400/10 p-6 sm:p-8">
          <h2 className="text-3xl font-black">Why teams pick Text2Sale over {competitor.name}</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {competitor.chooseText2Sale.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-zinc-950/60 p-4 leading-7 text-zinc-100">
                <span aria-hidden="true" className="font-black text-violet-300">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-violet-200">
            <li>✓ Texting and dialing in one workspace</li>
            <li>✓ CRM included</li>
            <li>✓ 10DLC registration fees covered</li>
            <li>✓ Month to month</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/?signup=1#auth-form" className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500">Start free trial</Link>
            <Link href="/demo" className="rounded-2xl border border-zinc-600 px-6 py-3 font-bold text-zinc-100 hover:border-violet-300">Book a demo</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Side-by-side comparison</h2>
          <p className="mt-3 text-sm text-zinc-400">
            {competitor.name} details are from its{" "}
            <a href={competitor.pricingUrl} className="text-violet-300 underline" rel="nofollow noopener" target="_blank">public pricing page</a>{" "}
            as of {PRICING_CHECKED}. Prices change, so confirm current terms with {competitor.name}.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th scope="col" className="w-1/4 p-4 font-bold text-zinc-400"> </th>
                  <th scope="col" className="w-[37.5%] bg-violet-400/10 p-4 font-black text-violet-300">Text2Sale</th>
                  <th scope="col" className="w-[37.5%] p-4 font-black text-white">{competitor.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-zinc-800 align-top">
                    <th scope="row" className="p-4 font-bold text-white">{row.label}</th>
                    <td className="bg-violet-400/10 p-4 font-semibold leading-6 text-white">{/^yes\b/i.test(row.text2sale) && <span aria-hidden="true" className="mr-1 text-violet-300">✓</span>}{row.text2sale}</td>
                    <td className="p-4 leading-6 text-zinc-400">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-black">What {competitor.name} is</h2>
        <p className="mt-4 leading-8 text-zinc-300">{competitor.whatItIs}</p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-xl font-bold text-zinc-200">When {competitor.name} may be the better fit</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-400 marker:text-zinc-600">
          {competitor.chooseCompetitor.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-4 text-sm leading-7 text-zinc-400">For everyone else working lead lists by text and phone, Text2Sale is the simpler choice.</p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-3xl font-black">Switching from {competitor.name}</h2>
        <ol className="mt-5 list-decimal space-y-3 pl-6 leading-7 text-zinc-300 marker:font-bold marker:text-violet-300">
          {competitor.switching.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-3xl font-black">Frequently asked questions</h2>
        <div className="mt-6 space-y-4">
          {competitor.faq.map((item) => (
            <details key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <summary className="cursor-pointer list-none font-bold text-white">{item.question}</summary>
              <p className="mt-3 leading-7 text-zinc-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-xl font-black">More comparisons</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {competitor.alternativePath && (
            <Link href={competitor.alternativePath} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-violet-300 hover:text-violet-200">
              Best {competitor.name} alternative
            </Link>
          )}
          {others.map((item) => (
            <Link key={item.slug} href={`/text2sale-vs-${item.slug}`} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-violet-300 hover:text-violet-200">
              Text2Sale vs {item.name}
            </Link>
          ))}
          <Link href="/insurance-lead-follow-up-software" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-violet-300 hover:text-violet-200">
            Insurance lead follow-up software
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
