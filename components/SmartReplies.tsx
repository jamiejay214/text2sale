"use client";

import React, { useEffect, useState } from "react";
import type { Sentiment } from "@/lib/sentiment";

// ────────────────────────────────────────────────────────────────────────────
// SmartReplies — horizontal chip strip of 3 context-aware reply suggestions.
// Shows above the composer, color-tinted based on the last inbound message's
// sentiment. Click a chip → inserts its text into the composer.
//
// Collapsible — users who find it noisy can minimize it into a thin one-line
// pill. Preference is persisted in localStorage so it sticks across reloads.
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  suggestions: string[];
  sentiment: Sentiment | null;
  onPick: (text: string) => void;
  className?: string;
};

const STORAGE_KEY = "textalot_smart_replies_collapsed";

export default function SmartReplies({ suggestions, sentiment, onPick, className = "" }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Restore preference on mount
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!suggestions || suggestions.length === 0) return null;

  const hintEmoji = sentiment?.emoji || "💡";
  const hintLabel =
    sentiment && sentiment.tier !== "neutral"
      ? `${sentiment.label} — try one of these`
      : "Smart suggestions";

  // Collapsed — show a thin single-line pill so we don't eat vertical space.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`group flex w-full items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 text-[11px] text-zinc-400 transition hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-zinc-200 ${className}`}
        title="Show smart suggestions"
      >
        <span>{hintEmoji}</span>
        <span className="font-semibold uppercase tracking-wider">{hintLabel}</span>
        <span className="ml-auto text-zinc-500 group-hover:text-violet-300">Show ▾</span>
      </button>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-3 ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <span className="text-sm">{hintEmoji}</span>
        <span>{hintLabel}</span>
        {sentiment && sentiment.tier !== "neutral" && (
          <span
            className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sentiment.bgClass} ${sentiment.borderClass}`}
          >
            {sentiment.tier.toUpperCase()}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          title="Minimize"
          aria-label="Minimize smart suggestions"
        >
          Hide ▴
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={`${i}-${s.slice(0, 12)}`}
            onClick={() => onPick(s)}
            className={`group max-w-full rounded-xl border px-3 py-2 text-left text-xs text-zinc-200 transition-all hover:scale-[1.02] hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-white ${
              sentiment?.tier === "ready"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : sentiment?.tier === "positive"
                ? "border-sky-500/30 bg-sky-500/5"
                : sentiment?.tier === "objection"
                ? "border-amber-500/30 bg-amber-500/5"
                : sentiment?.tier === "negative"
                ? "border-rose-500/30 bg-rose-500/5"
                : "border-zinc-700/80 bg-zinc-900/60"
            }`}
            title="Click to insert"
          >
            <span className="line-clamp-2">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
