import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "10DLC Compliant Texting Platform | Text2Sale",
  description:
    "Text2Sale helps sales teams text leads with compliance-focused tools for 10DLC, opt-outs, STOP handling, consent records, quiet hours, and campaign management.",
  alternates: { canonical: "/10dlc-compliant-texting" },
};

export default function TenDlcCompliantTextingPage() {
  return (
    <SeoLandingPage
      blogTags={["10DLC", "Compliance", "TCPA", "Deliverability"]}
      eyebrow="10DLC Compliant Texting"
      title="10DLC compliant texting tools for serious sales teams."
      description="Text2Sale helps teams manage SMS outreach with opt-out handling, consent-focused workflows, quiet-hours support, and campaign tools designed for business texting in today's carrier environment."
      secondaryCta="Insurance texting CRM"
      secondaryHref="/sms-crm-for-insurance-agents"
      canonicalPath="/10dlc-compliant-texting"
      sections={[
        {
          title: "STOP handling",
          body: "Automatically track opt-outs so contacts who unsubscribe are not messaged again.",
        },
        {
          title: "Consent records",
          body: "Keep opt-in and messaging activity connected to contacts and campaigns.",
        },
        {
          title: "Quiet hours",
          body: "Support better sending practices with time-window controls and responsible campaign behavior.",
        },
        {
          title: "Campaign organization",
          body: "Separate campaigns, templates, contacts, and conversations for cleaner oversight.",
        },
      ]}
      guideTitle="10DLC, explained for sales teams"
      guide={[
        {
          heading: "What 10DLC is and why it exists",
          paragraphs: [
            "10DLC stands for 10-digit long code: an ordinary local phone number used to send business text messages. US carriers created the 10DLC system so business texting from local numbers would be registered and traceable, which lets them block spam without blocking legitimate businesses.",
            "Registration happens through The Campaign Registry. First you register your brand, which is your business identity: legal name, EIN, address, and website. Then you register one or more campaigns describing what you send, who receives it, and how they opted in. Your phone numbers are linked to an approved campaign, and carriers use that record to decide how much traffic to accept from you.",
            "Carriers now block or heavily filter business traffic from unregistered local numbers, so registration is no longer optional for teams that text leads at any volume.",
          ],
        },
        {
          heading: "What carriers look for in a campaign",
          paragraphs: [
            "Most rejections come down to a mismatch between what a campaign says and what a reviewer can verify. Reviewers read your campaign description, sample messages, and opt-in description, then check them against your website. Before submitting, make sure these line up.",
          ],
          bullets: [
            "A working website that matches your registered business name",
            "A privacy policy that says mobile numbers and opt-in data are not shared with third parties for marketing",
            "An opt-in description showing exactly how people agree to receive texts, such as a web form with a consent checkbox",
            "Sample messages that identify your business and include opt-out language like \"Reply STOP to opt out\"",
            "A use case that matches what you actually send, such as marketing or customer care",
          ],
        },
        {
          heading: "Staying compliant after approval",
          paragraphs: [
            "Approval is the start, not the finish. Carriers keep monitoring opt-out rates, complaints, and message content, and a campaign that drifts from its registered use case can be suspended. Content involving sex, hate, alcohol, firearms, or tobacco is heavily restricted, and public link shorteners are often filtered, so use your own domain for links.",
            "TCPA rules apply alongside 10DLC. Marketing texts generally require prior express written consent, telemarketing messages are limited to 8 a.m. to 9 p.m. in the recipient's local time with some states setting narrower windows, and opt-out requests must be honored promptly. Text2Sale records STOP replies automatically, blocks future messages to opted-out numbers across every campaign, and gives you quiet-hours sending windows.",
          ],
        },
      ]}
      noteTitle="Important note"
      noteBody="Text2Sale gives teams compliance-focused tools, but every business is responsible for its own messaging practices, consent collection, list quality, and legal obligations. This page is general information, not legal advice."
      faq={[
        {
          question: "Do I need 10DLC registration to text leads?",
          answer: "If you text from local 10-digit numbers for business purposes in the US, yes. Carriers block or filter unregistered business traffic from local numbers. Text2Sale walks you through brand and campaign registration in the dashboard.",
        },
        {
          question: "How long does 10DLC approval take?",
          answer: "Usually a few business days, and longer if carriers ask for changes to your campaign. Having a live website, a privacy policy, and a clear opt-in description ready before you submit avoids most delays.",
        },
        {
          question: "Why do 10DLC campaigns get rejected?",
          answer: "Common reasons are a website that does not match the brand, a missing privacy policy, sample messages without opt-out language, or an opt-in description that does not show how people agreed to receive texts.",
        },
        {
          question: "Does 10DLC registration make my texts TCPA compliant?",
          answer: "No. 10DLC registration is a carrier requirement. TCPA compliance depends on how you collect consent, when you send, and how you handle opt-outs. You need both.",
        },
        {
          question: "How does Text2Sale handle opt-outs?",
          answer: "STOP, END, CANCEL, QUIT, and UNSUBSCRIBE replies are recorded automatically, and opted-out numbers are excluded from every future campaign. HELP replies receive your help message.",
        },
      ]}
      relatedPages={[
        {
          href: "/mass-texting-crm",
          label: "Mass texting CRM",
        },
        {
          href: "/bulk-sms-software",
          label: "Bulk SMS software",
        },
        {
          href: "/sms-crm-for-insurance-agents",
          label: "SMS CRM for insurance agents",
        },
        {
          href: "/how-to-text-insurance-leads",
          label: "How to text insurance leads",
        },
      ]}
    />
  );
}
