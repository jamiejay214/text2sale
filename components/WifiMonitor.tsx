"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getWifiSnapshot,
  relativeTime,
  clockTime,
  humanDuration,
  humanData,
  signalLabel,
  CATEGORY_LABELS,
  KIND_EMOJI,
  type WifiDevice,
  type DeviceKind,
  type DomainCategory,
  type DomainVisit,
  type CallSession,
  type PresenceEvent,
  type TimeControl,
  type ContentFilter,
  type WifiAlert,
  type WeeklyTrend,
  type Watchlist,
  type WifiSnapshot,
  type NetworkHealth,
  type BlockedDomainStat,
  type GeoPeer,
  type BypassEvent,
  type CategoryLimit,
  type DeviceSchedule,
  type NotificationRule,
  type FilterLists,
  type DayActivity,
} from "@/components/wifi/wifi-data";

const CATEGORY_CHIP: Record<DomainCategory, string> = {
  social: "bg-pink-500/15 text-pink-300 ring-pink-500/30",
  video: "bg-red-500/15 text-red-300 ring-red-500/30",
  gaming: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  messaging: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  education: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  shopping: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  news: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  search: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  adult: "bg-red-500/20 text-red-200 ring-red-500/40",
  other: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

const CARD = "rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6";

// Local, per-browser edits to the device roster (rename, reassign owner, fix
// type). Persisted so changes survive refreshes without a backend.
const OVERRIDES_KEY = "wifiDeviceOverrides.v1";
type DeviceOverride = { label?: string; owner?: string; kind?: DeviceKind };
type DeviceOverrides = Record<string, DeviceOverride>;

const KIND_OPTIONS: DeviceKind[] = ["phone", "tablet", "laptop", "computer", "console", "tv", "watch", "iot", "other"];

function applyOverrides(s: WifiSnapshot, o: DeviceOverrides): WifiSnapshot {
  if (!o || Object.keys(o).length === 0) return s;
  return { ...s, devices: s.devices.map((d) => (o[d.id] ? { ...d, ...o[d.id] } : d)) };
}

type InnerTab = "everything" | "live" | "history" | "network" | "controls" | "summary" | "settings";

const PHONE_KINDS = new Set<DeviceKind>(["phone", "tablet", "watch"]);

function primaryApp(deviceId: string, domains: DomainVisit[]): DomainVisit | undefined {
  return domains
    .filter((v) => v.deviceId === deviceId)
    .sort((a, b) => b.requests - a.requests)[0];
}

// Deterministic, stable 24-hour activity shape for a device (so the timeline
// looks real and doesn't jump every render). Weighted toward afternoon/evening.
function deviceHours(device: WifiDevice): number[] {
  let seed = 0;
  for (const c of device.id) seed = (seed * 31 + c.charCodeAt(0)) % 9973;
  const rnd = (h: number) => ((Math.sin(seed + h * 12.9898) * 43758.5453) % 1 + 1) % 1;
  return Array.from({ length: 24 }, (_, h) => {
    if (!device.online && h > new Date().getHours()) return 0;
    const dayBias = h >= 7 && h <= 22 ? 1 : 0.15;
    const evening = h >= 15 && h <= 21 ? 1.6 : 1;
    return Math.round(rnd(h) * 10 * dayBias * evening);
  });
}

function exportDeviceJson(device: WifiDevice, snapshot: WifiSnapshot) {
  const data = {
    exportedAt: new Date().toISOString(),
    device,
    domains: snapshot.domains.filter((v) => v.deviceId === device.id),
    calls: snapshot.calls.filter((c) => c.deviceId === device.id),
    usage: snapshot.usage.find((u) => u.deviceId === device.id) ?? null,
    watchlistHits: snapshot.watchlist.matches.filter((m) => m.deviceId === device.id),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${device.label.replace(/\s+/g, "-").toLowerCase()}-wifi.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WifiMonitor() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Show the built-in sample immediately, then swap in live data from the home
  // collector (via /api/wifi/snapshot) once it loads. `dataMode` badges which
  // one is on screen. Re-fetches every 30s so the live view stays current.
  const [base, setBase] = useState<WifiSnapshot>(() => getWifiSnapshot());
  const [dataMode, setDataMode] = useState<"sample" | "live" | "stale">("sample");
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/wifi/snapshot", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { live?: boolean; stale?: boolean; snapshot?: WifiSnapshot };
        if (cancelled || !data?.snapshot) return;
        setBase(data.snapshot);
        setDataMode(data.live ? (data.stale ? "stale" : "live") : "sample");
      } catch {
        /* keep sample */
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Editable device roster — rename a device, fix who it belongs to, or correct
  // its type. Persisted to localStorage so edits stick across refreshes.
  const [overrides, setOverrides] = useState<DeviceOverrides>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(OVERRIDES_KEY);
      return raw ? (JSON.parse(raw) as DeviceOverrides) : {};
    } catch {
      return {};
    }
  });
  const [editing, setEditing] = useState(false);
  const patchDevice = (id: string, patch: DeviceOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      try {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const resetOverrides = () => {
    setOverrides({});
    try {
      localStorage.removeItem(OVERRIDES_KEY);
    } catch {
      /* ignore */
    }
  };

  const snapshot = useMemo<WifiSnapshot>(() => applyOverrides(base, overrides), [base, overrides]);
  const byId = useMemo(() => new Map(snapshot.devices.map((d) => [d.id, d])), [snapshot]);
  const people = useMemo(() => groupByPerson(snapshot.devices), [snapshot]);
  const timeline = useMemo(
    () => [...snapshot.presence].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [snapshot],
  );

  const [filter, setFilter] = useState<"all" | "phones">("all");
  const [tab, setTab] = useState<InnerTab>("everything");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(snapshot.devices[0]?.id ?? "");
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});

  const visibleDevices = snapshot.devices.filter((d) => {
    if (filter === "phones" && !PHONE_KINDS.has(d.kind)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      d.label.toLowerCase().includes(q) ||
      d.owner.toLowerCase().includes(q) ||
      (d.ip ?? "").includes(q) ||
      snapshot.domains.some((v) => v.deviceId === d.id && (v.domain.includes(q) || v.service.toLowerCase().includes(q)))
    );
  });

  const selected = byId.get(selectedId) ?? snapshot.devices[0];
  const totalRequests = snapshot.devices.reduce((s, d) => s + d.requests, 0);

  return (
    <div className="space-y-4">
      <TopBar
        requests={totalRequests}
        deviceCount={snapshot.devices.length}
        alerts={snapshot.alerts.length}
        generatedAt={snapshot.generatedAt}
        dataMode={dataMode}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <DeviceSidebar
          devices={visibleDevices}
          total={snapshot.devices.length}
          filter={filter}
          onFilter={setFilter}
          selectedId={selected?.id ?? ""}
          onSelect={(id) => {
            setSelectedId(id);
            setTab("everything");
          }}
          blocked={blocked}
          onBlock={(id) => setBlocked((b) => ({ ...b, [id]: !b[id] }))}
          domains={snapshot.domains}
        />

        <div className="min-w-0 space-y-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎  Search devices, owners, apps, domains…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-sky-400"
          />

          <InnerTabs tab={tab} onTab={setTab} calls={snapshot.calls.length} />

          {tab === "everything" && selected && (
            <EverythingDossier key={selected.id} device={selected} snapshot={snapshot} onRename={(id, name) => patchDevice(id, { label: name })} />
          )}
          {tab === "live" && <LiveFeed snapshot={snapshot} byId={byId} />}
          {tab === "history" && (
            <div className="space-y-6">
              <section>
                <SectionTitle>Today&apos;s comings &amp; goings</SectionTitle>
                <PresenceTimeline events={timeline} byId={byId} />
              </section>
              <section>
                <SectionTitle>Calls today</SectionTitle>
                <CallLog calls={snapshot.calls} byId={byId} />
              </section>
            </div>
          )}
          {tab === "network" && <NetworkTab snapshot={snapshot} byId={byId} />}
          {tab === "controls" && <ControlsTab snapshot={snapshot} byId={byId} />}
          {tab === "summary" && <SummaryTab snapshot={snapshot} people={people} byId={byId} />}
          {tab === "settings" && (
            <SettingsTab
              snapshot={snapshot}
              byId={byId}
              editing={editing}
              onToggleEdit={() => setEditing((e) => !e)}
              onPatch={patchDevice}
              onReset={resetOverrides}
              hasOverrides={Object.keys(overrides).length > 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- shell ------------------------------------------------------------------

function TopBar({ requests, deviceCount, alerts, generatedAt, dataMode }: { requests: number; deviceCount: number; alerts: number; generatedAt: string; dataMode: "sample" | "live" | "stale" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 text-xl shadow-[0_0_24px_rgba(139,92,246,0.5)]">📡</span>
        <div>
          <h2 className="text-lg font-bold text-white">Home WiFi Monitor</h2>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/40">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {dataMode === "sample" ? "Sample data" : "Live WiFi traffic"} · {relativeTime(generatedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatPill icon="🌐" value={requests.toLocaleString()} label="Requests" />
        <StatPill icon="📱" value={`${deviceCount}`} label="Devices" />
        <StatPill icon="⚠️" value={`${alerts}`} label="Alerts" tone={alerts > 0 ? "amber" : undefined} />
        {dataMode === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </span>
        ) : dataMode === "stale" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300" title="Collector hasn't reported recently">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> STALE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60" title="Showing sample data — start the home collector to go live">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" /> SAMPLE
          </span>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon, value, label, tone }: { icon: string; value: string; label: string; tone?: "amber" }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5">
      <span>{icon}</span>
      <div className="leading-tight">
        <div className={`text-base font-bold ${tone === "amber" ? "text-amber-300" : "text-white"}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      </div>
    </div>
  );
}

function DeviceSidebar({
  devices,
  total,
  filter,
  onFilter,
  selectedId,
  onSelect,
  blocked,
  onBlock,
  domains,
}: {
  devices: WifiDevice[];
  total: number;
  filter: "all" | "phones";
  onFilter: (f: "all" | "phones") => void;
  selectedId: string;
  onSelect: (id: string) => void;
  blocked: Record<string, boolean>;
  onBlock: (id: string) => void;
  domains: DomainVisit[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Devices</span>
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">{total}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 text-xs font-medium">
        {(["all", "phones"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={`rounded-xl px-3 py-1.5 transition ${filter === f ? "bg-emerald-500/20 text-emerald-300" : "text-white/50 hover:text-white"}`}
          >
            {f === "all" ? "🌐 All WiFi" : "📱 Phones"}
          </button>
        ))}
      </div>
      <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
        {devices.length === 0 && <p className="px-1 py-4 text-center text-xs text-zinc-500">No devices match.</p>}
        {devices.map((d) => (
          <DeviceCard
            key={d.id}
            device={d}
            app={primaryApp(d.id, domains)}
            selected={d.id === selectedId}
            blocked={!!blocked[d.id]}
            onSelect={() => onSelect(d.id)}
            onBlock={() => onBlock(d.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DeviceCard({
  device,
  app,
  selected,
  blocked,
  onSelect,
  onBlock,
}: {
  device: WifiDevice;
  app?: DomainVisit;
  selected: boolean;
  blocked: boolean;
  onSelect: () => void;
  onBlock: () => void;
}) {
  return (
    <div
      className="rounded-2xl border bg-white/[0.02] p-3 transition"
      style={{
        borderColor: selected ? "#38bdf8" : "rgba(255,255,255,0.08)",
        boxShadow: selected ? "0 0 18px rgba(56,189,248,0.25)" : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{KIND_EMOJI[device.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{device.label}</span>
            {device.isNew && <span className="rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-300">NEW</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="rounded bg-white/5 px-1.5 py-px text-zinc-400">{KIND_EMOJI[device.kind]} {device.typeLabel}</span>
            <span>{device.ip ?? "—"}</span>
          </div>
        </div>
        <span className={`h-2 w-2 rounded-full ${blocked ? "bg-red-500" : device.online ? "bg-emerald-400" : "bg-zinc-600"}`} />
      </div>

      {app && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className={`rounded-full px-1.5 py-0.5 ring-1 ring-inset ${CATEGORY_CHIP[app.category]}`}>{app.service}</span>
          <span className="truncate text-zinc-600">{app.domain}</span>
        </div>
      )}

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-500">
          <div>
            <div className="font-mono text-xs text-zinc-300">{device.requests.toLocaleString()}</div>
            req
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-300">{humanData(device.dataDownMb)}</div>↓
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-300">{humanData(device.dataUpMb)}</div>↑
          </div>
        </div>
        <Sparkline data={device.spark} />
      </div>

      <div className="mt-2 flex gap-1.5">
        <button onClick={onSelect} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-medium text-white/70 transition hover:text-white">
          ▸ Details
        </button>
        <button
          onClick={onBlock}
          className="rounded-lg border px-2 py-1.5 text-[11px] font-medium transition"
          style={{
            borderColor: blocked ? "#22c55e40" : "#ef444440",
            background: blocked ? "#22c55e1a" : "#ef44441a",
            color: blocked ? "#86efac" : "#fca5a5",
          }}
        >
          {blocked ? "✓ Unblock" : "🚫 Block"}
        </button>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const w = 60;
  const h = 22;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const INNER_TABS: { id: InnerTab; label: string }[] = [
  { id: "everything", label: "⚡ Everything" },
  { id: "live", label: "📡 Live Feed" },
  { id: "history", label: "🗒️ History" },
  { id: "network", label: "🌐 Network" },
  { id: "controls", label: "🛡️ Controls" },
  { id: "summary", label: "📊 Summary" },
  { id: "settings", label: "⚙️ Settings" },
];

function InnerTabs({ tab, onTab, calls }: { tab: InnerTab; onTab: (t: InnerTab) => void; calls: number }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
      {INNER_TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
            tab === t.id ? "bg-sky-500/20 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          {t.label}
          {t.id === "history" && calls > 0 && (
            <span className="rounded-full bg-sky-500/30 px-1.5 text-[10px] font-semibold text-sky-200">{calls}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Everything dossier -----------------------------------------------------

function EverythingDossier({
  device,
  snapshot,
  onRename,
}: {
  device: WifiDevice;
  snapshot: WifiSnapshot;
  onRename: (id: string, name: string) => void;
}) {
  // Local state resets when a different device is selected because the parent
  // remounts this component with key={device.id}.
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(device.label);
  const saveName = () => {
    onRename(device.id, draft.trim() || device.label);
    setRenaming(false);
  };

  const domains = snapshot.domains.filter((v) => v.deviceId === device.id);
  const calls = snapshot.calls.filter((c) => c.deviceId === device.id);
  const usage = snapshot.usage.find((u) => u.deviceId === device.id);
  const flags = snapshot.watchlist.matches.filter((m) => m.deviceId === device.id);
  const blockedHits = domains.filter((v) => v.blocked).length;
  const arrival = snapshot.presence
    .filter((p) => p.deviceId === device.id && p.type === "arrived")
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0];
  const hours = deviceHours(device);
  const topApps = [...domains].sort((a, b) => b.requests - a.requests).slice(0, 6);
  const recent = [...domains].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()).slice(0, 8);

  const info: [string, string][] = [
    ["Type", device.typeLabel],
    ["Vendor", device.vendor],
    ["OS", device.os ?? "—"],
    ["Owner", device.owner],
    ["IP address", device.ip ?? "—"],
    ["MAC", device.mac],
    ["Band", device.band ?? "—"],
    ["Signal", `${signalLabel(device.signalDbm)}${device.signalDbm != null ? ` (${device.signalDbm} dBm)` : ""}`],
    ["First seen", relativeTime(device.firstSeen)],
    ["Requests today", device.requests.toLocaleString()],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{KIND_EMOJI[device.kind]}</span>
            <div>
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") {
                        setDraft(device.label);
                        setRenaming(false);
                      }
                    }}
                    aria-label="Device name"
                    className="rounded-md border border-sky-400 bg-white/10 px-2 py-1 text-lg font-bold text-white outline-none"
                  />
                  <button onClick={saveName} className="rounded-md bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-200">Save</button>
                  <button
                    onClick={() => {
                      setDraft(device.label);
                      setRenaming(false);
                    }}
                    className="px-1 text-xs text-white/40 hover:text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  {device.label}
                  <button
                    onClick={() => setRenaming(true)}
                    title="Rename this device"
                    className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-white/50 transition hover:text-white"
                  >
                    ✎ edit name
                  </button>
                </h3>
              )}
              <p className="max-w-xl text-sm text-zinc-500">
                Everything Tracker — wake &amp; last-seen, screen time per app, domains, data, and flagged searches. Metadata only.
              </p>
            </div>
          </div>
          <button
            onClick={() => exportDeviceJson(device, snapshot)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            ⬇ Export JSON
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          {info.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-zinc-600">{k}</div>
              <div className="truncate font-mono text-sm text-zinc-300" title={v}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Wake time" value={arrival ? clockTime(arrival.at) : "—"} />
        <StatTile label="Last seen" value={device.online ? "now" : relativeTime(device.lastChangeAt)} accent={device.online ? "#34d399" : undefined} />
        <StatTile label="Active today" value={usage ? humanDuration(usage.activeMinutesToday) : "—"} />
        <StatTile label="Flagged searches" value={`${flags.length}`} accent={flags.length ? "#fca5a5" : undefined} />
        <StatTile label="Calls" value={`${calls.length}`} />
        <StatTile label="Domains" value={`${domains.length}`} />
        <StatTile label="Data ↓" value={humanData(device.dataDownMb)} accent="#38bdf8" />
        <StatTile label="Data ↑" value={humanData(device.dataUpMb)} accent="#38bdf8" />
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">🕓 24-hour activity (today)</div>
        <HourlyTimeline hours={hours} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <SectionTitle>Time by category</SectionTitle>
          {domains.length ? (
            <CategoryBreakdown domains={domains} />
          ) : (
            <p className="text-sm text-zinc-500">No activity recorded for this device today.</p>
          )}
        </div>
        <div>
          <SectionTitle>Top apps by screen time</SectionTitle>
          <TopApps apps={topApps} />
        </div>
      </div>

      <div>
        <SectionTitle>Recent activity</SectionTitle>
        {recent.length ? (
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
            {recent.map((v, i) => (
              <div key={v.domain} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-zinc-800/60" : ""}`}>
                <span title={v.blocked ? "Blocked" : "Allowed"}>{v.blocked ? "🚫" : "🌐"}</span>
                <span className="flex-1 truncate">
                  <span className="font-medium text-zinc-200">{v.service}</span>
                  <span className="text-zinc-500"> · {v.domain}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${CATEGORY_CHIP[v.category]}`}>{CATEGORY_LABELS[v.category]}</span>
                <span className="w-14 text-right text-xs tabular-nums text-zinc-600">{v.requests} hits</span>
                <time className="w-20 flex-shrink-0 text-right text-xs text-zinc-600">{relativeTime(v.lastSeenAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No activity recorded for this device today.</p>
        )}
      </div>

      {blockedHits > 0 && (
        <p className="text-xs text-red-300">🚫 {blockedHits} blocked request{blockedHits > 1 ? "s" : ""} on this device today.</p>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-2xl font-bold" style={{ color: accent ?? "#fff" }}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function HourlyTimeline({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {hours.map((v, h) => (
          <div key={h} className="flex-1" title={`${h}:00 — ${v} req`}>
            <div
              className="w-full rounded-t bg-gradient-to-t from-sky-600/40 to-sky-400"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? "3px" : "0" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>12am</span>
        <span>6am</span>
        <span>noon</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
    </div>
  );
}

function TopApps({ apps }: { apps: DomainVisit[] }) {
  if (apps.length === 0) return <p className="text-sm text-zinc-500">No app sessions yet.</p>;
  const max = Math.max(1, ...apps.map((a) => a.requests));
  return (
    <div className="space-y-2 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
      {apps.map((a) => (
        <div key={a.domain} className="flex items-center gap-3 text-sm">
          <span className="w-28 flex-shrink-0 truncate text-zinc-200">{a.service}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${(a.requests / max) * 100}%` }} />
          </div>
          <span className="w-20 flex-shrink-0 text-right text-xs text-zinc-500">~{humanDuration(Math.max(1, Math.round(a.requests / 8)))}</span>
        </div>
      ))}
    </div>
  );
}

// --- Live feed --------------------------------------------------------------

interface FeedEntry {
  at: string;
  icon: string;
  text: string;
  who?: string;
  tone?: string;
}

function LiveFeed({ snapshot, byId }: { snapshot: WifiSnapshot; byId: Map<string, WifiDevice> }) {
  const name = (id: string) => byId.get(id)?.label ?? id;
  const entries: FeedEntry[] = [
    ...snapshot.domains.map((v) => ({ at: v.lastSeenAt, icon: v.blocked ? "🚫" : "🌐", text: `${name(v.deviceId)} → ${v.service} (${v.domain})`, tone: v.blocked ? "#fca5a5" : undefined })),
    ...snapshot.calls.map((c) => ({ at: c.startedAt, icon: c.kind === "video" ? "📹" : "📞", text: `${name(c.deviceId)} — ${c.kind} call via ${c.service}` })),
    ...snapshot.presence.map((p) => ({ at: p.at, icon: p.type === "arrived" ? "🟢" : "🚪", text: `${name(p.deviceId)} ${p.type === "arrived" ? "joined the WiFi" : "left the WiFi"}` })),
    ...snapshot.watchlist.matches.map((m) => ({ at: m.at, icon: "⚠️", text: `${name(m.deviceId)} — watched term “${m.term}” in a ${m.source}`, tone: "#fca5a5" })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live feed · newest first
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {entries.map((e, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t border-zinc-800/60" : ""}`}>
            <span>{e.icon}</span>
            <span className="flex-1 truncate" style={{ color: e.tone ?? "#d4d4d8" }}>{e.text}</span>
            <time className="flex-shrink-0 text-xs text-zinc-600">{relativeTime(e.at)}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Summary + Settings tabs ------------------------------------------------

// --- Network tab ------------------------------------------------------------

const BLOCK_CHIP: Record<string, string> = {
  ads: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  trackers: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  malware: "bg-red-500/20 text-red-200 ring-red-500/40",
  adult: "bg-red-500/20 text-red-200 ring-red-500/40",
  custom: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

function NetworkTab({ snapshot, byId }: { snapshot: WifiSnapshot; byId: Map<string, WifiDevice> }) {
  const n: NetworkHealth = snapshot.network;
  const blockedPct = n.dnsQueriesToday ? Math.round((n.blockedQueriesToday / n.dnsQueriesToday) * 100) : 0;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Download" value={`${n.throughputDownMbps} Mbps`} accent="#38bdf8" />
        <StatTile label="Upload" value={`${n.throughputUpMbps} Mbps`} accent="#38bdf8" />
        <StatTile label="Clients online" value={`${n.clientsOnline}`} accent="#34d399" />
        <StatTile label="DNS queries today" value={n.dnsQueriesToday.toLocaleString()} />
        <StatTile label="Blocked" value={`${blockedPct}%`} accent="#fca5a5" />
      </div>
      <section>
        <SectionTitle>Ads, trackers &amp; malware blocked</SectionTitle>
        <BlockedDomains items={snapshot.blockedDomains} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle>Where traffic goes (server locations)</SectionTitle>
          <GeoList peers={snapshot.geoPeers} />
        </section>
        <section>
          <SectionTitle>Filter-bypass attempts (VPN / encrypted DNS)</SectionTitle>
          <BypassList events={snapshot.bypass} byId={byId} />
        </section>
      </div>
    </div>
  );
}

function BlockedDomains({ items }: { items: BlockedDomainStat[] }) {
  const max = Math.max(1, ...items.map((i) => i.hits));
  const total = items.reduce((s, i) => s + i.hits, 0);
  return (
    <div className={`${CARD} space-y-3`}>
      <div className="text-sm text-zinc-400">{total.toLocaleString()} requests blocked today — ads, trackers, malware and adult domains.</div>
      {items.map((i) => (
        <div key={i.domain} className="flex items-center gap-3 text-sm">
          <span className="w-48 flex-shrink-0 truncate font-mono text-zinc-300" title={i.domain}>{i.domain}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${BLOCK_CHIP[i.category]}`}>{i.category}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-red-500/70" style={{ width: `${(i.hits / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right tabular-nums text-zinc-400">{i.hits.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function GeoList({ peers }: { peers: GeoPeer[] }) {
  const max = Math.max(1, ...peers.map((p) => p.connections));
  return (
    <div className={`${CARD} space-y-3`}>
      {peers.map((p) => (
        <div key={p.code} className="flex items-center gap-3 text-sm">
          <span className="w-40 flex-shrink-0 truncate text-zinc-300">{p.country}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${(p.connections / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right tabular-nums text-zinc-400">{p.connections.toLocaleString()}</span>
        </div>
      ))}
      <p className="text-xs text-zinc-600">Destination countries of the servers your devices talk to — never the content of those connections.</p>
    </div>
  );
}

function BypassList({ events, byId }: { events: BypassEvent[]; byId: Map<string, WifiDevice> }) {
  if (events.length === 0) {
    return (
      <div className={CARD}>
        <p className="text-sm text-emerald-300">✓ No filter-bypass attempts detected.</p>
      </div>
    );
  }
  return (
    <div className={`${CARD} space-y-2`}>
      {events.map((e) => {
        const d = byId.get(e.deviceId);
        return (
          <div key={e.id} className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm">
            <span className="text-lg">🕵️</span>
            <div className="min-w-0 flex-1">
              <div className="text-amber-100"><span className="font-semibold">{e.method}</span> · {d?.label ?? e.deviceId}</div>
              <div className="text-xs text-amber-200/60">{e.note}</div>
            </div>
            <time className="flex-shrink-0 text-xs text-amber-200/60">{relativeTime(e.at)}</time>
          </div>
        );
      })}
    </div>
  );
}

// --- Controls tab -----------------------------------------------------------

function ControlsTab({ snapshot, byId }: { snapshot: WifiSnapshot; byId: Map<string, WifiDevice> }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle>Content filtering &amp; safe search</SectionTitle>
          <FilterStatus filter={snapshot.filter} />
        </section>
        <section>
          <SectionTitle>Daily time budgets by category</SectionTitle>
          <CategoryLimits limits={snapshot.categoryLimits} />
        </section>
      </div>
      <section>
        <SectionTitle>Blocked &amp; allowed sites</SectionTitle>
        <ListsEditor lists={snapshot.lists} />
      </section>
      <section>
        <SectionTitle>Per-device internet schedule &amp; pause</SectionTitle>
        <Schedules schedules={snapshot.schedules} byId={byId} />
      </section>
      <section>
        <SectionTitle>Notifications</SectionTitle>
        <RuleToggles rules={snapshot.notificationRules} />
      </section>
    </div>
  );
}

function CategoryLimits({ limits }: { limits: CategoryLimit[] }) {
  return (
    <div className={`${CARD} space-y-3`}>
      {limits.map((l) => {
        const over = l.usedMin >= l.limitMin;
        const pct = Math.min(100, (l.usedMin / l.limitMin) * 100);
        return (
          <div key={l.category}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-200">{CATEGORY_LABELS[l.category]}</span>
              <span className={over ? "text-red-300" : "text-zinc-500"}>
                {humanDuration(l.usedMin)} / {humanDuration(l.limitMin)}{over ? " · over" : ""}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListsEditor({ lists }: { lists: FilterLists }) {
  const [state, setState] = useState<FilterLists>(() => {
    if (typeof window === "undefined") return lists;
    try {
      const raw = window.localStorage.getItem("wifiLists.v1");
      return raw ? (JSON.parse(raw) as FilterLists) : lists;
    } catch {
      return lists;
    }
  });
  const persist = (next: FilterLists) => {
    setState(next);
    try {
      window.localStorage.setItem("wifiLists.v1", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const add = (key: keyof FilterLists, value: string) => {
    const v = value.trim().toLowerCase();
    if (!v || state[key].includes(v)) return;
    persist({ ...state, [key]: [...state[key], v] });
  };
  const remove = (key: keyof FilterLists, value: string) => persist({ ...state, [key]: state[key].filter((x) => x !== value) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ListColumn title="Blocked sites" tone="red" items={state.blocklist} onAdd={(v) => add("blocklist", v)} onRemove={(v) => remove("blocklist", v)} />
      <ListColumn title="Always-allowed sites" tone="emerald" items={state.allowlist} onAdd={(v) => add("allowlist", v)} onRemove={(v) => remove("allowlist", v)} />
    </div>
  );
}

function ListColumn({ title, tone, items, onAdd, onRemove }: { title: string; tone: "red" | "emerald"; items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    onAdd(val);
    setVal("");
  };
  return (
    <div className={CARD}>
      <div className="mb-2 text-sm font-medium" style={{ color: tone === "red" ? "#fca5a5" : "#86efac" }}>{title}</div>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="example.com"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-400"
        />
        <button onClick={submit} className="rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition hover:text-white">Add</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-zinc-600">None yet.</span>}
        {items.map((x) => (
          <span key={x} className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-white/10">
            {x}
            <button onClick={() => onRemove(x)} className="text-zinc-500 transition hover:text-white" aria-label={`Remove ${x}`}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function Schedules({ schedules, byId }: { schedules: DeviceSchedule[]; byId: Map<string, WifiDevice> }) {
  const [paused, setPaused] = useState<Record<string, boolean>>(() => Object.fromEntries(schedules.map((s) => [s.deviceId, s.paused])));
  return (
    <div className={`${CARD} space-y-3`}>
      {schedules.map((s) => {
        const d = byId.get(s.deviceId);
        const isPaused = paused[s.deviceId];
        return (
          <div key={s.deviceId} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex-1 text-zinc-200">{d?.label ?? s.deviceId}</span>
            <span className="text-xs text-zinc-500">Internet {s.allowedFrom}–{s.allowedTo}</span>
            <button
              onClick={() => setPaused((p) => ({ ...p, [s.deviceId]: !p[s.deviceId] }))}
              className="rounded-lg border px-3 py-1 text-xs font-medium transition"
              style={{
                borderColor: isPaused ? "#22c55e40" : "#ef444440",
                background: isPaused ? "#22c55e1a" : "#ef44441a",
                color: isPaused ? "#86efac" : "#fca5a5",
              }}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause now"}
            </button>
          </div>
        );
      })}
      <p className="text-xs text-zinc-600">Pausing cuts a device&apos;s internet at the router. Wiring this to your real router/DNS applies it for real.</p>
    </div>
  );
}

function RuleToggles({ rules }: { rules: NotificationRule[] }) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(rules.map((r) => [r.id, r.enabled]));
    if (typeof window === "undefined") return base;
    try {
      const raw = window.localStorage.getItem("wifiRules.v1");
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });
  const toggle = (id: string) => {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem("wifiRules.v1", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return (
    <div className={`${CARD} space-y-1`}>
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/5">
          <span className="text-zinc-300">{r.label}</span>
          <button
            onClick={() => toggle(r.id)}
            role="switch"
            aria-checked={!!state[r.id]}
            aria-label={r.label}
            className="relative h-5 w-9 flex-shrink-0 rounded-full transition"
            style={{ background: state[r.id] ? "#22c55e" : "#3f3f46" }}
          >
            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: state[r.id] ? "1.125rem" : "0.125rem" }} />
          </button>
        </div>
      ))}
      <p className="px-2 pt-1 text-xs text-zinc-600">Choose which events send you a push/email alert. Saved on this device.</p>
    </div>
  );
}

function WeekHeatmap({ data }: { data: DayActivity[] }) {
  const max = Math.max(1, ...data.flatMap((d) => d.hours));
  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div className="min-w-[560px]">
        {data.map((d) => (
          <div key={d.day} className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-zinc-500">{d.day}</span>
            <div className="flex flex-1 gap-0.5">
              {d.hours.map((v, h) => (
                <div key={h} className="h-4 flex-1 rounded-sm" title={`${d.day} ${h}:00 — ${v}`} style={{ background: `rgba(139,92,246,${0.08 + 0.92 * (v / max)})` }} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex gap-2">
          <span className="w-8" />
          <div className="flex flex-1 justify-between text-[10px] text-zinc-600">
            <span>12a</span>
            <span>6a</span>
            <span>noon</span>
            <span>6p</span>
            <span>12a</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTab({ snapshot, people, byId }: { snapshot: WifiSnapshot; people: Person[]; byId: Map<string, WifiDevice> }) {
  const onlineCount = snapshot.devices.filter((d) => d.online).length;
  const peopleHome = people.filter((p) => p.name !== "Family" && p.devices.some((d) => d.online)).length;
  const dataToday = snapshot.devices.reduce((s, d) => s + d.dataDownMb + d.dataUpMb, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Devices online" value={`${onlineCount}`} sub={`of ${snapshot.devices.length} known`} tone="emerald" icon="📡" />
        <Stat label="People home" value={`${peopleHome}`} sub="right now" tone="sky" icon="🏠" />
        <Stat label="Blocked today" value={`${snapshot.filter.blockedAttemptsToday}`} sub="filter hits" tone="red" icon="🚫" />
        <Stat label="Data used today" value={humanData(dataToday)} sub="all devices" tone="violet" icon="📊" />
      </div>

      {snapshot.alerts.length > 0 && (
        <section>
          <SectionTitle>Alerts</SectionTitle>
          <AlertList alerts={snapshot.alerts} byId={byId} />
        </section>
      )}

      <section>
        <SectionTitle>Safety keyword watchlist</SectionTitle>
        <WatchlistPanel watchlist={snapshot.watchlist} byId={byId} />
      </section>

      <section>
        <SectionTitle>Per-kid daily digest</SectionTitle>
        <DailyDigest snapshot={snapshot} people={people} />
      </section>

      <section>
        <SectionTitle>Who&apos;s home right now</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <PersonCard key={p.name} name={p.name} devices={p.devices} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Activity by device</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.devices
            .filter((d) => snapshot.domains.some((v) => v.deviceId === d.id))
            .map((d) => (
              <DeviceActivityCard
                key={d.id}
                device={d}
                domains={snapshot.domains.filter((v) => v.deviceId === d.id)}
                usageMinutes={snapshot.usage.find((u) => u.deviceId === d.id)?.activeMinutesToday ?? 0}
              />
            ))}
        </div>
      </section>

      <section>
        <SectionTitle>What they&apos;re spending time on</SectionTitle>
        <CategoryBreakdown domains={snapshot.domains} />
      </section>

      <section>
        <SectionTitle>This week vs last</SectionTitle>
        <WeeklyTrends trends={snapshot.weeklyTrends} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle>Data usage per device</SectionTitle>
          <DataUsage devices={snapshot.devices} />
        </section>
        <section>
          <SectionTitle>Screen time today</SectionTitle>
          <ScreenTime snapshot={snapshot} byId={byId} />
        </section>
      </div>

      <section>
        <SectionTitle>Activity heatmap — this week</SectionTitle>
        <WeekHeatmap data={snapshot.weekHeatmap} />
      </section>
    </div>
  );
}

function SettingsTab({
  snapshot,
  byId,
  editing,
  onToggleEdit,
  onPatch,
  onReset,
  hasOverrides,
}: {
  snapshot: WifiSnapshot;
  byId: Map<string, WifiDevice>;
  editing: boolean;
  onToggleEdit: () => void;
  onPatch: (id: string, patch: DeviceOverride) => void;
  onReset: () => void;
  hasOverrides: boolean;
}) {
  return (
    <div className="space-y-8">
      <ScopeNotice />

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle>Content filtering &amp; safe search</SectionTitle>
          <FilterStatus filter={snapshot.filter} />
        </section>
        <section>
          <SectionTitle>Time limits &amp; bedtime</SectionTitle>
          <TimeControls controls={snapshot.timeControls} byId={byId} />
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Devices — names, owners &amp; types</SectionTitle>
          <div className="flex items-center gap-2">
            {editing && hasOverrides && (
              <button onClick={onReset} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white">
                Reset edits
              </button>
            )}
            <button
              onClick={onToggleEdit}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
              style={{
                borderColor: editing ? "#38bdf8" : "rgba(255,255,255,0.1)",
                background: editing ? "#38bdf826" : "rgba(255,255,255,0.05)",
                color: editing ? "#fff" : "rgba(255,255,255,0.7)",
              }}
            >
              {editing ? "✓ Done editing" : "✎ Edit devices"}
            </button>
          </div>
        </div>
        {editing && (
          <p className="mb-2 text-xs text-sky-300">Rename a device, change who it belongs to, or fix its type. Saved on this device.</p>
        )}
        <DeviceInventory devices={snapshot.devices} editing={editing} onPatch={onPatch} />
      </section>
    </div>
  );
}

// --- primitives -------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h3>;
}

const TONES: Record<string, string> = {
  emerald: "border-emerald-500/20 from-emerald-500/10 text-emerald-300",
  sky: "border-sky-500/20 from-sky-500/10 text-sky-300",
  red: "border-red-500/20 from-red-500/10 text-red-300",
  violet: "border-violet-500/20 from-violet-500/10 text-violet-300",
};

function Stat({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: string; icon: string }) {
  return (
    <div className={`rounded-3xl border bg-gradient-to-br via-zinc-900 to-zinc-950 p-5 ${TONES[tone]}`}>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>{icon}</span> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function ScopeNotice() {
  return (
    <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-950 p-5 text-sm">
      <div className="flex items-center gap-2 font-medium text-sky-200">
        <span>ℹ️</span> What this shows — and what it can&apos;t (by law and by physics)
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-medium text-emerald-300">✓ Sees (your own network)</p>
          <ul className="mt-1 space-y-0.5 text-zinc-400">
            <li>• Every device on the WiFi — type, brand, OS, IP, signal</li>
            <li>• When each device joins or leaves (home / away)</li>
            <li>• Which websites &amp; apps each device connects to (by domain)</li>
            <li>• Data used per device, and new-device / after-bedtime alerts</li>
            <li>• That a call happened via an app, and how long it lasted</li>
            <li>• Blocked-site attempts and safe-search status</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-red-300">✗ Can&apos;t see (and won&apos;t)</p>
          <ul className="mt-1 space-y-0.5 text-zinc-400">
            <li>• The contents of texts, DMs or chats — encrypted</li>
            <li>• Who was on a call, or a second of the audio</li>
            <li>• The pages/videos inside an HTTPS connection</li>
            <li>• Keystrokes, screens, camera or microphone</li>
            <li>• Anything once a device is off your WiFi (on cellular)</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        This is the full lawful feature set of a home-network monitor. Reading message text or call
        audio would require wiretapping or spyware on the device — illegal and not possible over
        WiFi — so it is deliberately excluded. Use this openly with your kids.
      </p>
    </div>
  );
}

function AlertList({ alerts, byId }: { alerts: WifiAlert[]; byId: Map<string, WifiDevice> }) {
  const ICON: Record<string, string> = { "new-device": "🆕", blocked: "🚫", "after-bedtime": "🌙", "adult-block": "⛔" };
  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const device = byId.get(a.deviceId);
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm"
          >
            <span className="text-lg">{ICON[a.kind] ?? "⚠️"}</span>
            <span className="flex-1 text-amber-100">
              {a.message}
              {device && <span className="text-amber-200/60"> · {device.label}</span>}
            </span>
            <time className="text-xs text-amber-200/60">{relativeTime(a.at)}</time>
          </div>
        );
      })}
    </div>
  );
}

interface Person {
  name: string;
  devices: WifiDevice[];
}

function groupByPerson(devices: WifiDevice[]): Person[] {
  const map = new Map<string, WifiDevice[]>();
  for (const d of devices) {
    const list = map.get(d.owner) ?? [];
    list.push(d);
    map.set(d.owner, list);
  }
  return [...map.entries()].map(([name, list]) => ({ name, devices: list }));
}

function PersonCard({ name, devices }: { name: string; devices: WifiDevice[] }) {
  const online = devices.filter((d) => d.online);
  const isHome = online.length > 0;
  const anchor = (isHome ? online : devices).reduce((latest, d) =>
    new Date(d.lastChangeAt) > new Date(latest.lastChangeAt) ? d : latest,
  );

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{name}</span>
        {isHome ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            🏠 Home
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/30 px-2.5 py-1 text-xs font-medium text-zinc-400 ring-1 ring-zinc-600/40">
            Away
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {isHome ? "Home since" : "Away since"} {clockTime(anchor.lastChangeAt)} ({relativeTime(anchor.lastChangeAt)})
      </p>
      <ul className="mt-3 space-y-1.5">
        {devices.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <span>{KIND_EMOJI[d.kind]}</span>
            <span className="flex-1 truncate text-zinc-300">{d.label}</span>
            <span className="text-xs text-zinc-600">{d.typeLabel}</span>
            <span className={`h-2 w-2 rounded-full ${d.online ? "bg-emerald-400" : "bg-zinc-600"}`} title={d.online ? "On WiFi" : "Off WiFi"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeviceInventory({
  devices,
  editing,
  onPatch,
}: {
  devices: WifiDevice[];
  editing: boolean;
  onPatch: (id: string, patch: DeviceOverride) => void;
}) {
  const inputCls =
    "w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-sky-400";
  return (
    <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900/50">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-zinc-500">
          <tr className="border-b border-zinc-800">
            <th className="px-4 py-3 font-medium">Device</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Connection</th>
            <th className="px-4 py-3 font-medium">IP / MAC</th>
            <th className="px-4 py-3 font-medium">Data today</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id} className="border-b border-zinc-800/60 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{KIND_EMOJI[d.kind]}</span>
                  <div className="min-w-[9rem]">
                    {editing ? (
                      <input
                        className={inputCls}
                        value={d.label}
                        aria-label="Device name"
                        onChange={(e) => onPatch(d.id, { label: e.target.value })}
                      />
                    ) : (
                      <div className="font-medium text-white">
                        {d.label}
                        {d.isNew && (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
                            NEW
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-zinc-500">First seen {relativeTime(d.firstSeen)}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {editing ? (
                  <select
                    className={inputCls}
                    value={d.kind}
                    aria-label="Device type"
                    onChange={(e) => onPatch(d.id, { kind: e.target.value as DeviceKind })}
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k} className="bg-zinc-900">
                        {KIND_EMOJI[k]} {k}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="text-zinc-200">{d.typeLabel}</div>
                    <div className="text-xs text-zinc-500">
                      {d.vendor}
                      {d.os ? ` · ${d.os}` : ""}
                    </div>
                  </>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-300">
                {editing ? (
                  <input
                    className={inputCls}
                    value={d.owner}
                    aria-label="Owner"
                    onChange={(e) => onPatch(d.id, { owner: e.target.value })}
                  />
                ) : (
                  d.owner
                )}
              </td>
              <td className="px-4 py-3">
                <div className="text-zinc-300">{d.band ?? "—"}</div>
                <div className="text-xs text-zinc-500">
                  {signalLabel(d.signalDbm)}
                  {d.signalDbm != null ? ` (${d.signalDbm} dBm)` : ""}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-zinc-300">{d.ip ?? "—"}</div>
                <div className="font-mono text-xs text-zinc-600">{d.mac}</div>
              </td>
              <td className="px-4 py-3 text-zinc-300">
                <div>↓ {humanData(d.dataDownMb)}</div>
                <div className="text-xs text-zinc-500">↑ {humanData(d.dataUpMb)}</div>
              </td>
              <td className="px-4 py-3">
                {d.online ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-zinc-500">
                    <span className="h-2 w-2 rounded-full bg-zinc-600" /> Offline
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PresenceTimeline({ events, byId }: { events: PresenceEvent[]; byId: Map<string, WifiDevice> }) {
  if (events.length === 0) return <p className="text-sm text-zinc-500">No arrivals or departures yet today.</p>;
  return (
    <ol className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
      {events.map((e, i) => {
        const device = byId.get(e.deviceId);
        const arrived = e.type === "arrived";
        return (
          <li key={e.id} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? "border-t border-zinc-800/70" : ""}`}>
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${arrived ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
              {arrived ? "🟢" : "🚪"}
            </span>
            <span className="flex-1 text-zinc-300">
              <span className="font-medium text-white">{device?.owner ?? "Unknown"}</span>{" "}
              {arrived ? "arrived home" : "left home"}
              <span className="text-zinc-500"> · {device?.label ?? e.deviceId}</span>
            </span>
            <time className="flex-shrink-0 text-right text-zinc-400">
              {clockTime(e.at)}
              <span className="block text-xs text-zinc-600">{relativeTime(e.at)}</span>
            </time>
          </li>
        );
      })}
    </ol>
  );
}

function CallLog({ calls, byId }: { calls: CallSession[]; byId: Map<string, WifiDevice> }) {
  const sorted = [...calls].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  if (sorted.length === 0) return <p className="text-sm text-zinc-500">No call sessions detected today.</p>;
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
      <ol>
        {sorted.map((call, i) => {
          const device = byId.get(call.deviceId);
          const video = call.kind === "video";
          return (
            <li key={call.id} className={`flex items-center gap-3 px-4 py-3 text-sm ${i > 0 ? "border-t border-zinc-800/70" : ""}`}>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/15">{video ? "📹" : "📞"}</span>
              <span className="flex-1 text-zinc-300">
                <span className="font-medium text-white">{device?.owner ?? "Unknown"}</span> had a {video ? "video" : "voice"} call via{" "}
                <span className="font-medium text-white">{call.service}</span>
                <span className="text-zinc-500"> · {device?.label ?? call.deviceId}</span>
              </span>
              <span className="flex-shrink-0 text-right text-zinc-400">
                {clockTime(call.startedAt)}
                <span className="block text-xs text-zinc-600">{humanDuration(call.durationMinutes)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-zinc-800/70 px-4 py-2 text-xs text-zinc-600">
        Detected from network traffic. Shows the app and how long — never the other person or the audio, which are encrypted and off-network.
      </p>
    </div>
  );
}

function DeviceActivityCard({ device, domains, usageMinutes }: { device: WifiDevice; domains: DomainVisit[]; usageMinutes: number }) {
  const sorted = [...domains].sort((a, b) => b.requests - a.requests);
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{KIND_EMOJI[device.kind]}</span>
        <div className="flex-1">
          <p className="font-medium text-white">{device.label}</p>
          <p className="text-xs text-zinc-500">
            {device.typeLabel} · {device.online ? "on WiFi" : "off WiFi"} · {humanDuration(usageMinutes)} active today
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {sorted.map((v) => (
          <li key={v.domain} className="flex items-center gap-2 text-sm">
            <span title={v.blocked ? "Blocked by filter" : "Allowed"}>{v.blocked ? "🚫" : "🛡️"}</span>
            <span className="flex-1 truncate">
              <span className="font-medium text-zinc-200">{v.service}</span>
              <span className="text-zinc-500"> · {v.domain}</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_CHIP[v.category]}`}>
              {CATEGORY_LABELS[v.category]}
            </span>
            <span className="w-16 text-right text-xs tabular-nums text-zinc-500">{v.requests} hits</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryBreakdown({ domains }: { domains: DomainVisit[] }) {
  const totals = new Map<DomainCategory, number>();
  for (const v of domains) totals.set(v.category, (totals.get(v.category) ?? 0) + v.requests);
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className={`${CARD} space-y-3`}>
      {rows.map(([cat, n]) => (
        <div key={cat} className="flex items-center gap-3 text-sm">
          <span className="w-28 flex-shrink-0 text-zinc-300">{CATEGORY_LABELS[cat]}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="w-16 flex-shrink-0 text-right tabular-nums text-zinc-400">{n} hits</span>
        </div>
      ))}
    </div>
  );
}

function DataUsage({ devices }: { devices: WifiDevice[] }) {
  const rows = [...devices].sort((a, b) => b.dataDownMb + b.dataUpMb - (a.dataDownMb + a.dataUpMb));
  const max = Math.max(1, ...rows.map((d) => d.dataDownMb + d.dataUpMb));
  return (
    <div className={`${CARD} space-y-3`}>
      {rows.map((d) => {
        const total = d.dataDownMb + d.dataUpMb;
        return (
          <div key={d.id} className="flex items-center gap-3 text-sm">
            <span className="w-40 flex-shrink-0 truncate text-zinc-300">{d.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${(total / max) * 100}%` }} />
            </div>
            <span className="w-20 flex-shrink-0 text-right tabular-nums text-zinc-400">{humanData(total)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ScreenTime({ snapshot, byId }: { snapshot: WifiSnapshot; byId: Map<string, WifiDevice> }) {
  const rows = [...snapshot.usage].sort((a, b) => b.activeMinutesToday - a.activeMinutesToday);
  const max = Math.max(1, ...rows.map((r) => r.activeMinutesToday));
  return (
    <div className={`${CARD} space-y-3`}>
      {rows.map((row) => {
        const device = byId.get(row.deviceId);
        return (
          <div key={row.deviceId} className="flex items-center gap-3 text-sm">
            <span className="w-40 flex-shrink-0 truncate text-zinc-300">{device?.label ?? row.deviceId}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${(row.activeMinutesToday / max) * 100}%` }} />
            </div>
            <span className="w-16 flex-shrink-0 text-right tabular-nums text-zinc-400">{humanDuration(row.activeMinutesToday)}</span>
          </div>
        );
      })}
    </div>
  );
}

function WatchlistPanel({ watchlist, byId }: { watchlist: Watchlist; byId: Map<string, WifiDevice> }) {
  const catStyle: Record<string, string> = {
    "self-harm": "bg-red-500/20 text-red-200 ring-red-500/40",
    drugs: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    violence: "bg-red-500/15 text-red-300 ring-red-500/30",
    adult: "bg-red-500/20 text-red-200 ring-red-500/40",
    bullying: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
    custom: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  };
  return (
    <div className={`${CARD} space-y-4`}>
      <div>
        <div className="mb-2 text-xs text-zinc-400">Watching for</div>
        <div className="flex flex-wrap gap-1.5">
          {watchlist.terms.map((t) => (
            <span key={t} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-white/10">
              {t}
            </span>
          ))}
        </div>
      </div>
      {watchlist.matches.length === 0 ? (
        <p className="text-sm text-emerald-300">✓ No watched terms seen recently.</p>
      ) : (
        <div className="space-y-2">
          {watchlist.matches.map((m) => {
            const device = byId.get(m.deviceId);
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm">
                <span className="text-lg">⚠️</span>
                <span className="flex-1 text-red-100">
                  Term <span className="font-semibold">&ldquo;{m.term}&rdquo;</span> seen in a {m.source}
                  <span className="text-red-200/60"> · {device?.owner ?? "Unknown"} · {device?.label ?? m.deviceId}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${catStyle[m.category]}`}>{m.category}</span>
                <time className="text-xs text-red-200/60">{relativeTime(m.at)}</time>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-zinc-600">
        Flags watched terms where the network can see them — unencrypted searches, DNS lookups, domain names.
        Most search is encrypted, so treat this as a tripwire, not a full record.
      </p>
    </div>
  );
}

function DailyDigest({ snapshot, people }: { snapshot: WifiSnapshot; people: Person[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const ids = new Set(p.devices.map((d) => d.id));
        const activeMin = snapshot.usage.filter((u) => ids.has(u.deviceId)).reduce((s, u) => s + u.activeMinutesToday, 0);
        const data = p.devices.reduce((s, d) => s + d.dataDownMb + d.dataUpMb, 0);
        const calls = snapshot.calls.filter((c) => ids.has(c.deviceId));
        const blocked = snapshot.domains.filter((v) => ids.has(v.deviceId) && v.blocked).length;
        const flags = snapshot.watchlist.matches.filter((m) => ids.has(m.deviceId)).length;
        const online = p.devices.some((d) => d.online);
        const catTotals = new Map<DomainCategory, number>();
        for (const v of snapshot.domains) if (ids.has(v.deviceId)) catTotals.set(v.category, (catTotals.get(v.category) ?? 0) + v.requests);
        const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
        return (
          <div key={p.name} className={CARD}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{p.name}</span>
              <span className={`text-xs ${online ? "text-emerald-300" : "text-zinc-500"}`}>{online ? "home" : "away"}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {humanDuration(activeMin)} active today · {humanData(data)} data
              {calls.length > 0 ? ` · ${calls.length} call${calls.length > 1 ? "s" : ""}` : ""}.
            </p>
            {topCats.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-xs text-zinc-500">Mostly</span>
                {topCats.map((c) => (
                  <span key={c} className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${CATEGORY_CHIP[c]}`}>
                    {CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>
            )}
            {(blocked > 0 || flags > 0) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {blocked > 0 && <span className="text-red-300">🚫 {blocked} blocked</span>}
                {flags > 0 && <span className="text-amber-300">⚠️ {flags} watchlist hit{flags > 1 ? "s" : ""}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeeklyTrends({ trends }: { trends: WeeklyTrend[] }) {
  return (
    <div className={`${CARD} space-y-3`}>
      {trends.map((t) => {
        const up = t.deltaPct >= 0;
        return (
          <div key={t.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 flex-shrink-0 truncate text-zinc-200">
              {t.label}
              {t.firstTimeThisWeek && (
                <span className="ml-1.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-500/40">
                  NEW
                </span>
              )}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${CATEGORY_CHIP[t.category]}`}>
              {CATEGORY_LABELS[t.category]}
            </span>
            <span className="flex-1 text-right text-xs text-zinc-500">
              {humanDuration(t.lastWeekMin)} → {humanDuration(t.thisWeekMin)}
            </span>
            <span className={`w-16 text-right font-medium tabular-nums ${t.firstTimeThisWeek ? "text-sky-300" : up ? "text-red-300" : "text-emerald-300"}`}>
              {t.firstTimeThisWeek ? "new" : `${up ? "▲" : "▼"} ${Math.abs(t.deltaPct)}%`}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-zinc-600">
        Week-over-week change in time per app. A jump in social/video or a brand-new app is often what&apos;s worth a conversation.
      </p>
    </div>
  );
}

function FilterStatus({ filter }: { filter: ContentFilter }) {
  return (
    <div className={`${CARD} space-y-3 text-sm`}>
      <Row label="Filter provider" value={filter.provider} />
      <Row
        label="Safe search"
        value={filter.safeSearchEnforced ? "Enforced" : "Off"}
        tone={filter.safeSearchEnforced ? "emerald" : "red"}
      />
      <Row label="Blocked attempts today" value={`${filter.blockedAttemptsToday}`} />
      <div className="flex items-center justify-between">
        <span className="text-zinc-400">Blocked categories</span>
        <div className="flex flex-wrap justify-end gap-1">
          {filter.blockedCategories.map((c) => (
            <span key={c} className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${CATEGORY_CHIP[c]}`}>
              {CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeControls({ controls, byId }: { controls: TimeControl[]; byId: Map<string, WifiDevice> }) {
  return (
    <div className={`${CARD} space-y-4 text-sm`}>
      {controls.map((c) => {
        const device = byId.get(c.deviceId);
        const over = c.usedMin >= c.dailyLimitMin;
        const pct = Math.min(100, (c.usedMin / c.dailyLimitMin) * 100);
        return (
          <div key={c.deviceId}>
            <div className="flex items-center justify-between">
              <span className="text-zinc-200">{device?.label ?? c.deviceId}</span>
              <span className="text-xs text-zinc-500">Bedtime {c.bedtime}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={over ? "text-red-300" : "text-zinc-500"}>
                {humanDuration(c.usedMin)} of {humanDuration(c.dailyLimitMin)} {over ? "· over limit" : ""}
              </span>
              {c.onlineAfterBedtime && <span className="text-amber-300">🌙 online past bedtime</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const color = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-zinc-200";
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
