import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs Salesmsg | Business Texting CRM Comparison",
  description: "Compare Text2Sale vs Salesmsg for business texting, SMS CRM, AI replies, lead follow-up, bulk campaigns, and sales team texting workflows.",
  alternates: { canonical: "/text2sale-vs-salesmsg" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs Salesmsg"
      title="Text2Sale vs Salesmsg: business texting with AI-powered sales follow-up."
      description="Salesmsg is a business texting platform. Text2Sale is designed for sales teams that want mass texting, lead list uploads, AI-assisted replies, campaign workflows, and a CRM-style inbox built around closing more conversations."
      sections={[
        { title: "Sales-first texting", body: "Text2Sale is built for outreach, follow-up, appointment setting, and team visibility instead of simple one-off business texting." },
        { title: "AI conversation support", body: "AI can help keep replies moving, qualify leads, and support appointment-setting conversations when agents are busy." },
        { title: "Campaign and CRM workflow", body: "Upload lists, launch campaigns, manage responses, and keep your team aligned inside one texting CRM." },
        { title: "Great fit for lead-driven teams", body: "Text2Sale is a strong fit for insurance agents, recruiting teams, appointment setters, and businesses that depend on fast lead response." }
      ]}
      bullets={["Business texting", "Mass texting", "AI reply assistance", "Lead follow-up", "Team inbox", "Campaign tracking"]}
      noteTitle="Bottom line"
      noteBody="Salesmsg can be useful for general business texting. Text2Sale is built for teams that want texting tied directly to sales campaigns, lead follow-up, and AI-assisted appointment setting."
    />
  );
}
