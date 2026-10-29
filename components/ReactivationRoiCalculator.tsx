"use client";

import { useMemo, useState } from "react";
import { STANDARD_SMS_RATE_PER_SEGMENT } from "@/lib/sms-pricing";

type Field = { id: string; label: string; suffix?: string; prefix?: string };

const FIELDS: Field[] = [
  { id: "leads", label: "Aged leads in your list" },
  { id: "contactable", label: "Contactable after cleanup", suffix: "%" },
  { id: "replyRate", label: "Reply rate", suffix: "%" },
  { id: "apptRate", label: "Replies that book a call", suffix: "%" },
  { id: "showRate", label: "Appointments that show", suffix: "%" },
  { id: "closeRate", label: "Shown appointments that buy", suffix: "%" },
  { id: "commission", label: "Average commission per sale", prefix: "$" },
  { id: "textsPerLead", label: "Texts sent per lead" },
];

// Example starting values only; visitors replace them with their own numbers.
const DEFAULTS: Record<string, number> = {
  leads: 5000,
  contactable: 80,
  replyRate: 6,
  apptRate: 25,
  showRate: 65,
  closeRate: 30,
  commission: 400,
  textsPerLead: 3,
};

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const count = (value: number) => Math.round(value).toLocaleString("en-US");

export default function ReactivationRoiCalculator() {
  const [values, setValues] = useState(DEFAULTS);

  const result = useMemo(() => {
    const pct = (key: string) => Math.max(values[key], 0) / 100;
    const contacted = Math.max(values.leads, 0) * pct("contactable");
    const replies = contacted * pct("replyRate");
    const appointments = replies * pct("apptRate");
    const shown = appointments * pct("showRate");
    const sales = shown * pct("closeRate");
    const revenue = sales * Math.max(values.commission, 0);
    const textCost = contacted * Math.max(values.textsPerLead, 0) * STANDARD_SMS_RATE_PER_SEGMENT;
    return { contacted, replies, appointments, sales, revenue, textCost, roi: textCost > 0 ? revenue / textCost : 0 };
  }, [values]);

  const input = "mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20";

  return (
    <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-emerald-950/30 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Free tool</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Lead reactivation ROI calculator</h2>
        </div>
        <button type="button" onClick={() => setValues(DEFAULTS)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-200">
          Reset example
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-400">The starting numbers are examples. Replace them with your own list size, rates and commission.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((field) => (
          <div key={field.id}>
            <label htmlFor={`roi-${field.id}`} className="block text-sm font-bold text-zinc-200">
              {field.label}{field.suffix ? ` (${field.suffix})` : field.prefix ? ` (${field.prefix})` : ""}
            </label>
            <input
              id={`roi-${field.id}`}
              type="number"
              min={0}
              value={values[field.id]}
              onChange={(event) => setValues({ ...values, [field.id]: Number(event.target.value) || 0 })}
              className={input}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {[
          ["Leads texted", count(result.contacted)],
          ["Replies", count(result.replies)],
          ["Appointments booked", count(result.appointments)],
          ["Policies sold", result.sales.toFixed(1)],
          ["Commission revenue", money(result.revenue)],
          ["Texting cost", money(result.textCost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Return on texting spend</p>
        <p className="mt-2 text-3xl font-black text-white">{result.roi > 0 ? `${result.roi.toFixed(1)}x` : "—"}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Revenue divided by outbound texting cost at ${STANDARD_SMS_RATE_PER_SEGMENT} per one-segment text. It does not include your software plan, agent time or what you originally paid for the leads.
        </p>
      </div>
    </div>
  );
}
