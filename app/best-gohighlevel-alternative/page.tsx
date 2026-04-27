import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Best GoHighLevel Alternative for SMS & Sales Teams | Text2Sale",
  description: "Looking for a GoHighLevel alternative focused on SMS? Text2Sale is a simpler, faster texting CRM for insurance agents and sales teams — mass texting, AI replies, and 2-way inbox without the bloat.",
  alternates: { canonical: "/best-gohighlevel-alternative" },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="GoHighLevel Alternative"
      title="The best GoHighLevel alternative when all you need is a powerful texting CRM."
      description="GoHighLevel is a massive all-in-one marketing suite. Text2Sale is the focused alternative — built just for sales teams that need mass texting, AI-assisted replies, lead follow-up, and a simple SMS CRM without paying for features they will never use."
      canonicalPath="/best-gohighlevel-alternative"
      sections={[
        { title: "Simpler and faster to use", body: "Text2Sale gets your team texting leads in minutes. No funnels, no website builder, no steep learning curve — just a clean SMS CRM built for sales outreach." },
        { title: "Better for SMS-first teams", body: "If texting is the core of your sales process, a dedicated SMS CRM gives you more depth and speed than a bloated all-in-one platform." },
        { title: "AI replies included", body: "Text2Sale's AI reply support helps your team handle inbound messages, qualify leads, and book more appointments without adding headcount." },
        { title: "Built for insurance and sales teams", body: "Insurance agents, recruiting firms, and high-volume sales teams choose Text2Sale when they want fast lead outreach without managing a complex marketing stack." }
      ]}
      bullets={["GoHighLevel alternative", "SMS-only focus", "Mass texting", "AI reply support", "Simple team inbox", "No unnecessary features"]}
      noteTitle="Why teams switch from GoHighLevel"
      noteBody="GoHighLevel is built for agencies managing everything from websites to email. Text2Sale is built for one thing: helping sales teams text more leads and close more deals."
      faq={[
        {
          question: "Why would I use Text2Sale instead of GoHighLevel?",
          answer: "If SMS outreach is your main sales channel, Text2Sale gives you more focus and speed. GoHighLevel is designed for marketing agencies that need funnels, websites, and email — Text2Sale strips all that out and gives you a purpose-built texting CRM."
        },
        {
          question: "Is Text2Sale cheaper than GoHighLevel?",
          answer: "Yes. Text2Sale starts at $39.99/month. GoHighLevel's plans start significantly higher and include features most sales teams do not need. Text2Sale charges for what you actually use."
        },
        {
          question: "Is Text2Sale a good GoHighLevel alternative for insurance agents?",
          answer: "Yes. Insurance agents who use GoHighLevel primarily for SMS often find Text2Sale faster and easier. It is designed around insurance lead workflows — bulk uploads, campaign sequences, AI replies, and appointment-setting conversations."
        },
        {
          question: "Can I move my contacts from GoHighLevel to Text2Sale?",
          answer: "Yes. Export your contacts as a CSV from GoHighLevel and import them into Text2Sale. The platform is built for quick onboarding so you can start texting the same day."
        },
        {
          question: "Does Text2Sale have the same SMS features as GoHighLevel?",
          answer: "Text2Sale covers all the SMS features sales teams need: mass texting, 2-way inbox, drip campaigns, CSV imports, opt-out handling, AI replies, and 10DLC compliance. It does not include email funnels or website builders."
        }
      ]}
      relatedPages={[
        { href: "/text2sale-vs-gohighlevel", label: "Text2Sale vs GoHighLevel" },
        { href: "/best-salesmsg-alternative", label: "Best Salesmsg Alternative" },
        { href: "/best-textdrip-alternative", label: "Best Textdrip Alternative" },
        { href: "/best-onlysales-alternative", label: "Best OnlySales Alternative" },
        { href: "/best-twilio-alternative", label: "Best Twilio Alternative" },
      ]}
    />
  );
}
