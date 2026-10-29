import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Insurance Lead Follow-Up Software | Text2Sale",
  description:
    "Follow up with insurance leads by text and phone, automate drip sequences, use AI replies, reactivate older inquiries, and book appointments from one CRM.",
  alternates: { canonical: "/insurance-lead-follow-up-software" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Follow-up", "Speed to lead", "Automation"]}
      eyebrow="Insurance Lead Follow-Up Software"
      title="Follow up with every insurance lead without living in spreadsheets."
      description="Text2Sale gives insurance agents one workflow for new leads, aged leads, texts, calls, drip follow-up, AI replies, appointments, and opt-outs so opportunities do not disappear between systems."
      secondaryCta="See insurance agents"
      secondaryHref="/insurance-agents"
      canonicalPath="/insurance-lead-follow-up-software"
      sections={[
        { title: "New lead speed-to-lead", body: "Start the first follow-up quickly and keep a consistent cadence instead of relying on memory." },
        { title: "Aged lead reactivation", body: "Segment older opted-in inquiries and reopen conversations with a simple, relevant question." },
        { title: "Text and call together", body: "Use SMS, manual dialing, power dialing, and predictive dialing from the same contact history." },
        { title: "Automated appointments", body: "Let AI qualify interest and offer appointment times while your agents focus on live conversations." },
      ]}
      guideTitle="Build a follow-up system instead of a pile of reminders"
      guide={[
        { heading: "Give every lead a next action", paragraphs: ["Insurance lead follow-up fails when the next step exists only in an agent's memory. A CRM should make the next action obvious: send the first text, make the call, schedule the callback, continue the drip, or stop because the person opted out.", "Text2Sale connects those actions to the contact so your team can see what happened before touching the lead again."] },
        { heading: "Use different cadences for different lead stages", paragraphs: ["A new lead who asked for a quote five minutes ago should not receive the same follow-up as a six-month-old inquiry. Segment by source, age, product, and prior response."], bullets: ["New inbound leads: prioritize speed", "Unresponsive leads: spaced multi-channel follow-up", "Warm replies: move toward a call", "Old leads: reintroduce the reason for contact", "Appointments: reminders and rescheduling"] },
        { heading: "Measure conversations, not just sends", paragraphs: ["The goal of follow-up is not to send the most messages or make the most calls. Track replies, appointments, contact rates, opt-outs, and completed conversations so you can improve the workflow without simply increasing volume."] },
      ]}
      faq={[
        { question: "What should insurance lead follow-up software include?", answer: "At minimum: contact history, texting, calling, drip sequences, reminders, opt-out controls, dispositions, and appointment tracking. Text2Sale also adds AI replies and AI appointment setting." },
        { question: "Can Text2Sale reactivate aged leads?", answer: "Yes. You can import older opted-in leads, segment them into campaigns, automate follow-up, and manage every response from the same inbox." },
        { question: "Can agents call and text from one place?", answer: "Yes. Text2Sale combines texting and dialer workflows so reps can move between channels without losing contact history." },
        { question: "Does follow-up stop when someone replies or opts out?", answer: "Campaign drip follow-up can stop when a contact replies, and opt-outs are suppressed from future messaging." },
      ]}
      relatedPages={[
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Insurance predictive dialer" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/sms-crm-for-insurance-agents", label: "SMS CRM for insurance agents" },
      ]}
    />
  );
}
