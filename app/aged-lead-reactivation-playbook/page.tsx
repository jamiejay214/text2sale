import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingHeader from "@/components/MarketingHeader";
import { NewsletterSignup, ResourceGate } from "@/components/EmailCapture";
import { REACTIVATION_PLAYBOOK, type PlaybookStep } from "@/lib/resources";

export const metadata: Metadata = {
  title: "Aged Lead Reactivation Playbook for Insurance Agents (Free) | Text2Sale",
  description:
    "A free step-by-step playbook for reactivating aged insurance leads: list cleaning, segmenting, first texts, batch sending, working replies, follow-up, callbacks and a 7-day schedule.",
  alternates: { canonical: "/aged-lead-reactivation-playbook" },
};

function Step({ step }: { step: PlaybookStep }) {
  return (
    <section>
      <h2 className="text-2xl font-black text-white">{step.title}</h2>
      {step.body.map((paragraph) => <p key={paragraph} className="mt-3 leading-8 text-zinc-300">{paragraph}</p>)}
      {step.bullets && (
        <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-zinc-300 marker:text-emerald-400">
          {step.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </section>
  );
}

export default function Page() {
  const preview = REACTIVATION_PLAYBOOK.slice(0, 2);
  const rest = REACTIVATION_PLAYBOOK.slice(2);
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <article className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Free playbook</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">The aged lead reactivation playbook</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            You already paid for your old leads. This playbook walks through how to turn them back into conversations: which leads to text, what to say, how fast to send, how to work the replies and what to track. It ends with a 7-day schedule you can run this week.
          </p>
          <p className="mt-4 text-sm text-zinc-400">In this playbook: {REACTIVATION_PLAYBOOK.map((step) => step.title.replace(/^\d+\.\s*/, "")).join(" · ")}</p>
        </header>

        {preview.map((step) => <Step key={step.title} step={step} />)}

        <ResourceGate id="reactivation-playbook" resource="aged lead reactivation playbook">
          <div className="space-y-10">
            {rest.map((step) => <Step key={step.title} step={step} />)}
            <p className="leading-7 text-zinc-300">
              Run the numbers first with the <Link className="text-emerald-300 underline" href="/lead-reactivation-roi-calculator">lead reactivation ROI calculator</Link>, and grab ready-made messages from the <Link className="text-emerald-300 underline" href="/insurance-follow-up-text-pack">30-text follow-up pack</Link>.
            </p>
          </div>
        </ResourceGate>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-xl font-black">Run this playbook in Text2Sale</h2>
          <p className="mt-2 leading-7 text-zinc-300">Import and segment your list, send in batches, let AI handle replies and book calls, power-dial the yeses and answer callbacks with the AI receptionist.</p>
          <Link href="/reactivate-old-insurance-leads" className="mt-4 inline-block rounded-2xl bg-emerald-400 px-5 py-3 font-black text-zinc-950 hover:bg-emerald-300">See lead reactivation</Link>
        </section>

        <NewsletterSignup />
      </article>
      <MarketingFooter />
    </main>
  );
}
