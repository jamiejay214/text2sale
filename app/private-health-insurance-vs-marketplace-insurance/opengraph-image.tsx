import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

export const alt = "Private health insurance vs Marketplace insurance guide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    eyebrow: "Health insurance guide",
    title: "Private health insurance vs Marketplace insurance",
    meta: "Costs, networks, and enrollment rules compared",
  });
}
