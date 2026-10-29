import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "AI Receptionist for Insurance Agents | Text2Sale",
  description:
    "AI receptionist for insurance agents that can answer inbound calls, qualify prospects, book appointments, and transfer ready leads to your team.",
  alternates: { canonical: "/ai-receptionist-for-insurance-agents" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "AI", "Appointments", "Calls"]}
      eyebrow="AI Receptionist for Insurance Agents"
      title="Answer more insurance calls without putting another person on the phones."
      description="Text2Sale's AI receptionist can answer inbound calls, gather basic information, qualify intent, book appointments, and transfer callers to your team while keeping licensed advice with licensed agents."
      secondaryCta="See insurance CRM"
      secondaryHref="/insurance-agents"
      canonicalPath="/ai-receptionist-for-insurance-agents"
      sections={[
        { title: "Answer inbound calls", body: "Give callers a consistent first response when your team is busy, on another call, or away from the desk." },
        { title: "Basic qualification", body: "Collect name, callback information, state, and the reason for the call before routing it." },
        { title: "Book consultations", body: "Offer available times and schedule prospects who cannot speak to an agent immediately." },
        { title: "Transfer ready callers", body: "Route qualified callers to a live team member when your workflow calls for a human handoff." },
      ]}
      guideTitle="How insurance agencies can use an AI receptionist responsibly"
      guide={[
        { heading: "Use AI for intake, not licensed advice", paragraphs: ["An AI receptionist is most useful at the front of the call: greeting the caller, identifying what they need, collecting basic contact information, and deciding whether to transfer or schedule.", "Questions about plan suitability, benefits, premiums, underwriting, or coverage recommendations should move to the appropriately licensed person rather than being improvised by automation."] },
        { heading: "Reduce missed-opportunity calls", paragraphs: ["A missed call can become a lost lead. An AI receptionist gives every inbound caller a path forward even when your team is handling another prospect."], bullets: ["Answer common intake questions", "Capture callback information", "Identify the caller's state", "Transfer active opportunities", "Book a later consultation when nobody is available"] },
        { heading: "Keep the call history connected to the CRM", paragraphs: ["The value grows when intake, calls, texts, appointments, and follow-up all live in the same workspace. That gives the agent context before the live conversation begins."] },
      ]}
      faq={[
        { question: "Can the AI receptionist sell insurance?", answer: "It should be used for intake, qualification, scheduling, and routing. Licensed recommendations and policy advice should remain with licensed insurance professionals." },
        { question: "Can it transfer a call to a live agent?", answer: "Yes. The workflow can transfer appropriate callers to your team or book a consultation when an immediate transfer is not available." },
        { question: "Can it book appointments?", answer: "Yes. It can offer available appointment times and schedule a consultation based on your connected availability." },
        { question: "Does Text2Sale also include texting?", answer: "Text2Sale Complete combines the dialer and AI calling features with texting, campaigns, AI text replies, and appointment workflows." },
      ]}
      relatedPages={[
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
        { href: "/insurance-agents", label: "AI appointment setting for insurance" },
      ]}
    />
  );
}
