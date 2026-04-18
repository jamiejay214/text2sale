"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ────────────────────────────────────────────────────────────────────────────
// Command Palette — a Superhuman/Linear-style fuzzy launcher.
//
// Open with ⌘K (or Ctrl+K). Type to filter; arrow keys / Enter to run.
// Commands are grouped into sections and each one has an icon, label, hint,
// optional keyboard shortcut, and an onRun() callback. Results are ranked by
// simple subsequence matching — cheap, sufficient, and no extra dependency.
//
// This component is fully controlled: the parent decides what's open and what
// commands are live. It returns null when closed so no DOM noise.
// ────────────────────────────────────────────────────────────────────────────

export type Command = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  icon?: React.ReactNode;
  keywords?: string[];
  shortcut?: string[]; // e.g. ["⌘", "N"]
  onRun: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

// Very light fuzzy scoring: sequential character match with adjacency bonus.
// Returns a number (higher = better) or -1 for no match.
function scoreMatch(query: string, label: string, keywords: string[] = []): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const haystack = (label + " " + keywords.join(" ")).toLowerCase();
  if (haystack.includes(q)) return 100 + (label.toLowerCase().startsWith(q) ? 50 : 0);
  // subsequence match
  let qi = 0;
  let score = 0;
  let lastIdx = -1;
  for (let i = 0; i < haystack.length && qi < q.length; i++) {
    if (haystack[i] === q[qi]) {
      score += i === lastIdx + 1 ? 4 : 2;
      lastIdx = i;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export default function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset when re-opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const ranked = useMemo(() => {
    const scored = commands
      .map((c) => ({ cmd: c, score: scoreMatch(query, c.label, c.keywords) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((r) => r.cmd);
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of ranked) {
      if (!map.has(c.section)) map.set(c.section, []);
      map.get(c.section)!.push(c);
    }
    return Array.from(map.entries());
  }, [ranked]);

  // Reset active index when results change
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(ranked.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = ranked[active];
        if (cmd) {
          cmd.onRun();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active, ranked, onClose]);

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        style={{
          animation: "cpPop 180ms cubic-bezier(0.21, 0.9, 0.3, 1.3)",
        }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <svg className="h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, pages, or type a command…"
            className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-600"
          />
          <kbd className="hidden rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {ranked.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900">
                <svg className="h-5 w-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              No matches. Try a different search.
            </div>
          ) : (
            grouped.map(([section, items]) => (
              <div key={section} className="mb-2">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {section}
                </div>
                <div className="space-y-0.5">
                  {items.map((cmd) => {
                    const globalIdx = ranked.findIndex((r) => r.id === cmd.id);
                    const isActive = globalIdx === active;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onMouseEnter={() => setActive(globalIdx)}
                        onClick={() => {
                          cmd.onRun();
                          onClose();
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive
                            ? "bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 text-white ring-1 ring-violet-500/30"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? "bg-violet-500/20 text-violet-300" : "bg-zinc-900 text-zinc-500"
                        }`}>
                          {cmd.icon || (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{cmd.label}</div>
                          {cmd.hint && (
                            <div className="truncate text-[11px] text-zinc-500">{cmd.hint}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <div className="flex shrink-0 gap-1">
                            {cmd.shortcut.map((k, i) => (
                              <kbd
                                key={i}
                                className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        )}
                        {isActive && !cmd.shortcut && (
                          <svg className="h-4 w-4 shrink-0 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 font-medium">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 font-medium">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            Powered by
            <span className="font-semibold text-violet-400">TextAlot AI</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes cpPop {
          0% { opacity: 0; transform: translateY(-6px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
