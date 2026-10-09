import { NextRequest } from "next/server";
import { getAllPosts } from "@/lib/blog-posts";
import { SITE_PAGES, SITE_PAGE_GROUP_LABELS, SITE_URL, type SitePageGroup } from "@/lib/site-pages";

// /llms.txt: a plain-text map of the site for AI assistants and AI search
// engines (https://llmstxt.org). Generated from the same page registry and
// blog data as the sitemap, so it never drifts from what is published.

const GROUPS: SitePageGroup[] = ["product", "industry", "compare", "guide"];

export function GET(req: NextRequest) {
  // Middleware skips .txt paths, so this also answers on customer branded
  // domains. Their compliance sites must not describe Text2Sale.
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host !== "text2sale.com" && host !== "localhost" && !host.endsWith(".vercel.app")) {
    return new Response("Not found", { status: 404 });
  }

  const lines: string[] = [
    "# Text2Sale",
    "",
    "> Text2Sale is a mass texting CRM for insurance agents, sales teams, and small businesses. Upload lead lists, send SMS campaigns and drip sequences, manage two-way conversations, and keep opt-out and consent records for TCPA and 10DLC compliance. The plan includes AI replies, appointment booking that syncs to Google Calendar, and an AI calling receptionist that can answer, qualify, book, and transfer inbound calls.",
    "",
    "Pricing: one plan at $39.99/month with AI texting and AI calling access included; usage is paid from a prepaid wallet. Outbound texts are $0.015 per segment ($0.0135 after a single wallet deposit of $500 or more), incoming texts are free, AI replies are $0.02 plus the text segments, calls are $0.025/minute outbound and $0.015/minute inbound, AI receptionist calls are $0.18/minute, and phone numbers are $1.50/month. No long-term contract.",
    "",
    `- [Home](${SITE_URL}/): Product overview, pricing, and FAQ`,
  ];

  for (const group of GROUPS) {
    lines.push("", `## ${SITE_PAGE_GROUP_LABELS[group]}`, "");
    for (const page of SITE_PAGES.filter((p) => p.group === group)) {
      lines.push(`- [${page.label}](${SITE_URL}${page.path})`);
    }
  }

  lines.push("", "## Blog", "");
  for (const post of getAllPosts()) {
    lines.push(`- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.description}`);
  }

  lines.push(
    "",
    "## Optional",
    "",
    `- [Blog index](${SITE_URL}/blog)`,
    `- [Privacy policy](${SITE_URL}/privacy-policy)`,
    `- [Terms and conditions](${SITE_URL}/terms)`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
