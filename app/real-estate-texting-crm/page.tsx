import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Texting CRM for Real Estate Agents | Text2Sale",
  description: "Text2Sale is a texting CRM for real estate agents. Send bulk SMS to buyer and seller leads, manage replies, use AI follow-up, and book more showings from one dashboard.",
  alternates: { canonical: "/real-estate-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Real Estate Texting CRM"
      title="A texting CRM built for real estate agents who need faster lead follow-up."
      description="Real estate leads go cold fast. Text2Sale helps agents send bulk SMS to buyer and seller leads, manage 2-way conversations, use AI to keep replies moving, and book more showings — all from one texting CRM built around speed."
      canonicalPath="/real-estate-texting-crm"
      sections={[
        { title: "Instant lead follow-up", body: "Text new buyer and seller leads within seconds of receiving them. Speed to lead is one of the biggest factors in whether a real estate prospect picks you or your competitor." },
        { title: "Bulk outreach to your list", body: "Upload your CRM contacts or cold lead list as a CSV and send a campaign to hundreds of prospects at once — open houses, price drops, new listings, or reactivation sequences." },
        { title: "AI-assisted replies", body: "When inbound messages come in, AI can help your team respond faster, qualify buyer intent, and schedule showings without leaving the dashboard." },
        { title: "One inbox for the whole team", body: "All texts, replies, and follow-up threads stay in one place so no lead falls through the cracks when agents are out showing properties." }
      ]}
      bullets={["Bulk SMS to buyer leads", "Seller lead follow-up", "AI reply assistance", "Open house text campaigns", "CSV lead imports", "2-way team inbox"]}
      noteTitle="Why real estate teams use Text2Sale"
      noteBody="Text2Sale gives real estate agents a fast, simple way to text every lead on their list, manage replies from one inbox, and use AI to keep conversations moving toward showings and signed contracts."
      faq={[
        {
          question: "Can real estate agents use Text2Sale for lead follow-up?",
          answer: "Yes. Text2Sale is used by real estate agents to send bulk SMS to buyer and seller leads, follow up on open house inquiries, reactivate cold leads, and manage 2-way conversations from one team inbox."
        },
        {
          question: "How does Text2Sale help real estate agents book more showings?",
          answer: "Text2Sale lets agents text leads immediately after they come in, send campaign sequences to large lists, and use AI-assisted replies to keep conversations moving toward scheduled showings — all without switching between multiple tools."
        },
        {
          question: "Can I upload my real estate lead list into Text2Sale?",
          answer: "Yes. You can import buyer leads, seller leads, or any contact list as a CSV file. Text2Sale supports bulk uploads so you can reach your entire pipeline at once."
        },
        {
          question: "Is Text2Sale 10DLC compliant for real estate texting?",
          answer: "Yes. Text2Sale includes 10DLC-compliant texting tools to help ensure your messages reach leads without being flagged by carriers."
        },
        {
          question: "How much does Text2Sale cost for real estate agents?",
          answer: "Text2Sale starts at $39.99/month and includes mass texting, AI replies, 2-way inbox, CSV imports, and campaign tools. A free trial is available."
        }
      ]}
      relatedPages={[
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for Insurance Agents" },
        { href: "/sales-team-texting-crm", label: "Sales Team Texting CRM" },
        { href: "/recruiting-texting-crm", label: "Recruiting Texting CRM" },
        { href: "/mass-texting-crm", label: "Mass Texting CRM" },
        { href: "/ai-texting-crm", label: "AI Texting CRM" },
      ]}
    />
  );
}
