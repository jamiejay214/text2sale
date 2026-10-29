import type { Metadata } from "next";
import Link from "next/link";
import MarketingFooter from "@/components/MarketingFooter";
import { SITE_URL } from "@/lib/site-pages";

export const metadata: Metadata = {
  title: "About Text2Sale | AI Lead Follow-Up CRM",
  description:
    "Learn what Text2Sale does, who it is built for, and how its texting, dialer, AI receptionist, lead reactivation, and appointment booking tools fit together.",
  alternates: { canonical: "/about" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Text2Sale",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: ["https://www.instagram.com/text2saleofficialcrm/"],
  description:
    "Text2Sale is an AI lead follow-up CRM with SMS campaigns, two-way texting, manual, power and predictive dialing, AI receptionist tools, and appointment booking.",
};

export default function AboutPage() {
  return (
    <main className="public-theme min-h-screen bg-zinc-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          ← Back to Text2Sale
        </Link>
        <p className="mt-10 text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">About Text2Sale</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-6xl">
          Built to turn lead follow-up into booked conversations.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Text2Sale is a web-based sales CRM built for teams that need to reach leads quickly, keep every conversation organized, and move interested prospects toward a call or appointment.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            ["AI lead follow-up", "Use AI to respond to inbound texts, ask qualifying questions, and help move interested leads toward an appointment."],
            ["Texting CRM", "Upload contacts, run SMS campaigns and drip sequences, manage replies, and keep opt-outs connected to the contact record."],
            ["Built-in dialer", "Use manual, power, and predictive dialing with dispositions, callbacks, transfers, and contact history in the same workspace."],
            ["AI receptionist", "Answer inbound calls, collect basic intake information, schedule calls, and route opportunities to a live team member."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>

        <article className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-3xl font-black">Who Text2Sale is built for</h2>
          <p className="mt-5 leading-8 text-zinc-300">
            Text2Sale is designed for insurance agents, appointment setters, recruiters, real estate teams, solar teams, roofing companies, and other sales organizations that work lead lists and depend on fast follow-up.
          </p>
          <p className="mt-5 leading-8 text-zinc-300">
            The platform is especially focused on the gap between acquiring a lead and getting that person into a real conversation. Instead of separating texting, calling, contact history, AI replies, and scheduling across different tools, Text2Sale brings those workflows together.
          </p>

          <h2 className="mt-12 text-3xl font-black">Product facts</h2>
          <ul className="mt-5 list-disc space-y-3 pl-6 leading-7 text-zinc-300 marker:text-emerald-400">
            <li>Web-based CRM at text2sale.com</li>
            <li>Mass SMS campaigns and two-way messaging</li>
            <li>Manual, power, and predictive dialing</li>
            <li>AI text replies and lead qualification</li>
            <li>AI receptionist for inbound calls</li>
            <li>Appointment booking with Google Calendar workflows</li>
            <li>10DLC registration and messaging compliance tools</li>
            <li>Support: support@text2sale.com</li>
          </ul>
        </article>
      </section>
      <MarketingFooter />
    </main>
  );
}
