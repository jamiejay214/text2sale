"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NEWSLETTER_NOTICE, RESOURCE_NOTICE, captureProspect } from "@/lib/prospect-capture";

const field =
  "mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20";

function storageKey(id: string) {
  return `t2s-resource-${id}`;
}

function CaptureForm({
  id,
  kind,
  resource,
  buttonLabel,
  onDone,
}: {
  id: string;
  kind: "resource" | "newsletter";
  resource?: string;
  buttonLabel: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await captureProspect({
        name,
        email,
        kind,
        followup: consent,
        message: resource ? `Requested: ${resource}` : "Newsletter signup",
        website,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-name`} className="block text-sm font-bold text-zinc-200">First name</label>
        <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" required className={field} />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="block text-sm font-bold text-zinc-200">Email</label>
        <input id={`${id}-email`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className={field} />
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
      <label htmlFor={`${id}-consent`} className="flex gap-3 text-sm leading-6 text-zinc-300 sm:col-span-2">
        <input id={`${id}-consent`} type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-400" />
        {kind === "resource" ? RESOURCE_NOTICE : NEWSLETTER_NOTICE}
      </label>
      {error && <p role="alert" className="text-sm font-bold text-rose-300 sm:col-span-2">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-400 px-6 py-3 font-black text-zinc-950 hover:bg-emerald-300 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
        {saving ? "Saving…" : buttonLabel}
      </button>
    </form>
  );
}

// Shows a preview to everyone (and to crawlers) and the rest of a resource
// after the visitor leaves an email. Unlocking is remembered per browser.
export function ResourceGate({ id, resource, children }: { id: string; resource: string; children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(id)) === "1") setTimeout(() => setUnlocked(true), 0);
    } catch {
      // Storage can be blocked; the visitor just sees the form again.
    }
  }, [id]);

  if (unlocked) return <>{children}</>;

  return (
    <section className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white">Get the full {resource}</h2>
      <p className="mt-2 leading-7 text-zinc-300">Free. Enter your name and email and the rest unlocks right here on this page.</p>
      <CaptureForm
        id={id}
        kind="resource"
        resource={resource}
        buttonLabel="Unlock it now"
        onDone={() => {
          try {
            localStorage.setItem(storageKey(id), "1");
          } catch {
            // Ignore; unlock still applies for this visit.
          }
          setUnlocked(true);
        }}
      />
    </section>
  );
}

export function NewsletterSignup() {
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">The Insurance Lead Playbook</p>
      <h2 className="mt-2 text-2xl font-black text-white">One follow-up tactic a week for agents who work leads.</h2>
      <p className="mt-2 leading-7 text-zinc-300">Texting scripts, calling strategy, AI, deliverability and the numbers that matter. Short enough to read between calls.</p>
      {done ? (
        <p role="status" className="mt-5 font-bold text-emerald-300">You&apos;re in. Look for the next issue in your inbox.</p>
      ) : (
        <CaptureForm id="newsletter" kind="newsletter" buttonLabel="Subscribe" onDone={() => setDone(true)} />
      )}
    </section>
  );
}
