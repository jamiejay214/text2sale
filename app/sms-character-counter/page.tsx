import type { Metadata } from "next";
import Link from "next/link";
import SmsCharacterCounter from "@/components/SmsCharacterCounter";

export const metadata: Metadata = {
  title: "Free SMS Character & Segment Counter | Text2Sale",
  description:
    "Count SMS characters and message segments instantly. See whether a text uses GSM-7 or Unicode before you launch a campaign.",
  alternates: { canonical: "/sms-character-counter" },
  openGraph: {
    title: "Free SMS Character & Segment Counter",
    description: "Check message length, encoding, and SMS segment count before you send.",
    url: "/sms-character-counter",
    type: "website",
  },
};

const faq = [
  {
    question: "How many characters fit in one SMS?",
    answer:
      "A single GSM-7 SMS can contain up to 160 units. A single Unicode message generally holds 70 characters. Multipart messages use smaller per-segment limits because they include joining information.",
  },
  {
    question: "Why did one emoji increase my SMS segment count?",
    answer:
      "An emoji changes the message from GSM-7 to Unicode encoding. Unicode supports a much wider character set but has a lower character limit per SMS segment.",
  },
  {
    question: "Do special characters always count as one character?",
    answer:
      "No. Several GSM-7 extension characters use two units, while characters outside GSM-7 can switch the entire message to Unicode. This counter checks both conditions.",
  },
];

export default function SmsCharacterCounterPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Text2Sale SMS Character & Segment Counter",
        url: "https://text2sale.com/sms-character-counter",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "A free browser-based tool for checking SMS character count, encoding, and message segments.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#060806] text-zinc-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <nav className="flex items-center justify-between gap-4" aria-label="Primary navigation">
          <Link href="/" className="text-xl font-black tracking-tight text-white">
            text<span className="text-emerald-300">2</span>sale.
          </Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <Link href="/blog" className="text-zinc-300 hover:text-emerald-200">Blog</Link>
            <Link href="/#auth-form" className="rounded-xl bg-emerald-300 px-4 py-2 text-zinc-950 hover:bg-emerald-200">Start free</Link>
          </div>
        </nav>

        <header className="mx-auto max-w-4xl py-16 text-center sm:py-24">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Write smarter campaign messages</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Know how many SMS segments you will send before you launch.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Paste a message to check its character count, GSM-7 or Unicode encoding, and total SMS segments. Nothing you type is uploaded or saved.
          </p>
        </header>

        <SmsCharacterCounter />

        <section className="mx-auto grid max-w-5xl gap-6 py-20 md:grid-cols-3">
          {[
            ["160 vs. 70", "GSM-7 supports up to 160 units in one SMS. Unicode messages generally support 70 characters in one segment."],
            ["Multipart messages", "Long messages are split and reassembled on the recipient's phone. Joined segments use 153 GSM-7 units or 67 Unicode characters each."],
            ["Content still matters", "A short message should still identify the sender, explain its context, and include required opt-out language when applicable."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 leading-7 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-4xl border-t border-zinc-800 py-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Frequently asked questions</p>
          <div className="mt-7 space-y-4">
            {faq.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <summary className="cursor-pointer list-none font-bold text-white">{item.question}</summary>
                <p className="mt-3 leading-7 text-zinc-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-black text-white">Build the full campaign in Text2Sale.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-200">
            Import leads, map fields, add multi-step follow-up, manage replies, call prospects, and book appointments from one workspace.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/#auth-form" className="rounded-xl bg-emerald-300 px-6 py-3 font-black text-zinc-950 hover:bg-emerald-200">Start free</Link>
            <Link href="/bulk-sms-software" className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-emerald-300">Explore bulk SMS</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
