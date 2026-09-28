import { tagSlug } from "@/lib/blog-posts";

// ── Blog post → most relevant landing page ─────────────────────────────────
// Every post used to send its "See the platform" CTA to the insurance CRM
// page, including dental and restaurant posts. Matching on the post's tags
// sends readers somewhere relevant and spreads internal links across the
// landing pages instead of piling them all onto one URL. First rule whose
// tags appear on the post wins, so industry pages come before topic pages.

type LandingLink = { href: string; label: string };

const RULES: { tags: string[]; landing: LandingLink }[] = [
  { tags: ["medicare", "aep"], landing: { href: "/medicare-agent-texting-crm", label: "Medicare agent texting CRM" } },
  { tags: ["final-expense"], landing: { href: "/final-expense-texting-crm", label: "Final expense texting CRM" } },
  { tags: ["life-insurance"], landing: { href: "/life-insurance-texting-crm", label: "Life insurance texting CRM" } },
  { tags: ["health-insurance", "open-enrollment"], landing: { href: "/health-insurance-texting-crm", label: "Health insurance texting CRM" } },
  { tags: ["auto"], landing: { href: "/auto-insurance-texting-crm", label: "Auto insurance texting CRM" } },
  { tags: ["mortgage"], landing: { href: "/mortgage-broker-texting-crm", label: "Texting CRM for mortgage brokers" } },
  { tags: ["real-estate"], landing: { href: "/real-estate-texting-crm", label: "Texting CRM for real estate agents" } },
  { tags: ["solar"], landing: { href: "/solar-sales-texting-crm", label: "Texting CRM for solar sales teams" } },
  { tags: ["recruiting", "staffing"], landing: { href: "/recruiting-texting-crm", label: "Recruiting texting CRM" } },
  { tags: ["insurance"], landing: { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" } },
  { tags: ["10dlc", "tcpa", "compliance", "opt-in", "toll-free", "a2p"], landing: { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" } },
  { tags: ["ai", "missed-calls"], landing: { href: "/ai-texting-crm", label: "AI texting CRM" } },
  { tags: ["sales-teams", "speed-to-lead", "prospecting", "cold-calling", "sales"], landing: { href: "/sales-team-texting-crm", label: "Sales team texting CRM" } },
  { tags: ["sms-follow-up", "follow-up", "lead-follow-up", "lead-nurturing"], landing: { href: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams" } },
  { tags: ["bulk-sms", "campaigns", "sms-marketing"], landing: { href: "/bulk-sms-software", label: "Bulk SMS software" } },
];

const DEFAULT_LANDING: LandingLink = { href: "/mass-texting-crm", label: "Mass texting CRM" };

export function landingForTags(tags: string[]): LandingLink {
  const slugs = new Set(tags.map(tagSlug));
  return RULES.find((rule) => rule.tags.some((t) => slugs.has(t)))?.landing ?? DEFAULT_LANDING;
}
