import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import HomeFaq, { HOME_FAQ } from "@/components/HomeFaq";
import SiteLinks from "@/components/SiteLinks";
import { SITE_URL } from "@/lib/site-pages";

// Server wrapper for the homepage. The interactive page (hero, pricing, auth
// form) is a client component, and client components can't export metadata,
// so the canonical URL and the homepage-only structured data live here.
// Structured data used to sit in the root layout, which stamped the
// homepage's FAQ and product markup onto every URL on the site.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Text2Sale",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: "AI follow-up and appointment booking for insurance agents and sales teams.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@text2sale.com",
    contactType: "customer support",
    availableLanguage: ["English"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Text2Sale",
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

// Prices mirror the plan cards in HomeClient. No aggregateRating: rating
// markup must come from real, visible reviews, and there is no review source.
const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Text2Sale",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM Software",
  operatingSystem: "Web browser",
  description:
    "Mass texting CRM for insurance agents, sales teams, and business owners. Upload CSV contact lists, build drip campaigns, manage 2-way conversations, and keep TCPA and 10DLC compliance records.",
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: [
    {
      "@type": "Offer",
      name: "Text2Sale",
      price: "39.99",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "39.99",
        priceCurrency: "USD",
        unitText: "MONTH",
        billingDuration: "P1M",
      },
    },
  ],
  featureList: [
    "Unlimited contacts",
    "Mass SMS campaigns",
    "2-way conversations",
    "CSV contact import",
    "Campaign builder with drip sequences",
    "TCPA and 10DLC compliance tools",
    "Quiet hours sending windows",
    "Team management",
    "AI auto-replies and appointment booking",
    "AI calling receptionist with qualification and booking",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function HomePage() {
  return (
    <>
      {[organizationSchema, websiteSchema, softwareApplicationSchema, faqSchema].map((schema) => (
        <script
          key={schema["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <HomeClient faqSection={<HomeFaq />} siteLinks={<SiteLinks />} />
    </>
  );
}
