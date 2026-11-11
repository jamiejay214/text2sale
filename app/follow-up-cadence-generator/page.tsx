import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import FollowUpCadenceGenerator from "@/components/tools/FollowUpCadenceGenerator";

export const metadata: Metadata = {
  title: "Insurance Lead Follow-Up Cadence Generator (Free) | Text2Sale",
  description:
    "Generate a day-by-day call and text follow-up plan for new leads, aged leads or missed appointments, with ready-to-send messages using your agency name.",
  alternates: { canonical: "/follow-up-cadence-generator" },
  openGraph: { title: "Follow-Up Cadence Generator", description: "A free generator that builds a day-by-day call and text follow-up schedule with message templates.", url: "/follow-up-cadence-generator", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/follow-up-cadence-generator"
      name="Text2Sale Follow-Up Cadence Generator"
      toolDescription="A free generator that builds a day-by-day call and text follow-up schedule with message templates."
      eyebrow="Build your follow-up plan"
      title="Get a day-by-day follow-up plan for every lead."
      intro="Pick the lead type and enter your agency and product. You get a schedule of calls and texts with messages ready to copy into your CRM."
      facts={[
        ["Consistency wins", "Most leads need several touches. A written cadence makes sure every lead gets them."],
        ["Mix channels", "Calls catch people who can talk now; texts reach people who cannot."],
        ["Know when to stop", "End the cadence on a reply, booking or opt-out, and move silent leads to slow nurture."],
      ]}
      faq={[
        { question: "How many follow-ups should I do?", answer: "Many agents make six to ten attempts over the first two weeks for new leads, then move to a slower nurture." },
        { question: "Should I call or text first?", answer: "Both, within minutes. The text gives the lead a way to reply when they cannot talk." },
        { question: "Can Text2Sale run this cadence automatically?", answer: "Yes. Texts run as sequences that stop on reply, and calls appear as due tasks in the dialer." },
      ]}
      relatedPages={[
        { href: "/insurance-lead-follow-up-cadence", label: "Insurance lead follow-up cadence" },
        { href: "/insurance-text-templates", label: "Insurance text templates" },
        { href: "/how-to-text-aged-leads", label: "How to text aged leads" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
      ]}
      ctaTitle="Want Text2Sale to run this cadence for you?"
      ctaBody="Load the texts as a sequence that stops on reply, and let the dialer surface every call that is due."
      ctaHref="/insurance-lead-follow-up-software"
      ctaLabel="See follow-up software"
    >
      <FollowUpCadenceGenerator />
    </ToolPage>
  );
}
