import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Health Insurance Texting CRM | Text2Sale",
  description: "Text2Sale is a health insurance texting CRM for agents who need mass texting, AI replies, lead follow-up, quote conversations, and appointment setting.",
  alternates: { canonical: "/health-insurance-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Health Insurance Texting CRM"
      title="Health insurance texting CRM built for faster quote conversations."
      description="Text2Sale helps health insurance agents text leads, manage replies, follow up on quote requests, use AI assistance, and move prospects toward a call without losing conversations in spreadsheets or personal phones."
      sections={[
        { title: "Reach leads faster", body: "Upload health insurance leads and send campaigns quickly so prospects hear from you while interest is still fresh." },
        { title: "Manage quote replies", body: "Keep plan questions, ZIP codes, family details, and appointment requests organized in a single texting inbox." },
        { title: "AI-assisted follow-up", body: "Use AI support to ask basic qualifying questions and guide interested prospects toward a quote call." },
        { title: "Built for high-volume agents", body: "Run lead campaigns, track replies, manage opt-outs, and keep your team focused on the hottest opportunities." }
      ]}
      bullets={["Health insurance lead texting", "Quote follow-up", "AI replies", "CSV lead uploads", "Appointment setting", "2-way conversations"]}
      noteTitle="Best fit"
      noteBody="Text2Sale is a strong fit for health insurance agents and agencies that rely on speed-to-leed, consistent follow-up, and text conversations that lead to phone calls."
    />
  );
}
