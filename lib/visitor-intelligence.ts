// ─────────────────────────────────────────────────────────────────────────
// Rich visitor intelligence aggregations.
//
// Reads from page_views, exit_clicks, lead_intents (text2sale Supabase).
// Returns the data shapes the new Command Center panels consume.
// ─────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "@supabase/supabase-js";

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function sinceISO(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export type ChannelRow = { channel: string; sessions: number; visitors: number; pct: number };
export type ReferrerRow = { domain: string; sessions: number };
export type CampaignRow = { source: string; medium: string; campaign: string; sessions: number };
export type ExitRow = { to_domain: string; clicks: number; top_from_path: string };
export type RecentVisitor = {
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
export type VisitorTimelineEvent = {
  at: string;
  type: "page" | "intent" | "exit";
  label: string;
  detail?: string;
};
export type EngagementMetrics = {
  avgSessionDepth: number;
  bounceRatePct: number;
  formStarts: number;
  ctaClicks: number;
  deepScrollPct: number;
  avgEngagementSec: number;
};

export async function getChannelBreakdown(days = 14): Promise<ChannelRow[]> {
  const sb = client();
  const { data } = await sb
    .from("page_views")
    .select("channel,session_id,visitor_id")
    .gte("created_at", sinceISO(days));
  const rows = data || [];

  const sessions = new Map<string, Set<string>>(); // channel -> set of session_ids
  const visitors = new Map<string, Set<string>>(); // channel -> set of visitor_ids
  let total = 0;
  for (const r of rows) {
    const ch = (r as { channel?: string }).channel || "direct";
    const sid = (r as { session_id?: string }).session_id || "";
    const vid = (r as { visitor_id?: string }).visitor_id || "";
    if (!sessions.has(ch)) sessions.set(ch, new Set());
    if (!visitors.has(ch)) visitors.set(ch, new Set());
    if (sid) sessions.get(ch)!.add(sid);
    if (vid) visitors.get(ch)!.add(vid);
  }
  for (const s of sessions.values()) total += s.size;
  const out: ChannelRow[] = [];
  for (const [channel, sids] of sessions.entries()) {
    out.push({
      channel,
      sessions: sids.size,
      visitors: (visitors.get(channel) || new Set()).size,
      pct: total ? Math.round((sids.size / total) * 100) : 0,
    });
  }
  return out.sort((a, b) => b.sessions - a.sessions);
}

export async function getTopReferrers(days = 14, limit = 10): Promise<ReferrerRow[]> {
  const sb = client();
  const { data } = await sb
    .from("page_views")
    .select("referrer_domain,session_id")
    .gte("created_at", sinceISO(days))
    .not("referrer_domain", "is", null);

  const map = new Map<string, Set<string>>();
  for (const r of data || []) {
    const d = (r as { referrer_domain?: string }).referrer_domain || "";
    const sid = (r as { session_id?: string }).session_id || "";
    if (!d) continue;
    if (!map.has(d)) map.set(d, new Set());
    if (sid) map.get(d)!.add(sid);
  }
  return Array.from(map.entries())
    .map(([domain, sids]) => ({ domain, sessions: sids.size }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

export async function getTopCampaigns(days = 30, limit = 10): Promise<CampaignRow[]> {
  const sb = client();
  const { data } = await sb
    .from("page_views")
    .select("utm_source,utm_medium,utm_campaign,session_id")
    .gte("created_at", sinceISO(days))
    .not("utm_source", "is", null);
  const map = new Map<string, Set<string>>();
  for (const r of data || []) {
    const x = r as { utm_source?: string; utm_medium?: string; utm_campaign?: string; session_id?: string };
    const key = `${x.utm_source || ""}|${x.utm_medium || ""}|${x.utm_campaign || ""}`;
    if (!map.has(key)) map.set(key, new Set());
    if (x.session_id) map.get(key)!.add(x.session_id);
  }
  return Array.from(map.entries())
    .map(([k, sids]) => {
      const [source, medium, campaign] = k.split("|");
      return { source, medium, campaign, sessions: sids.size };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

export async function getTopExitDestinations(days = 14, limit = 10): Promise<ExitRow[]> {
  const sb = client();
  const { data } = await sb
    .from("exit_clicks")
    .select("to_domain,from_path")
    .gte("created_at", sinceISO(days))
    .not("to_domain", "is", null)
    .limit(2000);
  const counts = new Map<string, { clicks: number; paths: Map<string, number> }>();
  for (const r of data || []) {
    const x = r as { to_domain?: string; from_path?: string };
    if (!x.to_domain) continue;
    let bucket = counts.get(x.to_domain);
    if (!bucket) {
      bucket = { clicks: 0, paths: new Map() };
      counts.set(x.to_domain, bucket);
    }
    bucket.clicks++;
    if (x.from_path) bucket.paths.set(x.from_path, (bucket.paths.get(x.from_path) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([to_domain, b]) => {
      let topPath = "";
      let topCount = 0;
      for (const [p, c] of b.paths.entries()) if (c > topCount) { topCount = c; topPath = p; }
      return { to_domain, clicks: b.clicks, top_from_path: topPath };
    })
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

export async function getRecentVisitors(limit = 30): Promise<RecentVisitor[]> {
  const sb = client();

  // 1) Find the most recent visitor_ids
  const { data: recent } = await sb
    .from("page_views")
    .select("visitor_id,created_at")
    .not("visitor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of recent || []) {
    const v = (r as { visitor_id?: string }).visitor_id;
    if (v && !seen.has(v)) {
      seen.add(v);
      ids.push(v);
      if (ids.length >= limit) break;
    }
  }
  if (!ids.length) return [];

  // 2) Pull all page_views for those visitors
  const { data: pv } = await sb
    .from("page_views")
    .select("visitor_id,session_id,path,city,region,country,device,browser,os,channel,referrer_domain,utm_source,landing_page,created_at")
    .in("visitor_id", ids)
    .order("created_at", { ascending: true });

  // 3) Pull their exit clicks + intents
  const { data: exits } = await sb
    .from("exit_clicks")
    .select("visitor_id,to_domain,created_at")
    .in("visitor_id", ids)
    .order("created_at", { ascending: false });
  const { data: intents } = await sb
    .from("lead_intents")
    .select("visitor_id,kind,created_at")
    .in("visitor_id", ids)
    .order("created_at", { ascending: false });

  const byVisitor = new Map<string, RecentVisitor>();
  for (const v of ids) {
    byVisitor.set(v, {
      visitor_id: v,
      first_seen: "",
      last_seen: "",
      visit_count: 0,
      pages_viewed: 0,
      channel: "",
      source: "",
      city: null, region: null, country: null,
      device: null, browser: null, os: null,
      landing_page: "",
      last_path: "",
      exit_domain: null,
      intents: [],
    });
  }
  const sessionsByVisitor = new Map<string, Set<string>>();

  for (const r of pv || []) {
    const x = r as {
      visitor_id?: string; session_id?: string; path?: string;
      city?: string; region?: string; country?: string;
      device?: string; browser?: string; os?: string;
      channel?: string; referrer_domain?: string; utm_source?: string;
      landing_page?: string; created_at?: string;
    };
    if (!x.visitor_id) continue;
    const v = byVisitor.get(x.visitor_id);
    if (!v) continue;
    v.pages_viewed++;
    if (!v.first_seen || (x.created_at && x.created_at < v.first_seen)) v.first_seen = x.created_at || v.first_seen;
    if (!v.last_seen || (x.created_at && x.created_at > v.last_seen)) {
      v.last_seen = x.created_at || v.last_seen;
      v.last_path = x.path || v.last_path;
      // most recent device/browser/os/channel wins
      v.device = x.device || v.device;
      v.browser = x.browser || v.browser;
      v.os = x.os || v.os;
      v.channel = x.channel || v.channel;
      v.source = x.utm_source || x.referrer_domain || v.source;
      v.city = x.city || v.city;
      v.region = x.region || v.region;
      v.country = x.country || v.country;
    }
    if (!v.landing_page) v.landing_page = x.landing_page || x.path || "";
    if (!sessionsByVisitor.has(x.visitor_id)) sessionsByVisitor.set(x.visitor_id, new Set());
    if (x.session_id) sessionsByVisitor.get(x.visitor_id)!.add(x.session_id);
  }
  for (const [vid, sids] of sessionsByVisitor.entries()) {
    const v = byVisitor.get(vid);
    if (v) v.visit_count = sids.size;
  }
  for (const e of exits || []) {
    const x = e as { visitor_id?: string; to_domain?: string };
    if (!x.visitor_id || !x.to_domain) continue;
    const v = byVisitor.get(x.visitor_id);
    if (v && !v.exit_domain) v.exit_domain = x.to_domain;
  }
  for (const i of intents || []) {
    const x = i as { visitor_id?: string; kind?: string };
    if (!x.visitor_id || !x.kind) continue;
    const v = byVisitor.get(x.visitor_id);
    if (!v) continue;
    if (!v.intents.includes(x.kind)) v.intents.push(x.kind);
  }
  // Return in the original recency order
  return ids.map((id) => byVisitor.get(id)!).filter(Boolean);
}

export async function getVisitorTimeline(visitor_id: string, limit = 200): Promise<VisitorTimelineEvent[]> {
  const sb = client();
  const [{ data: pv }, { data: exits }, { data: intents }] = await Promise.all([
    sb.from("page_views").select("path,page_title,channel,referrer_domain,created_at").eq("visitor_id", visitor_id).order("created_at", { ascending: false }).limit(limit),
    sb.from("exit_clicks").select("to_domain,to_url,from_path,created_at").eq("visitor_id", visitor_id).order("created_at", { ascending: false }).limit(limit),
    sb.from("lead_intents").select("kind,detail,path,created_at").eq("visitor_id", visitor_id).order("created_at", { ascending: false }).limit(limit),
  ]);

  const events: VisitorTimelineEvent[] = [];
  for (const r of pv || []) {
    const x = r as { path?: string; page_title?: string; channel?: string; referrer_domain?: string; created_at?: string };
    events.push({
      at: x.created_at || "",
      type: "page",
      label: x.page_title || x.path || "/",
      detail: x.channel ? `${x.channel}${x.referrer_domain ? ` · ${x.referrer_domain}` : ""}` : x.path || "",
    });
  }
  for (const r of exits || []) {
    const x = r as { to_domain?: string; to_url?: string; from_path?: string; created_at?: string };
    events.push({ at: x.created_at || "", type: "exit", label: `Exit → ${x.to_domain || x.to_url}`, detail: x.from_path });
  }
  for (const r of intents || []) {
    const x = r as { kind?: string; detail?: string; path?: string; created_at?: string };
    events.push({ at: x.created_at || "", type: "intent", label: x.kind || "intent", detail: `${x.path || ""}${x.detail ? ` · ${x.detail}` : ""}` });
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, limit);
}

export async function getEngagementMetrics(days = 14): Promise<EngagementMetrics> {
  const sb = client();
  const since = sinceISO(days);
  const [{ data: pv }, { data: intents }] = await Promise.all([
    sb.from("page_views").select("session_id").gte("created_at", since),
    sb.from("lead_intents").select("kind,value").gte("created_at", since),
  ]);

  const sessions = new Map<string, number>(); // session_id -> page count
  for (const r of pv || []) {
    const sid = (r as { session_id?: string }).session_id;
    if (!sid) continue;
    sessions.set(sid, (sessions.get(sid) || 0) + 1);
  }
  const totalSessions = sessions.size;
  let bounces = 0;
  let depthSum = 0;
  for (const c of sessions.values()) {
    depthSum += c;
    if (c === 1) bounces++;
  }
  const avgSessionDepth = totalSessions ? depthSum / totalSessions : 0;
  const bounceRatePct = totalSessions ? Math.round((bounces / totalSessions) * 100) : 0;

  let formStarts = 0;
  let ctaClicks = 0;
  let deepScrolls = 0;
  const engagementMsList: number[] = [];
  for (const i of intents || []) {
    const x = i as { kind?: string; value?: string };
    if (x.kind === "form_start") formStarts++;
    else if (x.kind === "cta_click") ctaClicks++;
    else if (x.kind === "scroll_90") deepScrolls++;
    else if (x.kind === "engagement") {
      const n = parseInt(x.value || "0", 10);
      if (n > 0 && n < 30 * 60_000) engagementMsList.push(n);
    }
  }
  const deepScrollPct = totalSessions ? Math.round((deepScrolls / totalSessions) * 100) : 0;
  const avgEngagementSec = engagementMsList.length
    ? Math.round(engagementMsList.reduce((a, b) => a + b, 0) / engagementMsList.length / 1000)
    : 0;

  return { avgSessionDepth: Math.round(avgSessionDepth * 10) / 10, bounceRatePct, formStarts, ctaClicks, deepScrollPct, avgEngagementSec };
}
