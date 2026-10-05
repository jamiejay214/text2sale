import Link from "next/link";
import type { BlogPost } from "@/lib/blog-posts";
import { getPostBySlug, getTagBySlug, tagSlug } from "@/lib/blog-posts";
import MarketingFooter from "@/components/MarketingFooter";
import { landingForTags } from "@/lib/topic-landing";

const SITE = "https://text2sale.com";

function formatDate(iso: string): string {
  // Parse as UTC to keep the rendered date stable regardless of server TZ.
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogPostLayout({ post }: { post: BlogPost }) {
  const url = `${SITE}/blog/${post.slug}`;
  const landing = landingForTags(post.tags);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    // The per-post card from app/blog/[slug]/opengraph-image.tsx. Article
    // rich results need an image, and 1200x630 clears Google's minimum.
    image: {
      "@type": "ImageObject",
      url: `${url}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    author: { "@type": "Organization", name: "Text2Sale", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Text2Sale",
      url: SITE,
      // /icon.png never existed, so every post pointed at a 404 logo.
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png`, width: 944, height: 462 },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
    ...(post.sources?.length ? { citation: post.sources.map((source) => source.href) } : {}),
  };

  const faqSchema =
    post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Text2Sale", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const related = (post.relatedSlugs || [])
    .map((s) => getPostBySlug(s))
    .filter((p): p is BlogPost => Boolean(p));

  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="font-semibold text-emerald-300 hover:text-emerald-200">Text2Sale</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="font-semibold text-emerald-300 hover:text-emerald-200">Blog</Link>
        </nav>

        <header className="mt-8">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => {
              const chip = "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300";
              // Only tags with their own archive page become links; the rest
              // stay plain so we never link into a 404.
              return getTagBySlug(tagSlug(tag)) ? (
                <Link key={tag} href={`/blog/tag/${tagSlug(tag)}`} className={`${chip} transition hover:bg-emerald-400/20`}>
                  {tag}
                </Link>
              ) : (
                <span key={tag} className={chip}>
                  {tag}
                </span>
              );
            })}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">{post.description}</p>
          <p className="mt-5 text-sm text-zinc-500">
            <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
            <span className="mx-2">·</span>
            {post.readMinutes} min read
          </p>
        </header>

        <div className="mt-10 space-y-5">
          {post.intro.map((p, i) => (
            <p key={i} className="text-[17px] leading-8 text-zinc-200">{p}</p>
          ))}
        </div>

        {post.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="text-2xl font-black tracking-tight">{section.heading}</h2>
            <div className="mt-4 space-y-5">
              {section.paragraphs.map((p, i) => (
                <p key={i} className="text-[17px] leading-8 text-zinc-300">{p}</p>
              ))}
            </div>
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-5 space-y-2">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[17px] leading-7 text-zinc-200">
                    <span className="mt-1 text-emerald-400">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {post.keyTakeaways.length > 0 && (
          <section className="mt-12 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <h2 className="text-xl font-bold">Key takeaways</h2>
            <ul className="mt-4 space-y-2">
              {post.keyTakeaways.map((t) => (
                <li key={t} className="flex gap-3 leading-7 text-zinc-200">
                  <span className="mt-1 text-emerald-400">→</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-2xl font-black">Put this into practice with Text2Sale</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-300">
            Import leads, create follow-up campaigns, organize replies, and connect texting, calling, and appointments in one workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/#auth-form" className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300">Choose your plan</Link>
            <Link href={landing.href} className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-emerald-300">{landing.label}</Link>
          </div>
        </section>

        {post.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-black">Frequently asked questions</h2>
            <div className="mt-6 space-y-4">
              {post.faq.map((item) => (
                <details key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 open:border-emerald-400/30">
                  <summary className="cursor-pointer font-bold text-zinc-100 marker:text-emerald-400">{item.question}</summary>
                  <p className="mt-4 leading-7 text-zinc-400">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {post.sources && post.sources.length > 0 && (
          <section className="mt-12 border-t border-zinc-800 pt-8" aria-label="Article references">
            <h2 className="text-xl font-bold text-zinc-200">References and further reading</h2>
            <ul className="mt-4 space-y-3">
              {post.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} className="text-sm font-semibold text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 hover:text-emerald-200">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(related.length > 0 || (post.relatedPages && post.relatedPages.length > 0)) && (
          <section className="mt-12 border-t border-zinc-800 pt-8">
            <h2 className="text-xl font-bold text-zinc-300">Keep reading</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-emerald-300 hover:text-emerald-300">
                  {p.title}
                </Link>
              ))}
              {(post.relatedPages || []).map((p) => (
                <Link key={p.href} href={p.href} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-emerald-300 hover:text-emerald-300">
                  {p.label}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <MarketingFooter />
    </main>
  );
}
