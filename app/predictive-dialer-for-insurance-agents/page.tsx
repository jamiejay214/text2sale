import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Predictive Dialer for Insurance Agents | Text2Sale",
  description:
    "Text2Sale gives insurance agents manual, power, and predictive dialing in the same CRM as texting, lead follow-up, appointments, and AI.",
  alternates: { canonical: "/predictive-dialer-for-insurance-agents" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Calls", "Sales", "Operations"]}
      eyebrow="Insurance Predictive Dialer"
      title="Call more insurance leads without losing the conversation around the call."
      description="Text2Sale combines predictive and power dialing with contacts, texting, follow-up, dispositions, callbacks, and appointments so insurance teams can work a lead from first touch to booked call in one place."
      secondaryCta="See insurance CRM"
      secondaryHref="/insurance-agents"
      canonicalPath="/predictive-dialer-for-insurance-agents"
      sections={[
        { title: "Predictive dialing", body: "Increase dialing throughput when your team has enough reps and lead volume for predictive calling." },
        { title: "Power dialing", body: "Work one lead after another with more control and less manual clicking between records." },
        { title: "Call outcomes", body: "Track dispositions, callbacks, and notes so the next follow-up is based on what actually happened." },
        { title: "Text after the call", body: "Move unanswered or interested contacts into an SMS follow-up workflow without switching systems." },
      ]}
      guideTitle="Choosing the right dialer mode for an insurance sales team"
      guide={[
        { heading: "Predictive is about throughput", paragraphs: ["Predictive dialing is useful when a team has enough agents and call volume to benefit from dialing ahead of rep availability. It is not automatically the right mode for every team or every campaign.", "For smaller teams, power dialing often gives a better balance between speed and control because each call remains tied closely to the contact record."] },
        { heading: "The CRM around the dialer matters", paragraphs: ["A dialer alone creates more calls. A dialer connected to messaging, appointments, and contact history creates a repeatable follow-up system."], bullets: ["See the contact before and during the call", "Record a disposition immediately", "Schedule a callback", "Send a follow-up text", "Move qualified prospects toward an appointment"] },
        { heading: "Protect deliverability and caller reputation", paragraphs: ["High-volume calling should be managed carefully. Use accurate caller identity, reasonable pacing, compliant contact lists, and follow-up workflows that do not repeatedly hammer unresponsive contacts."] },
      ]}
      faq={[
        { question: "What is the difference between predictive and power dialing?", answer: "Power dialing calls one contact at a time for a rep. Predictive dialing can place calls ahead of agent availability to increase throughput when a team and campaign are large enough to support it." },
        { question: "Does Text2Sale have both?", answer: "Yes. Text2Sale's dialer plan includes manual, power, and predictive dialing workflows." },
        { question: "Can I text a lead after a call?", answer: "Yes. Calling and texting share the same CRM, so a rep can move an unanswered or interested contact directly into SMS follow-up." },
        { question: "Is this only for health insurance?", answer: "No. The workflow can support health, life, final expense, Medicare, recruiting, and other sales teams that use outbound calling." },
      ]}
      relatedPages={[
        { href: "/ai-receptionist-for-insurance-agents", label: "AI receptionist for insurance agents" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/sms-crm-for-insurance-agents", label: "Insurance SMS CRM" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/power-dialer-vs-predictive-dialer", label: "Power dialer vs predictive dialer" },
        { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents" },
        { href: "/quiet-hours-checker", label: "Quiet hours checker" },
      ]}
    />
  );
}
