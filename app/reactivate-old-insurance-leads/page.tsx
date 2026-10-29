import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "How to Reactivate Old Insurance Leads with SMS & AI | Text2Sale",
  description:
    "A practical workflow for reactivating old insurance leads with compliant SMS, AI follow-up, segmentation, calling, and appointment booking.",
  alternates: { canonical: "/reactivate-old-insurance-leads" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Reactivation", "SMS follow-up", "AI"]}
      eyebrow="Old Insurance Lead Reactivation"
      title="Turn old insurance inquiries back into live conversations."
      description="Older leads are not automatically dead. Segment contacts whose permission still covers your follow-up, reopen the conversation with a simple question, and use Text2Sale to manage replies, calls, and appointment booking."
      secondaryCta="See insurance follow-up software"
      secondaryHref="/insurance-lead-follow-up-software"
      canonicalPath="/reactivate-old-insurance-leads"
      sections={[
        { title: "Clean the list first", body: "Remove opt-outs, bad numbers, duplicates, and contacts whose consent does not cover your message." },
        { title: "Segment by context", body: "Group leads by product, source, age, and prior activity so the message matches why they originally raised their hand." },
        { title: "Ask one easy question", body: "Lead with a short re-introduction and a low-friction question instead of dropping a full sales pitch into the first text." },
        { title: "Move replies to a call", body: "Use AI or your team to qualify interest and get serious prospects onto the calendar quickly." },
      ]}
      guideTitle="A practical aged-lead reactivation workflow"
      guide={[
        { heading: "Step 1: decide who is actually eligible to contact", paragraphs: ["Lead age does not determine consent. Before messaging an old list, confirm the permission you collected or received from the lead source still covers texts from your business, then remove contacts who opted out or should otherwise be suppressed.", "This list-cleaning step is more important than any script. Better targeting protects deliverability and keeps your team focused on people you can legitimately follow up with."] },
        { heading: "Step 2: reopen the conversation instead of pretending it is new", paragraphs: ["Aged leads usually remember requesting information vaguely, if at all. Give enough context to make the message understandable, identify the business, and ask whether they still want help."], bullets: ["Keep the first message short", "Reference the original type of inquiry when appropriate", "Ask one question", "Do not manufacture urgency", "Stop automation immediately on an opt-out"] },
        { heading: "Step 3: work replies fast", paragraphs: ["The value of reactivation comes after the response. Route interested replies to the inbox immediately, let AI cover routine qualification when appropriate, and offer a call time while the prospect is engaged.", "Track reply rate, positive-interest rate, appointments, opt-outs, and completed sales. Those numbers tell you whether the list and message are worth scaling."] },
      ]}
      faq={[
        { question: "Can old insurance leads still convert?", answer: "Yes. Some prospects were simply not ready when they first requested information. Reactivation can reopen those conversations, but results depend heavily on list quality, consent, product timing, and follow-up." },
        { question: "How old is too old for an insurance lead?", answer: "There is no universal age cutoff. The more important questions are whether the contact still fits your market and whether your permission to contact them remains valid for the channel you want to use." },
        { question: "Should I text or call old leads first?", answer: "Many teams use a short text to reopen the conversation, then call interested respondents. The best sequence depends on your consent, lead source, team size, and contact strategy." },
        { question: "Can AI handle the replies?", answer: "Text2Sale can use AI to handle routine replies, qualify interest, and offer appointment times, with a human taking over whenever the conversation requires judgment." },
      ]}
      relatedPages={[
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/sms-crm-for-insurance-agents", label: "Insurance SMS CRM" },
        { href: "/how-to-text-insurance-leads", label: "How to text insurance leads" },
        { href: "/how-to-text-aged-leads", label: "How to text aged leads" },
        { href: "/lead-reactivation-roi-calculator", label: "Lead reactivation ROI calculator" },
        { href: "/sms-cost-calculator", label: "SMS cost calculator" },
      ]}
    />
  );
}
