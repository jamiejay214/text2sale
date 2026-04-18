"use client";

import React, { useEffect, useState } from "react";

// ────────────────────────────────────────────────────────────────────────────
// Toast — lightweight animated toast container.
//
// Instead of replacing `message` state everywhere, this subscribes to a
// single `message` string prop from the parent. When it changes, a new toast
// is pushed; it auto-dismisses after 3s. Supports ✅/❌/⚠️ prefixes for
// semantic color.
// ────────────────────────────────────────────────────────────────────────────

export type ToastKind = "success" | "error" | "warn" | "info";

function kindFromMessage(msg: string): ToastKind {
  if (msg.startsWith("✅")) return "success";
  if (msg.startsWith("❌")) return "error";
  if (msg.startsWith("⚠️") || msg.startsWith("⚠")) return "warn";
  return "info";
}

type Item = { id: number; text: string; kind: ToastKind; createdAt: number };

export default function Toasts({ message }: { message: string }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!message || !message.trim()) return;
    const id = Date.now() + Math.random();
    const kind = kindFromMessage(message);
    const text = message.replace(/^([✅❌⚠️⚠])\s*/, "");
    setItems((prev) => [...prev, { id, text, kind, createdAt: Date.now() }]);
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[90] flex flex-col gap-2">
      {items.map((t) => {
        const palette = {
          success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
          error:   "border-red-500/30 bg-red-500/10 text-red-200",
          warn:    "border-amber-500/30 bg-amber-500/10 text-amber-200",
          info:    "border-zinc-700 bg-zinc-900 text-zinc-200",
        }[t.kind];
        const icon = {
          success: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ),
          error: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ),
          warn: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ),
          info: (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          ),
        }[t.kind];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ring-1 ring-white/5 ${palette}`}
            style={{ animation: "toastSlideIn 260ms cubic-bezier(0.21, 0.9, 0.3, 1.2)" }}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/5">
              {icon}
            </div>
            <span className="max-w-xs truncate">{t.text}</span>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes toastSlideIn {
          0% { opacity: 0; transform: translateX(16px) scale(0.96); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
