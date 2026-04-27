import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Text Insurance Leads | SMS Follow-Up Guide | Text2Sale",
  description: "Learn how to text insurance leads effectively. Best practices for SMS follow-up, campaign timing, AI replies, and converting leads into calls using a texting CRM.",
  alternates: { canonical: "/how-to-text-insurance-leads" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="How to Text Insurance Leads"
      title="How to text insurance leads and turn more of them into booked calls."
      description="Texting is the highest-response follow-up channel for insurance leads — but it only works when you do it fast, consistently, and with the right message. Here is how insurance agents use Text2Sale to convert more leads into conversations."
      canonicalPath="/how-to-text-insurance-leads"
      secondaryCta="See insurance texting CRM"
      secondaryHref="/sms-crm-for-insurance-agents"
      sections={[
        { title: "Text within 5 minutes of receiving the lead", body: "Insurance leads that receive a text within 5 minutes are dramatically more likely to respond than leads contacted after an hour. Set up instant follow-up campaigns so every new lead gets a message automatically." },
        { title: "Keep the first message short and human", body: "Avoid long scripts. A short, direct message like 'Hi [Name], this is [Agent] — I got your info about health insurance. Are you still looking for coverage?' gets far more replies than a formal pitch." },
        { title: "Follow up at least 5 times before giving up", body: "Most leads do not reply to the first message. A drip sequence that sends follow-ups on day 1, 3, 5, 7, and 14 will convert leads that would otherwise be written off as dead." },
        { title: "Use AI to handle the busy work", body: "When leads reply with common questions about cost, coverage, or whether they qualify, AI-assisted replies can respond instantly and keep the conversation warm until your agent is ready to call." }
      ]}
      bullets={["Text within 5 minutes of opt-in", "Short first messages get more replies", "5+ follow-up touches per lead", "AI handles common questions", "Drip sequences for aged leads", "One inbox for the whole team"]}
      noteTitle="The fastest way to implement this"
      noteBody="Text2Sale is built for exactly this workflow. Upload your lead list, set up your follow-up sequence, and let the platform handle timing, opt-outs, and AI replies so your team can focus on calls."
      faq={[
        {
          question: "How should insurance agents text new leads?",
          answer: "Text new insurance leads within 5 minutes of receiving them with a short, conversational message. Then follow up at least 4 to 5 more times over the next two weeks using a drip sequence. Most conversions happen on the 3rd to 5th touch."
        },
        {
          question: "What should an insurance agent say in a first text to a lead?",
          answer: "Keep it short and human. Something like 'Hi [Name], this is [Agent] with [Agency]. I got your request about health insurance — are you still looking for coverage?' works better than a long script because it feels like a real person reaching out."
        },
        {
          question: "How many times should you text an insurance lead before giving up?",
          answer: "Most agents give up after one or two texts, but the data shows that 5 to 7 contacts significantly increases response rates. Use a drip sequence to automate follow-up over 14 to 21 days before marking a lead as unresponsive."
        },
        {
          question: "What is the best texting CRM for insurance agents?",
          answer: "Text2Sale is designed specifically for insurance agents. It includes bulk SMS campaigns, drip sequences, AI-assisted replies, CSV lead imports, and a team inbox — all the tools agents need to text leads at scale and convert more into booked calls."
        },
        {
          question: "Is it legal to text insurance leads?",
          answer: "Texting insurance leads is legal when leads have provided express written consent to receive SMS messages. Always collect proper opt-in consent at the point of lead capture and use a 10DLC-compliant platform like Text2Sale to send compliant campaigns."
        }
      ]}
      relatedPages={[
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for Insurance Agents" },
        { href: "/health-insurance-texting-crm", label: "Health Insurance Texting CRM" },
        { href: "/life-insurance-texting-crm", label: "Life Insurance Texting CRM" },
        { href: "/medicare-agent-texting-crm", label: "Medicare Agent Texting CRM" },
        { href: "/final-expense-texting-crm", label: "Final Expense Texting CRM" },
        { href: "/ai-texting-crm", label: "AI Texting CRM" },
      ]}
    />
  );
}
