import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best OnlySales Alternative for Mass Texting | Text2Sale",
  description: "Looking for an OnlySales alternative? Text2Sale is a mass texting CRM with AI replies, CSV uploads, 2-way conversations, and sales follow-up workflows.",
  alternates: { canonical: "/best-onlysales-alternative" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="OnlySales Alternative"
      title="The best OnlySales alternative for teams that want AI-powered texting."
      description="If you are looking for an OnlySales alternative, Text2Sale gives you mass texting, AI-assisted replies, lead list uploads, conversation management, and sales-focused workflows designed to help your team book more appointments."
      sections={[
        { title: "AI texting built in", body: "Help your team respond faster, qualify prospects, and move conversations toward quote calls or appointments." },
        { title: "Simple lead list uploads", body: "Upload CSV files, organize contacts, and launch campaigns without complicated setup." },
        { title: "Sales-focused inbox", body: "Keep every reply in one place so hot leads do not get buried in disconnected tools." },
        { title: "Strong fit for insurance agents", body: "Text2Sale is designed around real lead follow-up, appointment setting, recruiting outreach, and insurance sales conversations." }
      ]}
      bullets={["OnlySales alternative", "Mass texting CRM", "AI texting", "Lead follow-up", "Campaign tracking", "Insurance sales workflow"]}
      noteTitle="Why Text2Sale"
      noteBody="Text2Sale is a strong OnlySales alternative for teams that want a modern texting CRM with AI support and sales workflows built around speed-to-lead."
    />
  );
}
