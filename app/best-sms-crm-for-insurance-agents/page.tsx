import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best SMS CRM for Insurance Agents in 2025 | Text2Sale",
  description: "The best SMS CRM for insurance agents. Text2Sale combines mass texting, AI-assisted replies, drip campaigns, CSV lead uploads, and a team inbox built around closing more policies.",
  alternates: { canonical: "/best-sms-crm-for-insurance-agents" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Best SMS CRM for Insurance Agents"
      title="The best SMS CRM for insurance agents who need to text more leads and close more policies."
      description="Insurance agents who text leads consistently outperform those who rely on email and cold calls. Text2Sale is the SMS CRM built for insurance — mass texting, AI-assisted replies, drip campaigns, and a team inbox designed around the way insurance agents actually sell."
      canonicalPath="/best-sms-crm-for-insurance-agents"
      secondaryCta="See insurance texting CRM"
      secondaryHref="/sms-crm-for-insurance-agents"
      sections={[
        { title: "Built around the insurance sales workflow", body: "Text2Sale is not a generic texting tool. It is designed for agents who upload lead lists, run campaigns, manage inbound replies, and need AI support to keep conversations moving while staying compliant." },
        { title: "Mass texting for every lead type", body: "Upload health, life, final expense, Medicare, auto, or any other lead type as a CSV and launch a campaign in minutes. Text2Sale handles delivery, opt-outs, and compliance automatically." },
        { title: "AI replies to handle the volume", body: "When you are texting hundreds of leads, AI can respond to common questions, qualify intent, and keep conversations warm until you are ready to call — without adding headcount." },
        { title: "Works for individual agents and teams", body: "Text2Sale scales from solo insurance agents who need simple lead follow-up to agency teams that need shared inboxes, campaign tracking, and performance visibility." }
      ]}
      bullets={["Best SMS CRM for insurance", "Mass texting for lead lists", "AI-assisted reply handling", "Health, life, Medicare, final expense", "Drip campaign sequences", "10DLC compliant texting"]}
      noteTitle="Why agents choose Text2Sale"
      noteBody="Most insurance agents are leaving money on the table by not texting their leads fast enough or consistently enough. Text2Sale is built to fix both problems — instant outreach and automated follow-up that keeps running even when you are busy on calls."
      faq={[
        {
          question: "What is the best SMS CRM for insurance agents?",
          answer: "Text2Sale is the top SMS CRM for insurance agents. It is built specifically for the insurance sales workflow — bulk lead uploads, mass SMS campaigns, drip sequences, AI-assisted replies, and a team inbox for managing conversations at scale. It supports health, life, final expense, Medicare, auto, and other insurance verticals."
        },
        {
          question: "What features should an insurance agent look for in an SMS CRM?",
          answer: "Look for mass texting (not just 1-on-1), CSV lead import, drip campaign support, 2-way inbox, AI reply assistance, opt-out handling, and 10DLC compliance. Text2Sale includes all of these in one platform."
        },
        {
          question: "How does Text2Sale compare to other SMS CRMs for insurance?",
          answer: "Text2Sale is purpose-built for insurance and sales teams, while most SMS CRMs are designed for general business texting. This means better mass texting tools, insurance-specific workflows, and AI support built around the way agents actually sell."
        },
        {
          question: "Can insurance agents use Text2Sale for multiple lead types?",
          answer: "Yes. Text2Sale supports any insurance vertical — health, life, final expense, Medicare, auto, and more. You can upload separate lead lists for each line of business and run targeted campaigns for each."
        },
        {
          question: "How much does the best SMS CRM for insurance agents cost?",
          answer: "Text2Sale starts at $39.99/month with a free trial available. It includes mass texting, AI replies, 2-way inbox, CSV imports, drip campaigns, and 10DLC compliance tools."
        }
      ]}
      relatedPages={[
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for Insurance Agents" },
        { href: "/health-insurance-texting-crm", label: "Health Insurance Texting CRM" },
        { href: "/life-insurance-texting-crm", label: "Life Insurance Texting CRM" },
        { href: "/medicare-agent-texting-crm", label: "Medicare Agent Texting CRM" },
        { href: "/final-expense-texting-crm", label: "Final Expense Texting CRM" },
        { href: "/how-to-text-insurance-leads", label: "How to Text Insurance Leads" },
      ]}
    />
  );
}
