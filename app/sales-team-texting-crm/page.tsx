import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Sales Team Texting CRM | Text2Sale",
  description: "Text2Sale is a sales team texting CRM for bulk SMS campaigns, AI replies, lead follow-up, appointment setting, team inboxes, and 2-way conversations.",
  alternates: { canonical: "/sales-team-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Sales Team Texting CRM"
      title="Sales team texting CRM built to turn replies into revenue."
      description="Text2Sale helps sales teams upload lead lists, send SMS campaigns, manage replies, use AI-assisted follow-up, and keep every conversation organized so reps can book more calls and close faster."
      sections={[
        { title: "Mass texting for teams", body: "Send campaigns to segmented lead lists and keep your outreach organized across reps and campaigns." },
        { title: "2-way sales inbox", body: "Manage inbound replies, objections, hot leads, and appointment requests from one team dashboard." },
        { title: "AI-assisted follow-up", body: "Use AI support to respond faster, qualify leads, and move prospects toward booked calls." },
        { title: "Built for managers", body: "Give managers visibility into campaign activity, replies, conversations, and follow-up execution." }
      ]}
      bullets={["Sales lead texting", "AI replies", "Team inbox", "Campaign tracking", "CSV imports", "Appointment setting"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is built for sales teams that depend on fast lead response, consistent follow-up, and organized texting workflows across multiple reps."
    />
  );
}
