import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SmsCostCalculator from "@/components/SmsCostCalculator";

export const metadata: Metadata = {
  title: "Free SMS Cost Calculator: Segments & Campaign Cost | Text2Sale",
  description:
    "Estimate what a text campaign will cost. Paste your message to count SMS segments, then enter contacts and follow-up steps to see cost per contact and total campaign cost.",
  alternates: { canonical: "/sms-cost-calculator" },
  openGraph: {
    title: "Free SMS Segment & Campaign Cost Calculator",
    description: "Count segments and estimate the cost of a text campaign before you send it.",
    url: "/sms-cost-calculator",
    type: "website",
  },
};

export default function Page() {
  return (
    <ToolPage
      path="/sms-cost-calculator"
      name="Text2Sale SMS Cost Calculator"
      toolDescription="A free calculator that counts SMS segments and estimates the cost of a text campaign by contacts and follow-up steps."
      eyebrow="Plan your campaign budget"
      title="Know what a text campaign will cost before you hit send."
      intro="Paste your message, enter how many contacts you will text and how many messages each one gets. The calculator counts segments, checks for emoji and other characters that shrink the limit, and estimates the total cost."
      facts={[
        ["Segments drive cost", "Texts are billed per segment, not per message. A 170-character text is two segments and costs twice as much as a 150-character one."],
        ["One emoji can double it", "Emoji and some special characters switch a message to Unicode, which cuts the limit from 160 to 70 characters per segment."],
        ["Plan the whole sequence", "Most follow-up runs three to six texts per lead. Budget for every step, not just the first message."],
      ]}
      faq={[
        { question: "How much does it cost to send a text message?", answer: "It depends on your provider and the number of segments. In Text2Sale, outbound texts are $0.015 per segment, or $0.0135 after a single wallet deposit of $500 or more. Incoming replies are free." },
        { question: "What is an SMS segment?", answer: "A segment is one billable unit of a text. A plain GSM-7 text holds up to 160 characters in one segment. Longer texts are split into 153-character segments, and Unicode texts into 70 or 67 characters." },
        { question: "How can I lower my texting costs?", answer: "Keep messages to one segment, avoid emoji in campaign texts, remove opt-outs and bad numbers before sending, and stop sequences when a lead replies." },
        { question: "Does this include carrier registration fees?", answer: "No. The calculator estimates per-message cost only. Business texting also requires carrier (10DLC) registration, which has separate one-time and monthly fees." },
      ]}
      relatedPages={[
        { href: "/sms-character-counter", label: "SMS character counter" },
        { href: "/mass-texting-crm", label: "Mass texting CRM" },
        { href: "/bulk-sms-software", label: "Bulk SMS software" },
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/pricing", label: "Text2Sale pricing" },
      ]}
      ctaTitle="Send the campaign from Text2Sale."
      ctaBody="Import your list, write one-segment messages, schedule follow-up that stops on reply, and pay only for what you send."
      ctaHref="/pricing"
      ctaLabel="See pricing"
    >
      <SmsCostCalculator />
    </ToolPage>
  );
}
