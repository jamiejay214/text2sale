import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "CRM for ACA Agents: Work Marketplace Leads Faster | Text2Sale",
  description:
    "A CRM built for ACA and marketplace health agents: instant lead response, texting, dialing, appointment booking and follow-up through open enrollment and special enrollment periods.",
  alternates: { canonical: "/crm-for-aca-agents" },
};

export default function Page() {
  return (
    <SeoLandingPage
      blogTags={["Insurance", "Follow-up", "Speed to lead", "Dialer"]}
      eyebrow="CRM for ACA Agents"
      title="A CRM for ACA agents that keeps up with open enrollment."
      description="ACA agents live in two modes: a flood of leads during open enrollment and a steady stream of special enrollment leads the rest of the year. The right CRM helps you respond to every lead in minutes during the rush and keeps follow-up running when the volume drops."
      secondaryCta="See insurance follow-up software"
      secondaryHref="/insurance-lead-follow-up-software"
      canonicalPath="/crm-for-aca-agents"
      sections={[
        { title: "Built for the enrollment rush", body: "Automatic first texts, dialer queues and AI replies let a small team handle a big spike without letting leads sit." },
        { title: "Special enrollment follow-up", body: "Outside open enrollment, follow-up sequences keep working leads with qualifying life events." },
        { title: "Renewal touchpoints", body: "Reminders before the next enrollment period bring existing clients back for a review." },
        { title: "One record per household", body: "Texts, calls, notes and appointments sit together so any agent can pick up the conversation." },
      ]}
      guideTitle="What ACA agents need from a CRM"
      guide={[
        { heading: "Handle the open enrollment spike", paragraphs: ["During open enrollment, lead volume can jump several times over in a few weeks. The agents who win are the ones who keep their response time short even when the volume is high. That means automation for the first touch, a dialer that keeps reps talking instead of dialing, and an inbox where the whole team can answer texts.", "Plan staffing and scripts before the period starts. Load your follow-up sequences, test your booking flow and make sure reminders are on, so the system is ready when the leads arrive."] },
        { heading: "Keep working special enrollment leads", paragraphs: ["Outside open enrollment, many leads come from people with qualifying life events such as moving, losing other coverage or a change in household. These leads have a deadline, so speed still matters. A CRM that tags these leads and starts a faster cadence helps you reach them while they can still enroll."] },
        { heading: "Features that matter for ACA work", paragraphs: ["Look for tools that reduce the time between a lead arriving and a conversation."], bullets: ["Automatic text and call task when a lead arrives", "Shared two-way inbox for the whole team", "Power and predictive dialing for large lists", "AI replies that ask simple qualifying questions and book calls", "Appointment reminders to cut no-shows", "Opt-out handling and quiet hours applied automatically", "Tags for lead source, enrollment type and status"] },
        { heading: "Bring clients back each year", paragraphs: ["Your existing clients are your best leads for the next enrollment period. Send a short reminder before open enrollment, offer a quick review call and book it automatically. A steady retention routine reduces the number of new leads you need to buy each year."] },
        { heading: "How Text2Sale helps ACA agents", paragraphs: ["Text2Sale combines mass texting, a two-way inbox, AI replies, appointment booking and manual, power and predictive dialing in one workspace. It lets a small ACA team respond like a large one during the rush and keeps follow-up running all year."] },
      ]}
      faq={[
        { question: "What CRM do ACA agents use?", answer: "ACA agents use a range of tools. Agents who buy or generate leads benefit most from a CRM with built-in texting, dialing and appointment booking, which is what Text2Sale provides." },
        { question: "Can I text ACA leads?", answer: "Yes, when you have appropriate consent for the messages, identify your business and honor opt-outs. Text2Sale applies STOP suppression and quiet hours automatically." },
        { question: "How do I handle the open enrollment rush?", answer: "Automate the first touch, use a dialer to work lists quickly and let AI reply to routine texts so agents focus on live conversations." },
        { question: "Is there a contract?", answer: "No. Text2Sale is month to month, so you can add seats for enrollment season and reduce them afterward." },
      ]}
      relatedPages={[
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer for insurance agents" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/best-crm-for-health-insurance-agents", label: "Best CRM for health insurance agents" },
        { href: "/health-insurance-texting-crm", label: "Health insurance texting CRM" },
      ]}
    />
  );
}
