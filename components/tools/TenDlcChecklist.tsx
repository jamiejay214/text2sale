"use client";

import { useState } from "react";
import { Note, ToolCard } from "@/components/tools/ToolFields";

const GROUPS: { title: string; items: { id: string; label: string; help: string }[] }[] = [
  {
    title: "Brand (your business)",
    items: [
      { id: "legal", label: "Legal business name matches your EIN records exactly", help: "Mismatched names are one of the most common reasons brands are rejected." },
      { id: "ein", label: "You have an EIN, or you are registering as a sole proprietor", help: "Sole proprietor registration has lower limits and stricter rules." },
      { id: "address", label: "Business address and contact details are current", help: "Use the address on file with the IRS or your state." },
      { id: "website", label: "Your website is live and shows the same business name", help: "Reviewers check that the site matches the brand." },
    ],
  },
  {
    title: "Website pages",
    items: [
      { id: "privacy", label: "Privacy policy says mobile numbers and opt-in data are not shared or sold for marketing", help: "This statement is checked during campaign review." },
      { id: "terms", label: "SMS terms list message types, frequency, 'Msg & data rates may apply', and STOP/HELP", help: "Link it from wherever people opt in." },
      { id: "optin-form", label: "Opt-in form or process clearly asks for permission to text", help: "Consent should be specific to your business and not pre-checked." },
    ],
  },
  {
    title: "Campaign (your messages)",
    items: [
      { id: "usecase", label: "You can describe the use case in a sentence or two", help: "For example: follow-up with people who requested insurance quotes." },
      { id: "optin-desc", label: "You can explain exactly how people opt in", help: "Name the form, page or verbal script and include a link or screenshot if possible." },
      { id: "samples", label: "Two or more sample messages that name your business", help: "Samples should match what you will really send." },
      { id: "optout", label: "Samples include opt-out language such as 'Reply STOP to opt out'", help: "At least one sample should show it." },
      { id: "content", label: "No prohibited content (cannabis, debt relief, lead sharing, etc.)", help: "Some categories are banned or need special vetting." },
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, group) => sum + group.items.length, 0);

export default function TenDlcChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const done = Object.values(checked).filter(Boolean).length;
  const missing = GROUPS.flatMap((group) => group.items).filter((item) => !checked[item.id]);

  return (
    <ToolCard title="10DLC readiness checklist">
      <div className="mt-5" aria-live="polite">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-bold text-white">{done} of {TOTAL} ready</span>
          <span className="text-zinc-400">{done === TOTAL ? "Ready to submit" : `${TOTAL - done} to fix before you submit`}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(done / TOTAL) * 100}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <fieldset key={group.title} className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <legend className="px-1 text-sm font-black uppercase tracking-[0.14em] text-emerald-300">{group.title}</legend>
            <div className="space-y-4">
              {group.items.map((item) => (
                <label key={item.id} htmlFor={`tendlc-${item.id}`} className="flex cursor-pointer gap-3">
                  <input
                    id={`tendlc-${item.id}`}
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={(event) => setChecked({ ...checked, [item.id]: event.target.checked })}
                    className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
                  />
                  <span>
                    <span className="block text-sm font-bold leading-5 text-white">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {missing.length > 0 && done > 0 && (
        <Note>
          Still to fix: {missing.map((item) => item.label.split(" ").slice(0, 4).join(" ")).join("; ")}.
        </Note>
      )}
      {done === 0 && <Note>Tick each item you already have in place. Anything left unticked is what to fix before submitting your brand and campaign.</Note>}
    </ToolCard>
  );
}
