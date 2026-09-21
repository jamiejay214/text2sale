import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { getIndexableTags, getPostsByTag, getTagBySlug } from "@/lib/blog-posts";

const SITE = "https://text2sale.com";

export function generateStaticParams() {
  return getIndexableTags().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = getTagBySlug(slug);
  if (!tag) return { title: "Topic Not Found | Text2Sale" };

  const title = `${tag.label} — Texting Guides & Articles | Text2Sale`;
  const description = `${tag.count} guides on ${tag.label.toLowerCase()} for businesses that text their customers — practical playbooks on outreach, follow-up, compliance, and deliverability.`;

  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${tag.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/blog/tag/${tag.slug}`,
      type: "website",
    },
  };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = getTagBySlug(slug);
  if (!tag) notFound();

  const posts = getPostsByTag(slug);
  const otherTags = getIndexableTags().filter((t) => t.slug !== slug);

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${tag.label} articles`,
    url: `${SITE}/blog/tag/${tag.slug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Text2Sale", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: tag.label, item: `${SITE}/blog/tag/${tag.slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Script id="tag-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <Script id="tag-breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="mx-auto max-w-5xl px-6 pt-16">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="font-semibold text-emerald-300 hover:text-emerald-200">Text2Sale</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="font-semibold text-emerald-300 hover:text-emerald-200">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">{tag.label}</span>
        </nav>

        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Topic</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">{tag.label}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
          {tag.count} {tag.count === 1 ? "guide" : "guides"} on {tag.label.toLowerCase()} — written for teams that text
          customers every day and need it to work.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/40 p-7 transition hover:border-emerald-400/40 hover:bg-zinc-900"
            >
              <h2 className="text-2xl font-black tracking-tight group-hover:text-emerald-200">{post.title}</h2>
              <p className="mt-3 flex-1 leading-7 text-zinc-400">{post.excerpt}</p>
              <p className="mt-5 text-sm text-zinc-500">
                <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
                <span className="mx-2">·</span>
                {post.readMinutes} min read
                <span className="ml-3 font-semibold text-emerald-300 group-hover:text-emerald-200">Read →</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="text-xl font-bold text-zinc-300">Other topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherTags.map((t) => (
            <Link
              key={t.slug}
              href={`/blog/tag/${t.slug}`}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-emerald-300 hover:text-emerald-300"
            >
              {t.label} <span className="text-zinc-500">{t.count}</span>
            </Link>
          ))}
          <Link
            href="/blog"
            className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10"
          >
            All guides →
          </Link>
        </div>
      </section>
    </main>
  );
}
