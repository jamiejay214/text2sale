import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Medicare Agent Texting CRM | Text2Sale",
  description: "Text2Sale is a Medicare agent texting CRM for SMS campaigns, appointment follow-up, AI replies, lead management, and 2-way conversations.",
  alternates: { canonical: "/medicare-agent-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Medicare Agent Texting CRM"
      title="Medicare agent texting CRM for appointment follow-up and lead conversations."
      description="Text2Sale helps Medicare agents and agencies manage SMS outreach, follow up with prospects, organize replies, and use AI-assisted texting to keep conversations moving toward appointments."
      sections={[
        { title: "Follow up with Medicare leads", body: "Text prospects about appointments, plan review conversations, call requests, and follow-up reminders from one dashboard." },
        { title: "Centralized conversations", body: "Keep inbound questions, replies, and appointment conversations organized for agents and managers." },
        { title: "AI-assisted SMS", body: "Use AI support to reply faster, qualify interest, and help guide prospects toward scheduled calls." },
        { title: "Team visibility", body: "Track campaign activity, conversations, replies, and follow-up so no interested prospect gets missed." }
      ]}
      bullets={["Medicare lead follow-up", "Appointment reminders", "AI texting", "SMS campaigns", "2-way conversations", "Agency workflow"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is useful for Medicare agencies that want a focused texting CRM for lead follow-up, appointment conversations, and team-managed SMS outreach."
    />
  );
}
