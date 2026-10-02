import type Stripe from "stripe";

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
