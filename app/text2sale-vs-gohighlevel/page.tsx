import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs GoHighLevel | Texting CRM Comparison",
  description: "Compare Text2Sale vs GoHighLevel for mass texting, AI SMS replies, insurance lead follow-up, campaign management, and sales team texting workflows.",
  alternates: { canonical: "/text2sale-vs-gohighlevel" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs GoHighLevel"
      title="Text2Sale vs GoHighLevel: focused texting CRM vs all-in-one marketing suite."
      description="GoHighLevel is a large all-in-one marketing platform. Text2Sale is focused on one thing: helping sales teams text leads, manage replies, use AI support, and book more conversations without unnecessary complexity."
      sections={[
        { title: "Focused SMS workflow", body: "Text2Sale is purpose-built for mass texting, lead follow-up, 2-way replies, and sales team texting instead of trying to be every marketing tool at once." },
        { title: "Easier for agents", body: "A focused texting CRM can be easier for agents and appointment setters to learn, especially when the main goal is sending campaigns and working replies." },
        { title: "AI texting support", body: "Use AI-assisted replies to respond faster, qualify leads, and help move prospects toward booked appointments." },
        { title: "Built for high-volume outreach", body: "Text2Sale is built around CSV uploads, campaigns, team conversations, opt-out handling, and texting workflows for lead-driven businesses." }
      ]}
      bullets={["Mass texting", "AI replies", "CSV lead uploads", "Simple sales workflow", "Team inbox", "Insurance lead follow-up"]}
      noteTitle="Bottom line"
      noteBody="GoHighLevel can be powerful if you need a full marketing suite. Text2Sale is the cleaner choice when your priority is texting leads, managing replies, and moving conversations to sales calls."
    />
  );
}
