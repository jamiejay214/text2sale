import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best Textdrip Alternative for Sales Texting | Text2Sale",
  description: "Looking for a Textdrip alternative? Text2Sale offers mass texting, AI-assisted SMS replies, sales CRM workflows, CSV uploads, and 2-way conversations.",
  alternates: { canonical: "/best-textdrip-alternative" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Textdrip Alternative"
      title="The best Textdrip alternative for sales teams that need AI and CRM follow-up."
      description="Text2Sale is a Textdrip alternative for teams that want more than automated text sequences. It combines mass SMS campaigns, a 2-way team inbox, AI-assisted replies, CSV lead uploads, and sales-focused follow-up tools."
      sections={[
        { title: "Beyond drip texting", body: "Text2Sale gives you campaigns, replies, contacts, team workflows, AI support, and performance visibility in one platform." },
        { title: "AI reply assistance", body: "Help your team answer inbound messages, qualify leads, and book calls faster." },
        { title: "Built for lead follow-up", body: "Use Text2Sale for new leads, aged leads, referral lists, missed-call recovery, recruiting, and reactivation campaigns." },
        { title: "Cleaner sales workflow", body: "Keep texts, contacts, replies, opt-outs, and campaign activity connected instead of scattered across different systems." }
      ]}
      bullets={["Textdrip alternative", "AI texting CRM", "Mass SMS campaigns", "2-way inbox", "CSV imports", "Appointment follow-up"]}
      noteTitle="Why Text2Sale"
      noteBody="Text2Sale is a strong Textdrip alternative when your team wants a sales texting CRM with AI support, not just basic automated drip messages."
    />
  );
}
