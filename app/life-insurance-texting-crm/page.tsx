import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Life Insurance Texting CRM | Text2Sale",
  description: "Text2Sale is a life insurance texting CRM for agents who need SMS campaigns, AI replies, lead follow-up, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/life-insurance-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Life Insurance Texting CRM"
      title="Life insurance texting CRM for agents who need more conversations and booked calls."
      description="Text2Sale helps life insurance agents send SMS campaigns, manage replies, use AI-assisted follow-up, and turn lead lists into real conversations with prospects who are ready to talk."
      sections={[
        { title: "Text new and aged leads", body: "Reach life insurance prospects by SMS and restart conversations with leads that did not answer the phone." },
        { title: "Organize every reply", body: "Keep beneficiary questions, coverage interest, appointment requests, and objections inside one sales inbox." },
        { title: "AI-assisted appointment setting", body: "Use AI support to respond faster and help move interested prospects toward a call." },
        { title: "Team campaign workflow", body: "Give agents templates, campaigns, lead lists, reply management, and performance visibility from one platform." }
      ]}
      bullets={["Life insurance lead texting", "Appointment setting", "AI replies", "Mass SMS campaigns", "2-way inbox", "Follow-up templates"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is built for life insurance agents and teams that need consistent follow-up and a faster way to turn lead lists into quote conversations."
    />
  );
}
