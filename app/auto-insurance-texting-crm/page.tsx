import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Texting CRM for Auto Insurance Agents | Text2Sale",
  description: "Text2Sale is a texting CRM for auto insurance agents. Send bulk SMS to auto leads, manage quote conversations, use AI replies, and book more calls from one dashboard.",
  alternates: { canonical: "/auto-insurance-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Auto Insurance Texting CRM"
      title="A texting CRM built for auto insurance agents who need fast lead follow-up."
      description="Auto insurance leads are competitive and time-sensitive. Text2Sale helps auto insurance agents send bulk SMS to their lead lists, manage quote conversations, use AI-assisted replies, and book more calls — all from one texting CRM built for speed."
      canonicalPath="/auto-insurance-texting-crm"
      sections={[
        { title: "Text auto leads instantly", body: "Reach new auto insurance leads within seconds of receiving them. Fast follow-up is the difference between booking a quote call and losing the lead to a competitor." },
        { title: "Bulk campaigns for your full list", body: "Upload your lead list as a CSV and send an SMS campaign to hundreds of auto insurance prospects at once — rate reminders, renewal outreach, or new policy campaigns." },
        { title: "AI-assisted quote conversations", body: "When leads reply, AI can help your team respond faster, answer common questions about coverage and rates, and move conversations toward a scheduled call." },
        { title: "Manage all replies in one inbox", body: "Keep every auto insurance conversation in a single team inbox so no hot lead gets missed when your agents are on calls." }
      ]}
      bullets={["Auto insurance lead texting", "Bulk SMS campaigns", "Quote conversation management", "AI reply assistance", "CSV lead imports", "Renewal outreach"]}
      noteTitle="Why auto insurance agents use Text2Sale"
      noteBody="Text2Sale helps auto insurance agents move faster on leads, run bulk outreach campaigns, and manage replies from one place — so more leads turn into quote calls and policies."
      faq={[
        {
          question: "Can auto insurance agents use Text2Sale?",
          answer: "Yes. Text2Sale is used by auto insurance agents to follow up on new leads, send bulk SMS campaigns to their full list, manage quote conversations in a 2-way inbox, and use AI to respond faster and book more calls."
        },
        {
          question: "How does Text2Sale help auto insurance agents get more quotes?",
          answer: "Text2Sale lets agents reach leads immediately after they come in, run renewal and rate campaigns to existing contacts, and use AI-assisted replies to keep prospects engaged — all from one dashboard."
        },
        {
          question: "Can I import my auto insurance leads into Text2Sale?",
          answer: "Yes. Upload your lead list as a CSV and launch a bulk SMS campaign to all of them at once. Text2Sale is built for high-volume lead outreach."
        },
        {
          question: "Is Text2Sale compliant for auto insurance texting?",
          answer: "Yes. Text2Sale includes 10DLC-compliant texting tools and opt-out handling so your campaigns follow carrier guidelines."
        },
        {
          question: "How much does Text2Sale cost for auto insurance agents?",
          answer: "Text2Sale starts at $39.99/month with a free trial available. It includes mass texting, AI replies, 2-way inbox, CSV imports, and campaign tools."
        }
      ]}
      relatedPages={[
        { href: "/health-insurance-texting-crm", label: "Health Insurance Texting CRM" },
        { href: "/life-insurance-texting-crm", label: "Life Insurance Texting CRM" },
        { href: "/final-expense-texting-crm", label: "Final Expense Texting CRM" },
        { href: "/medicare-agent-texting-crm", label: "Medicare Agent Texting CRM" },
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for Insurance Agents" },
      ]}
    />
  );
}
