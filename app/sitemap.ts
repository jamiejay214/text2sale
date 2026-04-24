import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://text2sale.com";
  const today = new Date();

  const corePages = [
    { path: "", priority: 1.0 },
    { path: "/mass-texting-crm", priority: 0.9 },
    { path: "/ai-texting-crm", priority: 0.9 },
    { path: "/sms-crm-for-insurance-agents", priority: 0.9 },
    { path: "/bulk-sms-software", priority: 0.85 },
    { path: "/10dlc-compliant-texting", priority: 0.85 },
  ];

  const comparisonPages = [
    "/text2sale-vs-onlysales",
    "/text2sale-vs-textdrip",
    "/text2sale-vs-salesmsg",
    "/text2sale-vs-gohighlevel",
    "/text2sale-vs-twilio",
    "/best-onlysales-alternative",
    "/best-textdrip-alternative",
  ];

  const nichePages = [
    "/health-insurance-texting-crm",
    "/life-insurance-texting-crm",
    "/final-expense-texting-crm",
    "/medicare-agent-texting-crm",
    "/recruiting-texting-crm",
    "/sales-team-texting-crm",
  ];

  return [
    ...corePages.map((page) => ({
      url: `${baseUrl}${page.path}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: page.priority,
    })),
    ...comparisonPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...nichePages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.82,
    })),
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
