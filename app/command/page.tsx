"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  DollarSign, Users, Target, Zap, Activity, Radio, Globe, TrendingUp,
  Download, RefreshCw, MessageSquare, UserPlus, CreditCard,
  ShoppingBag, FileText, Wifi, WifiOff, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loginUser } from "@/lib/auth";
import type { Overview, BusinessMetrics, Series, FeedItem } from "@/lib/command-center";
import { Panel, StatTile, AreaChart, BarList, Donut, Funnel } from "@/components/command/CommandKit";
import CommandVoice from "@/components/command/CommandVoice";
import Intelligence from "@/components/command/Intelligence";
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
  const [authState, setAuthState] = useState<"checking" | "needs-login" | "not-admin" | "ok">("checking");
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

  // auth gate + initial load — NEVER redirects off /command (was the bug
  // that sent the installed PWA / Electron app to the marketing homepage).
  // Instead we show an inline sign-in OR not-admin screen and stay put.
  const initAuth = async () => {
    if (demo) {
      setAuthState("ok");
      await load(null);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthState("needs-login");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    if (!profile || profile.role !== "admin") {
      setAuthState("not-admin");
      setLoading(false);
      return;
    }
    tokenRef.current = session.access_token;
    setToken(session.access_token);
    setAuthState("ok");
    await load(session.access_token);
  };
  useEffect(() => {
    initAuth();
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
    // Chrome/Edge/Android: native install prompt is available.
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      return;
    }
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      alert("Command Center is already installed — you're running it as an app. 🎉");
      return;
    }
    if (isIOS) {
      alert(
        "📲 Add Command Center to your iPhone:\n\n" +
          "1. Tap the Share button (□ with an ↑) in Safari's toolbar.\n" +
          "2. Scroll down and tap “Add to Home Screen”.\n" +
          "3. Tap “Add”.\n\n" +
          "It'll appear on your home screen with its own icon and open fullscreen like a real app.\n\n" +
          "(Must be done in Safari — not Chrome — on iPhone.)"
      );
      return;
    }
    alert(
      "Install the Command Center app:\n\n" +
        "• iPhone/iPad: open in Safari → Share → Add to Home Screen\n" +
        "• Android: Chrome → ⋮ → Install app\n" +
        "• Desktop: click the install icon in the Chrome/Edge address bar"
    );
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
      mrr: Number(overview.businesses.find((b) => b.id === "text2sale")?.extra.mrr || 0),
      activeSubscribers: Number(overview.businesses.find((b) => b.id === "text2sale")?.extra.activeSubscribers || 0),
    };
  }, [overview, scope]);

  if (authState === "needs-login") return <SignInScreen onSignedIn={initAuth} />;
  if (authState === "not-admin") return <NotAdminScreen onSignOut={async () => { await supabase.auth.signOut(); setAuthState("needs-login"); }} />;
  if (loading || authState === "checking") return <BootScreen />;
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
      <Backdrop accent={vm.accent} />
      <CommandVoice token={token} snapshot={overview} accent={vm.accent} />

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="relative flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: `linear-gradient(135deg,${vm.accent},#22d3ee)`, boxShadow: `0 0 30px ${vm.accent}80` }}
              animate={{ boxShadow: [`0 0 18px ${vm.accent}66`, `0 0 34px ${vm.accent}aa`, `0 0 18px ${vm.accent}66`] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Globe className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-[0.12em] sm:text-xl">COMMAND CENTER</h1>
              <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {scope === "all" ? "All systems · 3 businesses" : <span style={{ color: vm.accent }}>▸ {vm.biz?.name}</span>}
                {demo && <span className="text-amber-400">· DEMO</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="font-mono text-sm tabular-nums text-white/80">{clock.toLocaleTimeString("en-US")}</div>
              <div className="text-[10px] text-white/35">{updatedAt ? `synced ${timeAgo(updatedAt.toISOString())}` : ""}</div>
            </div>
            <button onClick={() => { setLoading(false); load(tokenRef.current); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:text-white" aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={install} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition hover:bg-white/10">
              <Download className="h-4 w-4" /> Install app
            </button>
          </div>
        </header>

        {/* Business selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const activeTab = scope === t.id;
            const b = overview.businesses.find((x) => x.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                className="group relative flex items-center gap-2 overflow-hidden rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200"
                style={{
                  borderColor: activeTab ? `${t.color}` : "rgba(255,255,255,0.08)",
                  background: activeTab ? `linear-gradient(180deg, ${t.color}26, ${t.color}0d)` : "rgba(255,255,255,0.02)",
                  color: activeTab ? "#fff" : "rgba(255,255,255,0.5)",
                  boxShadow: activeTab ? `0 0 22px ${t.color}55, inset 0 0 16px ${t.color}1a` : "none",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full transition"
                  style={{ background: t.color, boxShadow: activeTab ? `0 0 8px ${t.color}` : "none" }}
                />
                {t.id === "all" ? "All Businesses" : t.label}
                {b && (
                  <span className="ml-0.5 flex items-center" title={b.online ? "Live" : "Offline"}>
                    {b.online ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-white/30" />}
                  </span>
                )}
                {activeTab && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-2 -bottom-px h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* KPI row */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Revenue collected" value={vm.revenue} prefix="$" color="#34d399" icon={<DollarSign className="h-4 w-4" />} sub={vm.mrr > 0 ? `$${Math.round(vm.revenueToday).toLocaleString()} today · $${Math.round(vm.mrr).toLocaleString()}/mo MRR` : `$${Math.round(vm.revenueToday).toLocaleString()} today`} spark={vm.traffic} />
          <StatTile label="Visitors" value={vm.visitors} color="#22d3ee" icon={<Users className="h-4 w-4" />} sub={`${vm.visitorsWeek.toLocaleString()} this week`} spark={vm.traffic} />
          <StatTile label="Visitors Today" value={vm.visitorsToday} color="#38bdf8" icon={<TrendingUp className="h-4 w-4" />} spark={vm.traffic} />
          <StatTile label="Leads" value={vm.leads} color="#a855f7" icon={<Target className="h-4 w-4" />} />
          <StatTile label="Paying customers" value={vm.customers} color="#fb7185" icon={<Zap className="h-4 w-4" />} sub={(scope === "all" || scope === "text2sale") && vm.activeSubscribers > vm.customers ? `+${vm.activeSubscribers - vm.customers} comped` : undefined} />
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

          {/* All view → leaderboard · Single business → focused spotlight */}
          <div className="lg:col-span-4">
            {scope === "all" ? (
              <Panel title="All Businesses" glow="#a855f7">
                <div className="space-y-2">
                  {overview.businesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setScope(b.id)}
                      className="group/lb w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
                      style={{ boxShadow: `inset 3px 0 0 ${b.color}` }}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                          <span className="text-sm font-semibold text-white">{b.name}</span>
                        </div>
                        <span className="flex items-center gap-1.5">
                          {b.online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <span title={b.note} className="text-[9px] text-amber-400">setup</span>}
                          <ChevronRight className="h-3.5 w-3.5 text-white/25 transition group-hover/lb:translate-x-0.5 group-hover/lb:text-white/60" />
                        </span>
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
            ) : (
              vm.biz && <BusinessSpotlight biz={vm.biz} accent={vm.accent} />
            )}
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

        {/* Rich visitor intelligence + AI panels (scoped to the selected business) */}
        <Intelligence token={token} accent={vm.accent} demo={demo} scope={scope} bizName={vm.biz?.name} />

        <footer className="mt-8 flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-white/30">
          <span>Command Center · text2sale · aibusinessgrowth · trustedquotes · <a href="/command/install" className="hover:text-white/60">Install tracker on other sites →</a></span>
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

// Focused identity + secondary-stats card shown when ONE business is selected
// (replaces the all-businesses leaderboard so views never bleed together).
function BusinessSpotlight({ biz, accent }: { biz: BusinessMetrics; accent: string }) {
  const e = biz.extra;
  const n = (k: string) => Number(e[k] || 0);
  const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
  let stats: { label: string; value: string }[];
  if (biz.id === "text2sale") {
    stats = [
      { label: "MRR", value: money(n("mrr")) },
      { label: "This mo.", value: money(n("collectedThisMonth")) },
      { label: "Active subs", value: String(n("activeSubscribers")) },
      { label: "Contacts", value: n("contacts").toLocaleString() },
      { label: "Messages", value: n("messages").toLocaleString() },
      { label: "Calls", value: n("calls").toLocaleString() },
    ];
  } else if (biz.id === "aibusinessgrowth") {
    stats = [
      { label: "Subscribers", value: n("subscribers").toLocaleString() },
      { label: "Purchases", value: n("purchases").toLocaleString() },
      { label: "Conv. rate", value: `${biz.kpis.conversionRate.toFixed(1)}%` },
    ];
  } else {
    stats = [
      { label: "Partial leads", value: n("partialLeads").toLocaleString() },
      { label: "Completed", value: n("completedLeads").toLocaleString() },
      { label: "Conv. rate", value: `${biz.kpis.conversionRate.toFixed(1)}%` },
    ];
  }
  return (
    <Panel title="Business spotlight" glow={accent}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold" style={{ background: `${accent}22`, color: accent, boxShadow: `0 0 22px ${accent}44` }}>
          {biz.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-white">{biz.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/45">
            <span className="truncate">{biz.domain}</span>
            <span>·</span>
            {biz.online ? (
              <span className="flex shrink-0 items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live</span>
            ) : (
              <span className="shrink-0 text-amber-400">Setup</span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <div className="font-mono text-sm font-bold text-white">{s.value}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-white/35">{s.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Backdrop({ accent = "#a855f7" }: { accent?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* deep space base */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% -10%, #160a26 0%, #0a0712 48%, #040207 100%)" }} />
      {/* drifting tech grid */}
      <motion.div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            `linear-gradient(${accent}55 1px,transparent 1px),linear-gradient(90deg,${accent}55 1px,transparent 1px)`,
          backgroundSize: "46px 46px",
          maskImage: "radial-gradient(circle at 50% 0%, black, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 72%)",
        }}
        animate={{ backgroundPositionY: ["0px", "46px"] }}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
      />
      {/* horizontal scan sweep */}
      <motion.div
        className="absolute inset-x-0 h-40"
        style={{ background: `linear-gradient(to bottom, transparent, ${accent}14, transparent)` }}
        animate={{ top: ["-10%", "110%"] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
      />
      {/* ambient orbs (accent + cyan) */}
      <motion.div className="absolute -left-40 top-10 h-96 w-96 rounded-full" style={{ background: `radial-gradient(circle,${accent},transparent 70%)`, filter: "blur(70px)", opacity: 0.28 }} animate={{ x: [0, 60, 0], y: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 18 }} />
      <motion.div className="absolute right-0 top-40 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle,#22d3ee,transparent 70%)", filter: "blur(80px)", opacity: 0.18 }} animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ repeat: Infinity, duration: 22 }} />
      {/* vignette */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.65)" }} />
    </div>
  );
}

function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      // Hard 15s ceiling so a hung Supabase call doesn't trap the spinner forever
      const r = (await Promise.race([
        loginUser(email, password),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Sign-in timed out. Check your connection and try again.")), 15000)),
      ])) as Awaited<ReturnType<typeof loginUser>>;
      if (!r.success) {
        setErr(r.message);
        return;
      }
      onSignedIn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#07060d] text-white">
      <Backdrop />
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg,#a855f7,#22d3ee)", boxShadow: "0 0 40px #a855f780" }}>
            <Globe className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">COMMAND CENTER</h1>
          <p className="mt-1 text-xs text-white/40">Sign in as admin to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/50">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/50">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/60"
            />
          </div>
          {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{err}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-white/35">Admin only · text2sale.com / aibusinessgrowth / trustedquotes</p>
      </div>
    </div>
  );
}

function NotAdminScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#07060d] text-white">
      <Backdrop />
      <div className="relative z-10 w-full max-w-sm px-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="mt-1 mb-5 text-sm text-white/55">This account is signed in but doesn&apos;t have admin role on the Command Center.</p>
        <button onClick={onSignOut} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10">
          Sign out & try another account
        </button>
      </div>
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
