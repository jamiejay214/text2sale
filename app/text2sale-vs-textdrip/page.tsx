import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Text2Sale vs Textdrip | SMS CRM Comparison",
  description: "Compare Text2Sale vs Textdrip for bulk SMS, sales follow-up, AI texting, campaign management, and insurance agent CRM workflows.",
  alternates: { canonical: "/text2sale-vs-textdrip" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Text2Sale vs Textdrip"
      title="Text2Sale vs Textdrip: built for sales teams that need more than drip texting."
      description="Textdrip is known for automated texting workflows. Text2Sale focuses on the full sales texting process: uploading leads, launching campaigns, managing replies, using AI to respond faster, and keeping conversations moving toward booked appointments."
      canonicalPath="/text2sale-vs-textdrip"
      sections={[
        { title: "More than drip campaigns", body: "Text2Sale gives teams campaign sending, 2-way conversations, AI assistance, lead management, and performance tracking in one workflow." },
        { title: "AI reply support", body: "Use AI-assisted replies to help qualify prospects, answer common objections, and move interested leads toward a phone call." },
        { title: "Made for sales speed", body: "Your team can work inbound replies from one dashboard instead of losing hot leads across phones, spreadsheets, and disconnected apps." },
        { title: "Insurance-friendly positioning", body: "Text2Sale is especially strong for insurance teams that need fast follow-up, quote conversations, recruiting outreach, and appointment setting." }
      ]}
      bullets={["Bulk SMS campaigns", "Drip sequence support", "AI-assisted texting", "2-way conversations", "CSV imports", "Compliance-focused tools"]}
      noteTitle="Bottom line"
      noteBody="If you only need basic drip texting, Textdrip may be an option. If you want a broader SMS CRM with AI and sales-team workflows, Text2Sale is built for that lane."
      faq={[
        {
          question: "What is the difference between Text2Sale and Textdrip?",
          answer: "Textdrip focuses on automated drip texting sequences. Text2Sale is a broader SMS CRM that includes drip campaigns plus mass texting, 2-way inbox management, AI-assisted replies, CSV lead uploads, and sales-team workflows built around appointment setting and closing deals."
        },
        {
          question: "Is Text2Sale better than Textdrip for insurance agents?",
          answer: "Yes. Text2Sale is designed for the insurance sales workflow — fast lead uploads, bulk outreach, AI replies for common objections, and appointment-setting conversations. Insurance agents who need high-volume texting with a team inbox tend to find Text2Sale a stronger fit."
        },
        {
          question: "Does Text2Sale have drip texting like Textdrip?",
          answer: "Yes. Text2Sale supports drip sequences as part of its broader campaign toolset. You can set up automated follow-up sequences while also managing live 2-way conversations from the same dashboard."
        },
        {
          question: "What makes Text2Sale different from Textdrip for sales teams?",
          answer: "Text2Sale adds AI-assisted replies, a team conversation inbox, and CRM-style lead management on top of drip texting. For sales teams that need to work replies in real time and track which leads are moving toward a call, Text2Sale gives more visibility and control."
        },
        {
          question: "How much does Text2Sale cost compared to Textdrip?",
          answer: "Text2Sale starts at $39.99/month with a free trial available. It includes mass texting, drip campaigns, AI replies, CSV imports, and team inbox access in one plan."
        }
      ]}
      relatedPages={[
        { href: "/text2sale-vs-salesmsg", label: "Text2Sale vs Salesmsg" },
        { href: "/text2sale-vs-gohighlevel", label: "Text2Sale vs GoHighLevel" },
        { href: "/text2sale-vs-twilio", label: "Text2Sale vs Twilio" },
        { href: "/text2sale-vs-onlysales", label: "Text2Sale vs OnlySales" },
      ]}
    />
  );
}
