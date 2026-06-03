// ─────────────────────────────────────────────────────────────────────────
// Real collected revenue from the Stripe API — the source of truth for cash.
//
// The DB only stores wallet top-ups + a stripe_events idempotency ledger
// (no amounts), so subscription payments were invisible. This pulls actual
// settled charges (net of refunds) for lifetime / this-month / today, plus
// live active-subscription MRR straight from Stripe.
//
// Cached in-module (90s TTL) so the 45s dashboard poll doesn't hammer Stripe.
// ─────────────────────────────────────────────────────────────────────────

import Stripe from "stripe";

export type StripeRevenue = {
  ok: boolean;
  currency: string;
  collectedLifetime: number;
  collectedThisMonth: number;
  collectedToday: number;
  stripeMrr: number;
  activeSubscriptions: number;
  note?: string;
};

let cache: { at: number; data: StripeRevenue } | null = null;
const TTL_MS = 90_000;

function startOfTodayUnix(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}
function startOfMonthUnix(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export async function getStripeRevenue(): Promise<StripeRevenue> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { ok: false, currency: "usd", collectedLifetime: 0, collectedThisMonth: 0, collectedToday: 0, stripeMrr: 0, activeSubscriptions: 0, note: "STRIPE_SECRET_KEY not set" };
  }
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  const monthStart = startOfMonthUnix();
  const todayStart = startOfTodayUnix();

  let collectedLifetime = 0;
  let collectedThisMonth = 0;
  let collectedToday = 0;
  let currency = "usd";

  try {
    // Newest-first; cap pages so a huge account can't stall the dashboard.
    let pages = 0;
    const MAX_PAGES = 20; // 20 * 100 = 2000 charges
    let params: Stripe.ChargeListParams = { limit: 100 };
    for (;;) {
      const batch: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list(params);
      for (const c of batch.data) {
        if (!c.paid || c.status !== "succeeded") continue;
        const net = (c.amount - (c.amount_refunded || 0)) / 100;
        if (net <= 0) continue;
        if (c.currency) currency = c.currency;
        collectedLifetime += net;
        if (c.created >= monthStart) collectedThisMonth += net;
        if (c.created >= todayStart) collectedToday += net;
      }
      pages++;
      if (!batch.has_more || pages >= MAX_PAGES) break;
      const last = batch.data[batch.data.length - 1];
      params = { limit: 100, starting_after: last.id };
    }

    // Live MRR from active subscriptions (normalized to monthly).
    let stripeMrr = 0;
    let activeSubscriptions = 0;
    let subParams: Stripe.SubscriptionListParams = { status: "active", limit: 100 };
    let subPages = 0;
    for (;;) {
      const subs: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list(subParams);
      for (const s of subs.data) {
        activeSubscriptions++;
        for (const item of s.items.data) {
          const price = item.price;
          const qty = item.quantity || 1;
          const unit = (price.unit_amount || 0) / 100;
          const interval = price.recurring?.interval;
          const intervalCount = price.recurring?.interval_count || 1;
          let monthly = unit * qty;
          if (interval === "year") monthly = (unit * qty) / (12 * intervalCount);
          else if (interval === "week") monthly = (unit * qty) * (52 / 12) / intervalCount;
          else if (interval === "day") monthly = (unit * qty) * (365 / 12) / intervalCount;
          else if (interval === "month") monthly = (unit * qty) / intervalCount;
          stripeMrr += monthly;
        }
      }
      subPages++;
      if (!subs.has_more || subPages >= 10) break;
      const last = subs.data[subs.data.length - 1];
      subParams = { status: "active", limit: 100, starting_after: last.id };
    }

    const data: StripeRevenue = {
      ok: true,
      currency,
      collectedLifetime: Math.round(collectedLifetime * 100) / 100,
      collectedThisMonth: Math.round(collectedThisMonth * 100) / 100,
      collectedToday: Math.round(collectedToday * 100) / 100,
      stripeMrr: Math.round(stripeMrr * 100) / 100,
      activeSubscriptions,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    const data: StripeRevenue = {
      ok: false, currency: "usd", collectedLifetime: 0, collectedThisMonth: 0, collectedToday: 0,
      stripeMrr: 0, activeSubscriptions: 0,
      note: e instanceof Error ? e.message : "Stripe read failed",
    };
    // brief negative cache so a broken key doesn't retry every poll
    cache = { at: Date.now() - (TTL_MS - 15_000), data };
    return data;
  }
}
