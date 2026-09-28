import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI Texting CRM That Replies and Books Appointments | Text2Sale",
  description:
    "Text2Sale is an AI texting CRM that can reply to leads, qualify prospects, handle objections, book appointments, and help sales teams manage SMS conversations faster.",
  alternates: { canonical: "/ai-texting-crm" },
};

export default function AiTextingCrmPage() {
  return (
    <SeoLandingPage
      blogTags={["AI", "Workflows", "Missed calls", "Speed to lead"]}
      eyebrow="AI Texting CRM"
      title="AI texting CRM that replies fast, qualifies leads, and books appointments."
      description="Text2Sale gives your team an AI-powered texting assistant that can respond to inbound messages, ask qualifying questions, handle common objections, and push interested prospects toward a call or appointment. Your team stays in control while AI helps keep conversations moving."
      secondaryCta="Mass texting CRM"
      secondaryHref="/mass-texting-crm"
      canonicalPath="/ai-texting-crm"
      sections={[
        {
          title: "Instant replies",
          body: "Respond to new inbound texts in seconds so leads do not go cold while your team is busy.",
        },
        {
          title: "Lead qualification",
          body: "Ask the right questions, gather key details, and identify who is worth calling first.",
        },
        {
          title: "Appointment setting",
          body: "Move interested leads toward a scheduled call instead of leaving conversations open-ended.",
        },
        {
          title: "Objection handling",
          body: "Answer common concerns with consistent messaging based on your sales process.",
        },
      ]}
      guideTitle="How AI texting works in Text2Sale"
      guide={[
        {
          heading: "AI texting built for real sales conversations",
          paragraphs: [
            "Most leads do not wait around. If they text back and your team takes too long to respond, the opportunity can disappear. Text2Sale helps keep the conversation alive by giving your team AI replies, smart suggestions, sentiment cues, and a centralized inbox.",
            "On the Text2Sale + AI plan, AI reads each inbound reply in context and responds the way you have instructed it to: answering a question, asking the next qualifying question, handling a common objection, or offering appointment times. Booked appointments sync to Google Calendar so they show up where you already work.",
          ],
        },
        {
          heading: "You decide how much AI does",
          paragraphs: [
            "AI is a tool, not a replacement for your judgment. Some teams let it handle every reply after a campaign; others want suggestions only and send every message themselves. Text2Sale supports both.",
          ],
          bullets: [
            "Full AI mode handles every reply in a conversation",
            "A per-conversation toggle lets you switch AI off and take over at any point",
            "Smart replies suggest responses you can edit before sending",
            "Sentiment scoring and lead temperature show which conversations need a person now",
            "Your written instructions set the tone, the questions to ask, and what AI should never say",
          ],
        },
        {
          heading: "Where AI helps most",
          paragraphs: [
            "The biggest gains come from the moments your team cannot cover: replies that arrive while reps are on calls, after hours, or during a campaign that produces fifty responses at once. AI answers immediately, keeps the lead engaged, and hands the conversation to a person when it is ready for a call.",
            "Keep AI inside clear lines. Write instructions that tell it to identify your business, avoid making promises about pricing or coverage it cannot confirm, and escalate anything sensitive to a person. Review conversations regularly and refine the instructions as you learn what works.",
          ],
        },
      ]}
      noteTitle="Best for teams that need speed-to-lead"
      noteBody="Use AI to respond after campaigns, follow up with missed replies, qualify prospects before a call, and keep appointment-setting conversations moving without hiring another full-time setter."
      faq={[
        {
          question: "What does the AI actually do?",
          answer: "On the Text2Sale + AI plan, AI replies to inbound texts, asks qualifying questions, handles common objections, and books appointments that sync to Google Calendar, following the instructions you give it.",
        },
        {
          question: "Can I turn AI off for a conversation?",
          answer: "Yes. AI can be switched on or off for each conversation, so you can take over whenever a lead needs a person.",
        },
        {
          question: "How much does the AI plan cost?",
          answer: "The Text2Sale + AI plan is $59.99 per month, plus $0.012 per text and $0.025 per AI reply.",
        },
        {
          question: "Will AI replace my sales team?",
          answer: "No. AI covers fast replies and routine questions so leads do not go cold, and hands conversations to your team for calls and closing. Your team stays in control of what it says.",
        },
      ]}
      relatedPages={[
        {
          href: "/mass-texting-crm",
          label: "Mass texting CRM",
        },
        {
          href: "/sales-team-texting-crm",
          label: "Sales team texting CRM",
        },
        {
          href: "/sms-crm-for-insurance-agents",
          label: "SMS CRM for insurance agents",
        },
        {
          href: "/sms-follow-up-for-sales-teams",
          label: "SMS follow-up for sales teams",
        },
      ]}
    />
  );
}
