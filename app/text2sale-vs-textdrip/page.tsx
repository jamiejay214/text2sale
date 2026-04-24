import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs Textdrip | SMS CRM Comparison",
  description: "Compare Text2Sale vs Textdrip for bulk SMS, sales follow-up, AI texting, campaign management, and insurance agent CRM workflows.",
  alternates: { canonical: "/text2sale-vs-textdrip" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs Textdrip"
      title="Text2Sale vs Textdrip: built for sales teams that need more than drip texting."
      description="Textdrip is known for automated texting workflows. Text2Sale focuses on the full sales texting process: uploading leads, launching campaigns, managing replies, using AI to respond faster, and keeping conversations moving toward booked appointments."
      sections={[
        { title: "More than drip campaigns", body: "Text2Sale gives teams campaign sending, 2-way conversations, AI assistance, lead management, and performance tracking in one workflow." },
        { title: "AI reply support", body: "Use AI-assisted replies to help qualify prospects, answer common objections, and move interested leads toward a phone call." },
        { title: "Made for sales speed", body: "Your team can work inbound replies from one dashboard instead of losing hot leads across phones, spreadsheets, and disconnected apps." },
        { title: "Insurance-friendly positioning", body: "Text2Sale is especially strong for insurance teams that need fast follow-up, quote conversations, recruiting outreach, and appointment setting." }
      ]}
      bullets={["Bulk SMS campaigns", "Drip sequence support", "AI-assisted texting", "2-way conversations", "CSV imports", "Compliance-focused tools"]}
      noteTitle="Bottom line"
      noteBody="If you only need basic drip texting, Textdrip may be an option. If you want a broader SMS CRM with AI and sales-team workflows, Text2Sale is built for that lane."
    />
  );
}
