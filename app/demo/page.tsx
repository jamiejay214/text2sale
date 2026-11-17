import type { Metadata } from "next";
import DemoForm from "@/components/DemoForm";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingHeader from "@/components/MarketingHeader";

export const metadata: Metadata = {
  title: "Book a Demo of Text2Sale | Texting CRM & Dialer",
  description:
    "Request a live walkthrough of Text2Sale. See bulk texting, the two-way inbox, the predictive dialer and the AI receptionist using your own follow-up process.",
  alternates: { canonical: "/demo" },
};

const STEPS = [
  { title: "Tell us how you work", body: "Share what you sell, your team size and where your leads come from, so the walkthrough uses your process instead of a generic script." },
  { title: "See your follow-up built", body: "We upload a sample list, write a first text and a follow-up, and show how replies, callbacks and booked appointments land in one inbox." },
  { title: "Get straight answers", body: "Ask about 10DLC registration, per-text and per-minute costs, and what your first month would realistically cost before you pay anything." },
];

export default function DemoPage() {
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-300">Book a demo</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">See Text2Sale work a lead list like yours.</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            A short walkthrough with a person, not a recorded video. Tell us how you follow up today and we&apos;ll show the same steps in Text2Sale: texting a list, handling replies, dialing callbacks and letting the AI receptionist take incoming calls.
          </p>
          <h2 className="mt-10 text-xl font-bold">What happens on the call</h2>
          <ol className="mt-4 space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 font-black text-white">{index + 1}</span>
                <div>
                  <h3 className="font-bold text-white">{step.title}</h3>
                  <p className="mt-1 leading-7 text-zinc-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <DemoForm />
          <p className="mt-4 text-sm leading-6 text-zinc-500">Prefer email? Write to <a className="font-semibold text-violet-300" href="mailto:support@text2sale.com?subject=Demo%20request">support@text2sale.com</a>.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
