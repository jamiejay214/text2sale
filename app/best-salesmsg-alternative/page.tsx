import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best Salesmsg Alternative for Sales Teams | Text2Sale",
  description: "Looking for a Salesmsg alternative? Text2Sale offers mass texting, AI-assisted SMS replies, CRM workflows, CSV lead uploads, and 2-way conversations built for sales teams.",
  alternates: { canonical: "/best-salesmsg-alternative" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Salesmsg Alternative"
      title="The best Salesmsg alternative for teams that need mass texting and AI sales follow-up."
      description="Text2Sale is a Salesmsg alternative built for sales teams that need more than one-on-one business texting. It combines bulk SMS campaigns, a 2-way team inbox, AI-assisted replies, CSV lead uploads, and sales-focused follow-up workflows."
      canonicalPath="/best-salesmsg-alternative"
      sections={[
        { title: "Mass texting built in", body: "Upload a CSV of leads and launch a bulk SMS campaign in minutes — no per-message setup or manual outreach required." },
        { title: "AI-assisted replies", body: "Text2Sale helps your team respond to inbound messages faster, qualify leads, and move conversations toward booked appointments." },
        { title: "Sales CRM workflow", body: "Manage contacts, campaigns, replies, opt-outs, and team activity from one dashboard instead of toggling between disconnected tools." },
        { title: "Built for high-volume teams", body: "Text2Sale is designed for insurance agents, recruiters, appointment setters, and sales teams that text hundreds or thousands of leads at a time." }
      ]}
      bullets={["Salesmsg alternative", "Mass SMS campaigns", "AI texting CRM", "2-way inbox", "CSV imports", "Team workflows"]}
      noteTitle="Why switch to Text2Sale"
      noteBody="Salesmsg works well for simple business texting. Text2Sale is the stronger choice when your team needs bulk outreach, AI reply support, and a full sales texting workflow."
      faq={[
        {
          question: "Why would I switch from Salesmsg to Text2Sale?",
          answer: "If your team needs to send mass SMS campaigns, work high-volume lead lists, or use AI to help manage replies, Text2Sale is a stronger fit. Salesmsg is designed for one-on-one business texting, while Text2Sale is built for bulk outreach and sales-driven follow-up."
        },
        {
          question: "Is Text2Sale a good Salesmsg alternative for insurance agents?",
          answer: "Yes. Text2Sale is especially popular with insurance agents who need to text large lead lists, run drip campaigns, and manage replies from one team inbox. It is designed around the insurance sales workflow."
        },
        {
          question: "Does Text2Sale cost less than Salesmsg?",
          answer: "Text2Sale starts at $39.99/month and includes mass texting, AI replies, 2-way inbox, CSV imports, and campaign tracking. A free trial is available so you can compare before committing."
        },
        {
          question: "Can I import my Salesmsg contacts into Text2Sale?",
          answer: "Yes. Export your contacts as a CSV from Salesmsg and import them directly into Text2Sale. You can have your first campaign running the same day."
        },
        {
          question: "Does Text2Sale support 10DLC compliance like Salesmsg?",
          answer: "Yes. Text2Sale includes 10DLC-compliant texting so your campaigns stay within carrier guidelines and your messages reach leads reliably."
        }
      ]}
      relatedPages={[
        { href: "/text2sale-vs-salesmsg", label: "Text2Sale vs Salesmsg" },
        { href: "/best-textdrip-alternative", label: "Best Textdrip Alternative" },
        { href: "/best-onlysales-alternative", label: "Best OnlySales Alternative" },
        { href: "/best-gohighlevel-alternative", label: "Best GoHighLevel Alternative" },
        { href: "/best-twilio-alternative", label: "Best Twilio Alternative" },
      ]}
    />
  );
}
