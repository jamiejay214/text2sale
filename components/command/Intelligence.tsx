"use client";

// ─────────────────────────────────────────────────────────────────────────
// Rich intelligence panels for the Command Center:
//   • Acquisition (channels / referrers / UTM campaigns)
//   • Recent Visitors (with visit_count, source, exit, intents)
//   • Engagement (bounce, depth, scroll, time, top exits)
//   • Optimization Audit (AI-generated)
//   • Marketing Ideas (AI-generated)
// ─────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Sparkles, AlertTriangle, ArrowUpRight, Monitor, Smartphone, Tablet,
  Megaphone, Search, Mail, Globe, Send, Zap, Cpu, Users, ChevronDown,
  Phone, MessageSquare, Download, Flame, Inbox, BellRing, Check,
} from "lucide-react";
import { Panel, BarList, Donut, type Bar } from "./CommandKit";

type ChannelRow = { channel: string; sessions: number; visitors: number; pct: number };
type ReferrerRow = { domain: string; sessions: number };
type CampaignRow = { source: string; medium: string; campaign: string; sessions: number };
type ExitRow = { to_domain: string; clicks: number; top_from_path: string };
type RecentVisitor = {
  visitor_id: string;
  first_seen: string;
  last_seen: string;
  visit_count: number;
  pages_viewed: number;
  channel: string;
  source: string;
  city: string | null;
  region: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  landing_page: string;
  last_path: string;
  exit_domain: string | null;
  intents: string[];
};
type EngagementMetrics = {
  avgSessionDepth: number;
  bounceRatePct: number;
  formStarts: number;
  ctaClicks: number;
  deepScrollPct: number;
  avgEngagementSec: number;
};
type IntelData = {
  channels: ChannelRow[];
  referrers: ReferrerRow[];
  campaigns: CampaignRow[];
  exits: ExitRow[];
  recentVisitors: RecentVisitor[];
  engagement: EngagementMetrics;
};

type Finding = { severity: "high" | "medium" | "low"; title: string; evidence: string; fix: string };
type Audit = { generated_at: string; mode: string; businesses: { text2sale: { findings: Finding[] }; abg: { findings: Finding[] }; tq: { findings: Finding[] } } };

type Idea = {
  channel: string;
  title: string;
  rationale: string;
  steps: string[];
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
};
type Marketing = { generated_at: string; mode: string; businesses: { text2sale: { ideas: Idea[] }; abg: { ideas: Idea[] }; tq: { ideas: Idea[] } } };

const CHANNEL_COLOR: Record<string, string> = {
  organic: "#22d3ee",
  paid: "#fb7185",
  social: "#a855f7",
  email: "#fbbf24",
  referral: "#34d399",
  direct: "#94a3b8",
};
const CHANNEL_ICON: Record<string, React.ReactNode> = {
  organic: <Search className="h-3.5 w-3.5" />,
  paid: <Megaphone className="h-3.5 w-3.5" />,
  social: <Users className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  referral: <Globe className="h-3.5 w-3.5" />,
  direct: <ArrowUpRight className="h-3.5 w-3.5" />,
};

const BIZ_LABEL: Record<string, string> = { text2sale: "Text2Sale", abg: "AI Business Growth", tq: "Trusted Quotes" };
const BIZ_COLOR: Record<string, string> = { text2sale: "#a78bfa", abg: "#22d3ee", tq: "#34d399" };

// Leads inbox uses full business ids from the API
const LEAD_BIZ_COLOR: Record<string, string> = { text2sale: "#a78bfa", aibusinessgrowth: "#22d3ee", trustedquotes: "#34d399" };
const LEAD_BIZ_LABEL: Record<string, string> = { text2sale: "Text2Sale", aibusinessgrowth: "AI Biz Growth", trustedquotes: "Trusted Quotes" };

type LeadRow = {
  business: "text2sale" | "aibusinessgrowth" | "trustedquotes";
  kind: "signup" | "lead" | "partial";
  name: string;
  email: string | null;
  phone: string | null;
  detail: string;
  location: string | null;
  source: string | null;
  status: string | null;
  hot: boolean;
  at: string;
};
type LeadsResult = {
  counts: { text2sale: number; aibusinessgrowth: number; trustedquotes: number; recoverable: number };
  leads: LeadRow[];
};

function timeAgo(s: string) {
  if (!s) return "—";
  const t = new Date(s).getTime();
  if (isNaN(t)) return "—";
  const d = (Date.now() - t) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
function deviceIcon(d: string | null) {
  if (d === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (d === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}
const SEV: Record<Finding["severity"], { color: string; bg: string }> = {
  high: { color: "#fb7185", bg: "rgba(251,113,133,0.12)" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  low: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};
const IMPACT: Record<Idea["effort"], string> = { low: "#34d399", medium: "#fbbf24", high: "#fb7185" };

export default function Intelligence({ token, accent, demo }: { token: string | null; accent: string; demo: boolean }) {
  const [data, setData] = useState<IntelData | null>(null);
  const [intelLoading, setIntelLoading] = useState(true);
  const [intelErr, setIntelErr] = useState<string | null>(null);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [marketing, setMarketing] = useState<Marketing | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [openBiz, setOpenBiz] = useState<"text2sale" | "abg" | "tq">("text2sale");
  const [openVisitor, setOpenVisitor] = useState<string | null>(null);

  const [leadsData, setLeadsData] = useState<LeadsResult | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<"all" | "recoverable" | LeadRow["business"]>("all");
  const [digestState, setDigestState] = useState<"idle" | "sending" | "sent">("idle");

  const headers = useMemo(() => (token ? { authorization: `Bearer ${token}` } : undefined), [token]);

  const loadIntel = useCallback(async () => {
    if (demo) {
      setData(demoIntel());
      setIntelLoading(false);
      return;
    }
    if (!token) return;
    setIntelLoading(true);
    setIntelErr(null);
    try {
      const res = await fetch("/api/command-center/intelligence", { headers });
      if (!res.ok) throw new Error(res.status === 403 ? "Admin only" : "Failed");
      setData(await res.json());
    } catch (e) {
      setIntelErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setIntelLoading(false);
    }
  }, [demo, token, headers]);

  const runAudit = useCallback(async () => {
    if (demo) {
      setAudit(demoAudit());
      return;
    }
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await fetch("/api/command-center/audit", { method: "POST", headers });
      if (res.ok) setAudit(await res.json());
    } finally {
      setAuditLoading(false);
    }
  }, [demo, token, headers]);

  const runMarketing = useCallback(async () => {
    if (demo) {
      setMarketing(demoMarketing());
      return;
    }
    if (!token) return;
    setMarketingLoading(true);
    try {
      const res = await fetch("/api/command-center/marketing", { method: "POST", headers });
      if (res.ok) setMarketing(await res.json());
    } finally {
      setMarketingLoading(false);
    }
  }, [demo, token, headers]);

  const loadLeads = useCallback(async () => {
    if (demo) {
      setLeadsData(demoLeads());
      setLeadsLoading(false);
      return;
    }
    if (!token) return;
    setLeadsLoading(true);
    try {
      const res = await fetch("/api/command-center/leads", { headers });
      if (res.ok) setLeadsData(await res.json());
    } finally {
      setLeadsLoading(false);
    }
  }, [demo, token, headers]);

  const sendDigest = useCallback(async () => {
    if (demo) {
      setDigestState("sent");
      setTimeout(() => setDigestState("idle"), 2500);
      return;
    }
    if (!token) return;
    setDigestState("sending");
    try {
      const res = await fetch("/api/command-center/digest", { headers });
      setDigestState(res.ok ? "sent" : "idle");
    } catch {
      setDigestState("idle");
    }
    setTimeout(() => setDigestState("idle"), 4000);
  }, [demo, token, headers]);

  useEffect(() => {
    loadIntel();
    loadLeads();
  }, [loadIntel, loadLeads]);

  const exportCsv = async (business?: string, kind?: string) => {
    const qs = new URLSearchParams();
    if (business) qs.set("business", business);
    if (kind) qs.set("kind", kind);
    if (demo) {
      const rows = (leadsData?.leads || []).filter((l) => (!business || l.business === business) && (!kind || l.kind === kind));
      const header = ["business", "kind", "name", "email", "phone", "detail", "location", "source", "status", "created_at"];
      const csv = [header.join(","), ...rows.map((l) => [l.business, l.kind, l.name, l.email, l.phone, l.detail, l.location, l.source, l.status, l.at].map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))].join("\n");
      triggerDownload(csv, `leads_${business || "all"}_${kind || "all"}.csv`);
      return;
    }
    if (!token) return;
    const res = await fetch(`/api/command-center/export?${qs.toString()}`, { headers });
    if (!res.ok) return;
    triggerDownload(await res.text(), `leads_${business || "all"}_${kind || "all"}.csv`);
  };

  const filteredLeads = (leadsData?.leads || []).filter((l) =>
    leadFilter === "all" ? true : leadFilter === "recoverable" ? l.kind === "partial" && l.hot : l.business === leadFilter
  );

  return (
    <div className="mt-8 space-y-6">
      {/* ─── LEADS & RECOVERY ─── */}
      <SectionHeader
        icon={<Inbox className="h-5 w-5" />}
        title="Leads & Recovery"
        subtitle="Every lead across all 3 businesses — click to text, call, or email"
        accent="#fbbf24"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={sendDigest}
              disabled={digestState === "sending"}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
              title="Text a summary of all 3 businesses to your phone right now"
            >
              {digestState === "sent" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <BellRing className="h-3.5 w-3.5" />}
              {digestState === "sending" ? "Sending…" : digestState === "sent" ? "Texted you!" : "Text me a digest"}
            </button>
            <button onClick={() => exportCsv()} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 hover:bg-white/10" title="Export all leads as CSV">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <RefreshButton onClick={loadLeads} loading={leadsLoading} />
          </div>
        }
      />
      {leadsData && leadsData.counts.recoverable > 0 && (
        <button
          onClick={() => setLeadFilter("recoverable")}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-rose-500/10 p-4 text-left transition hover:from-amber-500/20"
        >
          <Flame className="h-6 w-6 shrink-0 text-amber-400" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{leadsData.counts.recoverable} abandoned quotes you can recover right now</div>
            <div className="text-[11px] text-white/55">Trusted Quotes visitors who started a quote and left contact info but didn&apos;t finish. Text or call them — this is the cheapest revenue you&apos;ll make today.</div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-amber-400" />
        </button>
      )}
      <Panel title="Lead inbox" glow="#fbbf24">
        {/* filter chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([
            { id: "all", label: `All${leadsData ? ` (${leadsData.leads.length})` : ""}` },
            { id: "recoverable", label: `🔥 Recoverable${leadsData ? ` (${leadsData.counts.recoverable})` : ""}` },
            { id: "text2sale", label: `Text2Sale${leadsData ? ` (${leadsData.counts.text2sale})` : ""}` },
            { id: "aibusinessgrowth", label: `AI Biz Growth${leadsData ? ` (${leadsData.counts.aibusinessgrowth})` : ""}` },
            { id: "trustedquotes", label: `Trusted Quotes${leadsData ? ` (${leadsData.counts.trustedquotes})` : ""}` },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setLeadFilter(f.id as typeof leadFilter)}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition"
              style={{
                borderColor: leadFilter === f.id ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.08)",
                background: leadFilter === f.id ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.02)",
                color: leadFilter === f.id ? "#fff" : "rgba(255,255,255,0.55)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {leadsLoading && !leadsData ? <SkeletonRows n={8} /> : <LeadInbox leads={filteredLeads} />}
      </Panel>

      {/* ─── ACQUISITION ─── */}
      <SectionHeader icon={<Send className="h-5 w-5" />} title="Acquisition" subtitle="How visitors are finding you" accent={accent} action={<RefreshButton onClick={loadIntel} loading={intelLoading} />} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Channel mix (14d)" glow={accent}>
          {data ? <ChannelMix channels={data.channels} /> : <SkeletonRows n={5} />}
        </Panel>
        <Panel title="Top referrers" glow={accent}>
          {data ? <BarList data={data.referrers.map((r) => ({ label: r.domain, value: r.sessions }))} color={accent} emptyLabel="No referrer traffic yet — direct/UTM only." /> : <SkeletonRows n={5} />}
        </Panel>
        <Panel title="Top UTM campaigns (30d)" glow={accent}>
          {data ? <CampaignList rows={data.campaigns} /> : <SkeletonRows n={5} />}
        </Panel>
      </div>

      {/* ─── VISITORS ─── */}
      <SectionHeader icon={<Users className="h-5 w-5" />} title="Recent visitors" subtitle="Click a row to see their full timeline" accent={accent} />
      <Panel title={data ? `${data.recentVisitors.length} most-recent visitors` : "Loading…"} glow={accent}>
        {data ? <VisitorsTable rows={data.recentVisitors} openVisitor={openVisitor} setOpenVisitor={setOpenVisitor} token={token} demo={demo} /> : <SkeletonRows n={8} />}
      </Panel>

      {/* ─── ENGAGEMENT ─── */}
      <SectionHeader icon={<Zap className="h-5 w-5" />} title="Engagement" subtitle="What they do once they land" accent={accent} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Bounce rate" value={data ? `${data.engagement.bounceRatePct}%` : "—"} color="#fb7185" />
        <MiniStat label="Avg pages / session" value={data ? data.engagement.avgSessionDepth.toFixed(1) : "—"} color="#22d3ee" />
        <MiniStat label="Deep scroll" value={data ? `${data.engagement.deepScrollPct}%` : "—"} color="#a855f7" sub="≥ 90% of page" />
        <MiniStat label="Avg time on page" value={data ? `${data.engagement.avgEngagementSec}s` : "—"} color="#fbbf24" />
        <MiniStat label="Form starts (14d)" value={data ? data.engagement.formStarts.toLocaleString() : "—"} color="#34d399" sub="lead intent" />
        <MiniStat label="CTA clicks (14d)" value={data ? data.engagement.ctaClicks.toLocaleString() : "—"} color="#fb7185" />
      </div>
      <Panel title="Where they go AFTER you (outbound exits)" glow={accent}>
        {data ? <ExitsTable rows={data.exits} /> : <SkeletonRows n={5} />}
      </Panel>

      {/* ─── OPTIMIZATION AUDIT ─── */}
      <SectionHeader
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Optimization audit"
        subtitle="AI reads your live numbers and tells you what to fix"
        accent="#fb7185"
        ai
        action={
          <button
            onClick={runAudit}
            disabled={auditLoading}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-r from-rose-500/20 to-amber-500/20 px-3 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
          >
            {auditLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {audit ? "Re-run audit" : "Run AI audit"}
          </button>
        }
      />
      {!audit && !auditLoading && (
        <Panel title="Tap “Run AI audit” to scan all 3 businesses" glow="#fb7185">
          <p className="text-sm text-white/50">Claude will read every metric (channels, bounce, exits, conversions) and return 3-5 specific tighten-up actions per business, ordered by severity.</p>
        </Panel>
      )}
      {audit && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(["text2sale", "abg", "tq"] as const).map((k) => (
            <Panel key={k} title={BIZ_LABEL[k]} glow={BIZ_COLOR[k]}>
              <div className="space-y-3">
                {(audit.businesses[k]?.findings || []).map((f, i) => <FindingCard key={i} f={f} />)}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* ─── MARKETING IDEAS ─── */}
      <SectionHeader
        icon={<Cpu className="h-5 w-5" />}
        title="Marketing ideas"
        subtitle="Channel-specific plays Claude thinks would work, given your data"
        accent="#a855f7"
        ai
        action={
          <button
            onClick={runMarketing}
            disabled={marketingLoading}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-3 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
          >
            {marketingLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {marketing ? "Regenerate ideas" : "Generate marketing ideas"}
          </button>
        }
      />
      {marketing && (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["text2sale", "abg", "tq"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setOpenBiz(k)}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  borderColor: openBiz === k ? `${BIZ_COLOR[k]}80` : "rgba(255,255,255,0.08)",
                  background: openBiz === k ? `${BIZ_COLOR[k]}1a` : "rgba(255,255,255,0.02)",
                  color: openBiz === k ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: BIZ_COLOR[k] }} />
                {BIZ_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(marketing.businesses[openBiz]?.ideas || []).map((idea, i) => <IdeaCard key={i} idea={idea} />)}
          </div>
        </div>
      )}
      {!marketing && !marketingLoading && (
        <Panel title="Tap “Generate marketing ideas” for AI plays" glow="#a855f7">
          <p className="text-sm text-white/50">Claude will draft 4-6 marketing ideas per business — channel-specific (SEO, paid, social, outbound, partnerships, content, email) with concrete steps, effort and impact rated.</p>
        </Panel>
      )}

      {intelErr && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">Intelligence error: {intelErr}</div>}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, accent, action, ai }: { icon: React.ReactNode; title: string; subtitle?: string; accent: string; action?: React.ReactNode; ai?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent, boxShadow: `0 0 20px ${accent}40` }}>
          {icon}
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            {title}
            {ai && <span className="rounded-md bg-gradient-to-r from-purple-500/30 to-cyan-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90">✦ AI</span>}
          </h2>
          {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white" aria-label="Refresh">
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
    </button>
  );
}
function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="h-6 w-full animate-pulse rounded bg-white/[0.04]" />)}
    </div>
  );
}

function ChannelMix({ channels }: { channels: ChannelRow[] }) {
  const data: Bar[] = channels.map((c) => ({ label: c.channel, value: c.sessions }));
  return (
    <div className="space-y-3">
      <Donut data={data} size={140} />
      <div className="space-y-1.5">
        {channels.map((c) => (
          <div key={c.channel} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded" style={{ background: `${CHANNEL_COLOR[c.channel] || "#94a3b8"}30`, color: CHANNEL_COLOR[c.channel] || "#94a3b8" }}>
                {CHANNEL_ICON[c.channel]}
              </span>
              <span className="capitalize text-white/80">{c.channel}</span>
            </div>
            <div className="text-white/50">
              <span className="text-white/90">{c.sessions.toLocaleString()}</span>
              <span className="ml-1 text-[10px] text-white/40">({c.pct}%)</span>
            </div>
          </div>
        ))}
        {channels.length === 0 && <p className="text-xs text-white/40">No channel data yet.</p>}
      </div>
    </div>
  );
}

function CampaignList({ rows }: { rows: CampaignRow[] }) {
  if (!rows.length) return <p className="text-xs text-white/40">No UTM-tagged traffic yet. Add ?utm_source=… to your outbound links.</p>;
  return (
    <div className="space-y-1.5 text-xs">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
          <div className="min-w-0">
            <div className="truncate font-medium text-white/90">{r.campaign || r.source || "(unnamed)"}</div>
            <div className="truncate text-[10px] text-white/40">{[r.source, r.medium].filter(Boolean).join(" · ") || "no source"}</div>
          </div>
          <div className="ml-2 shrink-0 font-mono text-white/70">{r.sessions}</div>
        </div>
      ))}
    </div>
  );
}

function VisitorsTable({ rows, openVisitor, setOpenVisitor, token, demo }: { rows: RecentVisitor[]; openVisitor: string | null; setOpenVisitor: (v: string | null) => void; token: string | null; demo: boolean }) {
  if (!rows.length) return <p className="text-xs text-white/40">No visitors with rich tracking yet. Once the tracker is live, individual visitor profiles appear here.</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((v) => {
        const open = openVisitor === v.visitor_id;
        return (
          <div key={v.visitor_id} className="rounded-xl border border-white/5 bg-white/[0.02] transition hover:border-white/10">
            <button onClick={() => setOpenVisitor(open ? null : v.visitor_id)} className="w-full px-3 py-2.5 text-left">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] text-white/70" style={{ background: `${CHANNEL_COLOR[v.channel] || "#94a3b8"}30`, color: CHANNEL_COLOR[v.channel] || "#94a3b8" }}>
                  {v.visitor_id.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-medium text-white/90">{[v.city, v.region, v.country].filter(Boolean).join(", ") || "Unknown loc"}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-white/60">{v.channel || "—"}</span>
                {v.visit_count > 1 && <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">↩ {v.visit_count}× visits</span>}
                <span className="text-[10px] text-white/40 inline-flex items-center gap-1">{deviceIcon(v.device)} {v.browser || "—"}</span>
                <span className="ml-auto text-[10px] text-white/40">{timeAgo(v.last_seen)}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition ${open ? "rotate-180" : ""}`} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
                <span>📥 {v.landing_page || "/"}</span>
                <span>📄 {v.pages_viewed} views</span>
                {v.source && <span>🔗 {v.source}</span>}
                {v.exit_domain && <span className="text-amber-300">↗ Exited to {v.exit_domain}</span>}
                {v.intents.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {v.intents.slice(0, 4).map((i) => <span key={i} className="rounded bg-purple-500/15 px-1 text-[9px] uppercase text-purple-200">{i.replace(/_/g, " ")}</span>)}
                  </span>
                )}
              </div>
            </button>
            {open && <VisitorTimeline visitorId={v.visitor_id} token={token} demo={demo} />}
          </div>
        );
      })}
    </div>
  );
}

function VisitorTimeline({ visitorId, token, demo }: { visitorId: string; token: string | null; demo: boolean }) {
  const [events, setEvents] = useState<{ at: string; type: string; label: string; detail?: string }[] | null>(null);
  useEffect(() => {
    if (demo) {
      setEvents([
        { at: new Date().toISOString(), type: "page", label: "/pricing", detail: "organic · google.com" },
        { at: new Date(Date.now() - 60_000).toISOString(), type: "intent", label: "form_start", detail: "/pricing · email" },
        { at: new Date(Date.now() - 120_000).toISOString(), type: "page", label: "/features" },
        { at: new Date(Date.now() - 600_000).toISOString(), type: "exit", label: "Exit → gohighlevel.com", detail: "/text2sale-vs-gohighlevel" },
      ]);
      return;
    }
    if (!token) return;
    fetch(`/api/command-center/visitor/${encodeURIComponent(visitorId)}`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setEvents(j.events || []))
      .catch(() => setEvents([]));
  }, [visitorId, token, demo]);
  if (!events) return <div className="border-t border-white/5 px-3 py-3 text-[11px] text-white/40">Loading timeline…</div>;
  if (!events.length) return <div className="border-t border-white/5 px-3 py-3 text-[11px] text-white/40">No timeline events.</div>;
  return (
    <div className="border-t border-white/5 px-3 py-3">
      <div className="ml-1 border-l border-white/10 pl-3">
        {events.map((e, i) => (
          <div key={i} className="relative pb-2 pl-3 text-[11px]">
            <span className="absolute -left-[7px] top-1 h-2 w-2 rounded-full" style={{ background: e.type === "page" ? "#22d3ee" : e.type === "exit" ? "#fbbf24" : "#a855f7" }} />
            <div className="flex items-center gap-2">
              <span className="font-medium text-white/85">{e.label}</span>
              <span className="text-[10px] text-white/35">{timeAgo(e.at)}</span>
            </div>
            {e.detail && <div className="text-white/40">{e.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExitsTable({ rows }: { rows: ExitRow[] }) {
  if (!rows.length) return <p className="text-xs text-white/40">No outbound clicks tracked yet — once visitors click external links, they show up here so you can see who you&apos;re losing them to.</p>;
  const max = Math.max(...rows.map((r) => r.clicks), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 text-xs">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="truncate font-medium text-white/90">{r.to_domain}</div>
              <div className="shrink-0 font-mono text-white/60">{r.clicks}</div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full" style={{ width: `${(r.clicks / max) * 100}%`, background: "linear-gradient(90deg,#fbbf24,#fb7185)" }} />
            </div>
            {r.top_from_path && <div className="mt-1 text-[10px] text-white/35">from {r.top_from_path}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LeadInbox({ leads }: { leads: LeadRow[] }) {
  if (!leads.length) return <p className="text-xs text-white/40">No leads in this view yet. As your sites capture leads, they appear here instantly.</p>;
  const kindBadge: Record<LeadRow["kind"], { label: string; color: string }> = {
    signup: { label: "SIGNUP", color: "#a78bfa" },
    lead: { label: "LEAD", color: "#34d399" },
    partial: { label: "ABANDONED", color: "#fbbf24" },
  };
  return (
    <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
      {leads.map((l, i) => {
        const b = kindBadge[l.kind];
        const sms = l.phone ? `sms:${l.phone.replace(/[^\d+]/g, "")}` : null;
        const tel = l.phone ? `tel:${l.phone.replace(/[^\d+]/g, "")}` : null;
        const mail = l.email ? `mailto:${l.email}` : null;
        return (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/10">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {l.hot && <Flame className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
              <span className="font-semibold text-white/95">{l.name}</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ background: `${b.color}22`, color: b.color }}>{b.label}</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: `${LEAD_BIZ_COLOR[l.business]}18`, color: LEAD_BIZ_COLOR[l.business] }}>{LEAD_BIZ_LABEL[l.business]}</span>
              <span className="ml-auto text-[10px] text-white/35">{timeAgo(l.at)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
              <span>{l.detail}</span>
              {l.location && <span>📍 {l.location}</span>}
              {l.source && <span>🔗 {l.source}</span>}
            </div>
            {(sms || tel || mail) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sms && <a href={sms} className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"><MessageSquare className="h-3 w-3" /> Text</a>}
                {tel && <a href={tel} className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20"><Phone className="h-3 w-3" /> Call</a>}
                {mail && <a href={mail} className="flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20"><Mail className="h-3 w-3" /> Email</a>}
                <span className="flex items-center text-[10px] text-white/30">{l.phone || l.email}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3" style={{ boxShadow: `inset 0 0 30px ${color}10` }}>
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-2xl font-bold leading-tight" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-white/35">{sub}</div>}
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const s = SEV[f.severity];
  return (
    <div className="rounded-xl border bg-white/[0.02] p-3" style={{ borderColor: `${s.color}40` }}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold leading-tight text-white/95">{f.title}</h4>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: s.bg, color: s.color }}>
          {f.severity}
        </span>
      </div>
      <p className="mb-1.5 text-[11px] text-white/55"><span className="font-medium text-white/75">Evidence:</span> {f.evidence}</p>
      <p className="text-[11px] text-emerald-300/85"><span className="font-medium text-emerald-200">Fix:</span> {f.fix}</p>
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const ch = idea.channel.toLowerCase();
  return (
    <div className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.005] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/70">{ch}</span>
        <div className="flex gap-1.5 text-[9px] uppercase tracking-wider">
          <span className="rounded px-1.5 py-0.5" style={{ background: `${IMPACT[idea.effort]}20`, color: IMPACT[idea.effort] }}>Effort: {idea.effort}</span>
          <span className="rounded px-1.5 py-0.5" style={{ background: `${IMPACT[idea.impact]}20`, color: IMPACT[idea.impact] }}>Impact: {idea.impact}</span>
        </div>
      </div>
      <h4 className="mb-1.5 text-sm font-semibold leading-snug text-white/95">{idea.title}</h4>
      <p className="mb-2.5 text-[11px] text-white/55">{idea.rationale}</p>
      <ol className="space-y-1 text-[11px] text-white/70">
        {idea.steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[9px] font-bold text-purple-300">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Demo data (for /command?demo=1) ─────────────────────────────────────

function demoLeads(): LeadsResult {
  const now = Date.now();
  return {
    counts: { text2sale: 2, aibusinessgrowth: 1, trustedquotes: 4, recoverable: 3 },
    leads: [
      { business: "trustedquotes", kind: "partial", name: "Maria Gomez", email: "maria.g@gmail.com", phone: "+18135550142", detail: "ACA / Marketplace · stopped at step 4", location: "Tampa, FL", source: "facebook", status: "abandoned", hot: true, at: new Date(now - 9 * 60_000).toISOString() },
      { business: "text2sale", kind: "signup", name: "Derek Yount", email: "derek@northernlegacyia.com", phone: "+15155550199", detail: "Paying subscriber", location: null, source: null, status: "active", hot: false, at: new Date(now - 40 * 60_000).toISOString() },
      { business: "trustedquotes", kind: "partial", name: "James Whitfield", email: null, phone: "+19045550173", detail: "Medicare · stopped at step 2", location: "Jacksonville, FL", source: "google", status: "abandoned", hot: true, at: new Date(now - 2 * 3600_000).toISOString() },
      { business: "aibusinessgrowth", kind: "lead", name: "Priya Nair", email: "priya@claritydental.co", phone: "+14155550121", detail: "Clarity Dental · Dental · wants AI front desk", location: null, source: "linkedin", status: "new", hot: true, at: new Date(now - 5 * 3600_000).toISOString() },
      { business: "trustedquotes", kind: "partial", name: "Abandoned quote", email: "shopper8842@yahoo.com", phone: null, detail: "ACA / Marketplace · stopped at step 3", location: "Orlando, FL", source: "tiktok", status: "abandoned", hot: true, at: new Date(now - 8 * 3600_000).toISOString() },
      { business: "trustedquotes", kind: "lead", name: "Robert Chen", email: "rchen@outlook.com", phone: "+13055550188", detail: "Medicare · qualified", location: "33101", source: "referral", status: "qualified", hot: true, at: new Date(now - 26 * 3600_000).toISOString() },
    ],
  };
}

function demoIntel(): IntelData {
  return {
    channels: [
      { channel: "organic", sessions: 412, visitors: 388, pct: 43 },
      { channel: "direct", sessions: 248, visitors: 198, pct: 26 },
      { channel: "social", sessions: 140, visitors: 122, pct: 14 },
      { channel: "referral", sessions: 78, visitors: 70, pct: 8 },
      { channel: "paid", sessions: 64, visitors: 51, pct: 7 },
      { channel: "email", sessions: 18, visitors: 14, pct: 2 },
    ],
    referrers: [
      { domain: "google.com", sessions: 312 },
      { domain: "bing.com", sessions: 56 },
      { domain: "facebook.com", sessions: 84 },
      { domain: "linkedin.com", sessions: 44 },
      { domain: "reddit.com", sessions: 18 },
    ],
    campaigns: [
      { source: "newsletter", medium: "email", campaign: "spring-launch", sessions: 14 },
      { source: "facebook", medium: "cpc", campaign: "agents-fl", sessions: 38 },
      { source: "youtube", medium: "social", campaign: "demo-video", sessions: 22 },
    ],
    exits: [
      { to_domain: "gohighlevel.com", clicks: 28, top_from_path: "/text2sale-vs-gohighlevel" },
      { to_domain: "twilio.com", clicks: 14, top_from_path: "/best-twilio-alternative" },
      { to_domain: "youtube.com", clicks: 11, top_from_path: "/" },
      { to_domain: "g2.com", clicks: 6, top_from_path: "/" },
    ],
    recentVisitors: [
      { visitor_id: "ab12cd34-e5f6-7890-abcd-ef1234567890", first_seen: new Date(Date.now() - 86400e3 * 3).toISOString(), last_seen: new Date(Date.now() - 4 * 60_000).toISOString(), visit_count: 3, pages_viewed: 11, channel: "organic", source: "google.com", city: "Tampa", region: "FL", country: "US", device: "desktop", browser: "Chrome", os: "macOS", landing_page: "/best-twilio-alternative", last_path: "/pricing", exit_domain: "twilio.com", intents: ["form_start", "scroll_90", "cta_click"] },
      { visitor_id: "ff99aa11-bb22-cc33-dd44-ee5566778899", first_seen: new Date(Date.now() - 86400e3).toISOString(), last_seen: new Date(Date.now() - 60_000).toISOString(), visit_count: 1, pages_viewed: 4, channel: "social", source: "linkedin.com", city: "Austin", region: "TX", country: "US", device: "mobile", browser: "Safari", os: "iOS", landing_page: "/", last_path: "/features", exit_domain: null, intents: ["scroll_50"] },
      { visitor_id: "12345678-90ab-cdef-1234-567890abcdef", first_seen: new Date(Date.now() - 86400e3 * 7).toISOString(), last_seen: new Date(Date.now() - 3 * 86400e3).toISOString(), visit_count: 5, pages_viewed: 22, channel: "paid", source: "facebook-ads", city: "Miami", region: "FL", country: "US", device: "desktop", browser: "Chrome", os: "Windows", landing_page: "/health-insurance-texting-crm", last_path: "/dashboard", exit_domain: null, intents: ["form_start", "form_field", "cta_click", "scroll_90"] },
    ],
    engagement: { avgSessionDepth: 2.4, bounceRatePct: 58, formStarts: 31, ctaClicks: 144, deepScrollPct: 22, avgEngagementSec: 84 },
  };
}
function demoAudit(): Audit {
  return {
    generated_at: new Date().toISOString(),
    mode: "offline",
    businesses: {
      text2sale: { findings: [
        { severity: "high", title: "Bounce rate 58% on top landing pages", evidence: "majority of /best-* and /vs-* pages have one-and-done sessions.", fix: "Add a 30-second product video above the fold + 'See it in action' anchor to keep visitors past first paint." },
        { severity: "medium", title: "26% of traffic is Direct", evidence: "you're losing attribution — likely missing UTMs on outbound links.", fix: "Tag every email/SMS/social link with utm_source/medium/campaign so you can measure what's actually working." },
        { severity: "low", title: "Deep scroll only 22%", evidence: "few visitors reach the bottom of long pages.", fix: "Move pricing & sign-up button to a sticky right-rail so it's always one click away." },
      ] },
      abg: { findings: [
        { severity: "low", title: "Not enough data to audit yet", evidence: "only 3 visits recorded.", fix: "Install the tracker snippet (Install Tracker tab) and run a small awareness test." },
      ] },
      tq: { findings: [
        { severity: "high", title: "43 partial leads abandoned", evidence: "visitors start the quote form but don't finish.", fix: "Build a 3-text recovery sequence triggered at 15min / 1day / 3days after abandon — this is found money." },
        { severity: "medium", title: "All visitors are FL", evidence: "445 visitors, 100% from Florida.", fix: "Concentrate paid spend on FL Meta + Google ads — geo-lock budget for higher ROAS." },
      ] },
    },
  };
}
function demoMarketing(): Marketing {
  return {
    generated_at: new Date().toISOString(),
    mode: "offline",
    businesses: {
      text2sale: { ideas: [
        { channel: "outbound", title: "Cold-text 100 health agents/week from your own platform", rationale: "Eat your own dogfood. Free lead lists from NPN.gov.", steps: ["Pull 5k licensed health agents.", "Hand-pick 100/week.", "Text from Text2Sale itself with 14-day trial link."], effort: "low", impact: "high" },
        { channel: "content", title: "Finish the comparison-page network", rationale: "Bottom-funnel '/vs-X' pages convert 5-10x homepages.", steps: ["Add screenshots + feature table to each.", "Single 'Switch free in 10 min' CTA.", "Earn 3 backlinks/page from G2 & Capterra."], effort: "medium", impact: "high" },
      ] },
      abg: { ideas: [
        { channel: "outbound", title: "10 done-with-you AI installs at $1,500", rationale: "Beats SEO at this stage — cash + case studies.", steps: ["Pick one vertical.", "DM 30/week.", "Deliver in 2 weeks."], effort: "medium", impact: "high" },
      ] },
      tq: { ideas: [
        { channel: "product", title: "Reactivate the 43 partial leads", rationale: "Warmest revenue you can earn — they almost converted.", steps: ["Text-1 at 15 min.", "Text-2 at 1 day.", "Text-3 at 3 days."], effort: "low", impact: "high" },
      ] },
    },
  };
}
