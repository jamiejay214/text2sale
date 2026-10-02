// ── Subscription packages ──────────────────────────────────────────────────
//
// The two plans the homepage sells. Prices live here once so signup, the
// Stripe checkout, the in-app AI upgrade and the admin plan switch can never
// quote different numbers.

export const PACKAGES = {
  standard: { key: "standard", name: "Text2Sale Standard", price: 39.99, messageCost: 0.012, aiPlan: false },
  ai: { key: "ai", name: "Text2Sale AI", price: 59.99, messageCost: 0.012, aiPlan: true },
} as const;

export type PackageKey = keyof typeof PACKAGES;

export function isPackageKey(value: unknown): value is PackageKey {
  return value === "standard" || value === "ai";
}

/** The `profiles.plan` JSON shape for a package. */
export function planShape(key: PackageKey) {
  const p = PACKAGES[key];
  return { name: p.name, price: p.price, messageCost: p.messageCost };
}

/**
 * Which package a stored `plan` belongs to.
 *
 * Existing rows predate this module ("Text2Sale Package" at $39.99 is
 * Standard) and an admin can set a custom price, so this reads the name and
 * the price instead of requiring an exact match.
 */
export function packageForPlan(plan: { name?: string | null; price?: number | null } | null | undefined): PackageKey {
  if (!plan) return "standard";
  if (typeof plan.name === "string" && /\bAI\b/.test(plan.name)) return "ai";
  if (typeof plan.price === "number" && plan.price >= 55) return "ai";
  return "standard";
}
