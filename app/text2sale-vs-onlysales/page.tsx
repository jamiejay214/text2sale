import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs OnlySales | Mass Texting CRM Comparison",
  description: "Compare Text2Sale vs OnlySales for mass texting, AI replies, SMS CRM workflows, insurance lead follow-up, campaign management, and sales team texting.",
  alternates: { canonical: "/text2sale-vs-onlysales" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs OnlySales"
      title="Text2Sale vs OnlySales: a texting CRM built for speed, AI, and sales follow-up."
      description="If you are comparing Text2Sale and OnlySales, the real question is simple: which platform helps your team start more conversations, manage replies faster, and turn more leads into booked calls? Text2Sale is built for mass texting, AI-assisted replies, CSV lead uploads, and sales teams that need clean follow-up workflows."
      sections={[
        { title: "AI-assisted conversations", body: "Text2Sale is built around AI texting that can help respond, qualify, and move leads toward appointments while your team stays in control." },
        { title: "Sales-focused SMS CRM", body: "Manage contacts, campaigns, conversations, replies, and follow-up from one dashboard instead of juggling disconnected tools." },
        { title: "Built for insurance and sales teams", body: "Text2Sale is especially useful for health insurance agents, life agents, recruiters, appointment setters, and high-volume sales teams." },
        { title: "Simple growth path", body: "Start with mass texting, then add AI replies, appointment-setting flows, campaign tracking, and compliance-focused workflows as your team grows." }
      ]}
      bullets={["Mass texting campaigns", "CSV lead uploads", "AI reply assistance", "2-way inbox", "Opt-out handling", "Sales team workflow"]}
      noteTitle="Bottom line"
      noteBody="OnlySales may work for basic texting workflows, but Text2Sale is positioned for teams that want a modern mass texting CRM with AI support and insurance-sales-friendly follow-up tools."
    />
  );
}
