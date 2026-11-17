// ── Plan access ───────────────────────────────────────────────────────────
// What an account may use, from its plan and subscription. Every gate on
// texting and calling, in API routes, background jobs and the dashboard,
// goes through here so the answer is the same everywhere.
//
//   Text      → texting (inbox, campaigns, AI text replies)
//   Dialer    → calling (browser phone, dialer, AI receptionist)
//   Complete  → both
//
// Accounts created before the three plans carry no plan key; they paid for
// the texting plan and stay on Text. The owner account keeps everything,
// separately from customer plans. Admin-comped accounts (free_subscription)
// keep the plan they were given.
//
// Free trial (subscription_status "trialing", lib/trial.ts): the card is on
// file but nothing has been charged yet. A trial unlocks the dashboard and
// the plan's features for setup, and calling (Dialer, Complete) works since
// call minutes come from the prepaid wallet. Texting does not send during a
// trial: the send routes require a paid subscription (isEntitled), and 10DLC
// registration, which Text2Sale pays for, starts after the first charge.

import { isOwnerEmail } from "./owner";
import { isPlanKey, PLANS, type Capability, type PlanKey } from "./plans";

export type PlanProfile = {
  email?: string | null;
  plan?: { key?: unknown; pendingKey?: unknown; pendingAt?: unknown } | null;
  subscription_status?: string | null;
  free_subscription?: boolean | null;
};

/** The plan in force now: a booked downgrade applies from its date. */
export function planKeyOf(profile: PlanProfile | null | undefined, now: Date = new Date()): PlanKey {
  const plan = profile?.plan;
  if (plan && isPlanKey(plan.pendingKey) && typeof plan.pendingAt === "string") {
    const at = new Date(plan.pendingAt).getTime();
    if (Number.isFinite(at) && at <= now.getTime()) return plan.pendingKey;
  }
  return isPlanKey(plan?.key) ? plan.key : "text";
}

/** Paying (or comped) right now. */
export function isActiveSubscriber(profile: PlanProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.free_subscription) return true;
  return profile.subscription_status === "active" || profile.subscription_status === "canceling";
}

/** In the free trial: card on file, first charge not taken yet. */
export function isTrialing(profile: PlanProfile | null | undefined): boolean {
  return !!profile && !profile.free_subscription && profile.subscription_status === "trialing";
}

/** Whether the account's plan includes a feature, whether or not it is paying. */
export function planIncludes(profile: PlanProfile | null | undefined, capability: Capability, now: Date = new Date()): boolean {
  return PLANS[planKeyOf(profile, now)].capabilities.includes(capability);
}

export function can(profile: PlanProfile | null | undefined, capability: Capability, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (isOwnerEmail(profile.email)) return true;
  if (!isActiveSubscriber(profile) && !isTrialing(profile)) return false;
  return planIncludes(profile, capability, now);
}

/** Texting inbox, campaigns, SMS sends and AI text replies. */
export const canText = (profile: PlanProfile | null | undefined, now?: Date) => can(profile, "texting", now);

/** Browser phone, dialer and the AI receptionist. */
export const canCall = (profile: PlanProfile | null | undefined, now?: Date) => can(profile, "calling", now);

/** Everything the dashboard needs to show or hide features. */
export function entitlementsOf(profile: PlanProfile | null | undefined, now: Date = new Date()) {
  const plan = planKeyOf(profile, now);
  return {
    plan,
    planName: PLANS[plan].name,
    active: isActiveSubscriber(profile) || isTrialing(profile) || isOwnerEmail(profile?.email),
    trial: isTrialing(profile),
    texting: canText(profile, now),
    calling: canCall(profile, now),
  };
}
