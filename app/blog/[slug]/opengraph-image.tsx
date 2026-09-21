import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/blog-posts";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "Text2Sale blog article";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return renderOgCard({
    eyebrow: post.tags[0] || "Text2Sale Blog",
    title: post.title,
    meta: `${post.readMinutes} min read`,
  });
}
