"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MARKETING_NOTICE } from "@/lib/welcome-offer";

export default function WelcomeOffer() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active || error || data.session || document.hidden || location.hash ||
          new URLSearchParams(location.search).has("signup") || document.querySelector("dialog[open],input:focus,textarea:focus")) return;
        dialog.current?.showModal();
      } catch { /* Keep the page usable when session storage is unavailable. */ }
    }, 6500);
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="welcome-offer-title" className="fixed inset-0 m-auto w-[min(92vw,26rem)] rounded-3xl border border-emerald-300/30 bg-zinc-950 p-7 text-white shadow-2xl backdrop:bg-black/65">
    <button type="button" aria-label="Close offer" onClick={() => dialog.current?.close()} className="float-right px-2 text-2xl">×</button>
    <h2 id="welcome-offer-title" className="pr-6 text-3xl font-bold">{code ? "Your discount code is ready" : "Get 10% off your first month today!"}</h2>
    {code ? <div aria-live="polite"><p className="my-4">Enter <strong className="text-lime-300">{code}</strong> at subscription checkout using the email you just entered. Regular monthly pricing starts in month two.</p><a className="underline" href="/pricing">View plans</a></div> :
    <form className="mt-4 space-y-4" onSubmit={async e => {
      e.preventDefault();
      if (busy) return;
      const fields = new FormData(e.currentTarget);
      setBusy(true); setError("");
      try {
        const res = await fetch("/api/welcome-offer", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:fields.get("email"),marketing:fields.has("marketing"),path:location.pathname})});
        if (!res.ok) throw new Error(res.status === 429 ? "Too many requests. Try again in 15 minutes." : "We couldn’t save your email. Please try again.");
        setCode((await res.json()).code);
      } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
      finally { setBusy(false); }
    }}>
      <p>Enter your email to unlock your subscription discount.</p>
      <label className="block">Email address<input name="email" required type="email" maxLength={254} autoComplete="email" className="mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-900 p-3"/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-1"/>{MARKETING_NOTICE}</label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-lime-300 p-3 font-bold text-zinc-950">{busy ? "Saving…" : "Get my code"}</button>
    </form>}
  </dialog>;
}
