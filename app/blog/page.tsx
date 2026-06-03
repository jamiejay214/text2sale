import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { getAllPosts } from "@/lib/blog-posts";

const SITE = "https://text2sale.com";

export const metadata: Metadata = {
  title: "Text2Sale Blog — Texting, Lead Follow-Up & Compliance for Agents",
  description:
    "Guides on texting leads, SMS follow-up, 10DLC and TCPA compliance, drip campaigns, and deliverability for insurance agents and sales teams.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Text2Sale Blog",
    description:
      "Guides on texting leads, SMS follow-up, 10DLC and TCPA compliance, and deliverability for agents and sales teams.",
    url: `${SITE}/blog`,
    type: "website",
  },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Text2Sale Blog",
    url: `${SITE}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      url: `${SITE}/blog/${p.slug}`,
    })),
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Script id="blog-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Text2Sale Blog</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight md:text-6xl">
          Texting playbooks for agents and sales teams
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Practical guides on texting leads faster, following up smarter, staying compliant, and getting your messages delivered at scale.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/40 p-7 transition hover:border-emerald-400/40 hover:bg-zinc-900"
            >
              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight group-hover:text-emerald-200">{post.title}</h2>
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
    </main>
  );
}
