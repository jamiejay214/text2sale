import type { WifiSnapshot } from "@/components/wifi/wifi-data";

/**
 * A fully-populated but empty snapshot. Real snapshots from the home collector
 * are merged over this so every field the UI expects exists, without mixing in
 * demo/sample data — sections the collector can't fill just show up empty.
 */
export function emptySnapshot(): WifiSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    devices: [],
    presence: [],
    domains: [],
    calls: [],
    usage: [],
    timeControls: [],
    filter: { safeSearchEnforced: false, blockedCategories: [], blockedAttemptsToday: 0, provider: "—" },
    alerts: [],
    weeklyTrends: [],
    watchlist: { terms: [], matches: [] },
    network: { throughputDownMbps: 0, throughputUpMbps: 0, clientsOnline: 0, dnsQueriesToday: 0, blockedQueriesToday: 0 },
    blockedDomains: [],
    geoPeers: [],
    bypass: [],
    categoryLimits: [],
    schedules: [],
    notificationRules: [],
    lists: { blocklist: [], allowlist: [] },
    weekHeatmap: [],
  };
}

/**
 * Merge a partial snapshot (whatever the collector could gather) onto the empty
 * base. Shallow per top-level field: arrays/objects the collector sends win,
 * everything else falls back to empty. `clientsOnline` is derived if absent.
 */
export function normalizeSnapshot(input: unknown): WifiSnapshot {
  const base = emptySnapshot();
  if (!input || typeof input !== "object") return base;
  const p = input as Partial<WifiSnapshot>;
  const merged: WifiSnapshot = {
    ...base,
    ...p,
    generatedAt: new Date().toISOString(),
    filter: { ...base.filter, ...(p.filter ?? {}) },
    network: { ...base.network, ...(p.network ?? {}) },
    watchlist: { ...base.watchlist, ...(p.watchlist ?? {}) },
    lists: { ...base.lists, ...(p.lists ?? {}) },
  };
  if (!p.network?.clientsOnline) {
    merged.network.clientsOnline = merged.devices.filter((d) => d.online).length;
  }
  return merged;
}
