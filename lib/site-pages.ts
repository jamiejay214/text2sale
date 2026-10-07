// ── Marketing page registry ────────────────────────────────────────────────
// One list of the public, indexable marketing pages. The sitemap, the
// homepage footer links and the IndexNow submission all read from here, so a
// new landing page only has to be added once to be crawlable and linked.

export const SITE_URL = "https://text2sale.com";

export type SitePageGroup = "product" | "industry" | "compare" | "guide";

export type SitePage = {
  path: string;
  /** Short anchor text for internal links. */
  label: string;
  group: SitePageGroup;
  priority: number;
  /**
   * ISO date the page's content last changed. Search engines only trust
   * sitemap lastmod values that track real edits, so bump this when the
   * copy changes rather than stamping every page with the build date.
   */
  updated: string;
};

// Content refresh that expanded the landing pages and added visible FAQs.
const REFRESH_2026_09 = "2026-09-28";

export const SITE_PAGES: SitePage[] = [
  { path: "/insurance-agents", label: "Insurance agent appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/health-insurance", label: "Health insurance appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/life-insurance", label: "Life insurance appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/medicare", label: "Medicare appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/recruiters", label: "Recruiter appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/solar", label: "Solar appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/real-estate", label: "Real estate appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/roofing", label: "Roofing appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },

  { path: "/sms-character-counter", label: "Free SMS character counter", group: "guide", priority: 0.85, updated: "2026-10-04" },
  { path: "/mass-texting-crm", label: "Mass texting CRM", group: "product", priority: 0.9, updated: REFRESH_2026_09 },
  { path: "/ai-texting-crm", label: "AI texting CRM", group: "product", priority: 0.9, updated: REFRESH_2026_09 },
  { path: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents", group: "product", priority: 0.9, updated: REFRESH_2026_09 },
  { path: "/bulk-sms-software", label: "Bulk SMS software", group: "product", priority: 0.85, updated: REFRESH_2026_09 },
  { path: "/10dlc-compliant-texting", label: "10DLC compliant texting", group: "product", priority: 0.85, updated: REFRESH_2026_09 },
  { path: "/sms-follow-up-for-sales-teams", label: "SMS follow-up for sales teams", group: "product", priority: 0.8, updated: REFRESH_2026_09 },

  { path: "/health-insurance-texting-crm", label: "Health insurance agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/life-insurance-texting-crm", label: "Life insurance agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/final-expense-texting-crm", label: "Final expense agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/medicare-agent-texting-crm", label: "Medicare agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/auto-insurance-texting-crm", label: "Auto insurance agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/best-sms-crm-for-insurance-agents", label: "Best SMS CRM for insurance", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/real-estate-texting-crm", label: "Real estate agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/mortgage-broker-texting-crm", label: "Mortgage brokers", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/solar-sales-texting-crm", label: "Solar sales teams", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/recruiting-texting-crm", label: "Recruiters", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/sales-team-texting-crm", label: "Sales teams", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },

  { path: "/text2sale-vs-onlysales", label: "Text2Sale vs OnlySales", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/text2sale-vs-textdrip", label: "Text2Sale vs Textdrip", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/text2sale-vs-salesmsg", label: "Text2Sale vs Salesmsg", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/text2sale-vs-gohighlevel", label: "Text2Sale vs GoHighLevel", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/text2sale-vs-twilio", label: "Text2Sale vs Twilio", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-onlysales-alternative", label: "OnlySales alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-textdrip-alternative", label: "Textdrip alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-salesmsg-alternative", label: "Salesmsg alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-gohighlevel-alternative", label: "GoHighLevel alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-twilio-alternative", label: "Twilio alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },

  { path: "/how-to-text-insurance-leads", label: "How to text insurance leads", group: "guide", priority: 0.78, updated: REFRESH_2026_09 },
  { path: "/private-health-insurance-vs-marketplace-insurance", label: "Private vs Marketplace health insurance", group: "guide", priority: 0.78, updated: REFRESH_2026_09 },
];

export const SITE_PAGE_GROUP_LABELS: Record<SitePageGroup, string> = {
  product: "Product",
  industry: "Industries",
  compare: "Compare",
  guide: "Guides",
};

/** Date the homepage copy last changed (FAQ and footer links added). */
export const HOME_UPDATED = "2026-10-07";
