import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI Appointment Setter for Sales & Insurance Leads | Text2Sale",
  description:
    "Text2Sale is an AI appointment setter that follows up with leads by text, qualifies interest, handles replies, and books calls directly to your calendar.",
  alternates: { canonical: "/ai-appointment-setter" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["AI", "Appointments", "Speed to lead", "Automation"]}
      eyebrow="AI Appointment Setter"
      title="Turn lead replies into booked appointments automatically."
      description="Text2Sale follows up with opted-in leads, answers common questions, qualifies interest, and offers available appointment times so your team spends more time on live sales conversations."
      secondaryCta="See AI texting CRM"
      secondaryHref="/ai-texting-crm"
      canonicalPath="/ai-appointment-setter"
      sections={[
        { title: "Instant follow-up", body: "Respond to interested leads while intent is still high instead of waiting for a rep to become available." },
        { title: "Qualification", body: "Ask the questions your team needs before a call and keep the conversation moving one step at a time." },
        { title: "Calendar booking", body: "Offer available appointment times and put confirmed calls onto the connected calendar." },
        { title: "Human handoff", body: "Let a salesperson take over when a conversation needs judgment, advice, or a live close." },
      ]}
      guideTitle="How an AI appointment setter fits into a real sales workflow"
      guide={[
        { heading: "Start with leads who already asked to hear from you", paragraphs: ["AI follow-up works best when the lead has already requested information or otherwise given permission for text follow-up. Text2Sale keeps consent, replies, campaign activity, and appointment status together so your team can see the full history.", "The goal is not to make AI sound like a salesperson who can promise anything. The goal is to answer quickly, identify interest, and move the prospect toward a scheduled conversation with your team."] },
        { heading: "Use AI where response time matters most", paragraphs: ["Most appointment leakage happens between the moment a lead responds and the moment a rep is free. AI can cover that gap by replying immediately, asking the next question, and offering a time while the prospect is still engaged."], bullets: ["New lead follow-up", "Aged lead reactivation", "After-hours replies", "Campaign response handling", "Appointment rescheduling and reminders"] },
        { heading: "Keep control with clear instructions", paragraphs: ["Give AI a narrow objective, approved language, escalation rules, and a clear point where a person takes over. For regulated industries such as insurance, keep recommendations and coverage advice with the licensed agent."] },
      ]}
      faq={[
        { question: "What is an AI appointment setter?", answer: "It is software that responds to leads, asks qualifying questions, and offers appointment times automatically. Text2Sale combines that workflow with texting, CRM records, campaigns, and calendar booking." },
        { question: "Can I take over a conversation?", answer: "Yes. AI can be switched off per conversation so a rep can take over at any time." },
        { question: "Does it work with old leads?", answer: "Yes, when those contacts have permission that covers your follow-up. Text2Sale is built for reactivation campaigns as well as new inbound leads." },
        { question: "Does Text2Sale book to Google Calendar?", answer: "Yes. Appointment booking can sync with Google Calendar so confirmed calls appear in the calendar your team already uses." },
      ]}
      relatedPages={[
        { href: "/insurance-agents", label: "AI for insurance agents" },
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-texting-crm", label: "AI texting CRM" },
      ]}
    />
  );
}
