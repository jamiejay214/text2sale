import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import { PACKAGES, planShape } from "@/lib/packages";
import { ensureMonthlyPrice } from "@/lib/stripe-plans";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const db = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_subscription_id, subscription_status, free_subscription, plan")
    .eq("id", auth.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  }

  const currentMessageCost = Number(profile.plan?.messageCost) === 0.0135 ? 0.0135 : 0.015;
  const normalizedPlan = { ...planShape("standard"), messageCost: currentMessageCost };

  if (profile.free_subscription || !profile.stripe_subscription_id) {
    await db.from("profiles").update({ plan: normalizedPlan, ai_plan: true }).eq("id", auth.user.id);
    return NextResponse.json({ success: true, changed: false });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "Payments are not configured." }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const item = subscription.items.data[0];
  if (!item) {
    return NextResponse.json({ success: false, error: "Subscription has no billing item." }, { status: 502 });
  }

  const currentCents = item.price.unit_amount;
  let changed = false;

  // Only migrate the exact retired AI price. This deliberately leaves any
  // custom/agency pricing alone.
  if (currentCents === 11999) {
    const unifiedPrice = await ensureMonthlyPrice(stripe, Math.round(PACKAGES.standard.price * 100));
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: unifiedPrice.id }],
      proration_behavior: "none",
      metadata: { ...(subscription.metadata || {}), userId: auth.user.id, package: "standard" },
    });
    changed = true;
  }

  await db
    .from("profiles")
    .update({
      plan: normalizedPlan,
      ai_plan: ["active", "trialing"].includes(subscription.status) || subscription.cancel_at_period_end,
    })
    .eq("id", auth.user.id);

  return NextResponse.json({ success: true, changed });
}
