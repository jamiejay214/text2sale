/**
 * WiFi monitor — data model for the dashboard's "WiFi" tab.
 *
 * SCOPE — READ THIS. Everything here is *network metadata* observable on your
 * own home router: which devices are connected, what type/brand they are, when
 * they join or leave the WiFi, which domains they talk to, how much data they
 * move, and what your content filter blocked. That is the complete lawful
 * surface for a parent monitoring their own network, and this file models all
 * of it.
 *
 * It deliberately does NOT model, and must never be extended to capture, the
 * things that are illegal wiretapping and/or technically impossible over WiFi:
 *   - the contents of messages (texts, DMs, chats) — end-to-end encrypted;
 *   - call audio or who was on a call;
 *   - keystrokes, screenshots, camera or microphone;
 *   - decrypted page/payload contents (HTTPS deep-packet inspection);
 *   - anything requiring spyware secretly installed on a child's device.
 *
 * The bundled `getWifiSnapshot()` returns realistic demo data so the tab works
 * immediately. To feed it real data, replace it with readers for your own gear:
 *   - Presence + device inventory: router client list, or an ARP/nmap scan;
 *     resolve `vendor` from the MAC OUI and guess `os`/`kind` from fingerprints.
 *   - Domains, categories, blocked attempts, call detection: a DNS server you
 *     control (Pi-hole / AdGuard Home) with query logging + blocklists.
 *   - Bandwidth: per-client counters from the router (SNMP, nlbwmon, etc.).
 *   - Time controls / safe-search: your router or DNS parental-control config.
 */

export type DeviceKind = "phone" | "tablet" | "laptop" | "computer" | "console" | "tv" | "watch" | "iot" | "other";

export interface WifiDevice {
  id: string;
  owner: string;
  label: string;
  kind: DeviceKind;
  /** Human label for the device type, e.g. "iPhone", "Windows PC". */
  typeLabel: string;
  /** Hardware vendor resolved from the MAC OUI, e.g. "Apple". */
  vendor: string;
  /** Best-guess operating system, e.g. "iOS 17". */
  os?: string;
  mac: string;
  ip?: string;
  online: boolean;
  /** When this device last connected or disconnected (ISO 8601). */
  lastChangeAt: string;
  /** First time this device was ever seen on the network (ISO 8601). */
  firstSeen: string;
  /** Never-before-seen device that just joined — worth a look. */
  isNew?: boolean;
  band?: "2.4GHz" | "5GHz" | "6GHz";
  /** Wi-Fi signal strength in dBm (closer to 0 is stronger). */
  signalDbm?: number;
  /** Data downloaded / uploaded today, in MB. */
  dataDownMb: number;
  dataUpMb: number;
}

export interface PresenceEvent {
  id: string;
  deviceId: string;
  type: "arrived" | "left";
  at: string;
}

export type DomainCategory =
  | "social" | "video" | "gaming" | "messaging" | "education"
  | "shopping" | "news" | "search" | "adult" | "other";

export interface DomainVisit {
  deviceId: string;
  domain: string;
  service: string;
  category: DomainCategory;
  requests: number;
  lastSeenAt: string;
  blocked: boolean;
}

export interface CallSession {
  id: string;
  deviceId: string;
  service: string;
  kind: "voice" | "video";
  startedAt: string;
  durationMinutes: number;
}

export interface UsageSummary {
  deviceId: string;
  activeMinutesToday: number;
  topCategory: DomainCategory;
}

/** Per-device parental time controls and their current state. */
export interface TimeControl {
  deviceId: string;
  /** Local bedtime after which internet is paused, e.g. "21:30". */
  bedtime: string;
  dailyLimitMin: number;
  usedMin: number;
  /** Device is online right now despite being past its bedtime. */
  onlineAfterBedtime: boolean;
}

/** Network-wide content filtering configuration + today's counters. */
export interface ContentFilter {
  safeSearchEnforced: boolean;
  blockedCategories: DomainCategory[];
  blockedAttemptsToday: number;
  /** Which DNS filter is doing the work, for display. */
  provider: string;
}

export type AlertKind = "new-device" | "blocked" | "after-bedtime" | "adult-block";

export interface WifiAlert {
  id: string;
  kind: AlertKind;
  deviceId: string;
  message: string;
  at: string;
}

export interface WifiSnapshot {
  generatedAt: string;
  devices: WifiDevice[];
  presence: PresenceEvent[];
  domains: DomainVisit[];
  calls: CallSession[];
  usage: UsageSummary[];
  timeControls: TimeControl[];
  filter: ContentFilter;
  alerts: WifiAlert[];
}

export const CATEGORY_LABELS: Record<DomainCategory, string> = {
  social: "Social",
  video: "Video",
  gaming: "Gaming",
  messaging: "Messaging",
  education: "Education",
  shopping: "Shopping",
  news: "News",
  search: "Search",
  adult: "Adult / blocked",
  other: "Other",
};

export const KIND_EMOJI: Record<DeviceKind, string> = {
  phone: "📱",
  tablet: "📲",
  laptop: "💻",
  computer: "🖥️",
  console: "🎮",
  tv: "📺",
  watch: "⌚",
  iot: "🔌",
  other: "📡",
};

// --- formatting helpers -----------------------------------------------------

export function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m ago` : `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function humanDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function humanData(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export function signalLabel(dbm?: number): string {
  if (dbm == null) return "—";
  if (dbm >= -55) return "Excellent";
  if (dbm >= -67) return "Good";
  if (dbm >= -75) return "Fair";
  return "Weak";
}

// --- sample data ------------------------------------------------------------

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export function getWifiSnapshot(): WifiSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    devices: [
      { id: "dev-ava-phone", owner: "Ava", label: "Ava's iPhone", kind: "phone", typeLabel: "iPhone 14", vendor: "Apple", os: "iOS 17.4", mac: "A4:83:E7:11:2C:9F", ip: "192.168.1.42", online: true, lastChangeAt: minutesAgo(34), firstSeen: daysAgo(412), band: "5GHz", signalDbm: -52, dataDownMb: 1840, dataUpMb: 210 },
      { id: "dev-liam-tablet", owner: "Liam", label: "Liam's iPad", kind: "tablet", typeLabel: "iPad (10th gen)", vendor: "Apple", os: "iPadOS 17.4", mac: "F0:18:98:5A:71:0B", ip: "192.168.1.51", online: true, lastChangeAt: minutesAgo(158), firstSeen: daysAgo(230), band: "5GHz", signalDbm: -61, dataDownMb: 2960, dataUpMb: 145 },
      { id: "dev-liam-switch", owner: "Liam", label: "Nintendo Switch", kind: "console", typeLabel: "Game console", vendor: "Nintendo", os: "Horizon OS", mac: "7C:BB:8A:3D:44:12", ip: "192.168.1.60", online: false, lastChangeAt: minutesAgo(75), firstSeen: daysAgo(88), band: "2.4GHz", signalDbm: -70, dataDownMb: 540, dataUpMb: 60 },
      { id: "dev-ava-laptop", owner: "Ava", label: "Ava's school laptop", kind: "laptop", typeLabel: "Windows laptop", vendor: "Dell", os: "Windows 11", mac: "B8:27:EB:9C:1E:73", ip: "192.168.1.33", online: false, lastChangeAt: minutesAgo(410), firstSeen: daysAgo(365), band: "5GHz", signalDbm: -66, dataDownMb: 780, dataUpMb: 95 },
      { id: "dev-family-tv", owner: "Family", label: "Living Room TV", kind: "tv", typeLabel: "Smart TV", vendor: "Samsung", os: "Tizen", mac: "5C:49:7D:22:88:AA", ip: "192.168.1.20", online: true, lastChangeAt: minutesAgo(300), firstSeen: daysAgo(500), band: "5GHz", signalDbm: -58, dataDownMb: 5120, dataUpMb: 40 },
      { id: "dev-ava-watch", owner: "Ava", label: "Ava's Apple Watch", kind: "watch", typeLabel: "Apple Watch", vendor: "Apple", os: "watchOS 10", mac: "3A:BB:1C:44:9E:07", ip: "192.168.1.71", online: true, lastChangeAt: minutesAgo(34), firstSeen: daysAgo(120), band: "2.4GHz", signalDbm: -64, dataDownMb: 60, dataUpMb: 25 },
      { id: "dev-unknown", owner: "Unknown", label: "Unrecognized device", kind: "other", typeLabel: "Unknown", vendor: "Unknown (randomized MAC)", mac: "8E:2A:F1:00:3D:6B", ip: "192.168.1.88", online: true, lastChangeAt: minutesAgo(12), firstSeen: minutesAgo(12), isNew: true, band: "2.4GHz", signalDbm: -73, dataDownMb: 15, dataUpMb: 4 },
    ],
    presence: [
      { id: "p1", deviceId: "dev-ava-laptop", type: "left", at: minutesAgo(475) },
      { id: "p2", deviceId: "dev-ava-phone", type: "left", at: minutesAgo(470) },
      { id: "p3", deviceId: "dev-liam-tablet", type: "arrived", at: minutesAgo(158) },
      { id: "p4", deviceId: "dev-liam-switch", type: "arrived", at: minutesAgo(150) },
      { id: "p5", deviceId: "dev-liam-switch", type: "left", at: minutesAgo(75) },
      { id: "p6", deviceId: "dev-unknown", type: "arrived", at: minutesAgo(12) },
      { id: "p7", deviceId: "dev-ava-phone", type: "arrived", at: minutesAgo(34) },
    ],
    domains: [
      { deviceId: "dev-ava-phone", domain: "youtube.com", service: "YouTube", category: "video", requests: 214, lastSeenAt: minutesAgo(3), blocked: false },
      { deviceId: "dev-ava-phone", domain: "tiktok.com", service: "TikTok", category: "social", requests: 176, lastSeenAt: minutesAgo(6), blocked: false },
      { deviceId: "dev-ava-phone", domain: "snapchat.com", service: "Snapchat", category: "messaging", requests: 88, lastSeenAt: minutesAgo(12), blocked: false },
      { deviceId: "dev-ava-phone", domain: "discord.com", service: "Discord", category: "messaging", requests: 41, lastSeenAt: minutesAgo(21), blocked: false },
      { deviceId: "dev-ava-phone", domain: "adult-content.example", service: "Blocked site", category: "adult", requests: 2, lastSeenAt: minutesAgo(52), blocked: true },
      { deviceId: "dev-liam-tablet", domain: "roblox.com", service: "Roblox", category: "gaming", requests: 302, lastSeenAt: minutesAgo(2), blocked: false },
      { deviceId: "dev-liam-tablet", domain: "youtubekids.com", service: "YouTube Kids", category: "video", requests: 133, lastSeenAt: minutesAgo(9), blocked: false },
      { deviceId: "dev-liam-tablet", domain: "khanacademy.org", service: "Khan Academy", category: "education", requests: 47, lastSeenAt: minutesAgo(64), blocked: false },
      { deviceId: "dev-liam-switch", domain: "nintendo.net", service: "Nintendo Online", category: "gaming", requests: 58, lastSeenAt: minutesAgo(78), blocked: false },
      { deviceId: "dev-ava-laptop", domain: "classroom.google.com", service: "Google Classroom", category: "education", requests: 96, lastSeenAt: minutesAgo(415), blocked: false },
      { deviceId: "dev-family-tv", domain: "netflix.com", service: "Netflix", category: "video", requests: 410, lastSeenAt: minutesAgo(300), blocked: false },
    ],
    calls: [
      { id: "c1", deviceId: "dev-ava-phone", service: "FaceTime", kind: "video", startedAt: minutesAgo(48), durationMinutes: 22 },
      { id: "c2", deviceId: "dev-ava-phone", service: "Discord", kind: "voice", startedAt: minutesAgo(160), durationMinutes: 41 },
      { id: "c3", deviceId: "dev-liam-tablet", service: "WhatsApp", kind: "voice", startedAt: minutesAgo(95), durationMinutes: 9 },
    ],
    usage: [
      { deviceId: "dev-ava-phone", activeMinutesToday: 187, topCategory: "video" },
      { deviceId: "dev-liam-tablet", activeMinutesToday: 142, topCategory: "gaming" },
      { deviceId: "dev-liam-switch", activeMinutesToday: 75, topCategory: "gaming" },
      { deviceId: "dev-ava-laptop", activeMinutesToday: 63, topCategory: "education" },
      { deviceId: "dev-family-tv", activeMinutesToday: 95, topCategory: "video" },
    ],
    timeControls: [
      { deviceId: "dev-ava-phone", bedtime: "21:30", dailyLimitMin: 180, usedMin: 187, onlineAfterBedtime: false },
      { deviceId: "dev-liam-tablet", bedtime: "20:00", dailyLimitMin: 120, usedMin: 142, onlineAfterBedtime: true },
      { deviceId: "dev-ava-laptop", bedtime: "22:00", dailyLimitMin: 240, usedMin: 63, onlineAfterBedtime: false },
    ],
    filter: {
      safeSearchEnforced: true,
      blockedCategories: ["adult"],
      blockedAttemptsToday: 6,
      provider: "Pi-hole + SafeSearch",
    },
    alerts: [
      { id: "a1", kind: "new-device", deviceId: "dev-unknown", message: "A new, unrecognized device joined the WiFi", at: minutesAgo(12) },
      { id: "a2", kind: "after-bedtime", deviceId: "dev-liam-tablet", message: "Liam's iPad is online past its 8:00 PM bedtime", at: minutesAgo(20) },
      { id: "a3", kind: "adult-block", deviceId: "dev-ava-phone", message: "Blocked an adult-content site on Ava's iPhone", at: minutesAgo(52) },
    ],
  };
}
