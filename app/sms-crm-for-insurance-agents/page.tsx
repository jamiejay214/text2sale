import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS CRM for Insurance Agents | Text2Sale",
  description:
    "Text2Sale is an SMS CRM for insurance agents that need bulk texting, lead follow-up, AI replies, 2-way conversations, CSV uploads, and compliance tools.",
  alternates: { canonical: "/sms-crm-for-insurance-agents" },
};

export default function SmsCrmForInsuranceAgentsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-amber-300 hover:text-amber-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Insurance Agent SMS CRM</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          SMS CRM for insurance agents who live off speed, follow-up, and booked calls.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale helps health, life, final expense, Medicare, and agency sales teams text leads faster, manage replies in one inbox, automate follow-up, and use AI to push interested prospects toward a quote call.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-amber-400 px-6 py-3 font-bold text-zinc-950 hover:bg-amber-300">Start free trial</Link>
          <Link href="/ai-texting-crm" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-amber-300">See AI texting</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Built for insurance lead follow-up</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["Work internet leads faster", "Upload lead lists and start conversations before the prospect forgets they requested information."],
              ["Handle inbound replies", "Keep every reply, question, objection, and call request organized in a single team inbox."],
              ["Use scripts and templates", "Give agents approved message templates for quote follow-up, appointment reminders, and missed-call recovery."],
              ["Let AI help qualify", "AI can ask basic qualifying questions and move interested prospects toward a phone call."],
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
        <h2 className="text-3xl font-black">Why insurance agents need texting built into the CRM</h2>
        <p className="mt-4 text-zinc-300 leading-7">
          Insurance sales is a follow-up game. Calls matter, but many prospects answer texts faster than phone calls. Text2Sale helps agents turn aged leads, new inquiries, referral lists, and reactivation campaigns into live conversations without bouncing between spreadsheets, phones, and disconnected texting apps.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Health insurance", "Life insurance", "Final expense", "Medicare", "Recruiting", "Agency sales teams"].map((item) => (
            <div key={item} className="rounded-2xl border border-zinc-800 p-4 text-zinc-200">{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
