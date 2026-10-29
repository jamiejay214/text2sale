import MarketingHeader from "@/components/MarketingHeader";
import Link from "next/link";
import type { ReactNode } from "react";
import MarketingFooter from "@/components/MarketingFooter";
import { NewsletterSignup } from "@/components/EmailCapture";

type FaqItem = { question: string; answer: string };
type RelatedPage = { href: string; label: string };

type ToolPageProps = {
  path: string;
  name: string;
  toolDescription: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  facts: [string, string][];
  faq: FaqItem[];
  relatedPages: RelatedPage[];
  ctaTitle: string;
  ctaBody: string;
  ctaHref: string;
  ctaLabel: string;
};

// Shared layout for the free tools. Each tool page gets WebApplication and
// FAQ structured data plus links back into the product pages it supports.
export default function ToolPage({
  path,
  name,
  toolDescription,
  eyebrow,
  title,
  intro,
  children,
  facts,
  faq,
  relatedPages,
  ctaTitle,
  ctaBody,
  ctaHref,
  ctaLabel,
}: ToolPageProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name,
        url: `https://text2sale.com${path}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: toolDescription,
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#060806] text-zinc-100">
      <MarketingHeader/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">


        <header className="mx-auto max-w-4xl py-16 text-center sm:py-20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">{eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">{title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{intro}</p>
        </header>

        {children}

        <section className="mx-auto grid max-w-5xl gap-6 py-20 md:grid-cols-3">
          {facts.map(([factTitle, body]) => (
            <article key={factTitle} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="text-xl font-black text-white">{factTitle}</h2>
              <p className="mt-3 leading-7 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-4xl border-t border-zinc-800 py-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Frequently asked questions</p>
          <div className="mt-7 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <summary className="cursor-pointer list-none font-bold text-white">{item.question}</summary>
                <p className="mt-3 leading-7 text-zinc-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl border-t border-zinc-800 py-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Related</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {relatedPages.map((page) => (
              <Link key={page.href} href={page.href} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-emerald-300 hover:text-emerald-200">
                {page.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="mb-12">
          <NewsletterSignup />
        </div>

        <section className="mb-12 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-black text-white">{ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-200">{ctaBody}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/?signup=1#auth-form" className="rounded-xl bg-emerald-300 px-6 py-3 font-black text-zinc-950 hover:bg-emerald-200">Get started</Link>
            <Link href={ctaHref} className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-emerald-300">{ctaLabel}</Link>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </main>
  );
}
