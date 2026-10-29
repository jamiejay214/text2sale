import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import SpeedToLeadCalculator from "@/components/tools/SpeedToLeadCalculator";

export const metadata: Metadata = {
  title: "Speed-to-Lead Calculator: What Slow Follow-Up Costs You | Text2Sale",
  description:
    "Audit how fast your team reaches new leads and see how much of your lead spend goes to leads reached late or never contacted.",
  alternates: { canonical: "/speed-to-lead-calculator" },
  openGraph: { title: "Speed-to-Lead Audit", description: "A free tool that shows how much lead spend goes to leads reached after five minutes or never contacted.", url: "/speed-to-lead-calculator", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/speed-to-lead-calculator"
      name="Text2Sale Speed-to-Lead Audit"
      toolDescription="A free tool that shows how much lead spend goes to leads reached after five minutes or never contacted."
      eyebrow="Audit your response time"
      title="How much of your lead spend is going cold?"
      intro="Enter your monthly leads, cost per lead and how quickly each group was first contacted. See how much money goes to leads that waited, or never heard from you at all."
      facts={[
        ["Minutes matter", "Shopped leads talk to whoever reaches them first while they are still thinking about coverage."],
        ["Measure it first", "Compare lead arrival times with first-touch times for your last month of leads."],
        ["Automate the first touch", "An instant text plus a dialer queue means no lead waits for someone to check email."],
      ]}
      faq={[
        { question: "What is speed to lead?", answer: "The time between a lead arriving and your first real attempt to contact them." },
        { question: "What is a good speed to lead?", answer: "Aim for under five minutes during business hours, with an automatic text going out immediately." },
        { question: "How do I find my numbers?", answer: "Export your last month of leads with created times and first call or text times, then group them by delay." },
      ]}
      relatedPages={[
        { href: "/speed-to-lead-for-insurance-agents", label: "Speed to lead for insurance agents" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/predictive-dialer-for-insurance-agents", label: "Predictive dialer" },
        { href: "/ai-receptionist-for-insurance-agents", label: "AI receptionist" },
      ]}
      ctaTitle="Want Text2Sale to reach every lead in minutes?"
      ctaBody="Text2Sale texts new leads instantly, puts them at the top of the dialer queue and lets AI reply when your team is busy."
      ctaHref="/speed-to-lead-for-insurance-agents"
      ctaLabel="See speed to lead"
    >
      <SpeedToLeadCalculator />
    </ToolPage>
  );
}
