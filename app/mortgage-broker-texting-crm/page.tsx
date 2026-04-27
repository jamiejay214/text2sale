import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Texting CRM for Mortgage Brokers | Text2Sale",
  description: "Text2Sale is a texting CRM for mortgage brokers. Send bulk SMS to purchase and refi leads, manage conversations, use AI replies, and close more loans from one dashboard.",
  alternates: { canonical: "/mortgage-broker-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Mortgage Broker Texting CRM"
      title="A texting CRM built for mortgage brokers who need to follow up faster on leads."
      description="Mortgage leads are expensive and competitive. Text2Sale helps mortgage brokers send bulk SMS to purchase and refinance leads, manage conversations from a team inbox, use AI replies to keep prospects engaged, and close more loans."
      canonicalPath="/mortgage-broker-texting-crm"
      sections={[
        { title: "Fast follow-up on purchase leads", body: "Text new mortgage leads within seconds of receiving them. Brokers who respond first book the most applications." },
        { title: "Refi and rate campaigns", body: "Upload your existing client list and run refinance or rate-drop campaigns via SMS when rates move — reach your entire book in one send." },
        { title: "AI-assisted pre-qual conversations", body: "When leads reply asking about rates, down payments, or loan types, AI can help your team respond quickly and move them toward a scheduled call or application." },
        { title: "Team inbox for loan officer teams", body: "Keep all prospect conversations in one shared inbox so no lead gets missed when loan officers are busy with closings or applications." }
      ]}
      bullets={["Mortgage lead follow-up", "Refi campaign texting", "Bulk SMS outreach", "AI reply assistance", "Team inbox", "CSV lead imports"]}
      noteTitle="Why mortgage brokers use Text2Sale"
      noteBody="Text2Sale gives mortgage brokers a fast way to reach purchase and refinance leads by SMS, run bulk outreach campaigns, and manage conversations from one inbox — so more leads turn into applications."
      faq={[
        {
          question: "Can mortgage brokers use Text2Sale for lead follow-up?",
          answer: "Yes. Text2Sale is used by mortgage brokers to follow up on new purchase leads, run refinance campaigns, manage pre-qualification conversations in a 2-way inbox, and use AI replies to keep prospects moving toward a scheduled call."
        },
        {
          question: "Can I text my existing client list for refinance campaigns?",
          answer: "Yes. Upload your client list as a CSV and send a bulk SMS campaign when rates drop or when it is time to reach out about refinancing opportunities."
        },
        {
          question: "Is Text2Sale compliant for mortgage texting?",
          answer: "Text2Sale includes 10DLC-compliant texting and opt-out handling. For RESPA compliance and consent requirements specific to mortgage marketing, always consult your compliance team before launching campaigns."
        },
        {
          question: "How does Text2Sale help loan officers book more applications?",
          answer: "Text2Sale lets loan officers reach new leads immediately, run automated follow-up sequences, and use AI-assisted replies to answer common questions and schedule calls — all from one dashboard."
        },
        {
          question: "How much does Text2Sale cost for mortgage brokers?",
          answer: "Text2Sale starts at $39.99/month with a free trial available. It includes mass texting, AI replies, 2-way inbox, CSV imports, and campaign tools."
        }
      ]}
      relatedPages={[
        { href: "/real-estate-texting-crm", label: "Real Estate Texting CRM" },
        { href: "/sales-team-texting-crm", label: "Sales Team Texting CRM" },
        { href: "/mass-texting-crm", label: "Mass Texting CRM" },
        { href: "/ai-texting-crm", label: "AI Texting CRM" },
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for Insurance Agents" },
      ]}
    />
  );
}
