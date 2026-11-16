import type { Metadata } from "next";
import HomeClient from "../HomeClient";
import SiteLinks from "@/components/SiteLinks";

export const metadata: Metadata = {
  title: "Med Spa Texting & Booking Software | Text2Sale",
  description:
    "Reply to new med spa inquiries in minutes, book consults, send visit reminders and bring clients back when it's time to rebook. Client texting and AI booking for med spas.",
  alternates: { canonical: "/med-spa" },
};

const FAQ = [
  {
    question: "How does Text2Sale help a med spa?",
    answer:
      "It handles the follow-up your front desk rarely has time for: replying to new inquiries by text, booking consults on your calendar, reminding clients about visits, and texting them when it's time to come back.",
  },
  {
    question: "Can it book appointments on my calendar?",
    answer:
      "Yes. Connect Google Calendar and set your available hours. Interested clients can pick a time by text and the appointment is added to your calendar.",
  },
  {
    question: "Who can I text?",
    answer:
      "Clients and prospects who agreed to receive texts from your spa, for example on your intake or inquiry form. Anyone who replies STOP is removed automatically.",
  },
  {
    question: "Should I put treatment details in texts?",
    answer:
      "No. Keep texts to scheduling, reminders and offers, and leave medical details for the consult or treatment room.",
  },
  {
    question: "Can it answer the phone when we're busy?",
    answer:
      "Yes, on the Dialer and Complete plans. The AI receptionist answers incoming calls when your team can't, takes the caller's details and books a callback.",
  },
  {
    question: "What does it cost?",
    answer:
      "Text2Sale Text is $39.99 per month, Dialer is $89.99 and Complete is $119.99. Texts and calls are paid from a prepaid balance, and Text2Sale covers carrier registration.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

function MedSpaFaq() {
  return (
    <section id="faq" className="border-b border-zinc-800 bg-black py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 style={{ color: "#e8f5eb" }} className="text-3xl font-black tracking-tight md:text-4xl">Questions med spa owners ask</h2>
        <div className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <div key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="text-lg font-bold text-white">{item.question}</h3>
              <p className="mt-3 leading-7 text-zinc-400">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function MedSpaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <HomeClient variant="medspa" faqSection={<MedSpaFaq />} siteLinks={<SiteLinks />} />
    </>
  );
}
