import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Texting CRM for Solar Sales Teams | Text2Sale",
  description: "Text2Sale is a texting CRM for solar sales teams. Send bulk SMS to homeowner leads, manage conversations, use AI replies, and book more solar appointments from one dashboard.",
  alternates: { canonical: "/solar-sales-texting-crm" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Solar Sales Texting CRM"
      title="A texting CRM built for solar sales teams that need more booked appointments."
      description="Solar leads are expensive and short-lived. Text2Sale helps solar sales teams send bulk SMS to homeowner lead lists, manage conversations, use AI-assisted replies, and book more in-home or virtual appointments — all from one texting CRM."
      canonicalPath="/solar-sales-texting-crm"
      sections={[
        { title: "Fast homeowner outreach", body: "Text new solar leads immediately after they come in. Solar reps who reach homeowners first book significantly more appointments." },
        { title: "Bulk campaigns for aged and cold lists", body: "Upload aged solar leads or purchased homeowner lists as a CSV and run a bulk SMS campaign to reactivate interest and fill your appointment calendar." },
        { title: "AI replies for common objections", body: "When homeowners reply with questions about cost, financing, or energy savings, AI can help your team respond quickly and keep the conversation moving toward a booked site visit." },
        { title: "Team inbox for solar reps", body: "All conversations flow into one shared inbox so your team can work replies efficiently without losing hot leads in individual phones or spreadsheets." }
      ]}
      bullets={["Solar lead texting", "Homeowner SMS campaigns", "Appointment setting", "AI reply assistance", "CSV list uploads", "2-way team inbox"]}
      noteTitle="Why solar teams use Text2Sale"
      noteBody="Text2Sale helps solar sales teams move fast on new leads, reactivate aged lists, and manage homeowner conversations from one place — so more leads turn into booked appointments."
      faq={[
        {
          question: "Can solar sales teams use Text2Sale?",
          answer: "Yes. Text2Sale is used by solar sales teams to follow up on new homeowner leads, run bulk SMS campaigns to aged lists, manage appointment conversations in a 2-way inbox, and use AI replies to handle objections and book site visits."
        },
        {
          question: "How does Text2Sale help solar reps book more appointments?",
          answer: "Text2Sale lets solar reps reach leads immediately, run reactivation campaigns to cold or aged lists, and use AI-assisted replies to keep homeowners engaged — all from one dashboard built for high-volume outreach."
        },
        {
          question: "Can I upload my solar lead list into Text2Sale?",
          answer: "Yes. Upload any homeowner or solar lead list as a CSV and launch a bulk SMS campaign in minutes. Text2Sale is built for teams that work large lead volumes."
        },
        {
          question: "Is Text2Sale compliant for solar texting campaigns?",
          answer: "Yes. Text2Sale includes 10DLC-compliant texting and opt-out handling to help keep your campaigns within carrier guidelines."
        },
        {
          question: "How much does Text2Sale cost for solar sales teams?",
          answer: "Text2Sale starts at $39.99/month with a free trial available. It includes mass texting, AI replies, 2-way inbox, CSV imports, and campaign tracking."
        }
      ]}
      relatedPages={[
        { href: "/sales-team-texting-crm", label: "Sales Team Texting CRM" },
        { href: "/mass-texting-crm", label: "Mass Texting CRM" },
        { href: "/recruiting-texting-crm", label: "Recruiting Texting CRM" },
        { href: "/ai-texting-crm", label: "AI Texting CRM" },
        { href: "/bulk-sms-software", label: "Bulk SMS Software" },
      ]}
    />
  );
}
