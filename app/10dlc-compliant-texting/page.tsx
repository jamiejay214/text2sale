import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "10DLC Compliant Texting Platform | Text2Sale",
  description:
    "Text2Sale helps sales teams text leads with compliance-focused tools for 10DLC, opt-outs, STOP handling, consent records, quiet hours, and campaign management.",
  alternates: { canonical: "/10dlc-compliant-texting" },
};

export default function TenDlcCompliantTextingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">← Back to Text2Sale</Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">10DLC Compliant Texting</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          10DLC compliant texting tools for serious sales teams.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale helps teams manage SMS outreach with opt-out handling, consent-focused workflows, quiet-hours support, and campaign tools designed for business texting in today&apos;s carrier environment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#auth-form" className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-zinc-950 hover:bg-emerald-300">Start free trial</Link>
          <Link href="/sms-crm-for-insurance-agents" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-emerald-300">Insurance texting CRM</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-black">Compliance tools that protect your texting operation</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["STOP handling", "Automatically track opt-outs so contacts who unsubscribe are not messaged again."],
              ["Consent records", "Keep opt-in and messaging activity connected to contacts and campaigns."],
              ["Quiet hours", "Support better sending practices with time-window controls and responsible campaign behavior."],
              ["Campaign organization", "Separate campaigns, templates, contacts, and conversations for cleaner oversight."],
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
        <h2 className="text-3xl font-black">Why 10DLC matters for business texting</h2>
        <p className="mt-4 text-zinc-300 leading-7">
          Business texting is not the same as casual one-to-one messaging. Carriers expect legitimate senders to use registered and compliant messaging workflows. Text2Sale is designed to help teams manage outreach more responsibly while keeping sales conversations organized.
        </p>
        <div className="mt-8 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <h3 className="text-2xl font-bold">Important note</h3>
          <p className="mt-3 text-zinc-300 leading-7">
            Text2Sale gives teams compliance-focused tools, but every business is responsible for its own messaging practices, consent collection, list quality, and legal obligations.
          </p>
        </div>
      </section>
    </main>
  );
}
