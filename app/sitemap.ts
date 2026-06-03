import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://text2sale.com";
  const today = new Date();

  const blogPosts = getAllPosts();

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
    "/best-salesmsg-alternative",
    "/best-gohighlevel-alternative",
    "/best-twilio-alternative",
  ];

  const nichePages = [
    "/health-insurance-texting-crm",
    "/life-insurance-texting-crm",
    "/final-expense-texting-crm",
    "/medicare-agent-texting-crm",
    "/recruiting-texting-crm",
    "/sales-team-texting-crm",
    "/auto-insurance-texting-crm",
    "/real-estate-texting-crm",
    "/mortgage-broker-texting-crm",
    "/solar-sales-texting-crm",
    "/best-sms-crm-for-insurance-agents",
  ];

  const articlePages = [
    "/how-to-text-insurance-leads",
    "/sms-follow-up-for-sales-teams",
    "/private-health-insurance-vs-marketplace-insurance",
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
    ...articlePages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.78,
    })),
    {
      url: `${baseUrl}/blog`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
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
