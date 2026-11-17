// ── Search priority pages ──────────────────────────────────────────────────
// The sitemap lists only these URLs. Google had crawled 6 of ~450 sitemap
// URLs (Search Console, Nov 2026), so the sitemap now points crawlers at the
// money, insurance and core industry pages. Every other page stays live and
// indexable; it is simply held out of the sitemap until these are indexed.
//
// `updated` is the date the page's content last changed (from git history,
// Nov 17 2026). Bump it only when you edit that page's content; a sitemap
// whose lastmod dates move without real changes gets its dates ignored.

export type PriorityPage = { path: string; updated: string; priority: number };

export const PRIORITY_PAGES: PriorityPage[] = [
  // Money pages
  { path: "/", updated: "2026-11-17", priority: 1.0 },
  { path: "/pricing", updated: "2026-11-16", priority: 0.9 },
  { path: "/demo", updated: "2026-11-16", priority: 0.9 },

  // Insurance product and use-case pages
  { path: "/insurance-agents", updated: "2026-11-16", priority: 0.9 },
  { path: "/sms-crm-for-insurance-agents", updated: "2026-11-16", priority: 0.9 },
  { path: "/health-insurance-texting-crm", updated: "2026-10-21", priority: 0.85 },
  { path: "/crm-for-aca-agents", updated: "2026-10-28", priority: 0.85 },
  { path: "/life-insurance", updated: "2026-10-21", priority: 0.85 },
  { path: "/final-expense-texting-crm", updated: "2026-09-27", priority: 0.85 },
  { path: "/medicare-agent-texting-crm", updated: "2026-10-03", priority: 0.85 },
  { path: "/auto-insurance-texting-crm", updated: "2026-10-20", priority: 0.85 },
  { path: "/insurance-lead-follow-up-software", updated: "2026-10-28", priority: 0.8 },
  { path: "/ai-for-insurance-agents", updated: "2026-10-28", priority: 0.8 },
  { path: "/10dlc-compliant-texting", updated: "2026-09-27", priority: 0.8 },
  { path: "/med-spa", updated: "2026-11-16", priority: 0.7 },
  { path: "/real-estate-texting-crm", updated: "2026-10-20", priority: 0.7 },
  { path: "/solar-sales-texting-crm", updated: "2026-10-20", priority: 0.7 },
  { path: "/roofing", updated: "2026-10-21", priority: 0.6 },

  // Insurance guides and tools
  { path: "/best-crm-for-health-insurance-agents", updated: "2026-10-28", priority: 0.8 },
  { path: "/speed-to-lead-for-insurance-agents", updated: "2026-10-28", priority: 0.8 },
  { path: "/how-to-text-insurance-leads", updated: "2026-09-21", priority: 0.8 },
  { path: "/insurance-text-templates", updated: "2026-10-29", priority: 0.7 },

  // Comparisons
  { path: "/text2sale-vs-textdrip", updated: "2026-11-17", priority: 0.75 },
  { path: "/text2sale-vs-onlysales", updated: "2026-11-17", priority: 0.75 },
  { path: "/text2sale-vs-gohighlevel", updated: "2026-11-17", priority: 0.75 },
  { path: "/text2sale-vs-salesmsg", updated: "2026-11-17", priority: 0.75 },
  { path: "/text2sale-vs-twilio", updated: "2026-11-17", priority: 0.7 },
  { path: "/text2sale-vs-aloware", updated: "2026-11-17", priority: 0.7 },

  // Blog hub and on-topic insurance posts
  { path: "/blog", updated: "2026-11-16", priority: 0.7 },
  { path: "/blog/car-dealership-text-message-marketing", updated: "2026-09-21", priority: 0.5 },
  { path: "/blog/home-services-text-marketing", updated: "2026-09-21", priority: 0.5 },
  { path: "/blog/how-fast-to-text-insurance-leads", updated: "2026-05-12", priority: 0.7 },
  { path: "/blog/tcpa-compliance-texting-leads", updated: "2026-06-02", priority: 0.7 },
  { path: "/blog/sms-vs-cold-calling-leads", updated: "2026-05-05", priority: 0.7 },
  { path: "/blog/crm-for-purchased-insurance-leads", updated: "2026-10-04", priority: 0.7 },
  { path: "/blog/open-enrollment-texting-campaign", updated: "2026-04-07", priority: 0.7 },
  { path: "/blog/health-insurance-lead-qualifying-texts", updated: "2026-09-28", priority: 0.7 },
  { path: "/blog/state-mini-tcpa-laws", updated: "2026-09-22", priority: 0.6 },
  { path: "/blog/medicare-advantage-open-enrollment-texts", updated: "2026-10-01", priority: 0.6 },
  { path: "/blog/best-texting-crm-for-insurance-agents-2026", updated: "2026-10-04", priority: 0.7 },
  { path: "/blog/ringy-vs-text2sale-insurance-crm", updated: "2026-10-04", priority: 0.7 },
  { path: "/blog/texting-aged-insurance-leads", updated: "2026-09-21", priority: 0.6 },

  // Legal
  { path: "/privacy-policy", updated: "2026-04-18", priority: 0.3 },
  { path: "/terms", updated: "2026-04-18", priority: 0.3 },
];
