"use client";

import type { ReactNode } from "react";

// Shared inputs and result tiles for the free calculators, matching the
// styling of SmsCharacterCounter.

export const inputClass =
  "mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20";

export function ToolCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-emerald-950/30 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Free tool</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  step,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-zinc-200">{label}</label>
      <input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Math.max(Number(event.target.value) || 0, 0))}
        className={inputClass}
      />
    </div>
  );
}

export function ResultGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
          <p className="mt-2 text-xl font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">{children}</div>;
}

export const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const count = (value: number) => Math.round(value).toLocaleString("en-US");

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
