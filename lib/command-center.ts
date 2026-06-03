// ─── Command Center data layer ─────────────────────────────────────────────
// Aggregates live analytics across all three businesses into ONE snapshot:
//
//   • text2sale        — this app's Supabase (CRM + page_views site traffic)
//   • aibusinessgrowth — the website_* tables inside the same Supabase project
//   • trustedquotes    — a SEPARATE Supabase project (its visitor count is
//                        behind RLS, so we read it with its own service key)
//
// Everything runs server-side with service-role keys so RLS never hides data.
// Each business is wrapped in try/catch: if one source is down or unconfigured
// it reports `online:false` instead of taking the whole dashboard with it.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStripeRevenue } from "./stripe-revenue";

export type Series = { label: string; value: number }[];
export type DayPoint = { date: string; value: number };
export type FeedItem = { kind: string; title: string; subtitle: string; at: string };

export type BusinessMetrics = {
  id: "text2sale" | "aibusinessgrowth" | "trustedquotes";
  name: string;
  domain: string;
  color: string;
  online: boolean;
  note?: string;
  kpis: {
    revenue: number;
    revenueToday: number;
    visitors: number;
    visitorsToday: number;
    visitorsWeek: number;
    leads: number;
    leadsWeek: number;
    customers: number;
    conversionRate: number;
  };
  trafficByDay: DayPoint[];
  topPages: Series;
  sources: Series;
  devices: Series;
  geo: Record<string, number>;
  funnel: { label: string; value: number }[];
  recent: FeedItem[];
  extra: Record<string, number | string>;
};

export type Overview = {
  generatedAt: string;
  businesses: BusinessMetrics[];
  combined: {
    revenue: number;
    revenueToday: number;
    visitors: number;
    visitorsToday: number;
    visitorsWeek: number;
    leads: number;
    customers: number;
    messages: number;
    calls: number;
    trafficByDay: DayPoint[];
    topPages: Series;
    geo: Record<string, number>;
    feed: FeedItem[];
  };
};

// ── clients ────────────────────────────────────────────────────────────────
function mainClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function tqClient(): SupabaseClient | null {
  const url = process.env.TRUSTEDQUOTES_SUPABASE_URL;
  const key = process.env.TRUSTEDQUOTES_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// AI Business Growth now lives in its OWN Supabase project. If its env is set,
// read from there; otherwise fall back to text2sale's legacy website_* tables
// so the dashboard never breaks during the cutover.
function abgClient(): SupabaseClient | null {
  const url = process.env.ABG_SUPABASE_URL;
  const key = process.env.ABG_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── time helpers ─────────────────────────────────────────────────────────────
const DAY = 86400000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

// ── small aggregators ────────────────────────────────────────────────────────
function cleanPath(p: string | null | undefined): string {
  if (!p) return "/";
  let s = String(p).split("?")[0].split("#")[0];
  try {
    if (s.startsWith("http")) s = new URL(s).pathname;
  } catch {
    /* keep raw */
  }
  return s || "/";
}

function classifyDevice(ua: string | null | undefined): string {
  if (!ua) return "Unknown";
  return /mobile|iphone|android|ipad|ipod/i.test(ua) ? "Mobile" : "Desktop";
}

function tally(values: (string | null | undefined)[], limit = 6): Series {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = (v ?? "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function byDay(dates: string[], days = 14): DayPoint[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    buckets.set(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), 0);
  }
  for (const raw of dates) {
    if (!raw) continue;
    const label = new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (buckets.has(label)) buckets.set(label, (buckets.get(label) || 0) + 1);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

// Normalize a state value (full name OR 2-letter) to a 2-letter USPS code so
// geo from all three sources merges onto the same US map.
const NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
function normState(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return NAME_TO_ABBR[t.toLowerCase()] || null;
}
function addGeo(geo: Record<string, number>, state: string | null | undefined, n = 1) {
  const abbr = normState(state);
  if (abbr) geo[abbr] = (geo[abbr] || 0) + n;
}

async function countSince(
  sb: SupabaseClient,
  table: string,
  sinceCol: string,
  sinceIso?: string
): Promise<number> {
  let q = sb.from(table).select("id", { count: "exact", head: true });
  if (sinceIso) q = q.gte(sinceCol, sinceIso);
  const { count } = await q;
  return count || 0;
}

function emptyBiz(
  id: BusinessMetrics["id"],
  name: string,
  domain: string,
  color: string,
  online: boolean,
  note?: string
): BusinessMetrics {
  return {
    id, name, domain, color, online, note,
    kpis: {
      revenue: 0, revenueToday: 0, visitors: 0, visitorsToday: 0, visitorsWeek: 0,
      leads: 0, leadsWeek: 0, customers: 0, conversionRate: 0,
    },
    trafficByDay: byDay([]), topPages: [], sources: [], devices: [], geo: {},
    funnel: [], recent: [], extra: {},
  };
}

// ── text2sale ────────────────────────────────────────────────────────────────
async function buildText2Sale(): Promise<BusinessMetrics> {
  const sb = mainClient();
  const biz = emptyBiz("text2sale", "Text2Sale", "text2sale.com", "#a855f7", true);
  try {
    const [
      visToday, visWeek, visTotal,
      messages, callsCount,
    ] = await Promise.all([
      countSince(sb, "page_views", "created_at", startOfToday()),
      countSince(sb, "page_views", "created_at", daysAgo(7)),
      countSince(sb, "page_views", "created_at"),
      countSince(sb, "messages", "created_at"),
      countSince(sb, "calls", "created_at"),
    ]);

    // 30-day traffic rows for charts/geo/top-pages
    const { data: views } = await sb
      .from("page_views")
      .select("created_at, path, referrer, user_agent, region, country")
      .gte("created_at", daysAgo(30))
      .limit(10000);
    const v = views || [];
    biz.trafficByDay = byDay(v.map((r) => r.created_at as string));
    biz.topPages = tally(v.map((r) => cleanPath(r.path as string)));
    biz.sources = tally(v.map((r) => (r.referrer ? hostOf(r.referrer as string) : "Direct")));
    biz.devices = tally(v.map((r) => classifyDevice(r.user_agent as string)));
    for (const r of v) if ((r.country as string) === "US") addGeo(biz.geo, r.region as string);

    // Wallet top-ups (prepaid SMS credit) — kept for reference, but real
    // collected cash now comes from Stripe (which also includes these).
    const { data: topups } = await sb
      .from("wallet_topups")
      .select("amount, created_at, description")
      .limit(10000);
    const tu = topups || [];
    const walletLifetime = tu.reduce((s, t) => s + Number(t.amount || 0), 0);
    const todayIso = startOfToday();
    const walletToday = tu
      .filter((t) => (t.created_at as string) >= todayIso)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const { data: profs } = await sb
      .from("profiles")
      .select("plan, subscription_status, role, free_subscription, total_deposited, created_at, first_name, last_name, email")
      .limit(10000);
    const p = profs || [];

    // ── Honest subscriber math ────────────────────────────────────────────
    // active subscribers = anyone with an active/canceling sub (incl. comped)
    const activeSubs = p.filter((x) =>
      ["active", "canceling"].includes((x.subscription_status as string) || "")
    );
    // PAYING customers = active AND not comped (free_subscription) AND not the
    // owner/admin account. This is what actually generates revenue.
    const payingSubs = activeSubs.filter(
      (x) => !(x.free_subscription as boolean) && (x.role as string) !== "admin"
    );
    // DB-derived MRR from paying subs only (no comped/owner inflation)
    const dbMrr = payingSubs.reduce((s, x) => {
      const price = (x.plan as { price?: number })?.price;
      return s + (typeof price === "number" ? price : 0);
    }, 0);

    // Real COLLECTED cash from Stripe (net of refunds — source of truth).
    // Guard: only trust Stripe when it actually returns money. A test-mode key
    // or an empty/restricted key returns $0 — in that case fall back to the
    // wallet top-up total so we NEVER show $0 when real revenue exists.
    const stripeRev = await getStripeRevenue();
    const useStripe = stripeRev.ok && stripeRev.collectedLifetime > 0;
    const revenue = useStripe ? stripeRev.collectedLifetime : walletLifetime;
    const revenueToday = useStripe ? stripeRev.collectedToday : walletToday;
    // MRR run-rate: use DB paying-subs MRR. It honors the owner's
    // free_subscription comp flag, which Stripe's raw unit_amount (pre-coupon)
    // does NOT — so dbMrr is the accurate recurring figure. stripeMrr is kept
    // in `extra` only as a cross-check.
    const mrr = dbMrr;

    // Real signups (exclude the owner/admin account) + signups this week
    const nonAdmin = p.filter((x) => (x.role as string) !== "admin");
    const signups = nonAdmin.length;
    const weekIso = daysAgo(7);
    const signupsWeek = nonAdmin.filter((x) => (x.created_at as string) >= weekIso).length;

    biz.kpis = {
      revenue,
      revenueToday,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads: signups, // signups (excl. owner) are this business's "leads"
      leadsWeek: signupsWeek,
      customers: payingSubs.length, // PAYING customers only
      conversionRate: visTotal ? (payingSubs.length / visTotal) * 100 : 0,
    };
    biz.extra = {
      mrr: Math.round(mrr * 100) / 100,
      collectedThisMonth: useStripe ? stripeRev.collectedThisMonth : walletLifetime,
      walletTopupsLifetime: Math.round(walletLifetime * 100) / 100,
      revenueSourceLive: useStripe ? 1 : 0,
      payingCustomers: payingSubs.length,
      activeSubscribers: activeSubs.length, // incl. comped
      compedSubscribers: activeSubs.length - payingSubs.length,
      stripeMrrRaw: stripeRev.ok ? stripeRev.stripeMrr : 0, // cross-check (pre-coupon)
      stripeActiveSubs: stripeRev.ok ? stripeRev.activeSubscriptions : 0,
      contacts: await countSince(sb, "contacts", "created_at"),
      conversations: await countSince(sb, "conversations", "created_at"),
      messages,
      calls: callsCount,
      revenueSource: stripeRev.ok ? "stripe" : "wallet_fallback",
    };
    biz.funnel = [
      { label: "Visitors", value: visTotal },
      { label: "Signups", value: signups },
      { label: "Paying", value: payingSubs.length },
    ];

    // live feed: recent signups + recent payments
    const recentSignups = [...p]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 5)
      .map((x) => ({
        kind: "signup",
        title: `${(x.first_name as string) || ""} ${(x.last_name as string) || ""}`.trim() || (x.email as string) || "New user",
        subtitle: "Signed up",
        at: x.created_at as string,
      }));
    const recentPay = [...tu]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 5)
      .map((t) => ({
        kind: "payment",
        title: `$${Number(t.amount || 0).toFixed(2)} wallet top-up`,
        subtitle: (t.description as string) || "Payment",
        at: t.created_at as string,
      }));
    biz.recent = [...recentSignups, ...recentPay]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  } catch (e) {
    biz.online = false;
    biz.note = e instanceof Error ? e.message : "read failed";
  }
  return biz;
}

// ── aibusinessgrowth (its own Supabase project; falls back to text2sale's
//    legacy website_* tables until ABG_* env is set) ─────────────────────────
async function buildAiBusinessGrowth(): Promise<BusinessMetrics> {
  const sb = abgClient() || mainClient();
  const biz = emptyBiz("aibusinessgrowth", "AI Business Growth", "aibusinessgrowth.net", "#22d3ee", true);
  try {
    const [visToday, visWeek, visTotal, leads, leadsWeek, subs, purchases] = await Promise.all([
      countSince(sb, "website_visits", "created_at", startOfToday()),
      countSince(sb, "website_visits", "created_at", daysAgo(7)),
      countSince(sb, "website_visits", "created_at"),
      countSince(sb, "website_leads", "created_at"),
      countSince(sb, "website_leads", "created_at", daysAgo(7)),
      countSince(sb, "website_subscribers", "created_at"),
      countSince(sb, "website_purchases", "created_at"),
    ]);

    const { data: visits } = await sb
      .from("website_visits")
      .select("created_at, page, device_type, source, region, country")
      .gte("created_at", daysAgo(30))
      .limit(10000);
    const v = visits || [];
    biz.trafficByDay = byDay(v.map((r) => r.created_at as string));
    biz.topPages = tally(v.map((r) => cleanPath(r.page as string)));
    biz.sources = tally(v.map((r) => (r.source as string) || "Direct"));
    biz.devices = tally(v.map((r) => (r.device_type as string) || "Unknown"));
    for (const r of v) if ((r.country as string) === "US") addGeo(biz.geo, r.region as string);

    biz.kpis = {
      revenue: 0,
      revenueToday: 0,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads,
      leadsWeek,
      customers: purchases,
      conversionRate: visTotal ? (leads / visTotal) * 100 : 0,
    };
    biz.extra = { subscribers: subs, purchases, sales: purchases };
    biz.funnel = [
      { label: "Visitors", value: visTotal },
      { label: "Leads", value: leads },
      { label: "Subscribers", value: subs },
      { label: "Sales", value: purchases },
    ];

    const { data: recentLeads } = await sb
      .from("website_leads")
      .select("created_at, name, company, industry")
      .order("created_at", { ascending: false })
      .limit(8);
    biz.recent = (recentLeads || []).map((l) => ({
      kind: "lead",
      title: (l.name as string) || (l.company as string) || "New lead",
      subtitle: [l.company, l.industry].filter(Boolean).join(" · ") || "Lead captured",
      at: l.created_at as string,
    }));
  } catch (e) {
    biz.online = false;
    biz.note = e instanceof Error ? e.message : "read failed";
  }
  return biz;
}

// ── trustedquotes (separate Supabase project) ────────────────────────────────
async function buildTrustedQuotes(): Promise<BusinessMetrics> {
  const sb = tqClient();
  if (!sb) {
    return emptyBiz(
      "trustedquotes", "Trusted Quotes", "trustedquotes.org", "#34d399",
      false, "Add TRUSTEDQUOTES_SERVICE_ROLE_KEY to .env.local to connect live data"
    );
  }
  const biz = emptyBiz("trustedquotes", "Trusted Quotes", "trustedquotes.org", "#34d399", true);
  try {
    const [visToday, visWeek, visTotal, leads, leadsWeek, partials] = await Promise.all([
      countSince(sb, "visitors", "created_at", startOfToday()),
      countSince(sb, "visitors", "created_at", daysAgo(7)),
      countSince(sb, "visitors", "created_at"),
      countSince(sb, "leads", "created_at"),
      countSince(sb, "leads", "created_at", daysAgo(7)),
      countSince(sb, "partial_leads", "created_at"),
    ]);

    const { data: visitors } = await sb
      .from("visitors")
      .select("created_at, page, state, country")
      .gte("created_at", daysAgo(30))
      .limit(10000);
    const v = visitors || [];
    biz.trafficByDay = byDay(v.map((r) => r.created_at as string));
    biz.topPages = tally(v.map((r) => cleanPath(r.page as string)));
    for (const r of v) addGeo(biz.geo, r.state as string);

    // device + source breakdown come from partial_leads
    const { data: pls } = await sb
      .from("partial_leads")
      .select("device_type, ref_source")
      .gte("created_at", daysAgo(30))
      .limit(10000);
    biz.devices = tally((pls || []).map((r) => (r.device_type as string) || "Unknown"));
    biz.sources = tally((pls || []).map((r) => (r.ref_source as string) || "Direct"));

    biz.kpis = {
      revenue: 0,
      revenueToday: 0,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads,
      leadsWeek,
      customers: leads, // each completed lead is the deliverable for a lead-gen site
      conversionRate: visTotal ? (leads / visTotal) * 100 : 0,
    };
    biz.extra = { partialLeads: partials, completedLeads: leads };
    biz.funnel = [
      { label: "Visitors", value: visTotal },
      { label: "Started", value: partials },
      { label: "Leads", value: leads },
    ];

    // NOTE: the `leads` table has NO `state` column (it has zip/who/
    // current_status). Selecting `state` here silently errored before, which
    // left the Trusted Quotes live feed permanently empty. Fixed columns:
    const { data: recentLeads } = await sb
      .from("leads")
      .select("created_at, first_name, last_name, coverage_type, current_status, zip, source")
      .order("created_at", { ascending: false })
      .limit(8);
    biz.recent = (recentLeads || []).map((l) => ({
      kind: "lead",
      title: `${(l.first_name as string) || ""} ${(l.last_name as string) || ""}`.trim() || "New lead",
      subtitle:
        [l.coverage_type, l.current_status].filter(Boolean).join(" · ") ||
        [l.zip, l.source].filter(Boolean).join(" · ") ||
        "Quote request",
      at: l.created_at as string,
    }));
  } catch (e) {
    biz.online = false;
    biz.note = e instanceof Error ? e.message : "read failed";
  }
  return biz;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

function mergeSeries(list: Series[], limit = 8): Series {
  const m = new Map<string, number>();
  for (const s of list) for (const { label, value } of s) m.set(label, (m.get(label) || 0) + value);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value }));
}

function mergeByDay(list: DayPoint[][]): DayPoint[] {
  const m = new Map<string, number>();
  for (const days of list) for (const { date, value } of days) m.set(date, (m.get(date) || 0) + value);
  // preserve the ordered 14-day skeleton from the first series
  const skeleton = list[0] || byDay([]);
  return skeleton.map(({ date }) => ({ date, value: m.get(date) || 0 }));
}

export async function buildOverview(): Promise<Overview> {
  const [t2s, aibg, tq] = await Promise.all([
    buildText2Sale(),
    buildAiBusinessGrowth(),
    buildTrustedQuotes(),
  ]);
  const businesses = [t2s, aibg, tq];

  const geo: Record<string, number> = {};
  for (const b of businesses) for (const [k, n] of Object.entries(b.geo)) geo[k] = (geo[k] || 0) + n;

  const feed = businesses
    .flatMap((b) => b.recent.map((r) => ({ ...r, title: `${r.title}`, subtitle: `${b.name} · ${r.subtitle}` })))
    .filter((r) => r.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 14);

  const sum = (f: (b: BusinessMetrics) => number) => businesses.reduce((s, b) => s + f(b), 0);

  return {
    generatedAt: new Date().toISOString(),
    businesses,
    combined: {
      revenue: sum((b) => b.kpis.revenue),
      revenueToday: sum((b) => b.kpis.revenueToday),
      visitors: sum((b) => b.kpis.visitors),
      visitorsToday: sum((b) => b.kpis.visitorsToday),
      visitorsWeek: sum((b) => b.kpis.visitorsWeek),
      leads: sum((b) => b.kpis.leads),
      customers: sum((b) => b.kpis.customers),
      messages: Number(t2s.extra.messages || 0),
      calls: Number(t2s.extra.calls || 0),
      trafficByDay: mergeByDay(businesses.map((b) => b.trafficByDay)),
      topPages: mergeSeries(
        businesses.map((b) => b.topPages.map((p) => ({ label: `${b.domain}${p.label}`, value: p.value }))),
      ),
      geo,
      feed,
    },
  };
}
