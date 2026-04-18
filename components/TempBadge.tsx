"use client";

import React from "react";
import type { LeadTemperature } from "@/lib/lead-temperature";

// ────────────────────────────────────────────────────────────────────────────
// TempBadge — tiny chip showing a contact's lead temperature. Used in the
// conversations list, contacts table, and contact detail sidebar.
//
// Two sizes:
//   • "sm" — icon-only dot suitable for crowded list rows
//   • "md" — chip with emoji + score + label (the default for contact cards)
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  temp: LeadTemperature;
  size?: "sm" | "md";
  showScore?: boolean;
  className?: string;
};

export default function TempBadge({ temp, size = "md", showScore = true, className = "" }: Props) {
  if (size === "sm") {
    return (
      <span
        title={`${temp.label}${temp.tier !== "dnc" ? ` — score ${temp.score}` : ""}`}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${temp.bgClass} ${temp.textClass} ${temp.borderClass} ${temp.glowClass} ${className}`}
      >
        {temp.emoji}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${temp.bgClass} ${temp.textClass} ${temp.borderClass} ${temp.glowClass} ${className}`}
      title={`Lead Temperature: ${temp.label} (${temp.score}/100)`}
    >
      <span className={temp.tier === "blazing" ? "animate-pulse" : ""}>{temp.emoji}</span>
      <span className="uppercase tracking-wider">{temp.label}</span>
      {showScore && temp.tier !== "dnc" && (
        <span className="tabular-nums opacity-70">{temp.score}</span>
      )}
    </span>
  );
}
