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
  type DomainCategory,
  type DomainVisit,
  type CallSession,
  type PresenceEvent,
  type TimeControl,
  type ContentFilter,
  type WifiAlert,
  type WifiSnapshot,
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

export default function WifiMonitor() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const snapshot = useMemo<WifiSnapshot>(() => getWifiSnapshot(), []);
  const byId = useMemo(() => new Map(snapshot.devices.map((d) => [d.id, d])), [snapshot]);
  const people = useMemo(() => groupByPerson(snapshot.devices), [snapshot]);
  const timeline = useMemo(
    () => [...snapshot.presence].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [snapshot],
  );

  const onlineCount = snapshot.devices.filter((d) => d.online).length;
  const peopleHome = people.filter((p) => p.name !== "Family" && p.devices.some((d) => d.online)).length;
  const dataToday = snapshot.devices.reduce((s, d) => s + d.dataDownMb + d.dataUpMb, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">📶 Home WiFi Monitor</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Everything happening on your network · updated {relativeTime(snapshot.generatedAt)}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Devices online" value={`${onlineCount}`} sub={`of ${snapshot.devices.length} known`} tone="emerald" icon="📡" />
        <Stat label="People home" value={`${peopleHome}`} sub="right now" tone="sky" icon="🏠" />
        <Stat label="Blocked today" value={`${snapshot.filter.blockedAttemptsToday}`} sub="filter hits" tone="red" icon="🚫" />
        <Stat label="Data used today" value={humanData(dataToday)} sub="all devices" tone="violet" icon="📊" />
      </div>

      <ScopeNotice />

      {snapshot.alerts.length > 0 && (
        <section>
          <SectionTitle>Alerts</SectionTitle>
          <AlertList alerts={snapshot.alerts} byId={byId} />
        </section>
      )}

      <section>
        <SectionTitle>Who&apos;s home right now</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <PersonCard key={p.name} name={p.name} devices={p.devices} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Devices on your network</SectionTitle>
        <DeviceInventory devices={snapshot.devices} />
      </section>

      <section>
        <SectionTitle>Today&apos;s comings &amp; goings</SectionTitle>
        <PresenceTimeline events={timeline} byId={byId} />
      </section>

      <section>
        <SectionTitle>Calls today</SectionTitle>
        <CallLog calls={snapshot.calls} byId={byId} />
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

function DeviceInventory({ devices }: { devices: WifiDevice[] }) {
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
                  <div>
                    <div className="font-medium text-white">
                      {d.label}
                      {d.isNew && (
                        <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">First seen {relativeTime(d.firstSeen)}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-zinc-200">{d.typeLabel}</div>
                <div className="text-xs text-zinc-500">
                  {d.vendor}
                  {d.os ? ` · ${d.os}` : ""}
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-300">{d.owner}</td>
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
