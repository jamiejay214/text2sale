import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingHeader from "@/components/MarketingHeader";
import { NewsletterSignup, ResourceGate } from "@/components/EmailCapture";
import { TEXT_PACK, type TextGroup } from "@/lib/resources";

export const metadata: Metadata = {
  title: "30 Insurance Follow-Up Text Templates (Free Pack) | Text2Sale",
  description:
    "30 ready-to-send follow-up texts for insurance agents: first contact, missed calls, aged leads, quotes, appointment reminders, no-shows, renewals and referrals.",
  alternates: { canonical: "/insurance-follow-up-text-pack" },
};

function Group({ group }: { group: TextGroup }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-2xl font-black text-white">{group.title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{group.when}</p>
      <ol className="mt-5 list-decimal space-y-3 pl-6 leading-7 text-zinc-200 marker:font-bold marker:text-emerald-300">
        {group.texts.map((text) => <li key={text}>{text} Reply STOP to opt out.</li>)}
      </ol>
    </section>
  );
}

export default function Page() {
  const [first, ...rest] = TEXT_PACK;
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <article className="mx-auto max-w-4xl space-y-8 px-6 py-16">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Free resource</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">30 insurance follow-up texts that sound like a person</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Ready-to-send texts for every stage of a lead: first contact, missed calls, aged leads, quotes, appointments and clients. Each one names your agency, asks one easy question and includes opt-out language. Swap in your details where you see {"{first}"}, {"{agent}"}, {"{agency}"}, {"{product}"} and {"{time}"}.
          </p>
        </header>

        <Group group={first} />

        <ResourceGate id="text-pack" resource="30 insurance follow-up texts">
          <div className="space-y-8">
            {rest.map((group) => <Group key={group.title} group={group} />)}
            <p className="leading-7 text-zinc-300">
              Want these personalized? Use the <Link className="text-emerald-300 underline" href="/insurance-text-templates">text template generator</Link>, or load them as a sequence with the <Link className="text-emerald-300 underline" href="/follow-up-cadence-generator">follow-up cadence generator</Link>.
            </p>
          </div>
        </ResourceGate>

        <section className="space-y-3 leading-7 text-zinc-300">
          <h2 className="text-2xl font-black text-white">How to use these texts</h2>
          <p>Only text leads whose consent covers texts from your business, keep messages inside the lead&apos;s local quiet hours, and stop all automation the moment someone opts out. Send to small batches first and watch replies and opt-outs before scaling.</p>
          <p>See also: <Link className="text-emerald-300 underline" href="/how-to-text-aged-leads">how to text aged leads</Link> · <Link className="text-emerald-300 underline" href="/quiet-hours-checker">quiet hours checker</Link> · <Link className="text-emerald-300 underline" href="/aged-lead-reactivation-playbook">aged lead reactivation playbook</Link></p>
        </section>

        <NewsletterSignup />
      </article>
      <MarketingFooter />
    </main>
  );
}
