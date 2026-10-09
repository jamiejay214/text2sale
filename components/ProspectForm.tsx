"use client";
import { useId, useState, type FormEvent } from "react";
import { captureProspect, FOLLOWUP_NOTICE } from "@/lib/prospect-capture";

export default function ProspectForm() {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await captureProspect({ name: String(form.get("name") || ""), email: String(form.get("email") || ""), phone: String(form.get("phone") || ""), industry: String(form.get("industry") || ""), message: String(form.get("message") || ""), website: String(form.get("website") || ""), followup: form.get("followup") === "on", kind: "inquiry" });
      setSent(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (sent) return <div role="status" className="mt-8 rounded-2xl border border-lime-300/40 bg-emerald-950 p-6"><h3 className="text-xl font-semibold text-lime-200">Your request is saved.</h3><p className="mt-2 text-emerald-100">We can follow up by email. Ready to get started now?</p><button type="button" onClick={() => window.location.assign("/?signup=1#auth-form")} className="mt-4 inline-block font-semibold text-lime-200 underline">Create your Text2Sale account →</button></div>;
  const inputClass = "mt-2 w-full rounded-xl border border-emerald-700 bg-emerald-950 p-3 text-white placeholder:text-emerald-200/60";
  return <form onSubmit={submit} className="mt-8 max-w-2xl rounded-2xl border border-emerald-700 bg-emerald-950/40 p-6">
    <h3 className="text-xl font-semibold">Get details before you join</h3><p className="mt-2 text-sm text-emerald-100">Ask a question or request founding-agent onboarding. No account required.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label htmlFor={`${id}-name`}>Name<input className={inputClass} id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} /></label>
      <label htmlFor={`${id}-email`}>Email<input className={inputClass} id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label htmlFor={`${id}-phone`}>Phone <span className="text-sm text-emerald-200">(optional)</span><input className={inputClass} id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
      <label htmlFor={`${id}-industry`}>Industry<select className={inputClass} id={`${id}-industry`} name="industry"><option value="">Select industry</option>{["Health insurance", "Life insurance", "Real estate", "Solar", "Recruiting", "Other"].map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <label className="mt-4 block" htmlFor={`${id}-message`}>How can we help?<textarea className={inputClass} id={`${id}-message`} name="message" rows={3} maxLength={1500} /></label>
    <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="mt-4 flex gap-3 text-sm leading-6 text-emerald-100"><input className="mt-1 h-5 w-5 shrink-0 accent-lime-300" type="checkbox" name="followup" required />{FOLLOWUP_NOTICE}</label>
    <p className="mt-2 text-xs text-emerald-200">Submitting does not opt you into marketing texts or automated calls. <a href="/privacy-policy" className="underline">Privacy policy</a></p>
    {error && <p role="alert" className="mt-4 text-rose-200">{error}</p>}
    <button disabled={busy} className="mt-5 rounded-xl bg-lime-300 px-6 py-3 font-bold text-emerald-950 disabled:opacity-60">{busy ? "Saving…" : "Send my request"}</button>
  </form>;
}
