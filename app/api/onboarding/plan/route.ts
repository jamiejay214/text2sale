import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import { isPackageKey, planShape } from "@/lib/packages";
import { isIndustryId } from "@/lib/industries";

// ── Record the plan chosen at signup ───────────────────────────────────────
//
// Text2Sale has ONE plan: $39.99/month with everything, AI included. The
// "standard" and "ai" keys both resolve to it (see lib/packages.ts); they
// survive only so old signup links and Stripe metadata keep working.
//
// This route only stores profiles.plan for checkout. AI features (ai_plan)
// are switched on by the Stripe webhook once the subscription is active —
// choosing a plan isn't paying for it.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const db = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await db
    .from("profiles")
    .select("subscription_status, stripe_subscription_id, free_subscription, is_usha, industry")
    .eq("id", auth.user.id)
    .single();
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  // The checkout price can only be chosen before there is a subscription.
  // After that, plan changes go through the upgrade route (which charges
  // first) or the admin switch.
  const hasSubscription =
    !!profile.stripe_subscription_id ||
    !!profile.free_subscription ||
    ["active", "canceling", "past_due"].includes(String(profile.subscription_status));

  let planApplied: string | null = null;
  if (isPackageKey(body.package) && !hasSubscription) {
    // USHA partner accounts are pinned to Standard and never see AI.
    const key = profile.is_usha ? "standard" : body.package;
    updates.plan = planShape(key);
    planApplied = key;
  }

  if (isIndustryId(body.industry) && !profile.industry) {
    updates.industry = body.industry;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db.from("profiles").update(updates).eq("id", auth.user.id);
    if (error) {
      console.error("[onboarding/plan] update failed:", error.message);
      return NextResponse.json({ success: false, error: "Could not save your plan" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, plan: planApplied });
}
