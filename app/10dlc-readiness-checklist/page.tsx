import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import TenDlcChecklist from "@/components/tools/TenDlcChecklist";

export const metadata: Metadata = {
  title: "10DLC Registration Checklist: Are You Ready to Submit? | Text2Sale",
  description:
    "An interactive 10DLC readiness checklist covering brand details, website privacy and SMS terms, opt-in, sample messages and opt-out language before you register.",
  alternates: { canonical: "/10dlc-readiness-checklist" },
  openGraph: { title: "10DLC Readiness Checklist", description: "A free interactive checklist for preparing 10DLC brand and campaign registration.", url: "/10dlc-readiness-checklist", type: "website" },
};

export default function Page() {
  return (
    <ToolPage
      path="/10dlc-readiness-checklist"
      name="Text2Sale 10DLC Readiness Checklist"
      toolDescription="A free interactive checklist for preparing 10DLC brand and campaign registration."
      eyebrow="Get registered the first time"
      title="Is your business ready for 10DLC registration?"
      intro="Tick off what you already have in place. The checklist shows what is left to fix before you submit your brand and campaign, so you avoid a rejection and a resubmission wait."
      facts={[
        ["Names must match", "Your legal business name should match your EIN records and your website exactly."],
        ["Your website gets reviewed", "Reviewers look for a privacy policy and SMS terms that match how you collect consent."],
        ["Samples must be real", "Sample messages should name your business, match what you will send and show opt-out language."],
      ]}
      faq={[
        { question: "What is 10DLC?", answer: "10DLC is the US system for registering businesses and their texting use cases on standard 10-digit phone numbers. Registered traffic is trusted more by carriers." },
        { question: "Why do 10DLC registrations get rejected?", answer: "Common reasons are mismatched business names, missing privacy or SMS terms, unclear opt-in descriptions and sample messages that do not name the business." },
        { question: "Does Text2Sale help with 10DLC?", answer: "Yes. Text2Sale includes guided brand and campaign registration for texting accounts." },
      ]}
      relatedPages={[
        { href: "/10dlc-compliant-texting", label: "10DLC compliant texting" },
        { href: "/quiet-hours-checker", label: "Quiet hours checker" },
        { href: "/insurance-text-templates", label: "Insurance text templates" },
        { href: "/sms-character-counter", label: "SMS character counter" },
      ]}
      ctaTitle="Want help getting registered?"
      ctaBody="Text2Sale walks you through brand and campaign registration and builds the compliance pages carriers look for."
      ctaHref="/10dlc-compliant-texting"
      ctaLabel="See compliant texting"
    >
      <TenDlcChecklist />
    </ToolPage>
  );
}
