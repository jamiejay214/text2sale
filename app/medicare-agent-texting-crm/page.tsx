import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Medicare Agent Texting CRM | Text2Sale",
  description: "Text2Sale is a Medicare agent texting CRM for SMS campaigns, appointment follow-up, AI replies, lead management, and 2-way conversations.",
  alternates: { canonical: "/medicare-agent-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Medicare", "AEP", "Health Insurance"]}
      eyebrow="Medicare Agent Texting CRM"
      title="Medicare agent texting CRM for appointment follow-up and lead conversations."
      description="Text2Sale helps Medicare agents and agencies manage SMS outreach, follow up with prospects, organize replies, and use AI-assisted texting to keep conversations moving toward appointments."
      sections={[
        { title: "Follow up with Medicare leads", body: "Text prospects about appointments, plan review conversations, call requests, and follow-up reminders from one dashboard." },
        { title: "Centralized conversations", body: "Keep inbound questions, replies, and appointment conversations organized for agents and managers." },
        { title: "AI-assisted SMS", body: "Use AI support to reply faster, qualify interest, and help guide prospects toward scheduled calls." },
        { title: "Team visibility", body: "Track campaign activity, conversations, replies, and follow-up so no interested prospect gets missed." }
      ]}
      bullets={["Medicare lead follow-up", "Appointment reminders", "AI texting", "SMS campaigns", "2-way conversations", "Agency workflow"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is useful for Medicare agencies that want a focused texting CRM for lead follow-up, appointment conversations, and team-managed SMS outreach."
      canonicalPath="/medicare-agent-texting-crm"
      guideTitle="How Medicare agents use texting without breaking the rules"
      guide={[
        {
          heading: "Text the people who asked to hear from you",
          paragraphs: [
            "Medicare marketing is one of the most tightly regulated corners of insurance sales. CMS rules prohibit unsolicited direct contact to market Medicare Advantage and Part D plans, and that includes text messages. In practice, a text should go only to someone who requested information, called you, returned a business reply card, or otherwise gave you documented permission to reach out.",
            "That makes the first job of a Medicare texting CRM record-keeping. Text2Sale keeps the lead source, the opt-in, and every message in the contact's thread, so when a beneficiary or a carrier asks why someone heard from you, the answer is on file. It also stops messages to anyone who replies STOP, across every campaign, not only the one they answered.",
          ],
        },
        {
          heading: "Use texts to schedule, then talk",
          paragraphs: [
            "Texting works best in Medicare as a scheduling and reminder channel rather than a place to discuss plan benefits. A short text confirming a call time, sharing what to have ready, and reminding the beneficiary the day before cuts no-shows without putting plan details into a thread that is hard to review later.",
            "When a beneficiary agrees to a personal marketing appointment, remember that CMS generally requires a Scope of Appointment to be documented at least 48 hours before the meeting, with some exceptions such as beneficiary-initiated walk-ins and the final days of an enrollment period. Build the reminder sequence around that timeline so the paperwork is done before the appointment rather than rushed at it.",
          ],
          bullets: [
            "Appointment confirmation with the date, time, and whether it is a phone or in-person meeting",
            "A reminder to have their Medicare card and current medication list ready",
            "A day-before reminder with an easy way to reschedule",
            "A thank-you text afterward with your direct number for questions",
          ],
        },
        {
          heading: "Plan around the enrollment calendar",
          paragraphs: [
            "Volume in Medicare is seasonal. The Annual Enrollment Period runs October 15 through December 7, the Medicare Advantage Open Enrollment Period runs January 1 through March 31, and turning-65 prospects have a seven-month Initial Enrollment Period around their birthday month. Each window changes what a beneficiary can do, so your messages should reflect the window they are in.",
            "A texting CRM helps you get ahead of the rush. Segment contacts by the window that applies to them, prepare templates in advance, and let the two-way inbox collect replies during AEP when phones are ringing all day. The AI plan can answer routine scheduling questions and hand anything about plan choice back to a licensed agent.",
          ],
        },
      ]}
      faq={[
        {
          question: "Can Medicare agents text leads?",
          answer: "Yes, with conditions. CMS prohibits unsolicited direct contact, including texts, to market Medicare Advantage and Part D plans, so text only beneficiaries who requested information or gave you documented permission. TCPA consent rules and your carriers' own requirements apply as well.",
        },
        {
          question: "Does Text2Sale handle STOP replies automatically?",
          answer: "Yes. Replies such as STOP, END, CANCEL, QUIT, and UNSUBSCRIBE are recorded as opt-outs automatically, and Text2Sale blocks future messages to that number across all of your campaigns.",
        },
        {
          question: "Can I send appointment reminders to Medicare prospects?",
          answer: "Yes. Appointment confirmations and reminders are one of the most useful ways to text Medicare prospects who agreed to meet with you. Keep plan-specific details for the conversation itself and use texts for logistics.",
        },
        {
          question: "Can AI reply to Medicare prospects for me?",
          answer: "On the Text2Sale + AI plan, AI can answer routine questions like rescheduling and confirm appointment times. You can switch AI off for any conversation, and plan recommendations should always come from a licensed agent.",
        },
        {
          question: "Is this legal advice?",
          answer: "No. This page is general information. The CMS Medicare Communications and Marketing Guidelines, your carrier contracts, and your compliance team are the authority, and the rules change from year to year.",
        },
      ]}
      relatedPages={[
        {
          href: "/sms-crm-for-insurance-agents",
          label: "SMS CRM for insurance agents",
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
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
      ]}
    />
  );
}
