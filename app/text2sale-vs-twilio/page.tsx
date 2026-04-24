import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs Twilio | SMS CRM vs SMS API",
  description: "Compare Text2Sale vs Twilio for sales teams that need a ready-to-use texting CRM instead of building SMS workflows from an API.",
  alternates: { canonical: "/text2sale-vs-twilio" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs Twilio"
      title="Text2Sale vs Twilio: ready-to-use SMS CRM vs developer SMS API."
      description="Twilio is a powerful communications API for developers. Text2Sale is a ready-to-use texting CRM for sales teams that want campaigns, conversations, AI replies, CSV uploads, opt-out handling, and team workflows without building everything from scratch."
      sections={[
        { title: "No custom build required", body: "Text2Sale gives you a working sales texting platform without needing developers to build contacts, campaigns, inboxes, billing, or compliance workflows." },
        { title: "Built-in sales dashboard", body: "Launch campaigns, manage replies, and track activity from a user-friendly dashboard instead of working directly with API infrastructure." },
        { title: "AI and CRM workflow", body: "Text2Sale adds AI-assisted replies, lead follow-up, and team conversation management on top of business texting." },
        { title: "Better for non-technical teams", body: "If your team wants to text leads and book appointments now, a ready-to-use CRM is usually faster than building on top of an API." }
      ]}
      bullets={["Ready-to-use dashboard", "Mass SMS campaigns", "2-way inbox", "AI replies", "CSV imports", "No developer required"]}
      noteTitle="Bottom line"
      noteBody="Twilio is best when you want to build your own texting product. Text2Sale is best when you want a working sales texting CRM your team can use right away."
    />
  );
}
