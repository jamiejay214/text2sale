import Link from "next/link";
import { getPostsByTags } from "@/lib/blog-posts";
import MarketingFooter from "@/components/MarketingFooter";

type FaqItem = { question: string; answer: string };
type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] };
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
  /**
   * Long-form sections rendered as prose under the feature cards. This is
   * where a page explains the workflow in depth, so it has enough unique,
   * useful text to be worth indexing on its own.
   */
  guideTitle?: string;
  guide?: GuideSection[];
  faq?: FaqItem[];
  relatedPages?: RelatedPage[];
  canonicalPath?: string;
  /**
   * Blog tags relevant to this page. When set, the guides section surfaces
   * posts on those topics instead of the generic cornerstone list, so a
   * dealership page links to dealership articles rather than insurance ones.
   */
  blogTags?: string[];
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
  guideTitle,
  guide = [],
  faq = [],
  relatedPages = [],
  canonicalPath,
  blogTags = [],
}: SeoLandingPageProps) {
  // Topic-matched posts when the page declares tags, cornerstone posts
  // otherwise. Falls back to cornerstone if a tag set matches nothing.
  const taggedPosts = blogTags.length > 0 ? getPostsByTags(blogTags, 5) : [];
  const guides =
    taggedPosts.length > 0
      ? taggedPosts.map((post) => ({ href: `/blog/${post.slug}`, label: post.title }))
      : CORNERSTONE_POSTS;
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

  // Plain <script> tags, not next/script: next/script injects inline JSON-LD
  // on the client, so it was missing from the HTML crawlers fetch.
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
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

      {guide.length > 0 && (
        <article className="mx-auto max-w-3xl px-6 py-16">
          {guideTitle && <h2 className="text-3xl font-black">{guideTitle}</h2>}
          {guide.map((part) => (
            <section key={part.heading} className="mt-10 first:mt-8">
              <h3 className="text-2xl font-bold">{part.heading}</h3>
              {part.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-4 leading-8 text-zinc-300">
                  {paragraph}
                </p>
              ))}
              {part.bullets && part.bullets.length > 0 && (
                <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-zinc-300 marker:text-emerald-400">
                  {part.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      )}

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
        <section className="mx-auto max-w-5xl px-6 pb-10">
          <h2 className="text-xl font-bold text-zinc-300">More from Text2Sale</h2>
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

      {/* Cornerstone guides — links every landing page into the blog so link
          equity and crawl paths flow between the two. */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-xl font-bold text-zinc-300">Guides from the Text2Sale blog</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {guides.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-emerald-300 hover:text-emerald-300"
            >
              {post.label}
            </Link>
          ))}
          <Link
            href="/blog"
            className="rounded-xl border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10"
          >
            All guides →
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

// Cornerstone blog posts surfaced on every SEO landing page for internal linking.
const CORNERSTONE_POSTS: { href: string; label: string }[] = [
  { href: "/blog/how-fast-to-text-insurance-leads", label: "How fast to text a new lead" },
  { href: "/blog/sms-drip-templates-for-insurance-agents", label: "9 SMS drip templates" },
  { href: "/blog/10dlc-registration-guide-for-agents", label: "10DLC registration guide" },
  { href: "/blog/tcpa-compliance-texting-leads", label: "TCPA compliance for texting" },
  { href: "/blog/what-is-a-texting-crm", label: "What is a texting CRM?" },
];
