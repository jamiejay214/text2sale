import type { Metadata } from "next";
import ToolPage from "@/components/ToolPage";
import ReactivationRoiCalculator from "@/components/ReactivationRoiCalculator";

export const metadata: Metadata = {
  title: "Lead Reactivation ROI Calculator for Insurance Agents | Text2Sale",
  description:
    "Estimate how many replies, appointments, sales and commission an aged lead list could produce, and the return on your texting spend. Free calculator for insurance and sales teams.",
  alternates: { canonical: "/lead-reactivation-roi-calculator" },
  openGraph: {
    title: "Free Lead Reactivation ROI Calculator",
    description: "See what your aged leads could be worth before you text them.",
    url: "/lead-reactivation-roi-calculator",
    type: "website",
  },
};

export default function Page() {
  return (
    <ToolPage
      path="/lead-reactivation-roi-calculator"
      name="Text2Sale Lead Reactivation ROI Calculator"
      toolDescription="A free calculator that estimates replies, appointments, sales, commission and return on texting spend from reactivating an aged lead list."
      eyebrow="Find the money in old leads"
      title="What is your aged lead list actually worth?"
      intro="Enter the size of your old lead list and your own rates. The calculator walks the funnel from texted leads to replies, appointments and sales, and compares the commission against what the texts cost."
      facts={[
        ["You already paid for these leads", "Aged leads cost nothing extra to keep. A small reply rate on a large list can still produce real appointments."],
        ["Every step multiplies", "Raising your show rate or close rate by a few points changes the outcome as much as finding more leads."],
        ["Start with a test batch", "Text a few hundred leads first, measure your real reply and booking rates, then put those numbers back in here."],
      ]}
      faq={[
        { question: "How do I estimate my reply rate?", answer: "Send a short re-engagement text to a small batch of your aged leads and count the replies over a few days. Use that number here instead of a guess." },
        { question: "Does the ROI include the cost of the leads?", answer: "No. The return compares commission to outbound texting cost only, because the leads were already purchased. Add your software and agent time for a full picture." },
        { question: "Which leads can I text?", answer: "Only contacts whose permission covers texts from your business and who have not opted out. Clean the list before you send." },
        { question: "What message should I send to aged leads?", answer: "A short, honest text that names your business, reminds them of their request and asks one easy question. See our guide to texting aged leads for scripts." },
      ]}
      relatedPages={[
        { href: "/reactivate-old-insurance-leads", label: "Reactivate old insurance leads" },
        { href: "/how-to-text-aged-leads", label: "How to text aged leads" },
        { href: "/insurance-lead-follow-up-software", label: "Insurance lead follow-up software" },
        { href: "/ai-appointment-setter", label: "AI appointment setter" },
        { href: "/sms-cost-calculator", label: "SMS cost calculator" },
      ]}
      ctaTitle="Turn the estimate into booked calls."
      ctaBody="Text2Sale cleans and segments your list, sends the reactivation texts, lets AI handle replies and books interested leads on your calendar."
      ctaHref="/reactivate-old-insurance-leads"
      ctaLabel="See lead reactivation"
    >
      <ReactivationRoiCalculator />
    </ToolPage>
  );
}
