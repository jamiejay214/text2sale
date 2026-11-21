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
        dialog.current?.show();
      } catch { /* Keep the page usable when session storage is unavailable. */ }
    }, 6500);
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="welcome-offer-title" className="fixed inset-auto bottom-4 right-4 z-[100] m-0 w-[min(calc(100vw-2rem),20rem)] rounded-2xl border border-violet-200 bg-white p-5 text-sm text-[#1e1b3a] shadow-2xl shadow-violet-900/25">
    <button type="button" aria-label="Close offer" onClick={() => dialog.current?.close()} className="float-right px-1 text-xl leading-none text-[#5f5a7a] hover:text-[#1e1b3a]">×</button>
    <h2 id="welcome-offer-title" className="pr-6 text-xl font-bold leading-tight">{code ? "Your discount code is ready" : "Get 10% off your first month today!"}</h2>
    {code ? <div aria-live="polite"><p className="my-4">Enter <strong className="text-violet-700">{code}</strong> at subscription checkout using the email you just entered. Regular monthly pricing starts in month two.</p><a className="font-semibold text-violet-700 underline" href="/pricing">View plans</a></div> :
    <form className="mt-3 space-y-3" onSubmit={async e => {
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
      <label className="block">Email address<input name="email" required type="email" maxLength={254} autoComplete="email" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white p-2.5 text-[#1e1b3a]"/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-1"/>{MARKETING_NOTICE}</label>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button disabled={busy} className="w-full rounded-full bg-violet-600 p-2.5 font-bold text-white hover:bg-violet-500 disabled:opacity-60">{busy ? "Saving…" : "Get my code"}</button>
    </form>}
  </dialog>;
}
