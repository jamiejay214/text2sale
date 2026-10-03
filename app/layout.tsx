import type { Metadata } from "next";
import Script from "next/script";
import Tracker from "@/components/Tracker";
import "./globals.css";
import "./workspace-theme.css";

const META_PIXEL_ID = "959512910266492";

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
  // No site-wide canonical, og:title, og:url or twitter:title here. Child
  // segments inherit whatever the root sets, so a root canonical of "/"
  // told Google every page without its own override (privacy, terms,
  // landing pages) was a duplicate of the homepage. Pages declare their own
  // canonical; og/twitter titles fall back to each page's own title, and the
  // share image comes from app/opengraph-image.tsx.
  openGraph: {
    siteName: "Text2Sale",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Meta Pixel ONLY on text2sale.com. Compliance sites (custom
            domains like northernlegacyia.info) get a clean head so carriers
            don't flag the opt-in page. Homepage structured data lives in
            app/page.tsx, blog markup in the blog routes. */}
        {/* This script exists in the static root layout but exits before loading
            anything unless the browser is on Text2Sale's own host. That keeps
            customer compliance domains clean without forcing every route to
            call headers() and become request-time rendered. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
if (/^(text2sale\.com|www\.text2sale\.com|localhost|127\.0\.0\.1)$/.test(location.hostname) || location.hostname.endsWith('.vercel.app')) {
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
}
              `}
        </Script>
      </head>
      <body className="min-h-full bg-background text-foreground">
        <Tracker />
        {children}
      </body>
    </html>
  );
}
