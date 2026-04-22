import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";

// ─── Admin: swap a user's subscription package ────────────────────────────
// The app ships two packages:
//   Standard  — $39.99 / mo, $0.012 per msg, no AI
//   AI        — $59.99 / mo, $0.012 per msg, AI auto-reply on
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

const PACKAGES = {
  standard: { name: "Text2Sale Standard", price: 39.99, messageCost: 0.012, aiPlan: false },
  ai:       { name: "Text2Sale AI",       price: 59.99, messageCost: 0.012, aiPlan: true  },
} as const;

type PackageKey = keyof typeof PACKAGES;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gate: caller must be admin. We trust the admin flag on profiles.role.
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 });
    }

    const { userId, pkg } = (await req.json()) as { userId?: string; pkg?: PackageKey };
    if (!userId || !pkg || !(pkg in PACKAGES)) {
      return NextResponse.json(
        { success: false, error: "userId and pkg ('standard' | 'ai') required" },
        { status: 400 }
      );
    }

    const target = PACKAGES[pkg];

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, free_subscription, plan, email")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // ── Step 1: update plan shape + ai_plan flag in Supabase ────────────
    const nextPlan = {
      name: target.name,
      price: target.price,
      messageCost: target.messageCost,
    };
    await supabase
      .from("profiles")
      .update({ plan: nextPlan, ai_plan: target.aiPlan })
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
        const products = await stripe.products.list({ limit: 10, active: true });
        let product = products.data.find((p) => p.name === "Text2Sale Monthly Plan");
        if (!product) {
          product = await stripe.products.create({
            name: "Text2Sale Monthly Plan",
            description: "Monthly subscription for Text2Sale CRM",
          });
        }

        // Find or create the matching recurring price
        const planPriceCents = Math.round(target.price * 100);
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 50 });
        let price = prices.data.find(
          (p) =>
            p.unit_amount === planPriceCents &&
            p.recurring?.interval === "month" &&
            p.currency === "usd"
        );
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: planPriceCents,
            currency: "usd",
            recurring: { interval: "month" },
          });
        }

        // Swap the subscription's line item. proration_behavior: 'create_prorations'
        // is Stripe's default — users get a credit/charge for the partial period.
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
      aiPlan: target.aiPlan,
      stripeResult,
      stripeMessage,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin/switch-plan error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
