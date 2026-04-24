import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mass Texting CRM for Sales Teams | Text2Sale",
  description:
    "Text2Sale is a mass texting CRM for sales teams that need bulk SMS campaigns, 2-way conversations, CSV lead uploads, drip sequences, AI replies, and TCPA/10DLC compliance tools.",
  alternates: { canonical: "/mass-texting-crm" },
};

const faqs = [
  {
    q: "What is a mass texting CRM?",
    a: "A mass texting CRM combines bulk SMS sending, contact management, campaign tracking, replies, opt-outs, and lead follow-up in one dashboard instead of using separate texting and CRM tools.",
  },
  {
    q: "Who is Text2Sale built for?",
    a: "Text2Sale is built for insurance agents, sales teams, recruiters, appointment setters, and small businesses that need to reach leads fast and manage every reply in one place.",
  },
  {
    q: "Can I upload a CSV lead list?",
    a: "Yes. Text2Sale lets you upload contacts by CSV, map common fields, clean phone formatting, and send campaigns to the list from the same workflow.",
  },
];

export default function MassTextingCrmPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Mass Texting CRM</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          Mass texting CRM built to turn lead lists into conversations.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale helps sales teams upload contacts, send bulk SMS campaigns, manage 2-way replies, automate follow-up, and track results from one clean dashboard. It is made for teams that need more appointments, faster speed-to-lead, and better control over every conversation.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-400">Start free trial</Link>
          <Link href="/ai-texting-crm" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-emerald-400">See AI texting CRM</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-14 md:grid-cols-3">
          {[
            ["CSV lead upload", "Import contacts, map fields, remove messy formatting, and prepare campaigns without fighting spreadsheets."],
            ["2-way inbox", "Keep every reply organized so hot leads, objections, follow-ups, and booked appointments do not get lost."],
            ["Campaign tracking", "See texts sent, replies, delivery performance, and campaign activity so you know what is actually working."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-black">Why sales teams use a texting CRM instead of regular SMS tools</h2>
        <p className="mt-4 text-zinc-300 leading-7">
          Basic bulk SMS tools can send messages, but they usually fall short once replies start coming in. A real texting CRM keeps contacts, campaigns, conversations, opt-outs, and performance data connected. That matters when your team is trying to reach thousands of leads without losing the people who actually respond.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            "Send campaigns to segmented lead lists",
            "Use templates and drip sequences for consistent follow-up",
            "Handle STOP opt-outs and compliance workflows",
            "Give teams one place to manage all conversations",
            "Use AI replies and smart suggestions to book more appointments",
            "Track wallet usage, credits, and messaging costs",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-zinc-800 p-4 text-zinc-200">✓ {item}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-black">Mass texting CRM FAQs</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="font-bold text-white">{faq.q}</h3>
              <p className="mt-2 text-zinc-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
