"use client";

import React, { useState } from "react";

// ─── USHA onboarding modal ───────────────────────────────────────────────
// Shown once, on the first dashboard visit after signup. We ask the rep a
// single yes/no: "Are you with US Health Advisors?". If they say yes, the
// parent flips `is_usha = true` and pins them to the Standard plan
// (AI features are hidden). Either way, `usha_prompted = true` is flipped
// so we never ask again.
//
// Keeping this in its own component keeps the dashboard render tree clean
// and lets us reuse the same dialog from the verify page if we ever move
// the prompt earlier in the signup flow.

type Props = {
  open: boolean;
  firstName?: string;
  onAnswer: (yes: boolean) => Promise<void>;
  busy?: boolean;
};

export default function UshaWelcomeModal({ open, firstName, onAnswer, busy }: Props) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  if (!open) return null;

  const submit = async (yes: boolean) => {
    setChoice(yes ? "yes" : "no");
    try {
      await onAnswer(yes);
    } catch {
      setChoice(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
        {/* Accent header */}
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

        <div className="p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl shadow-lg">
              👋
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                Welcome to Text2Sale
              </div>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-white">
                {firstName ? `Quick question, ${firstName}` : "Quick question"}
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-zinc-300">
            Are you with <span className="font-semibold text-white">US Health Advisors</span>?
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
            If yes, we&apos;ll set you up on the <span className="font-medium text-zinc-300">Standard plan</span> with the tools
            your team uses — calling, SMS, campaigns, and pipeline. AI auto-reply features
            won&apos;t be enabled on your account.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => submit(true)}
              disabled={busy || choice !== null}
              className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {choice === "yes" ? "Setting you up…" : "Yes, I'm with USHA"}
            </button>
            <button
              onClick={() => submit(false)}
              disabled={busy || choice !== null}
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-base font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {choice === "no" ? "One moment…" : "No, I'm not"}
            </button>
          </div>

          <p className="mt-5 text-center text-[11px] text-zinc-500">
            You can update this anytime from Settings &rarr; Billing.
          </p>
        </div>
      </div>
    </div>
  );
}
