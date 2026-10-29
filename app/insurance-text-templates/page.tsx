import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import TextTemplateGenerator from "@/components/tools/TextTemplateGenerator";

export const metadata: Metadata = {
  title: "Free Insurance Text Message Templates (Generator) | Text2Sale",
  description:
    "Generate text message templates for insurance leads: first contact, aged lead re-engagement, missed calls, appointment reminders, no-shows and renewals, personalized with your agency name.",
  alternates: { canonical: "/insurance-text-templates" },
  openGraph: { title: "Insurance Text Template Generator", description: "A free generator of insurance text message templates personalized with agency name, agent name and product.", url: "/insurance-text-templates", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/insurance-text-templates"
      name="Text2Sale Insurance Text Template Generator"
      toolDescription="A free generator of insurance text message templates personalized with agency name, agent name and product."
      eyebrow="Write texts that get replies"
      title="Insurance text templates that sound like a person."
      intro="Choose the situation and product, add your agency and name, and copy texts that introduce you, ask one question and include opt-out language."
      facts={[
        ["Name your agency", "Texts that say who you are get more replies and fewer spam flags."],
        ["Ask one question", "A single easy question is easier to answer than a pitch."],
        ["Stay in one segment", "Short texts cost less and read better on a phone. Each template shows its segment count."],
      ]}
      faq={[
        { question: "What should my first text to an insurance lead say?", answer: "Who you are, the agency, why you are texting and one easy question, plus opt-out language." },
        { question: "Should I include links?", answer: "Avoid links in first texts. They can look like spam and hurt delivery. Send details after the lead replies." },
        { question: "Why is Medicare not included?", answer: "Medicare marketing has its own federal contact rules, so those messages need separate review." },
      ]}
      relatedPages={[
        { href: "/how-to-text-aged-leads", label: "How to text aged leads" },
        { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
        { href: "/follow-up-cadence-generator", label: "Follow-up cadence generator" },
        { href: "/sms-cost-calculator", label: "SMS cost calculator" },
      ]}
      ctaTitle="Want to send these from Text2Sale?"
      ctaBody="Save templates, send them as campaigns or sequences, and let AI handle the replies."
      ctaHref="/mass-texting-crm"
      ctaLabel="See mass texting"
    >
      <TextTemplateGenerator />
    </ToolPage>
  );
}
