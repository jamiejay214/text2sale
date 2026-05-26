"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  DollarSign, Users, Target, Zap, Activity, Radio, Globe, TrendingUp,
  Download, RefreshCw, MessageSquare, UserPlus, CreditCard,
  ShoppingBag, FileText, Wifi, WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Overview, BusinessMetrics, Series, FeedItem } from "@/lib/command-center";
import { Panel, StatTile, AreaChart, BarList, Donut, Funnel } from "@/components/command/CommandKit";
import CommandVoice from "@/components/command/CommandVoice";
import USMapChart from "@/components/USMapChart";

type Scope = "all" | BusinessMetrics["id"];

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function mergeSeries(list: Series[], limit = 6): Series {
  const m = new Map<string, number>();
  for (const s of list) for (const { label, value } of s) m.set(label, (m.get(label) || 0) + value);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value }));
}
function feedIcon(kind: string) {
  if (kind === "payment") return <CreditCard className="h-3.5 w-3.5" />;
  if (kind === "signup") return <UserPlus className="h-3.5 w-3.5" />;
  if (kind === "lead") return <Target className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

// ── dev-only demo snapshot (so the UI can be previewed without a live login) ──
function makeDemo(): Overview {
  const days = (base: number, amp: number) =>
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86400000);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: Math.max(0, Math.round(base + amp * Math.sin(i / 1.7) + (i * amp) / 18 + Math.random() * amp * 0.4)),
      };
    });
  const t2s: BusinessMetrics = {
    id: "text2sale", name: "Text2Sale", domain: "text2sale.com", color: "#a855f7", online: true,
    kpis: { revenue: 18420, revenueToday: 640, visitors: 948, visitorsToday: 41, visitorsWeek: 233, leads: 8, leadsWeek: 2, customers: 5, conversionRate: 0.84 },
    trafficByDay: days(28, 18),
    topPages: [{ label: "/", value: 312 }, { label: "/ai-texting-crm", value: 144 }, { label: "/mass-texting-crm", value: 121 }, { label: "/dashboard", value: 98 }, { label: "/health-insurance-texting-crm", value: 63 }],
    sources: [{ label: "Direct", value: 410 }, { label: "google.com", value: 288 }, { label: "facebook.com", value: 142 }, { label: "bing.com", value: 41 }],
    devices: [{ label: "Mobile", value: 540 }, { label: "Desktop", value: 408 }],
    geo: { FL: 180, TX: 120, CA: 96, NY: 70, GA: 55, OH: 33, NC: 28, PA: 22 },
    funnel: [{ label: "Visitors", value: 948 }, { label: "Signups", value: 8 }, { label: "Active", value: 5 }],
    recent: [
      { kind: "payment", title: "$39.99 wallet top-up", subtitle: "Payment", at: new Date(Date.now() - 6e5).toISOString() },
      { kind: "signup", title: "Maria Lopez", subtitle: "Signed up", at: new Date(Date.now() - 36e5).toISOString() },
    ],
    extra: { mrr: 199.95, contacts: 17587, conversations: 3402, messages: 3508, calls: 80, activeSubscribers: 5 },
  };
  const aibg: BusinessMetrics = {
    id: "aibusinessgrowth", name: "AI Business Growth", domain: "aibusinessgrowth.com", color: "#22d3ee", online: true,
    kpis: { revenue: 0, revenueToday: 0, visitors: 126, visitorsToday: 9, visitorsWeek: 58, leads: 11, leadsWeek: 4, customers: 2, conversionRate: 8.7 },
    trafficByDay: days(7, 6),
    topPages: [{ label: "/", value: 71 }, { label: "/pricing", value: 33 }, { label: "/demo", value: 22 }],
    sources: [{ label: "linkedin.com", value: 44 }, { label: "Direct", value: 38 }, { label: "google.com", value: 31 }],
    devices: [{ label: "Desktop", value: 78 }, { label: "Mobile", value: 48 }],
    geo: { CA: 30, TX: 18, NY: 16, WA: 12, IL: 9 },
    funnel: [{ label: "Visitors", value: 126 }, { label: "Leads", value: 11 }, { label: "Subscribers", value: 6 }, { label: "Sales", value: 2 }],
    recent: [{ kind: "lead", title: "Acme Co", subtitle: "SaaS · 11–50", at: new Date(Date.now() - 12e5).toISOString() }],
    extra: { subscribers: 6, purchases: 2, sales: 2 },
  };
  const tq: BusinessMetrics = {
    id: "trustedquotes", name: "Trusted Quotes", domain: "trustedquotes.org", color: "#34d399", online: true,
    kpis: { revenue: 0, revenueToday: 0, visitors: 445, visitorsToday: 22, visitorsWeek: 140, leads: 12, leadsWeek: 5, customers: 12, conversionRate: 2.7 },
    trafficByDay: days(15, 10),
    topPages: [{ label: "/", value: 201 }, { label: "/quote", value: 132 }, { label: "/thank-you", value: 44 }],
    sources: [{ label: "google.com", value: 210 }, { label: "Direct", value: 120 }, { label: "facebook.com", value: 80 }],
    devices: [{ label: "Mobile", value: 300 }, { label: "Desktop", value: 145 }],
    geo: { FL: 90, TX: 70, CA: 55, NY: 40, AZ: 30, GA: 25 },
    funnel: [{ label: "Visitors", value: 445 }, { label: "Started", value: 43 }, { label: "Leads", value: 12 }],
    recent: [{ kind: "lead", title: "John Carter", subtitle: "Health · FL", at: new Date(Date.now() - 9e5).toISOString() }],
    extra: { partialLeads: 43, completedLeads: 12 },
  };
  const businesses = [t2s, aibg, tq];
  const geo: Record<string, number> = {};
  for (const b of businesses) for (const [k, n] of Object.entries(b.geo)) geo[k] = (geo[k] || 0) + n;
  return {
    generatedAt: new Date().toISOString(),
    businesses,
    combined: {
      revenue: 18420, revenueToday: 640, visitors: 1519, visitorsToday: 72, visitorsWeek: 431,
      leads: 31, customers: 19, messages: 3508, calls: 80,
      trafficByDay: t2s.trafficByDay.map((d, i) => ({ date: d.date, value: d.value + aibg.trafficByDay[i].value + tq.trafficByDay[i].value })),
      topPages: mergeSeries(businesses.map((b) => b.topPages.map((p) => ({ label: `${b.domain}${p.label}`, value: p.value }))), 8),
      geo,
      feed: businesses.flatMap((b) => b.recent.map((r) => ({ ...r, subtitle: `${b.name} · ${r.subtitle}` }))).sort((a, b) => b.at.localeCompare(a.at)),
    },
  };
}

export default function CommandCenterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = process.env.NODE_ENV !== "production" && params.get("demo") === "1";

  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [clock, setClock] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const tokenRef = useRef<string | null>(null);

  // clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // PWA: capture install prompt + register service worker (scoped to /command)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/command" }).catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const load = async (tok: string | null) => {
    if (demo) {
      setOverview(makeDemo());
      setUpdatedAt(new Date());
      setLoading(false);
      return;
    }
    if (!tok) return;
    try {
      const res = await fetch("/api/command-center/overview", { headers: { authorization: `Bearer ${tok}` } });
      if (!res.ok) {
        setErr(res.status === 403 ? "Admin access required." : "Failed to load analytics.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Overview;
      setOverview(data);
      setUpdatedAt(new Date());
      setErr(null);
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // auth gate + initial load
  useEffect(() => {
    (async () => {
      if (demo) {
        await load(null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
      tokenRef.current = session.access_token;
      setToken(session.access_token);
      await load(session.access_token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-refresh every 45s
  useEffect(() => {
    if (demo) return;
    const t = setInterval(() => load(tokenRef.current), 45000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const install = async () => {
    if (!installPrompt) {
      alert("To install: open this page in Chrome/Edge and use the install icon in the address bar, or 'Add to Dock' in Safari.");
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  // ── view model based on scope ──
  const vm = useMemo(() => {
    if (!overview) return null;
    const biz = scope === "all" ? null : overview.businesses.find((b) => b.id === scope) || null;
    const c = overview.combined;
    const accent = biz ? biz.color : "#a855f7";
    const sources = biz ? biz.sources : mergeSeries(overview.businesses.map((b) => b.sources));
    const devices = biz ? biz.devices : mergeSeries(overview.businesses.map((b) => b.devices));
    const funnel = biz
      ? biz.funnel
      : [
          { label: "Visitors", value: c.visitors },
          { label: "Leads", value: c.leads },
          { label: "Customers", value: c.customers },
        ];
    const feed: FeedItem[] = biz ? biz.recent.map((r) => ({ ...r, subtitle: r.subtitle })) : c.feed;
    return {
      biz, accent,
      revenue: biz ? biz.kpis.revenue : c.revenue,
      revenueToday: biz ? biz.kpis.revenueToday : c.revenueToday,
      visitors: biz ? biz.kpis.visitors : c.visitors,
      visitorsToday: biz ? biz.kpis.visitorsToday : c.visitorsToday,
      visitorsWeek: biz ? biz.kpis.visitorsWeek : c.visitorsWeek,
      leads: biz ? biz.kpis.leads : c.leads,
      customers: biz ? biz.kpis.customers : c.customers,
      conversion: biz ? biz.kpis.conversionRate : c.visitors ? (c.leads / c.visitors) * 100 : 0,
      traffic: biz ? biz.trafficByDay : c.trafficByDay,
      topPages: biz ? biz.topPages : c.topPages,
      geo: biz ? biz.geo : c.geo,
      sources, devices, funnel, feed,
      messages: Number(overview.businesses.find((b) => b.id === "text2sale")?.extra.messages || 0),
      calls: Number(overview.businesses.find((b) => b.id === "text2sale")?.extra.calls || 0),
    };
  }, [overview, scope]);

  if (loading) return <BootScreen />;
  if (err) return <ErrorScreen msg={err} onRetry={() => { setLoading(true); load(tokenRef.current); }} />;
  if (!overview || !vm) return <BootScreen />;

  const tabs: { id: Scope; label: string; color: string }[] = [
    { id: "all", label: "All Businesses", color: "#a855f7" },
    ...overview.businesses.map((b) => ({ id: b.id as Scope, label: b.name, color: b.color })),
  ];

  // contextual 6th tile
  const ctx =
    scope === "aibusinessgrowth"
      ? { label: "Sales", value: Number(vm.biz?.extra.sales || 0), icon: <ShoppingBag className="h-4 w-4" />, color: "#818cf8" }
      : scope === "trustedquotes"
      ? { label: "Partial Leads", value: Number(vm.biz?.extra.partialLeads || 0), icon: <FileText className="h-4 w-4" />, color: "#818cf8" }
      : { label: "Messages", value: vm.messages, icon: <MessageSquare className="h-4 w-4" />, color: "#818cf8" };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07060d] text-white">
      <Backdrop />
      <CommandVoice token={token} snapshot={overview} accent={vm.accent} />

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#a855f7,#22d3ee)", boxShadow: "0 0 30px #a855f780" }}>
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">COMMAND CENTER</h1>
              <p className="text-[11px] text-white/40">Unified intelligence · 3 businesses {demo && <span className="text-amber-400">· DEMO</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="font-mono text-sm text-white/80">{clock.toLocaleTimeString("en-US")}</div>
              <div className="text-[10px] text-white/35">{updatedAt ? `synced ${timeAgo(updatedAt.toISOString())}` : ""}</div>
            </div>
            <button onClick={() => { setLoading(false); load(tokenRef.current); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white" aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={install} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 hover:bg-white/10">
              <Download className="h-4 w-4" /> Install app
            </button>
          </div>
        </header>

        {/* Business tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const activeTab = scope === t.id;
            const b = overview.businesses.find((x) => x.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                className="group relative flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition"
                style={{
                  borderColor: activeTab ? `${t.color}80` : "rgba(255,255,255,0.08)",
                  background: activeTab ? `${t.color}1a` : "rgba(255,255,255,0.02)",
                  color: activeTab ? "#fff" : "rgba(255,255,255,0.55)",
                  boxShadow: activeTab ? `0 0 20px ${t.color}40` : "none",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.label}
                {b && (
                  <span className="ml-1 flex items-center" title={b.online ? "Live" : "Offline"}>
                    {b.online ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-white/30" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KPI row */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Revenue" value={vm.revenue} prefix="$" color="#34d399" icon={<DollarSign className="h-4 w-4" />} sub={`$${Math.round(vm.revenueToday).toLocaleString()} today`} spark={vm.traffic} />
          <StatTile label="Visitors" value={vm.visitors} color="#22d3ee" icon={<Users className="h-4 w-4" />} sub={`${vm.visitorsWeek.toLocaleString()} this week`} spark={vm.traffic} />
          <StatTile label="Visitors Today" value={vm.visitorsToday} color="#38bdf8" icon={<TrendingUp className="h-4 w-4" />} spark={vm.traffic} />
          <StatTile label="Leads" value={vm.leads} color="#a855f7" icon={<Target className="h-4 w-4" />} />
          <StatTile label="Customers" value={vm.customers} color="#fb7185" icon={<Zap className="h-4 w-4" />} />
          <StatTile label={ctx.label} value={ctx.value} color={ctx.color} icon={ctx.icon} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Traffic */}
          <div className="lg:col-span-8">
            <Panel title="Traffic — last 14 days" glow={vm.accent} right={<span className="font-mono text-xs text-white/50">{vm.visitors.toLocaleString()} total</span>}>
              <AreaChart data={vm.traffic} color={vm.accent} height={210} />
              <div className="mt-2 flex justify-between px-1 text-[10px] text-white/30">
                <span>{vm.traffic[0]?.date}</span>
                <span>{vm.traffic[Math.floor(vm.traffic.length / 2)]?.date}</span>
                <span>{vm.traffic[vm.traffic.length - 1]?.date}</span>
              </div>
            </Panel>
          </div>

          {/* Businesses leaderboard */}
          <div className="lg:col-span-4">
            <Panel title="All Businesses" glow="#a855f7">
              <div className="space-y-2">
                {overview.businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setScope(b.id)}
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.05]"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                        <span className="text-sm font-semibold text-white">{b.name}</span>
                      </div>
                      {b.online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <span title={b.note} className="text-[9px] text-amber-400">setup</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <Mini label="Rev" value={`$${Math.round(b.kpis.revenue).toLocaleString()}`} />
                      <Mini label="Visits" value={b.kpis.visitors.toLocaleString()} />
                      <Mini label="Leads" value={b.kpis.leads.toLocaleString()} />
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {/* Map */}
          <div className="lg:col-span-8">
            <Panel title="Visitor locations" glow={vm.accent}>
              <div className="[&>div]:!border-0 [&>div]:!bg-transparent [&>div]:!p-0 [&_h3]:hidden">
                <USMapChart stateData={vm.geo} />
              </div>
            </Panel>
          </div>

          {/* Live feed */}
          <div className="lg:col-span-4">
            <Panel title="Live activity" glow="#34d399" right={<span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />LIVE</span>}>
              <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
                {vm.feed.length === 0 && <div className="py-6 text-center text-xs text-white/30">No recent activity</div>}
                {vm.feed.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${vm.accent}1f`, color: vm.accent }}>{feedIcon(f.kind)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-white/90">{f.title}</div>
                      <div className="truncate text-[11px] text-white/40">{f.subtitle}</div>
                    </div>
                    <span className="shrink-0 text-[10px] text-white/30">{timeAgo(f.at)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Funnel */}
          <div className="lg:col-span-3">
            <Panel title="Conversion funnel" glow={vm.accent}><Funnel steps={vm.funnel} color={vm.accent} /></Panel>
          </div>
          {/* Top pages */}
          <div className="lg:col-span-3">
            <Panel title="Most visited pages" glow="#22d3ee"><BarList data={vm.topPages} color="#22d3ee" /></Panel>
          </div>
          {/* Sources */}
          <div className="lg:col-span-3">
            <Panel title="Traffic sources" glow="#fbbf24"><BarList data={vm.sources} color="#fbbf24" /></Panel>
          </div>
          {/* Devices */}
          <div className="lg:col-span-3">
            <Panel title="Devices" glow="#fb7185"><Donut data={vm.devices} /></Panel>
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-white/30">
          <span>Command Center · text2sale · aibusinessgrowth · trustedquotes</span>
          <span className="flex items-center gap-1"><Radio className="h-3 w-3" /> Auto-refresh 45s</span>
        </footer>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-1.5">
      <div className="font-mono text-xs font-semibold text-white">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% -10%, #1a0a2e 0%, #0a0712 45%, #050309 100%)" }} />
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "linear-gradient(rgba(168,85,247,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.5) 1px,transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)" }} />
      <motion.div className="absolute -left-40 top-10 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,#a855f7,transparent 70%)", filter: "blur(60px)", opacity: 0.25 }} animate={{ x: [0, 60, 0], y: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 18 }} />
      <motion.div className="absolute right-0 top-40 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,#22d3ee,transparent 70%)", filter: "blur(70px)", opacity: 0.2 }} animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ repeat: Infinity, duration: 22 }} />
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07060d] text-white">
      <div className="text-center">
        <motion.div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg,#a855f7,#22d3ee)" }} animate={{ scale: [1, 1.1, 1], rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Globe className="h-8 w-8" />
        </motion.div>
        <div className="font-mono text-sm tracking-[0.3em] text-white/60">INITIALIZING COMMAND CENTER</div>
        <div className="mt-3 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07060d] text-white">
      <div className="text-center">
        <WifiOff className="mx-auto mb-4 h-10 w-10 text-white/40" />
        <div className="mb-1 text-lg font-semibold">{msg}</div>
        <button onClick={onRetry} className="mt-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Retry</button>
      </div>
    </div>
  );
}
