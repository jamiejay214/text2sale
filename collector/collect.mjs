#!/usr/bin/env node
/**
 * Home WiFi collector for the Command Center's Home WiFi Monitor.
 *
 * Runs on any always-on machine on your home network (a spare laptop, a
 * Raspberry Pi, a NAS). Every interval it:
 *   1. discovers ALL devices on the LAN (ping-sweep + ARP table),
 *   2. resolves each device's vendor (MAC OUI) and a best-guess type,
 *   3. optionally pulls domain activity from a Pi-hole or AdGuard Home,
 *   4. POSTs a metadata-only snapshot to your site's /api/wifi/ingest.
 *
 * It is metadata only: device presence, vendor/type, and (via your DNS filter)
 * which domains were queried. It never sees message contents, call audio, or
 * anything inside an encrypted connection — that's not on the wire.
 *
 * Zero dependencies — plain Node 18+. Configure with env vars:
 *   SITE_URL             e.g. https://text2sale.com         (required)
 *   WIFI_INGEST_SECRET   same value set on the server       (required)
 *   SUBNET               e.g. 192.168.1   (default: guessed from your IP)
 *   INTERVAL_SEC         seconds between runs (default 60; 0 = run once)
 *   HOUSEHOLD            label if you run more than one home (default "home")
 *   PIHOLE_URL           e.g. http://192.168.1.10  (optional, for domains)
 *   PIHOLE_TOKEN         Pi-hole API token         (optional)
 *   AGH_URL, AGH_USER, AGH_PASS   AdGuard Home instead of Pi-hole (optional)
 *   STATE_FILE           path for cross-run state (default ./.wifi-state.json)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import dns from "node:dns/promises";

const exec = promisify(execFile);

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
const SECRET = process.env.WIFI_INGEST_SECRET;
const INTERVAL = Number(process.env.INTERVAL_SEC ?? "60");
const HOUSEHOLD = process.env.HOUSEHOLD ?? "home";
const STATE_FILE = process.env.STATE_FILE ?? "./.wifi-state.json";

if (!SITE_URL || !SECRET) {
  console.error("Set SITE_URL and WIFI_INGEST_SECRET. See the header of this file.");
  process.exit(1);
}

// --- tiny MAC OUI → vendor table (extend as you like) -----------------------
const OUI = {
  Apple: ["A4:83:E7", "F0:18:98", "3A:BB:1C", "AC:BC:32", "DC:A9:04", "F4:F1:5A", "8C:85:90", "34:C0:59"],
  Samsung: ["5C:49:7D", "8C:77:12", "E8:50:8B", "FC:A1:3E"],
  Google: ["1C:F2:9A", "F4:F5:D8", "3C:5A:B4", "DA:A1:19"],
  Amazon: ["FC:65:DE", "44:65:0D", "68:37:E9", "50:DC:E7"],
  Nintendo: ["7C:BB:8A", "98:B6:E9", "E0:E7:51"],
  Sony: ["00:D9:D1", "FC:0F:E6", "A8:E3:EE"],
  Microsoft: ["7C:1E:52", "58:82:A8", "C0:33:5E"],
  Roku: ["B0:A7:37", "CC:6D:A0", "DC:3A:5E"],
  Dell: ["B8:27:EB", "18:03:73", "F8:BC:12"], // note: B8:27:EB is actually Raspberry Pi
  Intel: ["94:65:9C", "34:41:5D", "A0:C5:89"],
};
function vendorFor(mac) {
  const p = mac.toUpperCase().split(":").slice(0, 3).join(":");
  for (const [name, prefixes] of Object.entries(OUI)) if (prefixes.includes(p)) return name;
  // Locally-administered / randomized MAC (2nd hex nibble is 2/6/A/E)
  const second = parseInt(mac[1], 16);
  if (!Number.isNaN(second) && (second & 0x2)) return "Unknown (randomized MAC)";
  return "Unknown";
}

function guessKind(hostname, vendor) {
  const h = (hostname || "").toLowerCase();
  const v = (vendor || "").toLowerCase();
  if (/iphone|pixel|galaxy|phone|android/.test(h)) return ["phone", "Phone"];
  if (/ipad|tablet|tab-/.test(h)) return ["tablet", "Tablet"];
  if (/watch/.test(h)) return ["watch", "Smartwatch"];
  if (/tv|roku|firetv|chromecast|shield|appletv|bravia|samsung/.test(h) || v === "roku") return ["tv", "Smart TV"];
  if (/switch|playstation|ps4|ps5|xbox/.test(h) || v === "nintendo" || v === "sony") return ["console", "Game console"];
  if (/macbook|laptop|thinkpad|xps|pc-|desktop|imac/.test(h)) return ["laptop", "Computer"];
  if (v === "apple") return ["phone", "Apple device"];
  if (/echo|nest|hue|ring|printer|cam|plug|bulb|sensor/.test(h)) return ["iot", "Smart home device"];
  return ["other", "Device"];
}

// --- device discovery -------------------------------------------------------
function localSubnet() {
  if (process.env.SUBNET) return process.env.SUBNET;
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) return a.address.split(".").slice(0, 3).join(".");
    }
  }
  return "192.168.1";
}

async function pingSweep(subnet) {
  const isWin = process.platform === "win32";
  const args = (ip) => (isWin ? ["-n", "1", "-w", "300", ip] : ["-c", "1", "-W", "1", ip]);
  const jobs = [];
  for (let i = 1; i <= 254; i++) {
    jobs.push(exec("ping", args(`${subnet}.${i}`)).catch(() => {}));
  }
  await Promise.allSettled(jobs);
}

async function arpTable() {
  const out = { list: [] };
  const push = (ip, mac) => {
    if (!ip || !mac || /(00:){5}00|ff:ff:ff/i.test(mac) || mac === "incomplete") return;
    out.list.push({ ip, mac: mac.toLowerCase() });
  };
  try {
    if (process.platform === "linux") {
      const { stdout } = await exec("ip", ["neigh", "show"]);
      for (const line of stdout.split("\n")) {
        const m = line.match(/^(\d+\.\d+\.\d+\.\d+)\s.*\slladdr\s([0-9a-f:]{17})\s+(\w+)/i);
        if (m && m[3].toUpperCase() !== "FAILED") push(m[1], m[2]);
      }
    } else {
      const { stdout } = await exec("arp", ["-a"]);
      for (const line of stdout.split("\n")) {
        const m = line.match(/(\d+\.\d+\.\d+\.\d+).*?([0-9a-f]{1,2}(?:[:-][0-9a-f]{1,2}){5})/i);
        if (m) push(m[1], m[2].replace(/-/g, ":").split(":").map((h) => h.padStart(2, "0")).join(":"));
      }
    }
  } catch (e) {
    console.error("arp/ip neigh failed:", e.message);
  }
  // de-dupe by mac
  const seen = new Map();
  for (const d of out.list) if (!seen.has(d.mac)) seen.set(d.mac, d);
  return [...seen.values()];
}

async function hostnameFor(ip) {
  try {
    const names = await dns.reverse(ip);
    return names[0]?.replace(/\.(local|lan|home)\.?$/i, "") ?? "";
  } catch {
    return "";
  }
}

// --- optional domain activity from Pi-hole / AdGuard ------------------------
async function piholeDomains(ipToDevice) {
  if (!process.env.PIHOLE_URL || !process.env.PIHOLE_TOKEN) return [];
  try {
    const url = `${process.env.PIHOLE_URL.replace(/\/$/, "")}/admin/api.php?getAllQueries&auth=${process.env.PIHOLE_TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = json?.data ?? [];
    const agg = new Map(); // key deviceId|domain
    for (const r of rows) {
      // [timestamp, type, domain, client, status, ...]
      const domain = r[2];
      const client = r[3];
      const blocked = String(r[4]) === "1" || String(r[4]) === "4";
      const dev = ipToDevice.get(client);
      if (!dev || !domain) continue;
      const key = `${dev.id}|${domain}`;
      const cur = agg.get(key) ?? { deviceId: dev.id, domain, service: domain.split(".").slice(-2).join("."), category: "other", requests: 0, lastSeenAt: new Date().toISOString(), blocked };
      cur.requests += 1;
      cur.blocked = cur.blocked || blocked;
      agg.set(key, cur);
    }
    return [...agg.values()];
  } catch (e) {
    console.error("Pi-hole fetch failed:", e.message);
    return [];
  }
}

// --- state (firstSeen + presence across runs) -------------------------------
async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return { firstSeen: {}, online: [] };
  }
}
async function saveState(state) {
  try {
    await writeFile(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    console.error("could not write state:", e.message);
  }
}

// --- one collection cycle ---------------------------------------------------
async function runOnce() {
  const subnet = localSubnet();
  await pingSweep(subnet);
  const found = await arpTable();

  const state = await loadState();
  const now = new Date().toISOString();
  const prevOnline = new Set(state.online ?? []);
  const nowOnline = new Set(found.map((d) => d.mac));
  const presence = [];

  const devices = [];
  const ipToDevice = new Map();
  for (const { ip, mac } of found) {
    const hostname = await hostnameFor(ip);
    const vendor = vendorFor(mac);
    const [kind, typeLabel] = guessKind(hostname, vendor);
    const id = `dev-${mac.replace(/:/g, "")}`;
    const firstSeen = state.firstSeen[mac] ?? now;
    state.firstSeen[mac] = firstSeen;
    const isNew = !prevOnline.has(mac) && firstSeen === now;
    if (!prevOnline.has(mac)) presence.push({ id: `p-${mac}-${Date.now()}`, deviceId: id, type: "arrived", at: now });
    const dev = {
      id, owner: "", label: hostname || `${vendor} device (${mac.slice(-5)})`,
      kind, typeLabel, vendor, mac, ip, online: true,
      lastChangeAt: now, firstSeen, isNew,
      dataDownMb: 0, dataUpMb: 0, requests: 0, spark: [],
    };
    devices.push(dev);
    ipToDevice.set(ip, dev);
  }
  // devices that were online last run but not now => left
  for (const mac of prevOnline) {
    if (!nowOnline.has(mac)) presence.push({ id: `p-${mac}-${Date.now()}`, deviceId: `dev-${mac.replace(/:/g, "")}`, type: "left", at: now });
  }

  const domains = await piholeDomains(ipToDevice);
  for (const v of domains) {
    const dev = devices.find((d) => d.id === v.deviceId);
    if (dev) dev.requests += v.requests;
  }

  state.online = [...nowOnline];
  await saveState(state);

  const snapshot = {
    household: HOUSEHOLD,
    generatedAt: now,
    devices,
    presence,
    domains,
    network: {
      throughputDownMbps: 0, throughputUpMbps: 0,
      clientsOnline: devices.length,
      dnsQueriesToday: domains.reduce((s, d) => s + d.requests, 0),
      blockedQueriesToday: domains.filter((d) => d.blocked).reduce((s, d) => s + d.requests, 0),
    },
  };

  const res = await fetch(`${SITE_URL}/api/wifi/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-wifi-key": SECRET },
    body: JSON.stringify(snapshot),
  });
  const text = await res.text();
  console.log(`[${now}] ${devices.length} devices, ${domains.length} domain rows → ingest ${res.status} ${text}`);
}

async function main() {
  await runOnce();
  if (INTERVAL > 0) {
    setInterval(() => runOnce().catch((e) => console.error("cycle error:", e.message)), INTERVAL * 1000);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
