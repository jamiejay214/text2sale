"use client";

import React, { useEffect, useState } from "react";
import type { CallHudState } from "@/components/CallHud";

// ─── Power Dialer ────────────────────────────────────────────────────────
// An auto-advancing calling queue, the way established CRMs (Outreach,
// SalesLoft, Kixie, Orum) do it. The rep clicks Start, we burn through the
// queue one contact at a time, and on each hangup the rep picks a
// disposition (Interested / Voicemail / Not Interested / Wrong Number /
// DNC / Callback). Auto-advance can be toggled off for manual pacing.
//
// Architecture notes
// ──────────────────
//   • Dialing itself is delegated to the parent (the dashboard) via the
//     `onStart` callback. The parent already owns the Telnyx round-trip,
//     the wallet debit, and the realtime HUD; we just feed it one contact
//     at a time and react when the call reaches a terminal state.
//   • The queue is a flat list of `PowerDialerEntry` — the dashboard
//     builds it from the current contacts filter (or a tag / stage).
//   • We expose `autoAdvance` and `paused` as separate toggles so the rep
//     can pause without forgetting their auto-advance preference.
//   • Dispositions write back through `onDisposition` — the parent chooses
//     whether that updates the call row, the contact, or both.

export type PowerDialerEntry = {
  contactId: string;
  name: string;
  phone: string;
  city?: string;
  state?: string;
  notes?: string;
  tags?: string[];
  lastMessage?: string;
  lastCalledAt?: string | null;
  temperature?: "hot" | "warm" | "cold";
  stage?: string;
  dnc?: boolean;
};

export type Disposition =
  | "interested"
  | "not_interested"
  | "voicemail"
  | "callback"
  | "wrong_number"
  | "dnc"
  | "skipped";

type Props = {
  open: boolean;
  onClose: () => void;
  queue: PowerDialerEntry[];
  index: number;
  onIndexChange: (next: number) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
  paused: boolean;
  onPausedChange: (v: boolean) => void;
  activeCall: CallHudState | null;
  fromNumber?: string;
  ownedNumbers: Array<{ number: string; display?: string }>;
  onStart: (entry: PowerDialerEntry, fromNumber: string) => void;
  onHangup: (callId: string) => void;
  onDisposition: (entry: PowerDialerEntry, callId: string | null, disposition: Disposition, notes?: string) => Promise<void>;
};

const DISPOSITION_BUTTONS: Array<{
  key: Disposition;
  label: string;
  sub: string;
  tone: string;
  icon: string;
}> = [
  { key: "interested",     label: "Interested",      sub: "I",   tone: "from-emerald-500 to-green-500", icon: "🔥" },
  { key: "voicemail",      label: "Voicemail",       sub: "V",   tone: "from-indigo-500 to-purple-500", icon: "📭" },
  { key: "callback",       label: "Callback",        sub: "C",   tone: "from-sky-500 to-cyan-500",      icon: "↩️" },
  { key: "not_interested", label: "Not interested",  sub: "N",   tone: "from-amber-500 to-orange-500",  icon: "✋" },
  { key: "wrong_number",   label: "Wrong number",    sub: "W",   tone: "from-zinc-500 to-zinc-600",     icon: "❓" },
  { key: "dnc",            label: "Do not call",     sub: "D",   tone: "from-red-500 to-rose-600",      icon: "⛔" },
];

const TERMINAL_STATUSES: CallHudState["status"][] = [
  "completed", "failed", "no-answer", "busy", "voicemail", "canceled",
];

export default function PowerDialer(props: Props) {
  const {
    open, onClose, queue, index, onIndexChange,
    autoAdvance, onAutoAdvanceChange,
    paused, onPausedChange,
    activeCall, fromNumber, ownedNumbers,
    onStart, onHangup, onDisposition,
  } = props;

  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);
  const [selectedFromNumber, setSelectedFromNumber] = useState<string>(fromNumber || ownedNumbers[0]?.number || "");
  const [awaitingDisposition, setAwaitingDisposition] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const entry = queue[index];
  const total = queue.length;
  const isCallActive = !!activeCall && !TERMINAL_STATUSES.includes(activeCall.status);
  const isCallFinished = !!activeCall && TERMINAL_STATUSES.includes(activeCall.status);

  // Keep chosen from-number in sync with owned-number updates.
  useEffect(() => {
    if (!selectedFromNumber && ownedNumbers[0]?.number) {
      setSelectedFromNumber(ownedNumbers[0].number);
    }
  }, [ownedNumbers, selectedFromNumber]);

  // Watch for call completion — then ask for a disposition.
  useEffect(() => {
    if (!open) return;
    if (isCallFinished) setAwaitingDisposition(true);
  }, [open, isCallFinished]);

  // Clear per-entry state on index change.
  useEffect(() => {
    setNote("");
    setAwaitingDisposition(false);
    setCountdown(null);
  }, [index]);

  // Auto-advance: once a disposition is logged AND autoAdvance is on AND we
  // aren't paused, count down 3s then move to next. The countdown gives the
  // rep a chance to click "Hold" if they want to jot more notes.
  useEffect(() => {
    if (!open || !autoAdvance || paused) return;
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (index + 1 < total) {
        onIndexChange(index + 1);
      } else {
        onPausedChange(true); // queue done
      }
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, open, autoAdvance, paused, index, total, onIndexChange, onPausedChange]);

  // Keyboard shortcuts: 1–6 disposition, space dial/hangup, n note, p pause, esc close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      if (e.key === "Escape") { onClose(); return; }
      if (e.key === " ") {
        e.preventDefault();
        if (isCallActive && activeCall) {
          onHangup(activeCall.callId);
        } else if (entry && !paused) {
          onStart(entry, selectedFromNumber);
        }
        return;
      }
      if (e.key.toLowerCase() === "p") { onPausedChange(!paused); return; }
      if (e.key.toLowerCase() === "s") {
        // skip
        if (entry) {
          onDisposition(entry, activeCall?.callId ?? null, "skipped", note || undefined);
          if (index + 1 < total) onIndexChange(index + 1);
        }
        return;
      }
      const key = e.key.toLowerCase();
      const map: Record<string, Disposition> = {
        i: "interested",
        v: "voicemail",
        c: "callback",
        n: "not_interested",
        w: "wrong_number",
        d: "dnc",
      };
      if (map[key] && entry && (isCallFinished || !isCallActive)) {
        handleDisposition(map[key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, isCallActive, isCallFinished, activeCall, paused, note, selectedFromNumber, index, total]);

  const handleDisposition = async (disp: Disposition) => {
    if (!entry) return;
    await onDisposition(entry, activeCall?.callId ?? null, disp, note.trim() || undefined);
    setAwaitingDisposition(false);
    if (autoAdvance && !paused) {
      setCountdown(3);
    }
  };

  const handleManualAdvance = () => {
    if (index + 1 < total) onIndexChange(index + 1);
    else onPausedChange(true);
  };

  const progressPct = total ? Math.round((index / total) * 100) : 0;

  const statusLabel = (() => {
    if (!activeCall) return "Ready to dial";
    switch (activeCall.status) {
      case "initiating": return "Starting call…";
      case "ringing":    return "Ringing your phone…";
      case "answered":   return "On the line";
      case "completed":  return "Call ended — log outcome";
      case "no-answer":  return "No answer — log outcome";
      case "busy":       return "Busy — log outcome";
      case "voicemail":  return "Voicemail — log outcome";
      case "failed":     return "Call failed — log outcome";
      case "canceled":   return "Canceled — log outcome";
    }
  })();

  const statusTone = (() => {
    if (!activeCall) return "from-violet-500 to-fuchsia-500";
    if (activeCall.status === "answered")   return "from-emerald-500 to-green-500";
    if (activeCall.status === "ringing")    return "from-violet-500 to-fuchsia-500";
    if (activeCall.status === "initiating") return "from-sky-500 to-cyan-500";
    if (activeCall.status === "failed")     return "from-red-500 to-rose-500";
    return "from-zinc-500 to-zinc-600";
  })();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* ── Header bar with progress ──────────────────────────────── */}
        <div className="relative border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl text-white shadow-lg">
                ⚡
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500">Power Dialer</div>
                <div className="text-lg font-bold text-white">
                  {total === 0 ? "Empty queue" : `${Math.min(index + 1, total)} of ${total}`}
                </div>
              </div>
              {/* Live auto-advance state */}
              <div className="ml-3 hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-[11px] text-zinc-300 md:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}></span>
                {paused ? "Paused" : autoAdvance ? "Auto-advancing" : "Manual mode"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-[11px] font-medium text-zinc-300 md:flex">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => onAutoAdvanceChange(e.target.checked)}
                  className="h-3.5 w-3.5 accent-violet-500"
                />
                Auto-advance
              </label>
              <button
                onClick={() => onPausedChange(!paused)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  paused
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-amber-500 text-black hover:bg-amber-400"
                }`}
              >
                {paused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                onClick={onClose}
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        {!entry ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
            <div className="text-5xl">🎉</div>
            <div className="text-xl font-bold text-white">Queue complete</div>
            <div className="max-w-md text-sm text-zinc-400">
              You&apos;ve run through every contact in this list. Dispositions and call outcomes have
              been saved to the call history.
            </div>
            <button
              onClick={onClose}
              className="mt-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white hover:brightness-110"
            >
              Back to Calls
            </button>
          </div>
        ) : (
          <div className="grid flex-1 gap-6 overflow-hidden p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* ── Contact card ─────────────────────────────────────── */}
            <div className="flex min-h-0 flex-col overflow-y-auto rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl font-bold text-white shadow-lg">
                  {(entry.name || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-2xl font-bold text-white">{entry.name || "Contact"}</div>
                    {entry.temperature === "hot" && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/30">
                        🔥 Hot
                      </span>
                    )}
                    {entry.stage && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {entry.stage}
                      </span>
                    )}
                    {entry.dnc && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/30">
                        DNC
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-base tabular-nums text-zinc-300">
                    {entry.phone}
                  </div>
                  {(entry.city || entry.state) && (
                    <div className="mt-0.5 text-[12px] text-zinc-500">
                      {[entry.city, entry.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {!!entry.tags?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.slice(0, 6).map((t) => (
                        <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status row */}
              <div className={`mt-5 flex items-center justify-between rounded-2xl bg-zinc-900/80 p-4 ring-1 ring-white/5`}>
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${statusTone} ${isCallActive ? "animate-pulse" : ""}`}></span>
                  <span className="text-sm font-semibold text-white">{statusLabel}</span>
                </div>
                {countdown !== null && (
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-500/30">
                    Next in {countdown}s
                  </span>
                )}
              </div>

              {/* Primary action */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {isCallActive ? (
                  <button
                    onClick={() => activeCall && onHangup(activeCall.callId)}
                    className="col-span-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-red-500/30 hover:brightness-110"
                  >
                    End call (Space)
                  </button>
                ) : (
                  <button
                    onClick={() => entry && onStart(entry, selectedFromNumber)}
                    disabled={!selectedFromNumber || paused || entry.dnc}
                    className="col-span-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {entry.dnc ? "Skip — DNC flagged" : "Dial now (Space)"}
                  </button>
                )}
              </div>

              {/* Last message / notes preview */}
              {(entry.lastMessage || entry.notes) && (
                <div className="mt-4 space-y-3">
                  {entry.lastMessage && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500">Last message</div>
                      <div className="mt-1 text-sm text-zinc-200 line-clamp-3">{entry.lastMessage}</div>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500">Notes</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-200 line-clamp-5">{entry.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* From-number selector */}
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Dialing from</div>
                <button
                  onClick={() => setPicking((v) => !v)}
                  className="mt-1 flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  <span className="font-mono tabular-nums">{selectedFromNumber || "No number selected"}</span>
                  <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {picking && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900">
                    {ownedNumbers.length === 0 ? (
                      <div className="p-3 text-xs text-zinc-500">
                        No owned numbers yet. Purchase one in Settings → Numbers.
                      </div>
                    ) : (
                      ownedNumbers.map((n) => (
                        <button
                          key={n.number}
                          onClick={() => { setSelectedFromNumber(n.number); setPicking(false); }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                            n.number === selectedFromNumber ? "bg-zinc-800 text-white" : "text-zinc-300"
                          }`}
                        >
                          <span className="font-mono tabular-nums">{n.number}</span>
                          {n.display && <span className="text-[11px] text-zinc-500">{n.display}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Disposition + note panel ─────────────────────────── */}
            <div className="flex min-h-0 flex-col overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                {awaitingDisposition ? "Log outcome" : "After you hang up"}
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                {DISPOSITION_BUTTONS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => handleDisposition(d.key)}
                    disabled={!entry || isCallActive}
                    className={`group flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${d.tone} text-sm`}>
                      {d.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{d.label}</span>
                      <span className="block text-[10px] text-zinc-500">press {d.sub}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-400">
                <span>Skip (S) · Pause (P) · Space to dial/hangup · Esc to close</span>
              </div>

              <div className="mt-auto pt-4">
                <button
                  onClick={handleManualAdvance}
                  disabled={!entry || isCallActive}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next contact →
                </button>
              </div>

              {/* Upcoming mini-list */}
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Up next</div>
                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {queue.slice(index + 1, index + 6).map((q, i) => (
                    <div key={q.contactId} className="flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-2.5 py-1.5 text-[12px]">
                      <div className="min-w-0 flex-1 truncate text-zinc-300">
                        <span className="text-zinc-500">{index + 2 + i}.</span> {q.name || "Contact"}
                      </div>
                      <div className="ml-2 shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">{q.phone}</div>
                    </div>
                  ))}
                  {queue.length <= index + 1 && (
                    <div className="rounded-xl border border-dashed border-zinc-800 p-2 text-center text-[11px] text-zinc-500">
                      Last contact in queue
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

