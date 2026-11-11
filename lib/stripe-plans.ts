import type Stripe from "stripe";
import { PLANS, PRICING_VERSION, type PlanKey } from "./plans";

/**
 * The recurring monthly price for a plan amount, created on first use.
 * Shares the "Text2Sale Monthly Plan" product with checkout and the admin
 * plan switch so all three land on the same Stripe objects.
 */
export async function ensureMonthlyPrice(stripe: Stripe, cents: number): Promise<Stripe.Price> {
  const products = await stripe.products.list({ limit: 10, active: true });
  let product = products.data.find((p) => p.name === "Text2Sale Monthly Plan");
  if (!product) {
    product = await stripe.products.create({
      name: "Text2Sale Monthly Plan",
      description: "Monthly subscription for Text2Sale CRM",
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 50 });
  const existing = prices.data.find(
    (p) => p.unit_amount === cents && p.recurring?.interval === "month" && p.currency === "usd"
  );
  if (existing) return existing;

  return stripe.prices.create({
    product: product.id,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval: "month" },
  });
}

/**
 * The monthly Stripe price for one of the three plans (lib/plans.ts), on a
 * product per plan, created on first use. Products are found by their
 * text2sale_plan metadata so renaming one in Stripe doesn't break checkout.
 */
export async function ensurePlanPrice(stripe: Stripe, key: PlanKey): Promise<Stripe.Price> {
  const plan = PLANS[key];
  const cents = Math.round(plan.price * 100);
  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((p) => p.metadata?.text2sale_plan === key);
  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.tagline,
      metadata: { text2sale_plan: key, pricing_version: PRICING_VERSION },
    });
  }
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 50 });
  const existing = prices.data.find((p) => p.unit_amount === cents && p.recurring?.interval === "month" && p.currency === "usd");
  if (existing) return existing;
  return stripe.prices.create({
    product: product.id,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { text2sale_plan: key, pricing_version: PRICING_VERSION },
  });
}
