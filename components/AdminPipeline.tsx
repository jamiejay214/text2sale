"use client";

import React, { useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { computePipeline, type Pipeline, type StepState } from "@/lib/activation-pipeline";
import { PENDING_STATUSES } from "@/lib/messaging-status";
import { getIndustry } from "@/lib/industries";
import type { Profile } from "@/lib/types";

// ── Admin: activation pipeline ─────────────────────────────────────────────
//
// How far along every customer is — signed up, subscribed, business details,
// website, Telnyx business verification, 10DLC messaging approval, phone
// number, live — and who is holding them up (the customer, the carriers, or
// us). Everything is derived from the profile row by lib/activation-pipeline,
// so this screen can't disagree with what the activation driver is doing.

const DOT: Record<StepState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-sky-500 text-white ring-4 ring-sky-500/30 animate-pulse",
  waiting: "bg-amber-500 text-zinc-950",
  failed: "bg-rose-500 text-white",
  pending: "bg-zinc-700 text-zinc-400",
};

const LINE: Record<StepState, string> = {
  done: "bg-emerald-500/70",
  current: "bg-sky-500/50",
  waiting: "bg-amber-500/50",
  failed: "bg-rose-500/50",
  pending: "bg-zinc-700",
};

const GLYPH: Record<StepState, string> = { done: "✓", current: "•", waiting: "…", failed: "!", pending: "" };

export function PipelineStepper({ pipeline, compact = false }: { pipeline: Pipeline; compact?: boolean }) {
  return (
    <ol className="flex w-full items-start">
      {pipeline.steps.map((s, i) => (
        <li key={s.key} className="flex min-w-0 flex-1 flex-col items-center" title={`${s.label}: ${s.detail}`}>
          <div className="flex w-full items-center">
            <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : LINE[pipeline.steps[i - 1].state === "done" ? s.state : "pending"]}`} />
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${DOT[s.state]}`}>
              {GLYPH[s.state]}
            </div>
            <div className={`h-0.5 flex-1 ${i === pipeline.steps.length - 1 ? "opacity-0" : LINE[s.state === "done" ? pipeline.steps[i + 1].state : "pending"]}`} />
          </div>
          <div className={`mt-1.5 w-full truncate px-0.5 text-center text-[10px] leading-tight ${s.state === "pending" ? "text-zinc-600" : "text-zinc-300"}`}>
            {s.label}
          </div>
          {!compact && (
            <div className="hidden w-full truncate px-0.5 text-center text-[10px] leading-tight text-zinc-500 xl:block">{s.detail}</div>
          )}
        </li>
      ))}
    </ol>
  );
}

const OWNER_CHIP: Record<Pipeline["owner"], { label: string; cls: string }> = {
  customer: { label: "Waiting on customer", cls: "bg-amber-500/15 text-amber-300" },
  carriers: { label: "In carrier review", cls: "bg-sky-500/15 text-sky-300" },
  us: { label: "Automatic", cls: "bg-violet-500/15 text-violet-300" },
  none: { label: "Done", cls: "bg-emerald-500/15 text-emerald-300" },
};

function since(iso?: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Fact({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-0.5 break-words text-xs text-zinc-200 ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

/** Everything the system knows about one customer's activation, plus the controls. */
export function ActivationPanel({
  profile,
  onChanged,
  showStepper = true,
}: {
  profile: Profile;
  onChanged: (userId: string) => void | Promise<void>;
  showStepper?: boolean;
}) {
  const pipeline = useMemo(() => computePipeline(profile), [profile]);
  const reg = (profile.a2p_registration || {}) as NonNullable<Profile["a2p_registration"]>;
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const status = pipeline.status;
  const canRetry = (PENDING_STATUSES as string[]).includes(status);
  const canRestart = status === "REJECTED";
  const siteHost = profile.custom_domain;

  const run = async (action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action + (extra.from ? `:${extra.from}` : ""));
    setNote(null);
    try {
      const res = await authFetch("/api/admin/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) setNote(`❌ ${json.error || "Failed"}`);
      else setNote(json.result?.note ? `✅ ${json.result.note}` : "✅ Done");
      await onChanged(profile.id);
    } catch {
      setNote("❌ Request failed");
    } finally {
      setBusy(null);
    }
  };

  const btn = "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50";

  return (
    <div className="space-y-4">
      {showStepper && <PipelineStepper pipeline={pipeline} />}

      {pipeline.alerts.length > 0 && (
        <ul className="space-y-1.5">
          {pipeline.alerts.map((a) => (
            <li
              key={a.code + a.message}
              className={`rounded-lg px-3 py-2 text-xs ${
                a.level === "error"
                  ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30"
                  : a.level === "warn"
                    ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30"
                    : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {a.message}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Status" value={`${status.replace(/_/g, " ").toLowerCase()} · ${since(profile.messaging_status_at)}`} />
        <Fact
          label="Retries"
          value={`${profile.messaging_attempts ?? 0}${profile.messaging_next_attempt_at && canRetry ? ` · next ${since(profile.messaging_next_attempt_at).replace(" ago", "")}` : ""}`}
        />
        <Fact label="Industry" value={profile.industry ? getIndustry(profile.industry).label : "Not chosen"} />
        <Fact label="Wallet" value={`$${Number(profile.wallet_balance || 0).toFixed(2)}`} />
        <Fact
          label="Website"
          value={
            siteHost ? (
              <a href={`https://${siteHost}`} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">{siteHost}</a>
            ) : reg.websiteMode === "own" && reg.website ? (
              <a href={reg.website} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">{reg.website}</a>
            ) : reg.domainRequest?.domain ? (
              `${reg.domainRequest.domain} (not bought yet)`
            ) : profile.business_slug ? (
              <a href={`/biz/${profile.business_slug}`} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">/biz/{profile.business_slug}</a>
            ) : undefined
          }
        />
        <Fact label="Website mode" value={reg.websiteMode === "own" ? "Customer's own site" : reg.websiteMode === "hosted" ? "We host it" : undefined} />
        <Fact label="Brand ID" value={reg.brandRegistrationSid} mono />
        <Fact label="Brand status" value={[reg.brandStatus, reg.brandIdentityStatus].filter(Boolean).join(" / ")} />
        <Fact label="Campaign ID" value={reg.campaignSid} mono />
        <Fact label="Campaign status" value={reg.campaignStatus} />
        <Fact label="Brand submissions" value={reg.brandSubmissions != null ? String(reg.brandSubmissions) : undefined} />
        <Fact label="Last error" value={profile.messaging_error} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canRetry && (
          <button
            disabled={!!busy}
            onClick={() => run("retry")}
            className={`${btn} border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20`}
          >
            {busy === "retry" ? "Working…" : "Retry now"}
          </button>
        )}
        {canRestart && reg.brandRegistrationSid && (
          <button
            disabled={!!busy}
            onClick={() =>
              run("restart", { from: "campaign" }, "File a new messaging registration using the already-approved business? This costs a new campaign fee on the Telnyx account.")
            }
            className={`${btn} border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
          >
            {busy === "restart:campaign" ? "Working…" : "Re-file campaign"}
          </button>
        )}
        {canRestart && (
          <button
            disabled={!!busy}
            onClick={() =>
              run("restart", { from: "business" }, "Start this customer over with a brand-new business submission? This costs a new brand fee and a new campaign fee on the Telnyx account.")
            }
            className={`${btn} border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20`}
          >
            {busy === "restart:business" ? "Working…" : "Start over"}
          </button>
        )}
        {reg.adminAlert && (
          <button disabled={!!busy} onClick={() => run("clear_alert")} className={`${btn} border-zinc-600 text-zinc-300 hover:bg-zinc-800`}>
            Dismiss alert
          </button>
        )}
        {note && <span className="text-xs text-zinc-400">{note}</span>}
      </div>
    </div>
  );
}

type Filter = "all" | "attention" | "customer" | "carriers" | "live" | "idle";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "attention", label: "Needs attention" },
  { id: "customer", label: "Waiting on customer" },
  { id: "carriers", label: "In carrier review" },
  { id: "live", label: "Live" },
  { id: "idle", label: "Not started" },
];

function classify(p: Pipeline): Filter {
  if (p.health === "complete") return "live";
  if (p.alerts.length > 0) return "attention";
  if (p.health === "not_started") return "idle";
  if (p.owner === "customer") return "customer";
  if (p.owner === "carriers") return "carriers";
  return "all";
}

const GROUP_ORDER: Record<Filter, number> = { attention: 0, customer: 1, carriers: 2, all: 3, idle: 4, live: 5 };

export default function PipelineBoard({
  profiles,
  onChanged,
  onOpenUser,
}: {
  profiles: Profile[];
  onChanged: (userId: string) => void | Promise<void>;
  onOpenUser: (userId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    return profiles
      .filter((p) => p.role !== "admin")
      .map((p) => ({ profile: p, pipeline: computePipeline(p) }));
  }, [profiles]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, attention: 0, customer: 0, carriers: 0, live: 0, idle: 0 };
    for (const r of rows) {
      const k = classify(r.pipeline);
      if (k !== "all") c[k]++;
    }
    return c;
  }, [rows]);

  // Funnel: how many customers have completed each step.
  const funnel = useMemo(() => {
    const keys = rows[0]?.pipeline.steps.map((s) => ({ key: s.key, label: s.label })) ?? [];
    return keys.map(({ key, label }) => ({
      key,
      label,
      count: rows.filter((r) => r.pipeline.steps.find((s) => s.key === key)?.state === "done").length,
    }));
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== "all" && classify(r.pipeline) !== filter) return false;
        if (!q) return true;
        const reg = r.profile.a2p_registration;
        return [r.profile.first_name, r.profile.last_name, r.profile.email, reg?.businessName, r.profile.custom_domain]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const g = GROUP_ORDER[classify(a.pipeline)] - GROUP_ORDER[classify(b.pipeline)];
        if (g !== 0) return g;
        return new Date(b.profile.messaging_status_at || b.profile.created_at).getTime() - new Date(a.profile.messaging_status_at || a.profile.created_at).getTime();
      });
  }, [rows, filter, query]);

  const total = Math.max(rows.length, 1);

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { id: "attention" as const, label: "Needs attention", cls: "border-rose-500/30 bg-rose-500/5 text-rose-300" },
          { id: "customer" as const, label: "Waiting on customer", cls: "border-amber-500/30 bg-amber-500/5 text-amber-300" },
          { id: "carriers" as const, label: "In carrier review", cls: "border-sky-500/30 bg-sky-500/5 text-sky-300" },
          { id: "live" as const, label: "Texting live", cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" },
          { id: "idle" as const, label: "Not started", cls: "border-zinc-700 bg-zinc-900 text-zinc-300" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(filter === t.id ? "all" : t.id)}
            className={`rounded-2xl border p-4 text-left transition hover:brightness-125 ${t.cls} ${filter === t.id ? "ring-2 ring-white/30" : ""}`}
          >
            <div className="text-3xl font-bold tabular-nums">{counts[t.id]}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider opacity-80">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Funnel */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-bold">Signup to live — funnel</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">
          {funnel.map((f, i) => {
            const pct = Math.round((f.count / total) * 100);
            return (
              <div key={f.key}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-zinc-400">{i + 1}. {f.label}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums text-white">{f.count}</span>
                  <span className="text-[11px] text-zinc-500">{pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f.id ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{f.id === "all" ? rows.length : counts[f.id]}</span>
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, business, domain…"
          className="ml-auto w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-violet-500 sm:w-72"
        />
      </div>

      {/* Customers */}
      <div className="space-y-3">
        {visible.map(({ profile, pipeline }) => {
          const reg = profile.a2p_registration;
          const chip = OWNER_CHIP[pipeline.owner];
          const isOpen = open.has(profile.id);
          return (
            <div key={profile.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0 lg:w-64 lg:shrink-0">
                  <button onClick={() => onOpenUser(profile.id)} className="max-w-full truncate text-left font-semibold hover:text-violet-300">
                    {profile.first_name} {profile.last_name}
                  </button>
                  <div className="truncate text-xs text-zinc-500">{reg?.businessName || profile.email}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${chip.cls}`}>{chip.label}</span>
                    <span className="text-[10px] text-zinc-500">{pipeline.percent}% · {since(profile.messaging_status_at || profile.created_at)}</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <PipelineStepper pipeline={pipeline} compact />
                </div>

                <div className="flex shrink-0 items-center gap-3 lg:w-56 lg:justify-end">
                  <div className="min-w-0 text-xs text-zinc-300 lg:text-right">{pipeline.headline}</div>
                  <button
                    onClick={() =>
                      setOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(profile.id)) next.delete(profile.id);
                        else next.add(profile.id);
                        return next;
                      })
                    }
                    className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {isOpen ? "Hide" : "Details"}
                  </button>
                </div>
              </div>

              {!isOpen && pipeline.alerts.length > 0 && (
                <div className="mt-3 truncate text-xs text-rose-300">⚠ {pipeline.alerts[0].message}</div>
              )}

              {isOpen && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <ActivationPanel profile={profile} onChanged={onChanged} showStepper={false} />
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-10 text-center text-sm text-zinc-500">
            No customers match.
          </div>
        )}
      </div>
    </div>
  );
}
