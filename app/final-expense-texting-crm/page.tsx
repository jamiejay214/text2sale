import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Final Expense Texting CRM | Text2Sale",
  description: "Text2Sale is a final expense texting CRM for agents who need bulk SMS campaigns, lead follow-up, AI replies, appointment setting, and 2-way conversations.",
  alternates: { canonical: "/final-expense-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Final Expense Texting CRM"
      title="Final expense texting CRM for faster follow-up and more booked appointments."
      description="Text2Sale helps final expense agents text prospects, revive aged leads, manage replies, use AI-assisted follow-up, and move interested people toward a call or appointment."
      sections={[
        { title: "Work aged leads by text", body: "Restart conversations with final expense prospects who ignored calls or never completed the quoting process." },
        { title: "Manage objections", body: "Keep price questions, timing concerns, coverage interest, and appointment requests organized inside one inbox." },
        { title: "AI-assisted replies", body: "Use AI support to answer faster and guide interested prospects toward a real conversation." },
        { title: "Campaign follow-up", body: "Send campaigns, track replies, handle opt-outs, and keep every lead conversation connected to your sales workflow." }
      ]}
      bullets={["Final expense lead texting", "Aged lead reactivation", "AI replies", "Appointment setting", "Mass SMS campaigns", "2-way inbox"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for final expense agents who need better speed-to-lead, more consistent follow-up, and a cleaner way to manage texting conversations."
    />
  );
}
