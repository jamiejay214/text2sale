"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCE_NOTICE, captureProspect } from "@/lib/prospect-capture";

// One-time exit-intent offer: catch a visitor who's leaving the marketing site
// and trade a free resource for their email, so a non-buyer still becomes a
// lead. Shows at most once per visitor per 30 days, never on app pages.

const SEEN_KEY = "t2s-exit-offer-v1";
const SEEN_DAYS = 30;
const PLAYBOOK_URL = "/aged-lead-reactivation-playbook";
const field =
  "mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20";

function recentlySeen(): boolean {
  try {
    const at = Number(localStorage.getItem(SEEN_KEY) || 0);
    return at > 0 && Date.now() - at < SEEN_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* private mode — worst case it shows again next visit */
  }
}

export default function ExitIntentOffer() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const armed = useRef(false);

  // Never on the app itself, only public marketing pages.
  const suppressed = /^\/(dashboard|command|admin|biz|api)(\/|$)/.test(pathname);

  useEffect(() => {
    if (suppressed || recentlySeen()) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("signup") || url.searchParams.get("login")) return;

    const show = () => {
      if (armed.current) return;
      armed.current = true;
      markSeen();
      setOpen(true);
    };

    // Desktop: the cursor leaving the top of the viewport = heading for the
    // tab bar / back button. Mobile: a long dwell without converting.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) show();
    };
    const timer = window.setTimeout(show, 45_000);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.clearTimeout(timer);
    };
  }, [suppressed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-offer-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-emerald-400/30 bg-[#0f1f1a] p-7 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        {done ? (
          <div className="text-center">
            <p className="text-emerald-300 text-sm font-bold uppercase tracking-widest">You&apos;re in</p>
            <h2 className="mt-2 text-2xl font-black">Check your inbox 📬</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              The Insurance Lead Playbook is on its way. Want it right now?
            </p>
            <Link
              href={PLAYBOOK_URL}
              className="mt-5 inline-block rounded-xl bg-emerald-300 px-6 py-3 font-black text-emerald-950 hover:bg-emerald-200"
            >
              Read the playbook now
            </Link>
          </div>
        ) : (
          <>
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Before you go —</p>
            <h2 id="exit-offer-title" className="mt-2 text-2xl font-black leading-tight">
              Start dialing in minutes — 7 days free
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Try Text2Sale Dialer free for 7 days. No texting registration to wait on — upload your leads and start calling today.
            </p>
            <Link
              href="/?signup=1&plan=dialer&trial=1#auth-form"
              className="mt-5 block rounded-xl bg-emerald-300 px-6 py-3 text-center font-black text-emerald-950 hover:bg-emerald-200"
            >
              Start my 7-day free trial
            </Link>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              Add a card to start. You only pay for your calls, number and usage. Cancel anytime before day 7 and the plan is never charged.
            </p>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-zinc-600">
              <span className="h-px flex-1 bg-zinc-700" /> or <span className="h-px flex-1 bg-zinc-700" />
            </div>
            <p className="text-sm font-bold text-zinc-200">Not ready? Grab the free Insurance Lead Playbook</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              50 text scripts that get cold and aged leads to reply.
            </p>
            <Form onDone={() => setDone(true)} />
          </>
        )}
      </div>
    </div>
  );
}

function Form({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await captureProspect({
        name,
        email,
        kind: "resource",
        followup: consent,
        message: "Exit-intent: Insurance Lead Playbook",
        website,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="exit-name" className="text-xs font-bold text-zinc-300">First name</label>
          <input id="exit-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required className={field} />
        </div>
        <div>
          <label htmlFor="exit-email" className="text-xs font-bold text-zinc-300">Email</label>
          <input id="exit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={field} />
        </div>
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="exit-website">Website</label>
        <input id="exit-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label htmlFor="exit-consent" className="flex gap-2 text-[12px] leading-5 text-zinc-400">
        <input id="exit-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400" />
        {RESOURCE_NOTICE}
      </label>
      {error && <p className="text-sm text-amber-300">{error}</p>}
      <button
        type="submit"
        disabled={saving || !consent}
        className="w-full rounded-xl bg-emerald-300 px-5 py-3 font-black text-emerald-950 hover:bg-emerald-200 disabled:opacity-50"
      >
        {saving ? "Sending…" : "Send me the playbook"}
      </button>
      <p className="text-center text-[11px] text-zinc-500">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
