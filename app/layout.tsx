import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text2Sale — Mass Texting CRM for Insurance Agents & Sales Teams",
  description: "The #1 mass texting CRM for insurance agents, sales teams, and business owners. Upload CSV contact lists, build drip campaigns, manage 2-way conversations, and stay TCPA/10DLC compliant — all from one dashboard.",
  keywords: [
    "mass texting software",
    "SMS CRM",
    "insurance agent CRM",
    "mass texting for insurance",
    "TCPA compliant SMS",
    "10DLC texting",
    "bulk SMS software",
    "sales texting platform",
    "lead texting CRM",
    "text message marketing",
  ],
  authors: [{ name: "Text2Sale" }],
  creator: "Text2Sale",
  publisher: "Text2Sale",
  metadataBase: new URL("https://text2sale.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Text2Sale — Mass Texting CRM for Sales Teams",
    description: "Upload leads, build campaigns, send thousands of texts, and close more deals. TCPA & 10DLC compliant.",
    url: "https://text2sale.com",
    siteName: "Text2Sale",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Text2Sale — Mass Texting CRM",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text2Sale — Mass Texting CRM",
    description: "The #1 mass texting CRM for sales teams. TCPA & 10DLC compliant.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "tTjQ-KPggaiKkYkRteyJR9N21FXPosX-X7drUiErr-4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema.org structured data — helps Google show rich results
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Text2Sale",
    url: "https://text2sale.com",
    logo: "https://text2sale.com/logo.png",
    description: "Mass texting CRM platform for sales teams and insurance agents.",
    sameAs: [
      "https://text2sale.com",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@text2sale.com",
      contactType: "Customer Support",
      availableLanguage: ["English"],
    },
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Text2Sale",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM Software",
    operatingSystem: "Web Browser (Cloud)",
    description: "The #1 mass texting CRM for insurance agents, sales teams, and business owners. Upload CSV contact lists, build drip campaigns, manage 2-way conversations, and stay TCPA/10DLC compliant.",
    url: "https://text2sale.com",
    image: "https://text2sale.com/logo.png",
    offers: {
      "@type": "Offer",
      price: "39.99",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "39.99",
        priceCurrency: "USD",
        unitText: "MONTH",
        billingDuration: "P1M",
      },
    },
    featureList: [
      "Unlimited contacts",
      "Mass SMS campaigns",
      "2-way conversations",
      "CSV contact import",
      "Campaign builder with drip sequences",
      "Real-time delivery tracking",
      "TCPA & 10DLC compliance tools",
      "DNC / opt-out handling",
      "Quiet hours compliance",
      "Team collaboration",
      "Local phone numbers",
      "Auto-recharge wallet",
      "Dark/light mode",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Text2Sale",
    url: "https://text2sale.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://text2sale.com/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Text2Sale?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text2Sale is a mass texting CRM platform for insurance agents, sales teams, and business owners. It lets you upload lead lists, send bulk SMS campaigns, manage 2-way conversations, and stay compliant with TCPA and 10DLC regulations.",
        },
      },
      {
        "@type": "Question",
        name: "How much does Text2Sale cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text2Sale starts at $39.99 per month for full platform access, plus $0.012 per text message sent. Bulk discounts apply: save 10% when you add $100+ to your wallet and 15% off $500+.",
        },
      },
      {
        "@type": "Question",
        name: "Is Text2Sale TCPA compliant?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Text2Sale includes built-in TCPA compliance tools: automatic STOP keyword handling, DNC list management, quiet hours enforcement, opt-in tracking, and 10DLC brand/campaign registration.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need 10DLC registration to use Text2Sale?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, US carriers require 10DLC registration for all A2P messaging. Text2Sale walks you through the registration process inside the dashboard — brand registration and campaign approval typically take 1–3 business days.",
        },
      },
      {
        "@type": "Question",
        name: "Can I text leads from my own phone number?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text2Sale provides local phone numbers you can purchase and use to send texts. You can also use multiple numbers and the system will round-robin texts across them automatically to improve deliverability.",
        },
      },
    ],
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
