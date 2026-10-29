import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";

export const metadata: Metadata = {
  title: "Text2Sale Product Facts & Media Information",
  description:
    "Verified product facts, descriptions, categories, features, pricing links, and contact information for Text2Sale directory editors, reviewers, and media.",
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Product facts</p>
        <h1 className="mt-4 text-5xl font-black tracking-tight">Text2Sale media & directory information</h1>
        <p className="mt-6 text-lg leading-8 text-zinc-300">
          This page provides concise, current information for software directories, reviewers, journalists, and partners describing Text2Sale.
        </p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-2xl font-bold">One-line description</h2>
            <p className="mt-3 leading-7 text-zinc-300">AI lead follow-up CRM with texting, dialing, AI receptionist, and appointment booking.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Short description</h2>
            <p className="mt-3 leading-7 text-zinc-300">
              Text2Sale helps insurance agents and sales teams reactivate leads, run SMS campaigns, manage two-way conversations, call through lead lists, use AI to qualify replies, and book appointments from one CRM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Primary categories</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-zinc-300 marker:text-emerald-400">
              <li>CRM software</li>
              <li>Sales engagement software</li>
              <li>SMS marketing software</li>
              <li>Predictive and power dialer software</li>
              <li>AI appointment scheduling</li>
              <li>AI receptionist / conversational AI</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Core features</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-zinc-300">
              {[
                "Mass SMS campaigns",
                "Two-way messaging inbox",
                "AI text replies",
                "AI lead qualification",
                "Appointment booking",
                "Google Calendar workflows",
                "Manual dialing",
                "Power dialing",
                "Predictive dialing",
                "AI receptionist",
                "CSV contact import",
                "Drip sequences",
                "STOP suppression",
                "10DLC workflow tools",
              ].map((feature) => <li key={feature}>✓ {feature}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Useful links</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                ["/", "Homepage"],
                ["/pricing", "Pricing"],
                ["/about", "About"],
                ["/ai-appointment-setter", "AI appointment setter"],
                ["/predictive-dialer-for-insurance-agents", "Predictive dialer"],
                ["/ai-receptionist-for-insurance-agents", "AI receptionist"],
                ["/blog", "Guides"],
              ].map(([href,label]) => (
                <Link key={href} href={href} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-300 hover:text-emerald-300">
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <h2 className="text-2xl font-bold">Verification & contact</h2>
            <p className="mt-3 leading-7 text-zinc-300">
              Official website: text2sale.com<br />
              Support and listing verification: <a className="text-emerald-300" href="mailto:support@text2sale.com">support@text2sale.com</a>
            </p>
          </section>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
