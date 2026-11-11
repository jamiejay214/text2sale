"use client";

import { useMemo, useState } from "react";
import { analyzeMessage } from "@/components/SmsCharacterCounter";
import { STANDARD_SMS_RATE_PER_SEGMENT, VOLUME_SMS_RATE_PER_SEGMENT } from "@/lib/sms-pricing";

const SAMPLE = "Hi {first_name}, this is Jamie with Sunrise Insurance. You asked about coverage options. Are you still looking? Reply STOP to opt out.";

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SmsCostCalculator() {
  const [message, setMessage] = useState(SAMPLE);
  const [contacts, setContacts] = useState(1000);
  const [steps, setSteps] = useState(3);
  const [rate, setRate] = useState(STANDARD_SMS_RATE_PER_SEGMENT);

  const result = useMemo(() => {
    const analysis = analyzeMessage(message);
    const segments = Math.max(analysis.segments, 1);
    const totalSegments = segments * Math.max(contacts, 0) * Math.max(steps, 0);
    return { ...analysis, segments, totalSegments, cost: totalSegments * rate, perContact: segments * Math.max(steps, 0) * rate };
  }, [message, contacts, steps, rate]);

  const input = "mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20";

  return (
    <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-emerald-950/30 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Free tool</p>
      <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">SMS segment & campaign cost calculator</h2>

      <label htmlFor="sms-cost-message" className="mt-7 block text-sm font-bold text-zinc-200">Your message</label>
      <textarea id="sms-cost-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className={`${input} resize-y leading-7`} />
      <p className="mt-2 text-xs text-zinc-400">Merge fields such as {"{first_name}"} are counted as typed. Leave room for longer names.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="sms-cost-contacts" className="block text-sm font-bold text-zinc-200">Contacts</label>
          <input id="sms-cost-contacts" type="number" min={0} value={contacts} onChange={(event) => setContacts(Number(event.target.value) || 0)} className={input} />
        </div>
        <div>
          <label htmlFor="sms-cost-steps" className="block text-sm font-bold text-zinc-200">Messages per contact</label>
          <input id="sms-cost-steps" type="number" min={0} value={steps} onChange={(event) => setSteps(Number(event.target.value) || 0)} className={input} />
        </div>
        <div>
          <label htmlFor="sms-cost-rate" className="block text-sm font-bold text-zinc-200">Price per segment</label>
          <select id="sms-cost-rate" value={rate} onChange={(event) => setRate(Number(event.target.value))} className={input}>
            <option value={STANDARD_SMS_RATE_PER_SEGMENT}>${STANDARD_SMS_RATE_PER_SEGMENT} (Text2Sale standard)</option>
            <option value={VOLUME_SMS_RATE_PER_SEGMENT}>${VOLUME_SMS_RATE_PER_SEGMENT} (Text2Sale volume)</option>
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        {[
          ["Segments per message", `${result.segments} (${result.encoding})`],
          ["Total segments", result.totalSegments.toLocaleString("en-US")],
          ["Cost per contact", result.perContact.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 })],
          ["Estimated campaign cost", money(result.cost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
        {result.segments > 1
          ? `This message is ${result.segments} segments. Trimming it to one segment would cut the cost of each send to ${money(rate * Math.max(contacts, 0) * Math.max(steps, 0))}.`
          : "This message fits in one segment, the cheapest way to send it."}{" "}
        Estimates cover outbound texts only. Incoming replies are free in Text2Sale; carrier registration fees are separate.
      </div>
    </div>
  );
}
