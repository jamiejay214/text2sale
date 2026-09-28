import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Bulk SMS Software for Sales Follow-Up | Text2Sale",
  description:
    "Text2Sale bulk SMS software helps sales teams upload CSV contacts, send campaigns, manage replies, track performance, and follow up with leads from one dashboard.",
  alternates: { canonical: "/bulk-sms-software" },
};

export default function BulkSmsSoftwarePage() {
  return (
    <SeoLandingPage
      blogTags={["Bulk SMS", "Campaigns", "Deliverability", "SMS marketing"]}
      eyebrow="Bulk SMS Software"
      title="Bulk SMS software for teams that need replies, not just sends."
      description="Text2Sale lets your team upload contacts, launch bulk SMS campaigns, manage every response, and track performance without using separate tools for texting, CRM, and reporting."
      secondaryCta="Compare CRM features"
      secondaryHref="/mass-texting-crm"
      canonicalPath="/bulk-sms-software"
      sections={[
        {
          title: "Upload CSV contacts",
          body: "Bring in lead lists, map fields, and organize campaigns without manual copy-and-paste work.",
        },
        {
          title: "Send targeted campaigns",
          body: "Use SMS templates and campaigns to reach the right contacts with the right message.",
        },
        {
          title: "Manage replies",
          body: "Keep inbound messages organized so your team can respond quickly and book more calls.",
        },
        {
          title: "Track usage and results",
          body: "See campaign activity, credit usage, replies, and performance from your dashboard.",
        },
      ]}
      guideTitle="How to send bulk SMS that gets replies"
      guide={[
        {
          heading: "Bulk SMS software vs. a texting CRM",
          paragraphs: [
            "Sending a large batch of texts is only step one. The money is in managing the replies, following up, identifying hot prospects, and keeping opt-outs clean. Basic bulk SMS software is built around sending. Text2Sale is built around selling, so your team can send campaigns, manage conversations, use AI assistance, track opt-outs, and move leads into appointments without losing context.",
            "That difference matters most after a campaign goes out. A send to 2,000 contacts can produce dozens of replies within an hour, and each one is a lead deciding whether to talk to you. If those replies land in a tool nobody is watching, the campaign's cost is wasted.",
          ],
        },
        {
          heading: "Prepare the list before you press send",
          paragraphs: [
            "List quality decides deliverability. Carriers watch opt-out and complaint rates, and a campaign sent to a stale or unconsented list can get your numbers filtered for everyone on your account. A few minutes of cleanup protects every future campaign.",
          ],
          bullets: [
            "Send only to contacts who agreed to receive texts from your business",
            "Remove duplicates and numbers that are not valid mobile numbers",
            "Import your existing opt-out list before your first campaign",
            "Segment by source or interest so the message matches the person",
          ],
        },
        {
          heading: "Write messages people answer",
          paragraphs: [
            "The texts that get replies are short, personal, and specific. Use the contact's first name, say who you are, reference why you are texting, and end with one question that is easy to answer. Every first message to a contact should include opt-out language.",
            "Keep an eye on length and characters. A standard SMS segment holds 160 GSM-7 characters, but a single emoji or some special characters switch the whole message to Unicode, which cuts a segment to 70 characters. Text2Sale charges $0.012 per segment on either plan, so a message that splits into three segments costs three times as much. You save 10% when you add $500 or more to your wallet.",
          ],
        },
      ]}
      faq={[
        {
          question: "What is bulk SMS software?",
          answer: "Bulk SMS software sends a text message to many contacts at once, usually from an uploaded list. A texting CRM like Text2Sale adds reply management, drip follow-up, opt-out tracking, and reporting so the replies turn into appointments.",
        },
        {
          question: "How much does bulk SMS cost with Text2Sale?",
          answer: "Texts are $0.012 per segment, and the Standard plan is $39.99 per month. A standard segment holds 160 characters, or 70 if the message contains emoji. You save 10% when you add $500 or more to your wallet.",
        },
        {
          question: "Can I upload a CSV of contacts?",
          answer: "Yes. Upload a CSV, map the fields, and send campaigns to the list from the same workflow.",
        },
        {
          question: "Do I need consent to send bulk texts?",
          answer: "Yes. Marketing texts generally require prior express written consent, and carriers expect every contact on a business texting list to have opted in. Sending to unconsented lists risks legal exposure and carrier filtering.",
        },
      ]}
      relatedPages={[
        {
          href: "/mass-texting-crm",
          label: "Mass texting CRM",
        },
        {
          href: "/10dlc-compliant-texting",
          label: "10DLC compliant texting",
        },
        {
          href: "/sms-follow-up-for-sales-teams",
          label: "SMS follow-up for sales teams",
        },
        {
          href: "/best-twilio-alternative",
          label: "Twilio alternative",
        },
      ]}
    />
  );
}
