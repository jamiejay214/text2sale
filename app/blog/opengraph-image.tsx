import { getAllPosts } from "@/lib/blog-posts";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "Text2Sale Blog — texting playbooks for agents and sales teams";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    eyebrow: "Text2Sale Blog",
    title: "Texting playbooks for agents and sales teams",
    meta: `${getAllPosts().length} guides`,
  });
}
