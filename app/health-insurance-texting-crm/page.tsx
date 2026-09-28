import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Health Insurance Texting CRM | Text2Sale",
  description: "Text2Sale is a health insurance texting CRM for agents who need mass texting, AI replies, lead follow-up, quote conversations, and appointment setting.",
  alternates: { canonical: "/health-insurance-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Health Insurance", "Open Enrollment", "Medicare"]}
      eyebrow="Health Insurance Texting CRM"
      title="Health insurance texting CRM built for faster quote conversations."
      description="Text2Sale helps health insurance agents text leads, manage replies, follow up on quote requests, use AI assistance, and move prospects toward a call without losing conversations in spreadsheets or personal phones."
      sections={[
        { title: "Reach leads faster", body: "Upload health insurance leads and send campaigns quickly so prospects hear from you while interest is still fresh." },
        { title: "Manage quote replies", body: "Keep plan questions, ZIP codes, family details, and appointment requests organized in a single texting inbox." },
        { title: "AI-assisted follow-up", body: "Use AI support to ask basic qualifying questions and guide interested prospects toward a quote call." },
        { title: "Built for high-volume agents", body: "Run lead campaigns, track replies, manage opt-outs, and keep your team focused on the hottest opportunities." }
      ]}
      bullets={["Health insurance lead texting", "Quote follow-up", "AI replies", "CSV lead uploads", "Appointment setting", "2-way conversations"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for health insurance agents and agencies that rely on speed-to-lead, consistent follow-up, and text conversations that lead to phone calls."
      canonicalPath="/health-insurance-texting-crm"
      guideTitle="A texting workflow for health insurance leads"
      guide={[
        {
          heading: "Answer quote requests while they are still shopping",
          paragraphs: [
            "A health insurance lead who fills out a quote form is usually comparing options that same day, and often hears from several agents within the hour. The agent who responds first with something useful tends to get the conversation. Calling is still how most policies get written, but a text gets read in minutes when an unknown number goes to voicemail.",
            "When leads arrive through a connected lead form or integration, Text2Sale can send the first text automatically, then keeps every reply in one inbox. A good first text names you and your agency, references the request, and asks one easy question, such as the best time for a five-minute call. It should also tell the lead how to opt out.",
          ],
        },
        {
          heading: "Collect the basics by text, quote on the phone",
          paragraphs: [
            "Texting is a fast way to gather the details that decide which plans are worth quoting: ZIP code, household size, estimated income for subsidy eligibility, and any doctors or prescriptions the lead wants to keep. Getting those answers before the call makes the call shorter and the quote more accurate.",
            "Keep sensitive details out of the thread. Diagnoses, Social Security numbers, and payment information belong in a secure application process, not a text conversation. Use the text thread to schedule, confirm, and remind.",
          ],
          bullets: [
            "ZIP code and county, since plan availability is local",
            "Household size and ages of everyone who needs coverage",
            "Rough household income, which drives Marketplace subsidy eligibility",
            "Preferred doctors and must-have prescriptions",
          ],
        },
        {
          heading: "Time campaigns to enrollment windows",
          paragraphs: [
            "Individual health coverage is tied to enrollment windows. Open Enrollment on HealthCare.gov generally runs November 1 through January 15, some state exchanges set their own dates, and outside that window people usually need a qualifying life event, such as losing other coverage, moving, or having a baby, to get a Special Enrollment Period.",
            "Segment your lists so the right message reaches the right person: an Open Enrollment reminder to past quote requests who never enrolled, a renewal check-in to existing clients, and a special enrollment message only to leads who told you about a qualifying event. If you help people enroll in Marketplace plans, also document the consumer consent CMS requires before you assist.",
          ],
        },
      ]}
      faq={[
        {
          question: "How fast should I text a health insurance lead?",
          answer: "Within minutes if you can. Quote-request leads compare several agents quickly, and the first useful response usually wins the call. Text2Sale can send your first text automatically when a lead arrives through a connected form or integration.",
        },
        {
          question: "What should I not ask for by text?",
          answer: "Avoid collecting Social Security numbers, detailed medical information, or payment details in a text thread. Use texts to schedule and gather basics like ZIP code and household size, and handle sensitive information through a secure application.",
        },
        {
          question: "Can I text leads about Open Enrollment?",
          answer: "Yes, if they gave consent to receive texts from you. Open Enrollment reminders to past quote requests and clients who opted in are a common and effective campaign. Honor opt-outs and send during reasonable hours.",
        },
        {
          question: "Does Text2Sale work for agencies with several agents?",
          answer: "Yes. Agents join your team with a team code, and team management lets a manager see each agent's contacts, campaigns, and conversations, so quote requests that go unanswered are easy to spot.",
        },
      ]}
      relatedPages={[
        {
          href: "/private-health-insurance-vs-marketplace-insurance",
          label: "Private vs Marketplace insurance",
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
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
      ]}
    />
  );
}
