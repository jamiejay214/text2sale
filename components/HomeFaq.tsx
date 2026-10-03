import Link from "next/link";

// Homepage FAQ. The same list feeds the visible section below and the
// FAQPage JSON-LD in app/page.tsx: Google only honours FAQ markup whose
// questions and answers are shown on the page, so the two must never drift.

export type HomeFaqItem = {
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

export const HOME_FAQ: HomeFaqItem[] = [
  {
    question: "What is Text2Sale?",
    answer:
      "Text2Sale is a mass texting CRM for insurance agents, sales teams, and business owners. You upload lead lists, send SMS campaigns, manage two-way conversations in one inbox, and keep opt-in and opt-out records for TCPA and 10DLC compliance.",
    link: { href: "/mass-texting-crm", label: "How the mass texting CRM works" },
  },
  {
    question: "How much does Text2Sale cost?",
    answer:
      "The Standard plan is $39.99 per month and the Text2Sale + AI plan is $119.99 per month. The AI plan includes access to AI texting and the AI calling receptionist. Texts cost $0.012 each, AI replies cost $0.025 each, and AI-assisted calls cost $0.18 per minute from your wallet. Standard calls cost $0.045 per minute outbound and $0.025 per minute inbound. You save 10% when you add $500 or more to your wallet, and there is no long-term contract.",
  },
  {
    question: "Is Text2Sale TCPA compliant?",
    answer:
      "Text2Sale gives you the tools compliant texting depends on: automatic STOP and HELP keyword handling, quiet-hours sending windows, opt-in records, and 10DLC brand and campaign registration. Compliance also depends on how you collect consent, so only text people who have agreed to hear from you.",
    link: { href: "/10dlc-compliant-texting", label: "Read about 10DLC compliant texting" },
  },
  {
    question: "Do I need 10DLC registration to use Text2Sale?",
    answer:
      "Yes. US carriers require 10DLC brand and campaign registration for business texting from local numbers. Text2Sale walks you through registration inside the dashboard. Approval usually takes a few business days and can take longer if carriers ask for changes to your campaign.",
  },
  {
    question: "Can I text leads from my own phone number?",
    answer:
      "Texts go out from local business numbers you buy inside Text2Sale, not from your personal cell. Each number is linked to your registered 10DLC campaign, and replies land in your shared inbox so you can answer from the dashboard.",
  },
  {
    question: "What does the AI plan add?",
    answer:
      "The Text2Sale + AI plan replies to inbound texts, handles common objections, and books appointments that sync to Google Calendar. It also includes an AI calling receptionist that can answer inbound calls, qualify a lead, book the next conversation, and transfer to a person when needed. You can control AI workspace-wide or one conversation at a time.",
    link: { href: "/ai-texting-crm", label: "See the AI texting CRM" },
  },
];

export default function HomeFaq() {
  return (
    <section id="faq" className="border-b border-zinc-800 bg-black py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">Frequently asked questions</h2>
        <div className="mt-8 space-y-4">
          {HOME_FAQ.map((item) => (
            <div key={item.question} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h3 className="text-lg font-bold text-white">{item.question}</h3>
              <p className="mt-3 leading-7 text-zinc-400">{item.answer}</p>
              {item.link && (
                <Link href={item.link.href} className="mt-3 inline-block text-sm font-semibold text-violet-400 hover:text-violet-300">
                  {item.link.label} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
