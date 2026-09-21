import { notFound } from "next/navigation";
import { getTagBySlug } from "@/lib/blog-posts";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "Text2Sale blog topic";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = getTagBySlug(slug);
  if (!tag) notFound();

  return renderOgCard({
    eyebrow: "Text2Sale Blog",
    title: tag.label,
    meta: `${tag.count} ${tag.count === 1 ? "guide" : "guides"}`,
  });
}
