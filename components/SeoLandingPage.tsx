import Link from "next/link";
import Script from "next/script";

type FaqItem = { question: string; answer: string };
type RelatedPage = { href: string; label: string };

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  sections: {
    title: string;
    body: string;
  }[];
  bullets?: string[];
  noteTitle?: string;
  noteBody?: string;
  faq?: FaqItem[];
  relatedPages?: RelatedPage[];
  canonicalPath?: string;
};

export default function SeoLandingPage({
  eyebrow,
  title,
  description,
  primaryCta = "Start free trial",
  secondaryCta = "See mass texting CRM",
  secondaryHref = "/mass-texting-crm",
  sections,
  bullets = [],
  noteTitle,
  noteBody,
  faq = [],
  relatedPages = [],
  canonicalPath,
}: SeoLandingPageProps) {
  const faqSchema = faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  const breadcrumbSchema = canonicalPath
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Text2Sale", item: "https://text2sale.com" },
          { "@type": "ListItem", position: 2, name: eyebrow, item: `https://text2sale.com${canonicalPath}` },
        ],
      }
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {faqSchema && (
        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}

      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          ← Back to Text2Sale
        </Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300">
            {primaryCta}
          </Link>
          <Link href={secondaryHref} className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-emerald-300">
            {secondaryCta}
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto grid max-w-5xl gap-5 px-6 py-16 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      {bullets.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Why teams choose Text2Sale</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {bullets.map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-800 p-4 text-zinc-200">
                ✓ {item}
              </div>
            ))}
          </div>
        </section>
      )}

      {noteTitle && noteBody && (
        <section className="mx-auto max-w-5xl px-6 pb-10">
          <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <h2 className="text-2xl font-bold">{noteTitle}</h2>
            <p className="mt-3 leading-7 text-zinc-300">{noteBody}</p>
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 open:border-emerald-400/30">
                <summary className="cursor-pointer font-bold text-zinc-100 marker:text-emerald-400">
                  {item.question}
                </summary>
                <p className="mt-4 leading-7 text-zinc-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {relatedPages.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <h2 className="text-xl font-bold text-zinc-300">More Text2Sale comparisons</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {relatedPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-emerald-300 hover:text-emerald-300"
              >
                {page.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
