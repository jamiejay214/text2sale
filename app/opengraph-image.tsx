import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og-card";

// Site-wide share image. Pages that don't declare their own openGraph
// inherit this one; it replaces /logo.png, which is 944x462 and was being
// declared as 1200x630.
export const alt = "Text2Sale — mass texting CRM for insurance agents and sales teams";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    eyebrow: "Text2Sale",
    title: "Mass texting CRM for insurance agents and sales teams",
    meta: "TCPA and 10DLC compliance tools built in",
  });
}
