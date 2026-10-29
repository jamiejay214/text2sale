export const SITE_URL = "https://text2sale.com";

export type SitePageGroup = "product" | "industry" | "compare" | "guide" | "tool";

export type SitePage = {
  path: string;
  label: string;
  group: SitePageGroup;
  priority: number;
  updated: string;
};

const REFRESH_2026_09 = "2026-09-28";
const SEO_EXPANSION_2026_10 = "2026-10-28";
const TOPIC_CLUSTER_2026_10 = "2026-10-29";

export const SITE_PAGES: SitePage[] = [
  { path: "/about", label: "About Text2Sale", group: "guide", priority: 0.72, updated: "2026-10-28" },
  { path: "/press", label: "Product facts & media", group: "guide", priority: 0.65, updated: "2026-10-28" },
  { path: "/pricing", label: "Pricing", group: "product", priority: 0.9, updated: "2026-10-21" },
  { path: "/ai-appointment-setter", label: "AI appointment setter", group: "product", priority: 0.92, updated: SEO_EXPANSION_2026_10 },
  { path: "/ai-receptionist-for-insurance-agents", label: "AI receptionist for insurance agents", group: "product", priority: 0.92, updated: SEO_EXPANSION_2026_10 },
  { path: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents", group: "product", priority: 0.9, updated: SEO_EXPANSION_2026_10 },
  { path: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software", group: "product", priority: 0.92, updated: SEO_EXPANSION_2026_10 },
  { path: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads", group: "guide", priority: 0.88, updated: SEO_EXPANSION_2026_10 },

  { path: "/insurance-agents", label: "Insurance agent appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/health-insurance", label: "Health insurance appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/life-insurance", label: "Life insurance appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/medicare", label: "Medicare appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/recruiters", label: "Recruiter appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/solar", label: "Solar appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/real-estate", label: "Real estate appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },
  { path: "/roofing", label: "Roofing appointments", group: "industry", priority: 0.85, updated: "2026-10-07" },

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
  { path: "/real-estate-texting-crm", label: "Real estate agents", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/mortgage-broker-texting-crm", label: "Mortgage brokers", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/solar-sales-texting-crm", label: "Solar sales teams", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/recruiting-texting-crm", label: "Recruiters", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },
  { path: "/sales-team-texting-crm", label: "Sales teams", group: "industry", priority: 0.82, updated: REFRESH_2026_09 },

  { path: "/text2sale-vs-onlysales", label: "Text2Sale vs OnlySales", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-textdrip", label: "Text2Sale vs Textdrip", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-salesmsg", label: "Text2Sale vs Salesmsg", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-gohighlevel", label: "Text2Sale vs GoHighLevel", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-twilio", label: "Text2Sale vs Twilio", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-aloware", label: "Text2Sale vs Aloware", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-phoneburner", label: "Text2Sale vs PhoneBurner", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-kixie", label: "Text2Sale vs Kixie", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/text2sale-vs-close", label: "Text2Sale vs Close", group: "compare", priority: 0.8, updated: "2026-10-29" },
  { path: "/best-onlysales-alternative", label: "OnlySales alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-textdrip-alternative", label: "Textdrip alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-salesmsg-alternative", label: "Salesmsg alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-gohighlevel-alternative", label: "GoHighLevel alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },
  { path: "/best-twilio-alternative", label: "Twilio alternative", group: "compare", priority: 0.8, updated: REFRESH_2026_09 },

  { path: "/how-to-text-insurance-leads", label: "How to text insurance leads", group: "guide", priority: 0.78, updated: REFRESH_2026_09 },
  { path: "/best-crm-for-health-insurance-agents", label: "Best CRM for health insurance agents", group: "guide", priority: 0.82, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/crm-for-aca-agents", label: "CRM for ACA agents", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/ai-for-insurance-agents", label: "AI for insurance agents", group: "guide", priority: 0.82, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/ai-appointment-setter-for-life-insurance", label: "AI appointment setter for life insurance", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/power-dialer-vs-predictive-dialer", label: "Power dialer vs predictive dialer", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/insurance-lead-follow-up-cadence", label: "Insurance lead follow-up cadence", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/why-insurance-leads-stop-responding", label: "Why insurance leads stop responding", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/how-to-text-aged-leads", label: "How to text aged leads", group: "guide", priority: 0.8, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/reduce-insurance-appointment-no-shows", label: "Reduce appointment no-shows", group: "guide", priority: 0.78, updated: TOPIC_CLUSTER_2026_10 },

  { path: "/sms-character-counter", label: "SMS character counter", group: "tool", priority: 0.85, updated: "2026-10-04" },
  { path: "/sms-cost-calculator", label: "SMS cost calculator", group: "tool", priority: 0.85, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/lead-reactivation-roi-calculator", label: "Lead reactivation ROI calculator", group: "tool", priority: 0.85, updated: TOPIC_CLUSTER_2026_10 },
  { path: "/quiet-hours-checker", label: "Quiet hours checker", group: "tool", priority: 0.85, updated: TOPIC_CLUSTER_2026_10 },
];

export const SITE_PAGE_GROUP_LABELS: Record<SitePageGroup, string> = {
  product: "Product",
  industry: "Industries",
  compare: "Compare",
  guide: "Guides",
  tool: "Free tools",
};

export const HOME_UPDATED = "2026-10-29";
