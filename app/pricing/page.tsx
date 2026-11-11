import type { Metadata } from "next";
import Link from "next/link";
import { COMPLETE_SAVINGS, PLAN_KEYS, PLANS, REGISTRATION_FEES, USAGE_RATES } from "@/lib/plans";
import { VOLUME_SMS_UNLOCK_AMOUNT } from "@/lib/sms-pricing";

// Every number on this page comes from lib/plans.ts (the same constants checkout
// and billing charge with), so the page can never drift from the real price.

const money = (n: number) => `$${n.toFixed(2)}`;
const rate = (n: number) => `$${n}`;

export const metadata: Metadata = {
  title: "Text2Sale Pricing: Texting CRM & Dialer Plans",
  description: `Text2Sale plans: Text ${money(PLANS.text.price)}/mo, Dialer ${money(PLANS.dialer.price)}/mo, Complete ${money(PLANS.complete.price)}/mo per user. Texts from ${rate(USAGE_RATES.smsPerSegment)} per segment, pay-as-you-go wallet, no free trial.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Text2Sale Pricing",
    description: "Plans for texting, dialing, or both, plus pay-as-you-go usage from a prepaid wallet.",
    url: "/pricing",
    type: "website",
  },
};

// Worked examples use the standard rates above; they are illustrations, not quotes.
const examples = [
  {
    label: "1,000 one-segment texts",
    detail: `1,000 × ${rate(USAGE_RATES.smsPerSegment)}`,
    total: 1000 * USAGE_RATES.smsPerSegment,
  },
  {
    label: "1,000 AI replies (including the reply texts)",
    detail: `1,000 × (${rate(USAGE_RATES.aiReplyFee)} AI fee + ${rate(USAGE_RATES.smsPerSegment)} reply text)`,
    total: 1000 * (USAGE_RATES.aiReplyFee + USAGE_RATES.smsPerSegment),
  },
  {
    label: "500 minutes of outbound calling",
    detail: `500 × ${rate(USAGE_RATES.outboundCallPerMin)}/min`,
    total: 500 * USAGE_RATES.outboundCallPerMin,
  },
];

const faq = [
  {
    question: "Is there a free trial?",
    answer: "No. Payment is taken right after you create your account. You choose Text, Dialer, or Complete during signup.",
  },
  {
    question: "What does the monthly plan include, and what costs extra?",
    answer:
      "The plan pays for software access per user. Usage (texts, calls, AI replies, AI receptionist minutes) is paid from a prepaid wallet at the rates on this page. Phone numbers and carrier texting registration (10DLC) are separate pass-through charges.",
  },
  {
    question: "How are calls billed?",
    answer: `Per started minute, rounded up: outbound ${rate(USAGE_RATES.outboundCallPerMin)}/min, inbound ${rate(USAGE_RATES.inboundCallPerMin)}/min, forwarded ${rate(USAGE_RATES.forwardedCallPerMin)}/min. A dialer call moved to a cell phone keeps two outbound legs open, so it bills ${rate(USAGE_RATES.transferredToCellPerMin)}/min.`,
  },
  {
    question: "Can I get a lower texting rate?",
    answer: `Yes. A wallet purchase of $${VOLUME_SMS_UNLOCK_AMOUNT} or more unlocks ${rate(USAGE_RATES.smsVolumePerSegment)} per outbound SMS segment instead of ${rate(USAGE_RATES.smsPerSegment)}. Inbound texts are free.`,
  },
  {
    question: "Do I pay texting registration fees on the Dialer plan?",
    answer: "No. Carrier registration (10DLC) is only needed for texting, so Dialer-only accounts don't pay it.",
  },
  {
    question: "Is anything unlimited?",
    answer: "No. Every text, minute and AI action is metered at the published rate, and taxes may apply.",
  },
];

export default function PricingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Text2Sale",
        url: "https://text2sale.com/pricing",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: PLAN_KEYS.map((key) => ({
          "@type": "Offer",
          name: PLANS[key].name,
          price: PLANS[key].price.toFixed(2),
          priceCurrency: "USD",
          url: `https://text2sale.com/?signup=1&plan=${key}#auth-form`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: PLANS[key].price.toFixed(2),
            priceCurrency: "USD",
            unitText: "MONTH",
            referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
          },
        })),
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

  const usageRows: [string, string][] = [
    ["Outbound text (per SMS segment)", `${rate(USAGE_RATES.smsPerSegment)} · ${rate(USAGE_RATES.smsVolumePerSegment)} after a $${VOLUME_SMS_UNLOCK_AMOUNT}+ wallet purchase`],
    ["Inbound text", "Free"],
    ["AI text reply", `${rate(USAGE_RATES.aiReplyFee)} + the reply's SMS cost`],
    ["Outbound call", `${rate(USAGE_RATES.outboundCallPerMin)}/min`],
    ["Inbound call", `${rate(USAGE_RATES.inboundCallPerMin)}/min`],
    ["Forwarded call", `${rate(USAGE_RATES.forwardedCallPerMin)}/min`],
    ["Call transferred to a cell", `${rate(USAGE_RATES.transferredToCellPerMin)}/min`],
    ["AI receptionist", `${rate(USAGE_RATES.aiReceptionistPerMin)}/min`],
    ["Local phone number", `${money(USAGE_RATES.localNumberMonthly)}/month each`],
  ];

  const registrationRows: [string, string][] = [
    ["Brand registration (one time)", money(REGISTRATION_FEES.brand)],
    ["Campaign review (one time)", money(REGISTRATION_FEES.campaignReview)],
    ["Low-volume campaign", `${money(REGISTRATION_FEES.lowVolumeCampaignMonthly)}/month`],
    ["Standard campaign", `${money(REGISTRATION_FEES.standardCampaignMonthly)}/month`],
  ];

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
            <Link href="/?signup=1#auth-form" className="rounded-xl bg-emerald-300 px-4 py-2 text-zinc-950 hover:bg-emerald-200">Get started</Link>
          </div>
        </nav>

        <header className="mx-auto max-w-4xl py-16 text-center sm:py-20">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Pricing</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Pay for the tools you use, then only for what you send.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Pick texting, dialing, or both. Usage comes out of a prepaid wallet at the rates below. No free trial, and nothing is unlimited.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3" aria-label="Plans">
          {PLAN_KEYS.map((key) => {
            const plan = PLANS[key];
            const featured = key === "complete";
            return (
              <article
                key={key}
                className={`flex flex-col rounded-3xl border p-7 ${featured ? "border-emerald-300/60 bg-emerald-300/10" : "border-zinc-800 bg-zinc-900/60"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-white">{plan.name}</h2>
                  {featured && (
                    <span className="rounded-full bg-lime-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                      Save {money(COMPLETE_SAVINGS)}/mo
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{plan.tagline}</p>
                <p className="mt-6 text-4xl font-black text-white">
                  {money(plan.price)}
                  <span className="text-base font-bold text-zinc-400"> /user/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm leading-6 text-zinc-200">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-2"><span className="text-emerald-300" aria-hidden>✓</span>{item}</li>
                  ))}
                  {plan.excludes.map((item) => (
                    <li key={item} className="flex gap-2 text-zinc-500"><span aria-hidden>–</span>Not included: {item}</li>
                  ))}
                </ul>
                <Link
                  href={`/?signup=1&plan=${key}#auth-form`}
                  className={`mt-7 rounded-xl px-5 py-3 text-center font-black ${featured ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200" : "border border-zinc-600 text-white hover:border-emerald-300"}`}
                >
                  Start with {plan.name.replace("Text2Sale ", "")}
                </Link>
              </article>
            );
          })}
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">Usage rates</h2>
            <p className="mt-2 text-sm text-zinc-400">Paid from your prepaid wallet. Calls bill per started minute.</p>
            <dl className="mt-5 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/60">
              {usageRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-zinc-300">{k}</dt>
                  <dd className="text-right font-bold text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Texting registration (10DLC)</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Carrier pass-through fees for texting accounts. {`Campaign fees are billed ${REGISTRATION_FEES.upfrontCampaignMonths} months up front at registration.`} Dialer-only accounts don&apos;t pay these.
            </p>
            <dl className="mt-5 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/60">
              {registrationRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-zinc-300">{k}</dt>
                  <dd className="text-right font-bold text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-10 text-2xl font-black text-white">What usage can cost</h2>
            <p className="mt-2 text-sm text-zinc-400">Examples at standard rates, on top of your plan. Illustrations, not quotes.</p>
            <ul className="mt-5 space-y-3">
              {examples.map((ex) => (
                <li key={ex.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-bold text-white">{ex.label}</span>
                    <span className="font-black text-emerald-300">{money(ex.total)}</span>
                  </div>
                  <p className="mt-1 text-zinc-400">{ex.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-400">
              Long or emoji-heavy messages use more segments.{" "}
              <Link href="/sms-character-counter" className="font-bold text-emerald-300 hover:text-emerald-200">Check a message with the SMS counter</Link>.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl border-t border-zinc-800 py-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Pricing questions</p>
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
          <h2 className="text-3xl font-black text-white">Ready to work your leads?</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-200">
            Import opted-in leads, run follow-up campaigns, call, and book appointments from one workspace.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/?signup=1&plan=complete#auth-form" className="rounded-xl bg-emerald-300 px-6 py-3 font-black text-zinc-950 hover:bg-emerald-200">Get started</Link>
            <Link href="/sales-team-texting-crm" className="rounded-xl border border-zinc-600 px-6 py-3 font-black text-white hover:border-emerald-300">For sales teams &amp; businesses</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
