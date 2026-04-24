import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Recruiting Texting CRM | Text2Sale",
  description: "Text2Sale is a recruiting texting CRM for teams that need mass texting, candidate follow-up, AI replies, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/recruiting-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Recruiting Texting CRM"
      title="Recruiting texting CRM for faster candidate follow-up and booked interviews."
      description="Text2Sale helps recruiting teams and agency leaders text candidates, manage replies, follow up after interviews, use AI-assisted responses, and keep conversations organized from one dashboard."
      sections={[
        { title: "Reach candidates faster", body: "Use SMS campaigns to follow up with applicants, referrals, no-shows, and warm recruiting leads." },
        { title: "Book more interviews", body: "Move interested candidates toward interview times, quick calls, or next-step conversations." },
        { title: "AI-assisted replies", body: "Use AI support to answer common questions and keep recruiting conversations moving when your team is busy." },
        { title: "Organized team inbox", body: "Keep candidate replies, notes, and follow-up conversations in one place instead of scattered across phones." }
      ]}
      bullets={["Candidate texting", "Interview follow-up", "AI replies", "Mass SMS campaigns", "Team inbox", "Recruiting outreach"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for recruiting teams that need to reach candidates quickly and manage high-volume SMS conversations without losing track of interested people."
    />
  );
}
