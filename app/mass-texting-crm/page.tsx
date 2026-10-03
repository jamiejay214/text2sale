import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Mass Texting CRM for Sales Teams | Text2Sale",
  description:
    "Text2Sale is a mass texting CRM for sales teams that need bulk SMS campaigns, 2-way conversations, CSV lead uploads, drip sequences, AI replies, and TCPA/10DLC compliance tools.",
  alternates: { canonical: "/mass-texting-crm" },
};

export default function MassTextingCrmPage() {
  return (
    <SeoLandingPage
      blogTags={["texting CRM", "Campaigns", "SMS marketing", "Automation"]}
      eyebrow="Mass Texting CRM"
      title="Mass texting CRM built to turn lead lists into conversations."
      description="Text2Sale helps sales teams upload contacts, send bulk SMS campaigns, manage 2-way replies, automate follow-up, and track results from one clean dashboard. It is made for teams that need more appointments, faster speed-to-lead, and better control over their texting."
      secondaryCta="See AI texting CRM"
      secondaryHref="/ai-texting-crm"
      canonicalPath="/mass-texting-crm"
      sections={[
        {
          title: "CSV lead upload",
          body: "Import contacts, map fields, remove messy formatting, and prepare campaigns without fighting spreadsheets.",
        },
        {
          title: "2-way inbox",
          body: "Keep every reply organized so hot leads, objections, follow-ups, and booked appointments do not get lost.",
        },
        {
          title: "Campaign tracking",
          body: "See texts sent, replies, delivery performance, and campaign activity so you know what is actually working.",
        },
        {
          title: "Drip sequences",
          body: "Schedule follow-up that stops automatically when a contact replies or opts out.",
        },
      ]}
      bullets={[
        "Send campaigns to segmented lead lists",
        "Use templates and drip sequences for consistent follow-up",
        "Handle STOP opt-outs and compliance workflows",
        "Give managers visibility into every rep's conversations",
        "Use AI replies and smart suggestions to book more appointments",
        "Track wallet usage, credits, and messaging costs",
      ]}
      guideTitle="Why sales teams use a texting CRM instead of regular SMS tools"
      guide={[
        {
          heading: "Sending is the easy part",
          paragraphs: [
            "Basic bulk SMS tools can send messages, but they usually fall short once replies start coming in. A real texting CRM keeps contacts, campaigns, conversations, opt-outs, and performance data connected. That matters when your team is trying to reach thousands of leads and still give each reply a fast, personal answer.",
            "In Text2Sale the workflow runs in one place: upload a list, send a campaign, let drip sequences follow up with people who have not answered, and work every reply from the two-way inbox. On the AI plan, AI can answer replies the moment they arrive and book appointments.",
          ],
        },
        {
          heading: "A typical campaign, start to finish",
          paragraphs: [
            "Most teams settle into the same rhythm. Each step is simple on its own; the value is that nothing falls between them.",
          ],
          bullets: [
            "Upload a CSV of contacts who opted in, and map names and phone numbers",
            "Choose a template or write a short message with the contact's first name and one question",
            "Send the campaign during daytime hours in your contacts' time zones",
            "Work replies from the inbox, or let AI handle them on the AI plan",
            "Let a drip sequence follow up with people who did not answer, stopping when they reply",
            "Review reply and opt-out rates to see which messages and lists performed",
          ],
        },
        {
          heading: "Built for compliance and deliverability",
          paragraphs: [
            "Mass texting only works if your messages get delivered. Text2Sale walks you through 10DLC registration, records STOP replies automatically, excludes opted-out contacts from every future campaign, and applies quiet-hours sending windows.",
            "Pricing is straightforward: the Standard plan is $39.99 per month and the Text2Sale + AI plan is $119.99 per month, with texts at $0.012 per segment and 10% off when you add $500 or more to your wallet.",
          ],
        },
      ]}
      faq={[
        {
          question: "What is a mass texting CRM?",
          answer: "A mass texting CRM combines bulk SMS sending, contact management, campaign tracking, replies, opt-outs, and lead follow-up in one dashboard instead of using separate texting and CRM tools.",
        },
        {
          question: "Who is Text2Sale built for?",
          answer: "Text2Sale is built for insurance agents, sales teams, recruiters, appointment setters, and small businesses that need to reach leads fast and manage every reply in one place.",
        },
        {
          question: "Can I upload a CSV lead list?",
          answer: "Yes. Text2Sale lets you upload contacts by CSV, map common fields, clean phone formatting, and send campaigns to the list from the same workflow.",
        },
        {
          question: "Do drip sequences stop when someone replies?",
          answer: "Yes. Drip follow-ups are cancelled for a contact as soon as they reply or opt out, so nobody who is already talking to you keeps getting automated messages.",
        },
        {
          question: "How much does Text2Sale cost?",
          answer: "The Standard plan is $39.99 per month and the Text2Sale + AI plan is $119.99 per month. Texts cost $0.012 each and AI replies cost $0.025 each. There is no long-term contract.",
        },
      ]}
      relatedPages={[
        {
          href: "/bulk-sms-software",
          label: "Bulk SMS software",
        },
        {
          href: "/ai-texting-crm",
          label: "AI texting CRM",
        },
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
        {
          href: "/sales-team-texting-crm",
          label: "Sales team texting CRM",
        },
      ]}
    />
  );
}
