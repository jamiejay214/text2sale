import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Life Insurance Texting CRM | Text2Sale",
  description: "Text2Sale is a life insurance texting CRM for agents who need SMS campaigns, AI replies, lead follow-up, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/life-insurance-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Life insurance", "Final Expense", "Insurance"]}
      eyebrow="Life Insurance Texting CRM"
      title="Life insurance texting CRM for agents who need more conversations and booked calls."
      description="Text2Sale helps life insurance agents send SMS campaigns, manage replies, use AI-assisted follow-up, and turn lead lists into real conversations with prospects who are ready to talk."
      sections={[
        { title: "Text new and aged leads", body: "Reach life insurance prospects by SMS and restart conversations with leads that did not answer the phone." },
        { title: "Organize every reply", body: "Keep beneficiary questions, coverage interest, appointment requests, and objections inside one sales inbox." },
        { title: "AI-assisted appointment setting", body: "Use AI support to respond faster and help move interested prospects toward a call." },
        { title: "Team campaign workflow", body: "Give agents templates, campaigns, lead lists, reply management, and performance visibility from one platform." }
      ]}
      bullets={["Life insurance lead texting", "Appointment setting", "AI replies", "Mass SMS campaigns", "2-way inbox", "Follow-up templates"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is built for life insurance agents and teams that need consistent follow-up and a faster way to turn lead lists into quote conversations."
      canonicalPath="/life-insurance-texting-crm"
      guideTitle="Where texting fits in a life insurance sale"
      guide={[
        {
          heading: "First contact: make the call easy to say yes to",
          paragraphs: [
            "Life insurance buyers rarely answer an unknown number, and many filled out a form while thinking about their family and then got pulled back into their day. A short text that reminds them who you are and why you are reaching out gets a reply far more often than a third voicemail.",
            "Keep the first message plain: your name, your agency, the reason for the text, one question, and opt-out language. Offering two specific call times gets a faster answer than asking when they are free. Text2Sale sends the message from a local business number, and replies come back to your shared inbox.",
          ],
        },
        {
          heading: "Keep applicants engaged through underwriting",
          paragraphs: [
            "The weeks between application and approval are where life sales quietly fall apart. The client applied in a moment of motivation, then heard nothing while the carrier ordered an exam and medical records. By the time the approval arrives, some no longer remember why they applied, and the policy is never placed.",
            "A few status texts prevent a lot of that. Tell applicants what happens next and roughly how long it takes, confirm exam appointments, and warn them early if records are delayed or a rating could come back different from the quote. Clients who know what to expect are far more likely to accept the policy.",
          ],
          bullets: [
            "Application submitted: what happens next and the typical timeline",
            "Exam scheduled: date, time, and how to prepare",
            "Records requested: a heads-up that it can add time",
            "Decision ready: a request to schedule a delivery call",
          ],
        },
        {
          heading: "Reactivate aged leads with care",
          paragraphs: [
            "Older leads can still convert, but consent is the first question. A lead who agreed to texts from a different company, or who asked for information years ago, may not have agreed to hear from you. Text only people whose consent covers your agency and your number, and stop immediately when someone opts out.",
            "For the leads you can contact, a reactivation campaign works best when it offers something concrete, such as a policy review or an updated quote after a birthday changed their rate class. Text2Sale tracks who replied, who opted out, and who went quiet, so your next campaign goes only to people worth reaching.",
          ],
        },
      ]}
      faq={[
        {
          question: "Can I text life insurance leads I bought?",
          answer: "Only if the consent the lead gave covers texts from you. Many purchased leads name specific companies or carry consent that has aged. Check your lead vendor's consent language and keep a record of it before texting.",
        },
        {
          question: "What should I text during underwriting?",
          answer: "Status updates at the steps that apply: application submitted, exam scheduled and completed, records requested, and decision ready. Short updates keep clients engaged and reduce policies that are approved but never placed.",
        },
        {
          question: "Can AI book life insurance appointments?",
          answer: "With Text2Sale AI, AI can reply to inbound texts, handle common scheduling questions, and book appointments that sync to Google Calendar. You can turn AI off for any conversation.",
        },
        {
          question: "Does Text2Sale help with opt-outs?",
          answer: "Yes. STOP replies and similar keywords are recorded automatically, and opted-out numbers are excluded from every future campaign.",
        },
      ]}
      relatedPages={[
        {
          href: "/how-to-text-insurance-leads",
          label: "How to text insurance leads",
        },
        {
          href: "/health-insurance-texting-crm",
          label: "Health insurance texting CRM",
        },
        {
          href: "/final-expense-texting-crm",
          label: "Final expense texting CRM",
        },
        {
          href: "/medicare-agent-texting-crm",
          label: "Medicare agent texting CRM",
        },
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
      ]}
    />
  );
}
