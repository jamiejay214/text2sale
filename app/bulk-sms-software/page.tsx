import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bulk SMS Software for Sales Follow-Up | Text2Sale",
  description:
    "Text2Sale bulk SMS software helps sales teams upload CSV contacts, send campaigns, manage replies, track performance, and follow up with leads from one dashboard.",
  alternates: { canonical: "/bulk-sms-software" },
};

export default function BulkSmsSoftwarePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-fuchsia-300">Bulk SMS Software</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          Bulk SMS software for teams that need replies, not just sends.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale lets your team upload contacts, launch bulk SMS campaigns, manage every response, and track performance without using separate tools for texting, CRM, and reporting.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-fuchsia-400 px-6 py-3 font-bold text-zinc-950 hover:bg-fuchsia-300">Start free trial</Link>
          <Link href="/mass-texting-crm" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-fuchsia-300">Compare CRM features</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Bulk texting with a real sales workflow</h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Sending a large batch of texts is only step one. The money is in managing the replies, following up, identifying hot prospects, and keeping opt-outs clean. Text2Sale connects the whole workflow.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["Upload CSV contacts", "Bring in lead lists, map fields, and organize campaigns without manual copy-and-paste work."],
              ["Send targeted campaigns", "Use SMS templates and campaigns to reach the right contacts with the right message."],
              ["Manage replies", "Keep inbound messages organized so your team can respond quickly and book more calls."],
              ["Track usage and results", "See campaign activity, credit usage, replies, and performance from your dashboard."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-black">Bulk SMS software vs. a texting CRM</h2>
        <p className="mt-4 text-zinc-300 leading-7">
          Basic bulk SMS software is built around sending. Text2Sale is built around selling. That means your team can send campaigns, manage conversations, use AI assistance, track opt-outs, and move leads into appointments without losing context.
        </p>
      </section>
    </main>
  );
}
