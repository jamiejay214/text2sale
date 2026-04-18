"use client";

import React from "react";
import type { Sentiment } from "@/lib/sentiment";

// ────────────────────────────────────────────────────────────────────────────
// SmartReplies — horizontal chip strip of 3 context-aware reply suggestions.
// Shows above the composer, color-tinted based on the last inbound message's
// sentiment. Click a chip → inserts its text into the composer.
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  suggestions: string[];
  sentiment: Sentiment | null;
  onPick: (text: string) => void;
  className?: string;
};

export default function SmartReplies({ suggestions, sentiment, onPick, className = "" }: Props) {
  if (!suggestions || suggestions.length === 0) return null;

  const hintEmoji = sentiment?.emoji || "💡";
  const hintLabel =
    sentiment && sentiment.tier !== "neutral"
      ? `${sentiment.label} — try one of these`
      : "Smart suggestions";

  return (
    <div
      className={`rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-3 ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <span className="text-sm">{hintEmoji}</span>
        <span>{hintLabel}</span>
        {sentiment && sentiment.tier !== "neutral" && (
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sentiment.bgClass} ${sentiment.borderClass}`}
          >
            {sentiment.tier.toUpperCase()}
          </span>
        )}
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
