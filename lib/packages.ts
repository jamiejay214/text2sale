// ── Subscription package ──────────────────────────────────────────────────
// Text2Sale now has one paid platform plan. AI access is included in the
// subscription and usage is billed separately from the wallet.
//
// Keep the legacy "ai" key as an alias so old Stripe metadata / admin links
// continue to resolve safely during the transition.

export const PACKAGES = {
  standard: { key: "standard", name: "Text2Sale", price: 39.99, messageCost: 0.015, aiPlan: true },
  ai: { key: "ai", name: "Text2Sale", price: 39.99, messageCost: 0.015, aiPlan: true },
} as const;

export type PackageKey = keyof typeof PACKAGES;

export function isPackageKey(value: unknown): value is PackageKey {
  return value === "standard" || value === "ai";
}

/** The `profiles.plan` JSON shape for the unified paid plan. */
export function planShape(_key: PackageKey = "standard") {
  const p = PACKAGES.standard;
  return { name: p.name, price: p.price, messageCost: p.messageCost };
}

/**
 * Legacy plans all map to the single $39.99 package (AI included). This keeps
 * existing accounts and old Stripe subscription metadata compatible.
 */
export function packageForPlan(_plan: { name?: string | null; price?: number | null } | null | undefined): PackageKey {
  return "standard";
}
