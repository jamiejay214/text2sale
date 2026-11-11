// ── Subscription packages (legacy keys) ───────────────────────────────────
// Text2Sale sells three plans (lib/plans.ts): Text, Dialer and Complete.
// Accounts and Stripe metadata from before them carry "standard" or "ai";
// both are the texting plan. Keep these helpers so old links, metadata and
// admin tools keep resolving.

import { STANDARD_SMS_RATE_PER_SEGMENT } from "./sms-pricing";
import { isPlanKey, PLANS, type PlanKey } from "./plans";

export const PACKAGES = {
  standard: { key: "standard", name: PLANS.text.name, price: PLANS.text.price, messageCost: STANDARD_SMS_RATE_PER_SEGMENT, aiPlan: true },
  ai: { key: "ai", name: PLANS.text.name, price: PLANS.text.price, messageCost: STANDARD_SMS_RATE_PER_SEGMENT, aiPlan: true },
} as const;

export type PackageKey = keyof typeof PACKAGES;

export function isPackageKey(value: unknown): value is PackageKey {
  return value === "standard" || value === "ai";
}

/** A signup or checkout package value as one of the three plans. */
export function toPlanKey(value: unknown): PlanKey | null {
  if (isPlanKey(value)) return value;
  if (isPackageKey(value)) return "text";
  return null;
}

/** The `profiles.plan` JSON for a plan, keeping an approved SMS volume rate. */
export function planShape(key: PackageKey | PlanKey = "text", messageCost: number = STANDARD_SMS_RATE_PER_SEGMENT) {
  const plan = PLANS[toPlanKey(key) || "text"];
  return { key: plan.key, name: plan.name, price: plan.price, messageCost };
}

/** Legacy: every pre-2026-10 plan maps to the texting package. */
export function packageForPlan(_plan: { name?: string | null; price?: number | null } | null | undefined): PackageKey {
  return "standard";
}
