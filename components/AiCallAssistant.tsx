"use client";

// ── AI call assistant settings ───────────────────────────────────────────
// Self-contained panel: owns its own fetch, state, and saves against
// /api/ai-call. It is mounted from the dashboard's AI settings tab with a
// single line, deliberately, so none of this lives in that 15k-line file.

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type Settings = {
  enabled: boolean;
  greeting: string | null;
  instructions: string | null;
  voice: string;
  transferNumber: string | null;
  afterHoursOnly: boolean;
  maxMinutes: number;
};

type Session = {
  id: string;
  from_number: string | null;
  state: string;
  outcome: string | null;
  summary: string | null;
  collected: Record<string, unknown> | null;
  turn_count: number;
  charged_amount: number | string;
  appointment_id: string | null;
  started_at: string;
  ended_at: string | null;
};

type Voice = { id: string; label: string };

type Payload = {
  available: boolean;
  reason?: string;
  message?: string;
  settings?: Settings;
  voices?: Voice[];
  pricing?: { perMinute: number; upfrontReserve: number };
  sessions?: Session[];
};

const OUTCOME_LABEL: Record<string, string> = {
  booked: "Appointment booked",
  message_taken: "Message taken",
  transferred: "Transferred to you",
  declined: "Caller declined",
  abandoned: "Caller hung up",
};

const OUTCOME_TONE: Record<string, string> = {
  booked: "bg-emerald-900/40 text-emerald-300",
  message_taken: "bg-cyan-900/40 text-cyan-300",
  transferred: "bg-violet-900/40 text-violet-300",
  declined: "bg-zinc-800 text-zinc-400",
  abandoned: "bg-zinc-800 text-zinc-400",
};

function prettyPhone(e164: string | null): string {
  if (!e164) return "Unknown";
  const d = e164.replace(/\D/g, "").replace(/^1/, "");
  if (d.length !== 10) return e164;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function durationOf(s: Session): string {
  if (!s.ended_at) return "in progress";
  const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

export default function AiCallAssistant() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/ai-call");
      const json: Payload = await res.json();
      setPayload(json);
      if (json.settings) setDraft(json.settings);
    } catch {
      setError("Couldn't load the call assistant settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>, successNote: string) {
    setBusy(true);
    setError("");
    try {
      const res = await authFetch("/api/ai-call", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Couldn't save that.");
        return;
      }
      if (json.settings) {
        setDraft(json.settings);
        setPayload((prev) => (prev ? { ...prev, settings: json.settings } : prev));
      }
      setNote(successNote);
      window.setTimeout(() => setNote(""), 3000);
    } catch {
      setError("Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  if (!payload) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
        Loading call assistant…
      </div>
    );
  }

  if (!payload.available) {
    return (
      <div className="rounded-3xl border border-amber-900/50 bg-amber-950/20 p-6">
        <h3 className="text-lg font-bold text-amber-200">AI Call Assistant — not set up yet</h3>
        <p className="mt-2 text-sm text-amber-300/80">
          {payload.message || "The database migration for this feature hasn't been applied."}
        </p>
      </div>
    );
  }

  const s = draft!;
  const perMinute = payload.pricing?.perMinute ?? 0.18;
  const reserve = payload.pricing?.upfrontReserve ?? 0.36;
  const sessions = payload.sessions || [];

  return (
    <div className="space-y-6">
      {/* ── On/off ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">AI Call Assistant</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Answers your text2sale number, finds out what the caller needs, and books them
              straight into your calendar. It works the same open times your texting assistant
              uses, so the two can never double-book you.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => save({ enabled: !s.enabled }, s.enabled ? "Call assistant turned off" : "Call assistant is live")}
            className={`relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
              s.enabled ? "bg-cyan-600" : "bg-zinc-700"
            } ${busy ? "opacity-50" : ""}`}
            aria-label={s.enabled ? "Turn the call assistant off" : "Turn the call assistant on"}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                s.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {s.enabled && (
          <div className="mt-4 rounded-xl bg-cyan-900/20 px-4 py-3 text-sm text-cyan-300">
            <strong>Live</strong> — incoming calls are answered by the assistant. Billed at $
            {perMinute.toFixed(2)}/minute, taken from your wallet. ${reserve.toFixed(2)} is held when
            the call connects and anything unused is credited straight back when it ends. If your
            wallet can&apos;t cover the hold, the call rings through to you as normal instead of
            being answered.
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={s.afterHoursOnly}
            disabled={busy}
            onChange={(e) => save({ afterHoursOnly: e.target.checked }, "Saved")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800"
          />
          <span className="text-sm text-zinc-300">
            Only answer outside my business hours
            <span className="block text-xs text-zinc-500">
              During the hours you set under Scheduling, calls ring through to you instead.
            </span>
          </span>
        </label>
      </div>

      {/* ── Greeting ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold">Greeting</h3>
        <p className="mt-1 text-sm text-zinc-400">
          The first thing the caller hears. Leave it blank and the assistant introduces your
          business name and offers to help.
        </p>
        <textarea
          value={s.greeting || ""}
          maxLength={320}
          onChange={(e) => setDraft({ ...s, greeting: e.target.value })}
          placeholder="Thanks for calling Sunrise Dental. I'm the scheduling assistant — how can I help you today?"
          className="mt-4 h-24 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{(s.greeting || "").length}/320 characters</span>
          <button
            disabled={busy}
            onClick={() => save({ greeting: s.greeting || "" }, "Greeting saved")}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            Save greeting
          </button>
        </div>
      </div>

      {/* ── Instructions ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold">What should it say?</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Anything you&apos;d tell a new receptionist on their first day. These instructions
          outrank everything else the assistant knows.
        </p>
        <textarea
          value={s.instructions || ""}
          maxLength={4000}
          onChange={(e) => setDraft({ ...s, instructions: e.target.value })}
          placeholder={`Example:
We're a chiropractic office in Tampa. New patients get a 20-minute consult.
Ask whether they've been here before.
If it's a car accident case, say we handle those and book them as soon as possible.
Never quote a price — tell them we'll go over cost at the visit.
If they sound like they're in pain today, offer the very first opening.`}
          className="mt-4 h-48 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {(s.instructions || "").length}/4000 characters
          </span>
          <button
            disabled={busy}
            onClick={() => save({ instructions: s.instructions || "" }, "Instructions saved")}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            Save instructions
          </button>
        </div>
      </div>

      {/* ── Voice, transfer, limit ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold">Voice &amp; handoff</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Voice</span>
            <select
              value={s.voice}
              disabled={busy}
              onChange={(e) => save({ voice: e.target.value }, "Voice updated")}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
            >
              {(payload.voices || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Hang up after</span>
            <select
              value={s.maxMinutes}
              disabled={busy}
              onChange={(e) => save({ maxMinutes: Number(e.target.value) }, "Call limit updated")}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
            >
              {[5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-500">
              A hard stop so no single call can run up a bill. The assistant takes a message and
              says goodbye before it hits this.
            </span>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-zinc-300">
            Transfer to this number when a caller asks for a person
          </span>
          <input
            type="tel"
            value={s.transferNumber || ""}
            onChange={(e) => setDraft({ ...s, transferNumber: e.target.value })}
            placeholder="(555) 123-4567"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Usually your cell. Leave it blank and the assistant takes a message instead — it will
            never tell a caller it&apos;s transferring them when it can&apos;t.
          </span>
        </label>
        <div className="mt-3 flex justify-end">
          <button
            disabled={busy}
            onClick={() => save({ transferNumber: s.transferNumber || "" }, "Transfer number saved")}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            Save number
          </button>
        </div>
      </div>

      {/* ── Forward your cell ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold">Send your cell&apos;s missed calls here too</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Set up <strong>conditional call forwarding</strong> on your mobile carrier and the
          assistant picks up whatever you don&apos;t. Your phone still rings first — this only
          catches the calls you miss, so you never lose one to voicemail again.
        </p>
        <ol className="mt-4 space-y-2 text-sm text-zinc-300">
          <li>
            <strong>1.</strong> From your cell, dial the forward-on-no-answer code for your
            carrier followed by your text2sale number. On most US carriers that&apos;s{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-cyan-300">*71</code> then the
            number, then call.
          </li>
          <li>
            <strong>2.</strong> Call your own cell from another phone and let it ring out. The
            assistant should answer.
          </li>
          <li>
            <strong>3.</strong> To turn it off later, dial{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-cyan-300">*73</code>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Codes differ by carrier — Verizon and T-Mobile use *71/*73, AT&amp;T uses *004*. Your
          carrier&apos;s support page will confirm. Forwarded minutes may be billed by your
          carrier as well as by us.
        </p>
      </div>

      {/* ── Recent calls ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent answered calls</h3>
          <button
            onClick={() => void load()}
            className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Nothing yet. Once the assistant answers a call it shows up here with what the caller
            wanted and what it did about it.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sessions.map((sess) => {
              const name = (sess.collected?.caller_name as string) || "";
              const outcome = sess.outcome || sess.state;
              return (
                <li key={sess.id} className="rounded-2xl bg-zinc-800/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-white">
                      {name || prettyPhone(sess.from_number)}
                      {name && (
                        <span className="ml-2 font-normal text-zinc-400">
                          {prettyPhone(sess.from_number)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        OUTCOME_TONE[outcome] || "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {OUTCOME_LABEL[outcome] || outcome}
                    </span>
                  </div>
                  {sess.summary && (
                    <p className="mt-2 text-sm text-zinc-300">{sess.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>{new Date(sess.started_at).toLocaleString()}</span>
                    <span>{durationOf(sess)}</span>
                    <span>{sess.turn_count} exchanges</span>
                    <span>${Number(sess.charged_amount || 0).toFixed(2)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── What it will and won't do ── */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold">What it will and won&apos;t do</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>
            <span className="text-zinc-200">It tells callers it&apos;s automated</span> if they
            ask. It will never claim to be you or any other person — several states require that
            disclosure, and a caller who feels tricked is a caller you&apos;ve lost.
          </li>
          <li>
            <span className="text-zinc-200">It only offers times you actually have open</span>,
            checked against both your appointments and your Google Calendar.
          </li>
          <li>
            <span className="text-zinc-200">It won&apos;t quote prices or give advice.</span> If a
            caller asks something it can&apos;t answer, it takes a message for you.
          </li>
          <li>
            <span className="text-zinc-200">It waits its turn.</span> Callers can&apos;t talk over
            it mid-sentence, so it works best with a short greeting and short answers.
          </li>
        </ul>
      </div>

      {(note || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            error ? "bg-red-950/40 text-red-300" : "bg-emerald-950/40 text-emerald-300"
          }`}
        >
          {error || note}
        </div>
      )}
    </div>
  );
}
