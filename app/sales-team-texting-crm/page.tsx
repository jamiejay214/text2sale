import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Sales Team Texting CRM | Text2Sale",
  description: "Text2Sale is a sales team texting CRM for bulk SMS campaigns, AI replies, lead follow-up, appointment setting, team inboxes, and 2-way conversations.",
  alternates: { canonical: "/sales-team-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Sales teams", "Scripts", "SMS follow-up", "Speed to lead"]}
      eyebrow="Sales Team Texting CRM"
      title="Sales team texting CRM built to turn replies into revenue."
      description="Text2Sale helps sales teams upload lead lists, send SMS campaigns, manage replies, use AI-assisted follow-up, and keep every conversation organized so reps can book more calls and close faster."
      sections={[
        { title: "Mass texting for teams", body: "Send campaigns to segmented lead lists and keep your outreach organized across reps and campaigns." },
        { title: "2-way sales inbox", body: "Manage inbound replies, objections, hot leads, and appointment requests from one team dashboard." },
        { title: "AI-assisted follow-up", body: "Use AI support to respond faster, qualify leads, and move prospects toward booked calls." },
        { title: "Built for managers", body: "Give managers visibility into campaign activity, replies, conversations, and follow-up execution." }
      ]}
      bullets={["Sales lead texting", "AI replies", "Team inbox", "Campaign tracking", "CSV imports", "Appointment setting"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is built for sales teams that depend on fast lead response, consistent follow-up, and organized texting workflows across multiple reps."
      canonicalPath="/sales-team-texting-crm"
      guideTitle="Running a sales team on text"
      guide={[
        {
          heading: "Speed to lead is a team problem",
          paragraphs: [
            "Most sales teams know that responding within minutes matters. The problem is execution: new leads arrive while reps are on calls, in meetings, or off shift, and a lead that waits an hour has often already talked to a competitor. Individual discipline does not fix that. A system does.",
            "Text2Sale can send a first-touch text automatically when a lead arrives through a connected form or integration, and campaigns reach uploaded lists in one step. Every reply lands in the rep's two-way inbox, and managers can see conversations across the team. On the AI plan, AI can respond to inbound replies immediately and book a call, so the lead gets an answer even when every rep is busy.",
          ],
        },
        {
          heading: "Give reps templates, not blank text boxes",
          paragraphs: [
            "When every rep writes their own messages, quality varies and compliance slips. Shared templates for first touch, follow-up, appointment confirmation, and no-show recovery keep the team consistent and make it easy for new reps to sound like your best ones.",
            "Keep templates short, personal, and specific. Use the lead's first name, reference what they asked for, and end with one question. Every first message to a new contact should identify your business and tell the recipient how to opt out.",
          ],
          bullets: [
            "First touch: who you are, why you are texting, one question",
            "Follow-up: a new angle, not the same message again",
            "Appointment confirmation: date, time, and how to reschedule",
            "No-show recovery: a friendly offer of two new times",
          ],
        },
        {
          heading: "What managers should watch",
          paragraphs: [
            "A texting CRM gives managers visibility that personal phones never will. Look at reply rates by campaign to see which messages work, unanswered inbound replies to catch leads that are waiting on the team, and opt-out rates to spot messages or lists that are hurting your sender reputation.",
            "High opt-out or complaint rates are an early warning. Carriers watch them, and a campaign that draws complaints can get your numbers filtered. Clean lists, clear consent, and reasonable sending hours protect deliverability for the whole team.",
          ],
        },
      ]}
      faq={[
        {
          question: "How do managers oversee a team's texting?",
          answer: "Reps join your team with a team code. Team management lets a manager see each rep's contacts, campaigns, and conversations, so leads are not stuck on personal phones where nobody can see them.",
        },
        {
          question: "Can we use our own message templates?",
          answer: "Yes. Build templates and drip sequences for each stage of your process so every rep sends consistent, compliant messages.",
        },
        {
          question: "How does AI help a sales team?",
          answer: "On the Text2Sale + AI plan, AI replies to inbound texts, handles common objections, and books appointments that sync to Google Calendar, so leads get an answer when reps are busy. AI can be switched off per conversation.",
        },
        {
          question: "What does it cost?",
          answer: "The Standard plan is $39.99 per month plus $0.012 per text. The Text2Sale + AI plan is $119.99 per month plus $0.025 per AI reply. There is no long-term contract.",
        },
      ]}
      relatedPages={[
        {
          href: "/sms-follow-up-for-sales-teams",
          label: "SMS follow-up for sales teams",
        },
        {
          href: "/mass-texting-crm",
          label: "Mass texting CRM",
        },
        {
          href: "/ai-texting-crm",
          label: "AI texting CRM",
        },
        {
          href: "/recruiting-texting-crm",
          label: "Recruiting texting CRM",
        },
      ]}
    />
  );
}
