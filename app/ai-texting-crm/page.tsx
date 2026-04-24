import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Texting CRM That Replies and Books Appointments | Text2Sale",
  description:
    "Text2Sale is an AI texting CRM that can reply to leads, qualify prospects, handle objections, book appointments, and help sales teams manage SMS conversations faster.",
  alternates: { canonical: "/ai-texting-crm" },
};

export default function AiTextingCrmPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">AI Texting CRM</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          AI texting CRM that replies fast, qualifies leads, and books appointments.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale gives your team an AI-powered texting assistant that can respond to inbound messages, ask qualifying questions, handle common objections, and push interested prospects toward a call or appointment. Your team stays in control while AI helps keep every conversation moving.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-cyan-400 px-6 py-3 font-bold text-zinc-950 hover:bg-cyan-300">Start free trial</Link>
          <Link href="/mass-texting-crm" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-cyan-300">Mass texting CRM</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">What the AI can help with</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["Instant replies", "Respond to new inbound texts in seconds so leads do not go cold while your team is busy."],
              ["Lead qualification", "Ask the right questions, gather key details, and identify who is worth calling first."],
              ["Appointment setting", "Move interested leads toward a scheduled call instead of leaving conversations open-ended."],
              ["Objection handling", "Answer common concerns with consistent messaging based on your sales process."],
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
        <h2 className="text-3xl font-black">AI texting built for real sales conversations</h2>
        <p className="mt-4 text-zinc-300 leading-7">
          Most leads do not wait around. If they text back and your team takes too long to respond, the opportunity can disappear. Text2Sale helps keep the conversation alive by giving your team AI replies, smart suggestions, sentiment cues, and a centralized inbox for every lead.
        </p>
        <div className="mt-8 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-6">
          <h3 className="text-2xl font-bold">Best for teams that need speed-to-lead</h3>
          <p className="mt-3 text-zinc-300 leading-7">
            Use AI to respond after campaigns, follow up with missed replies, qualify prospects before a call, and keep appointment-setting conversations moving without hiring another full-time setter.
          </p>
        </div>
      </section>
    </main>
  );
}
