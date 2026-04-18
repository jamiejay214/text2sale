"use client";

import React, { useEffect, useState } from "react";

// ─── Floating Call HUD ───────────────────────────────────────────────────
// A small fixed card that shows the status of an outbound call as it
// progresses (initiating → ringing → answered → completed). We keep it in
// its own component so dashboard logic stays shallow — the dashboard just
// opens/closes it and subscribes to its onCancel/onClose. The live status
// flows in via the `status` prop which the parent updates from realtime
// Supabase events on the `calls` table.

export type CallHudState = {
  callId: string;
  contactName: string;
  contactPhone: string;
  fromNumber: string;
  status:
    | "initiating"
    | "ringing"
    | "answered"
    | "completed"
    | "failed"
    | "no-answer"
    | "busy"
    | "voicemail"
    | "canceled";
  startedAt: number; // Date.now() when the call was kicked off
  answeredAt?: number;
  durationSec?: number;
  error?: string;
  /** true when audio is coming through the browser (WebRTC mode) */
  browserMode?: boolean;
  muted?: boolean;
};

type Props = {
  call: CallHudState | null;
  onHangup: (callId: string) => void;
  onClose: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
};

export default function CallHud({ call, onHangup, onClose, onMute, onUnmute }: Props) {
  const [tick, setTick] = useState(0);

  // Tick every second so the live timer renders in real time.
  useEffect(() => {
    if (!call) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(t);
  }, [call]);

  if (!call) return null;
  void tick; // silence unused

  const now = Date.now();
  const answeredMs = call.answeredAt ? call.answeredAt : 0;
  const liveDuration = answeredMs
    ? Math.max(0, Math.floor((now - answeredMs) / 1000))
    : 0;
  const finishedDuration = call.durationSec ?? 0;

  const isActive = ["initiating", "ringing", "answered"].includes(call.status);
  const isFinished = !isActive;

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const statusMeta: Record<CallHudState["status"], { label: string; tint: string; pulse: boolean }> = {
    initiating: { label: "Starting call…", tint: "from-sky-500 to-cyan-500", pulse: true },
    ringing: { label: call?.browserMode ? "Calling…" : "Ringing your phone…", tint: "from-violet-500 to-fuchsia-500", pulse: true },
    answered: { label: "On the line", tint: "from-emerald-500 to-green-500", pulse: true },
    completed: { label: "Call ended", tint: "from-zinc-500 to-zinc-600", pulse: false },
    "no-answer": { label: "No answer", tint: "from-amber-500 to-orange-500", pulse: false },
    busy: { label: "Busy", tint: "from-amber-500 to-orange-500", pulse: false },
    voicemail: { label: "Voicemail", tint: "from-indigo-500 to-purple-500", pulse: false },
    failed: { label: "Call failed", tint: "from-red-500 to-rose-500", pulse: false },
    canceled: { label: "Canceled", tint: "from-zinc-500 to-zinc-600", pulse: false },
  };

  const meta = statusMeta[call.status];

  return (
    <div className="fixed bottom-6 right-6 z-[120] w-[360px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl">
      {/* Gradient accent bar */}
      <div className={`h-1 bg-gradient-to-r ${meta.tint}`} />

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.tint} text-white shadow-inner`}>
            {isActive ? (
              <svg className={`h-6 w-6 ${meta.pulse ? "animate-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            ) : call.status === "voicemail" ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><line x1="6" y1="18" x2="18" y2="18"/></svg>
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-white">
              {call.contactName || "Outbound call"}
            </div>
            <div className="truncate text-xs tabular-nums text-zinc-400">
              {call.contactPhone}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
              <span>From {call.fromNumber}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Status row */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            {meta.pulse && (
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full bg-gradient-to-r ${meta.tint} opacity-75`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full bg-gradient-to-r ${meta.tint}`} />
              </span>
            )}
            <span className="text-sm font-semibold text-white">{meta.label}</span>
          </div>
          <span className="font-mono text-sm tabular-nums text-zinc-300">
            {call.status === "answered" ? mmss(liveDuration) : isFinished ? mmss(finishedDuration) : "--:--"}
          </span>
        </div>

        {/* Action */}
        {isActive ? (
          <div className="mt-4 flex gap-2">
            {/* Mute toggle — only shown in browser WebRTC mode */}
            {call.browserMode && (
              <button
                onClick={call.muted ? onUnmute : onMute}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                  call.muted
                    ? "border-amber-600 bg-amber-900/40 text-amber-300 hover:bg-amber-900/60"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
                title={call.muted ? "Unmute" : "Mute"}
              >
                {call.muted ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={() => onHangup(call.callId)}
              className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:brightness-110"
            >
              End call
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Close
          </button>
        )}

        {call.error && (
          <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-[11px] text-red-300">
            {call.error}
          </div>
        )}

        <p className="mt-3 text-center text-[10px] text-zinc-500">
          {call.browserMode ? "🎧 Audio through your browser" : "We ring your phone first, then connect your contact."}
        </p>
      </div>
    </div>
  );
}
