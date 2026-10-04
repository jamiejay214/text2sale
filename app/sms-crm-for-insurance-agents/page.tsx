import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "SMS CRM for Insurance Agents | Text2Sale",
  description:
    "Text2Sale is an SMS CRM for insurance agents that need bulk texting, lead follow-up, AI replies, 2-way conversations, CSV uploads, and compliance tools.",
  alternates: { canonical: "/sms-crm-for-insurance-agents" },
};

export default function SmsCrmForInsuranceAgentsPage() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Speed to lead", "Scripts", "Compliance"]}
      eyebrow="Insurance Agent SMS CRM"
      title="SMS CRM for insurance agents who live off speed, follow-up, and booked calls."
      description="Text2Sale helps health, life, final expense, Medicare, and agency sales teams text leads faster, manage replies in one inbox, automate follow-up, and use AI to push interested prospects toward a quote call."
      secondaryCta="See AI texting"
      secondaryHref="/ai-texting-crm"
      canonicalPath="/sms-crm-for-insurance-agents"
      sections={[
        {
          title: "Work internet leads faster",
          body: "Upload lead lists and start conversations before the prospect forgets they requested information.",
        },
        {
          title: "Handle inbound replies",
          body: "Keep every reply, question, objection, and call request organized in a single inbox.",
        },
        {
          title: "Use scripts and templates",
          body: "Give agents approved message templates for quote follow-up, appointment reminders, and missed-call recovery.",
        },
        {
          title: "Let AI help qualify",
          body: "AI can ask basic qualifying questions and move interested prospects toward a phone call.",
        },
      ]}
      guideTitle="Why insurance agents need texting built into the CRM"
      guide={[
        {
          heading: "Insurance sales is a follow-up game",
          paragraphs: [
            "Calls matter, but many prospects answer texts faster than phone calls. Internet leads often hear from several agents within an hour of requesting a quote, and the agent who responds first with something useful usually gets the conversation. Text2Sale helps agents turn aged leads, new inquiries, referral lists, and reactivation campaigns into live conversations without bouncing between a dialer, a spreadsheet, and a personal phone.",
            "The platform brings the pieces together: CSV lead uploads, bulk campaigns, drip sequences that stop when someone replies, a two-way inbox, AI replies with AI, and appointment booking that syncs to Google Calendar.",
          ],
        },
        {
          heading: "One workflow across every line of business",
          paragraphs: [
            "Each line has its own rhythm, and your texting should follow it. The workflow stays the same: a fast first touch, consistent follow-up, and reminders that get people to the call.",
          ],
          bullets: [
            "Health: answer quote requests fast and plan campaigns around Open Enrollment and special enrollment events",
            "Life: keep applicants informed through exams and underwriting so approved policies get placed",
            "Final expense: follow up patiently with a calm, reassuring tone and daytime sending",
            "Medicare: text only beneficiaries who asked to hear from you, and use texts for scheduling",
            "Recruiting: reply to agent candidates the same day and keep them engaged through licensing",
          ],
        },
        {
          heading: "Compliance that protects your book",
          paragraphs: [
            "Insurance marketing draws more consent-related lawsuits than almost any other industry, so compliance has to be built into the workflow rather than remembered. Text only people whose consent covers texts from you, identify your agency in the first message, and honor opt-outs immediately.",
            "Text2Sale records STOP replies automatically, blocks opted-out numbers across every campaign, applies quiet-hours sending windows, and walks you through 10DLC registration. Those tools support good practice; how you collect consent is still up to you.",
          ],
        },
      ]}
      faq={[
        {
          question: "What is an SMS CRM for insurance agents?",
          answer: "It is a CRM built around texting: it stores your leads, sends campaigns and drip sequences, keeps every reply in one inbox, and tracks opt-outs so agents can follow up quickly and compliantly.",
        },
        {
          question: "Can I text leads I bought from a lead vendor?",
          answer: "Only if the lead's consent covers texts from you. Many vendor leads name specific companies. Check the consent language and keep a record before texting.",
        },
        {
          question: "Does Text2Sale work for health, life, final expense, and Medicare agents?",
          answer: "Yes. Agents in each of those lines use the same core workflow: fast first-touch texts, drip follow-up, appointment reminders, and opt-out handling.",
        },
        {
          question: "What does Text2Sale cost for an insurance agent?",
          answer: "Text2Sale is $39.99 per month with AI included. Outbound SMS is $0.015 per segment, inbound SMS is free, and AI replies are $0.020 each plus the outbound SMS segment charge. AI replies and appointment booking are included with the platform.",
        },
      ]}
      relatedPages={[
        {
          href: "/best-sms-crm-for-insurance-agents",
          label: "Best SMS CRM for insurance agents",
        },
        {
          href: "/health-insurance-texting-crm",
          label: "Health insurance texting CRM",
        },
        {
          href: "/life-insurance-texting-crm",
          label: "Life insurance texting CRM",
        },
        {
          href: "/final-expense-texting-crm",
          label: "Final expense texting CRM",
        },
        {
          href: "/medicare-agent-texting-crm",
          label: "Medicare agent texting CRM",
        },
      ]}
    />
  );
}
