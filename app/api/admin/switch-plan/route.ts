import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { planShape, toPlanKey } from "@/lib/packages";
import { PLANS } from "@/lib/plans";
import { ensurePlanPrice } from "@/lib/stripe-plans";

// ─── Admin: swap a user's subscription package ────────────────────────────
// The app ships two packages:
//   Standard  — $39.99 / mo, $0.015 per segment (legacy key)
//   AI        — $39.99 / mo, same plan (legacy key); AI is included in both
// Occasionally a user signs up for the wrong one and we need to move them
// without asking them to cancel + re-subscribe. This endpoint:
//   1. Writes the new plan shape to profiles.plan (+ ai_plan flag)
//   2. If they have an active Stripe subscription, swaps its price item to
//      the matching monthly price — Stripe prorates automatically so their
//      next invoice reflects the new amount.
//   3. Skips the Stripe step gracefully for users on free_subscription /
//      no Stripe sub (admin-comped accounts) — plan shape still updates.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const forbidden = await requireAdmin(auth.user);
    if (forbidden) return forbidden;

    const { userId, pkg: requested } = (await req.json()) as { userId?: string; pkg?: string };
    // Text, Dialer or Complete; legacy "standard" / "ai" mean Text.
    const pkg = toPlanKey(requested);
    if (!userId || !pkg) {
      return NextResponse.json(
        { success: false, error: "userId and pkg ('text' | 'dialer' | 'complete') required" },
        { status: 400 }
      );
    }

    const target = PLANS[pkg];

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, free_subscription, plan, email")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // ── Step 1: update plan shape + ai_plan flag in Supabase ────────────
    const currentPlan = (profile.plan || {}) as Record<string, unknown>;
    const nextPlan = { ...currentPlan, ...planShape(pkg, Number(currentPlan.messageCost) === 0.0135 ? 0.0135 : undefined), pendingKey: null, pendingAt: null };
    await supabase
      .from("profiles")
      .update({ plan: nextPlan })
      .eq("id", userId);

    // ── Step 2: sync Stripe subscription if one exists ──────────────────
    let stripeResult: "updated" | "skipped-no-sub" | "skipped-free" | "error" = "skipped-no-sub";
    let stripeMessage = "";

    if (profile.free_subscription) {
      stripeResult = "skipped-free";
      stripeMessage = "User is on a comp'd plan — no Stripe charge to change.";
    } else if (profile.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

        // Find or create a Text2Sale product
        const price = await ensurePlanPrice(stripe, pkg);

        const firstItem = sub.items.data[0];
        if (firstItem) {
          await stripe.subscriptions.update(profile.stripe_subscription_id, {
            items: [{ id: firstItem.id, price: price.id }],
            proration_behavior: "create_prorations",
            metadata: { ...(sub.metadata || {}), userId, package: pkg },
          });
          stripeResult = "updated";
          stripeMessage = `Stripe sub updated to $${target.price}/mo (prorated on next invoice).`;
        }
      } catch (err) {
        stripeResult = "error";
        stripeMessage = err instanceof Error ? err.message : "Stripe update failed";
        console.error("admin/switch-plan Stripe error:", stripeMessage);
      }
    } else {
      stripeMessage = "No active Stripe subscription — plan shape updated; user will be charged the new rate next time they subscribe.";
    }

    return NextResponse.json({
      success: true,
      pkg,
      plan: nextPlan,
      stripeResult,
      stripeMessage,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin/switch-plan error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
