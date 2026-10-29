import type { Metadata } from "next";
import { PLAN_KEYS, PLANS } from "@/lib/plans";
import HomeClient from "./HomeClient";
import HomeFaq, { HOME_FAQ } from "@/components/HomeFaq";
import SiteLinks from "@/components/SiteLinks";
import { SITE_URL } from "@/lib/site-pages";

export const metadata: Metadata = {
  title: "AI Lead Follow-Up CRM & Appointment Setter | Text2Sale",
  description:
    "Text2Sale is an AI lead follow-up CRM for insurance agents and sales teams. Reactivate old leads, automate SMS follow-up, use a built-in dialer, and book appointments automatically.",
  alternates: { canonical: "/" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Text2Sale",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "AI lead follow-up, texting, dialing, and appointment booking for insurance agents and sales teams.",
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

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Text2Sale",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "CRM Software",
  operatingSystem: "Web browser",
  description:
    "AI lead follow-up CRM with mass texting, two-way conversations, a built-in dialer, AI receptionist, appointment booking, CSV contact import, campaign automation, and TCPA/10DLC compliance tools.",
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: PLAN_KEYS.map((key) => ({
    "@type": "Offer",
    name: PLANS[key].name,
    price: PLANS[key].price.toFixed(2),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: PLANS[key].price.toFixed(2),
      priceCurrency: "USD",
      unitText: "MONTH",
      billingDuration: "P1M",
    },
  })),
  featureList: [
    "AI lead follow-up",
    "Old lead reactivation",
    "Unlimited contacts",
    "Mass SMS campaigns",
    "2-way conversations",
    "CSV contact import",
    "Campaign builder with drip sequences",
    "TCPA and 10DLC compliance tools",
    "Manual, power and predictive dialer",
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
