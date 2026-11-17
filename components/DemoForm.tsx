"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DEMO_NOTICE, captureProspect } from "@/lib/prospect-capture";

const field =
  "mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-300/20";
const label = "block text-sm font-bold text-zinc-200";

const TEAM_SIZES = ["Just me", "2-5 people", "6-20 people", "More than 20"];
const INDUSTRIES = ["Health insurance", "Life insurance", "Medicare", "Other insurance", "Real estate", "Mortgage", "Solar", "Roofing or home services", "Recruiting", "Med spa", "Other"];

// Demo requests are saved to the same prospect list the signup form feeds,
// so they show up in the admin pipeline with the team size and notes.
export default function DemoForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState(TEAM_SIZES[0]);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await captureProspect({
        name,
        email,
        phone,
        kind: "inquiry",
        followup: consent,
        demo: true,
        industry,
        message: `Demo request · Team size: ${teamSize}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
        website,
      });
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-3xl border border-violet-400/30 bg-violet-400/10 p-8">
        <h2 className="text-2xl font-black text-white">Request received.</h2>
        <p className="mt-3 leading-7 text-zinc-300">We&apos;ll reach out at the email and phone number you gave us to set a time. In the meantime you can look over the plans or try a free tool.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500">See pricing</Link>
          <Link href="/sms-cost-calculator" className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-100 hover:border-violet-300">SMS cost calculator</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:grid-cols-2 sm:p-8">
      <div>
        <label htmlFor="demo-name" className={label}>Full name</label>
        <input id="demo-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={120} className={field} />
      </div>
      <div>
        <label htmlFor="demo-email" className={label}>Work email</label>
        <input id="demo-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} className={field} />
      </div>
      <div>
        <label htmlFor="demo-phone" className={label}>Phone</label>
        <input id="demo-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required maxLength={20} className={field} />
      </div>
      <div>
        <label htmlFor="demo-team" className={label}>Team size</label>
        <select id="demo-team" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} className={field}>
          {TEAM_SIZES.map((size) => <option key={size}>{size}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="demo-industry" className={label}>What do you sell?</label>
        <select id="demo-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} required className={field}>
          <option value="" disabled>Choose one</option>
          {INDUSTRIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="demo-notes" className={label}>What would you like to see? <span className="font-normal text-zinc-400">(optional)</span></label>
        <textarea id="demo-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1000} className={field} />
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="demo-website">Website</label>
        <input id="demo-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
      <label htmlFor="demo-consent" className="flex gap-3 text-sm leading-6 text-zinc-300 sm:col-span-2">
        <input id="demo-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 h-5 w-5 shrink-0 accent-violet-400" />
        {DEMO_NOTICE}
      </label>
      {error && <p role="alert" className="text-sm font-bold text-rose-300 sm:col-span-2">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-full bg-violet-600 px-6 py-3 font-black text-white hover:bg-violet-500 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
        {saving ? "Sending…" : "Request my demo"}
      </button>
    </form>
  );
}
