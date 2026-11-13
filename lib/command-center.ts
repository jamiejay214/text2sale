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
import { TRAFFIC_START, easternDay, easternMidnight, REPORTING_TZ } from "./traffic-metrics";

export type Series = { label: string; value: number }[];
export type DayPoint = { date: string; value: number };
export type FeedItem = { kind: string; title: string; subtitle: string; at: string };

export type BusinessMetrics = {
  id: "text2sale" | "aibusinessgrowth" | "trustedquotes";
  name: string;
  domain: string;
  color: string;
  online: boolean;
  checkedAt?: string;
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
const startOfToday = () => easternMidnight();
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

// ── small aggregators ────────────────────────────────────────────────────────
async function visitCharts(sb: SupabaseClient, biz: BusinessMetrics) {
  const { data, error } = await sb.rpc("command_visit_charts");
  if (error || !data) throw new Error("Visit charts unavailable");
  biz.trafficByDay = byDay([]).map(d => ({ ...d, value: data.daily?.[d.date] ?? 0 }));
  biz.topPages = data.series?.pages ?? [];
  biz.sources = data.series?.sources ?? [];
  biz.devices = data.series?.devices ?? [];
  for (const entry of data.series?.geo ?? []) addGeo(biz.geo, entry.label, entry.value);
}

async function readRows(sb: SupabaseClient, table: string, fields: string) {
  const records: Record<string, unknown>[] = [];
  for (let offset = 0;; offset += 500) {
    const { data, error } = await sb.from(table).select(fields).order("id").range(offset, offset + 499);
    if (error || !data) throw new Error(table + " read unavailable");
    records.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < 500) return records;
  }
}

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: REPORTING_TZ });
function byDay(dates: string[], days = 14): DayPoint[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    buckets.set(dayLabel.format(d), 0);
  }
  for (const raw of dates) {
    if (!raw) continue;
    const label = dayLabel.format(new Date(raw));
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
  const { count, error } = await q;
  if (error || count == null) throw new Error(table + " count unavailable");
  return count;
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
    const [messages, callsCount] = await Promise.all([
      countSince(sb, "messages", "created_at"),
      countSince(sb, "calls", "created_at"),
    ]);

    const { data: traffic, error } = await sb.rpc("command_traffic_summary", { report_start: TRAFFIC_START });
    if (error || !traffic) throw new Error("Website traffic is temporarily unavailable");
    const { total: visTotal, today: visToday, week: visWeek } = traffic;
    biz.trafficByDay = byDay([]).map(d => ({ ...d, value: traffic.daily?.[d.date] ?? 0 }));
    biz.topPages = traffic.series?.pages ?? [];
    biz.sources = traffic.series?.sources ?? [];
    biz.devices = traffic.series?.devices ?? [];
    for (const { label, value } of traffic.series?.geo ?? []) addGeo(biz.geo, label, value);

    // Wallet top-ups (prepaid SMS credit) — kept for reference, but real
    // collected cash now comes from Stripe (which also includes these).
    const tu = await readRows(sb, "wallet_topups", "amount,created_at,description");
    const walletLifetime = tu.reduce((s, t) => s + Number(t.amount || 0), 0);
    const todayIso = startOfToday();
    const walletToday = tu
      .filter((t) => (t.created_at as string) >= todayIso)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const p = await readRows(sb, "profiles", "plan,subscription_status,role,free_subscription,created_at,first_name,last_name,email");
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
    const prospects = await readRows(sb, "text2sale_prospects", "email,kind,created_at");
    const month = easternDay(new Date()).slice(0,7);
    const signupEmails = new Set(nonAdmin.map(x => String(x.email).toLowerCase()));
    const unregistered = (prospects || []).filter(x => !signupEmails.has(String(x.email).toLowerCase()));
    const signups = nonAdmin.length;
    const weekIso = daysAgo(7);
    const signupsWeek = nonAdmin.filter((x) => (x.created_at as string) >= weekIso).length;

    biz.kpis = {
      revenue,
      revenueToday,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads: signups + unregistered.length,
      leadsWeek: signupsWeek + unregistered.filter(x => String(x.created_at) >= weekIso).length,
      customers: payingSubs.length, // PAYING customers only
      conversionRate: visTotal ? (payingSubs.filter(x => String(x.created_at) >= TRAFFIC_START).length / visTotal) * 100 : 0,
    };
    const emailCount = () => sb.from("email_sends").select("id", { head: true, count: "exact" })
      .not("provider_message_id", "is", null).gte("sent_at", todayIso);
    const email = await Promise.all([emailCount(), emailCount().not("delivered_at","is",null), emailCount().eq("status","bounced")]);
    biz.extra = {
      ...(email.every(v => !v.error && v.count != null) ? {emailAccepted: email[0].count!, emailDelivered: email[1].count!, emailBounced: email[2].count!} : {}),
      inquiries: unregistered.filter(x => x.kind === "inquiry").length,
      partialLeads: unregistered.filter(x => x.kind === "signup").length,
      trafficStartedAt: TRAFFIC_START,
      pageViews: traffic.views,
      sessions: traffic.sessions,
      mrr: Math.round(mrr * 100) / 100,
      collectedThisMonth: useStripe ? stripeRev.collectedThisMonth : tu.filter(t => easternDay(String(t.created_at)).startsWith(month)).reduce((sum,t) => sum + Number(t.amount || 0),0),
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
      revenueSource: useStripe ? "stripe" : "wallet_fallback",
    };
    biz.funnel = [
      { label: "Visitors", value: visTotal },
      { label: "Contacts", value: nonAdmin.filter(x => String(x.created_at) >= TRAFFIC_START).length + unregistered.filter(x => String(x.created_at) >= TRAFFIC_START).length },
      { label: "Signups", value: nonAdmin.filter(x => String(x.created_at) >= TRAFFIC_START).length },
      { label: "Paying", value: payingSubs.filter(x => String(x.created_at) >= TRAFFIC_START).length },
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
  const sb = abgClient();
  const biz = emptyBiz("aibusinessgrowth", "AI Business Growth", "aibusinessgrowth.net", "#22d3ee", true);
  try {
    if (!sb) throw new Error("AI Business Growth source is not configured");
    const [visToday, visWeek, visTotal, leads, leadsWeek, subs, purchases] = await Promise.all([
      countSince(sb, "website_visits", "created_at", startOfToday()),
      countSince(sb, "website_visits", "created_at", daysAgo(7)),
      countSince(sb, "website_visits", "created_at"),
      countSince(sb, "website_leads", "created_at"),
      countSince(sb, "website_leads", "created_at", daysAgo(7)),
      countSince(sb, "website_subscribers", "created_at"),
      countSince(sb, "website_purchases", "created_at"),
    ]);

    await visitCharts(sb, biz);

    biz.kpis = {
      revenue: 0,
      revenueToday: 0,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads,
      leadsWeek,
      customers: 0, // Purchases have no unique customer identity.
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
      .limit(8).throwOnError();
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

    await visitCharts(sb, biz);

    biz.kpis = {
      revenue: 0,
      revenueToday: 0,
      visitors: visTotal,
      visitorsToday: visToday,
      visitorsWeek: visWeek,
      leads,
      leadsWeek,
      customers: 0, // A quote request is not a payment.
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
      .limit(8).throwOnError();
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

// Coalesce overlapping polls per source. A slow upstream may finish and populate
// the next refresh without holding the other businesses off screen.
const sourceCache = new Map<string, { at: number; data: BusinessMetrics }>();
const pending = new Map<string, Promise<BusinessMetrics>>();
async function source(id: BusinessMetrics["id"], name: string, domain: string, color: string, read: () => Promise<BusinessMetrics>) {
  const cached = sourceCache.get(id);
  if (cached && Date.now() - cached.at < 30_000) return cached.data;
  const fallback = () => cached
    ? { ...cached.data, online: false, note: "Showing the last successful refresh." }
    : emptyBiz(id, name, domain, color, false, "Temporarily unavailable; retrying on refresh.");
  let work = pending.get(id);
  if (!work) {
    const started = Date.now();
    work = read().then(result => {
      if (result.online) {
        result.checkedAt = new Date().toISOString();
        sourceCache.set(id, { at: Date.now(), data: result });
      }
      return !result.online && cached ? fallback() : result;
    }).catch(fallback).finally(() => {
      pending.delete(id);
      console.info("[command-overview]", id, Date.now() - started, "ms");
    });
    pending.set(id, work);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<BusinessMetrics>(resolve => {
      timer = setTimeout(() => resolve(fallback()), 8000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function buildOverview(): Promise<Overview> {
  const [t2s, aibg, tq] = await Promise.all([
    source("text2sale", "Text2Sale", "text2sale.com", "#a855f7", buildText2Sale),
    source("aibusinessgrowth", "AI Business Growth", "aibusinessgrowth.net", "#22d3ee", buildAiBusinessGrowth),
    source("trustedquotes", "Trusted Quotes", "trustedquotes.org", "#34d399", buildTrustedQuotes),
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
