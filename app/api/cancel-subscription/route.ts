import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const stripe = getStripe();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId: bodyUserId } = await req.json();

    if (!bodyUserId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;

    const userId = auth.user.id;

    // Get subscription ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", userId)
      .single();

    // Canceling during the free trial ends it now: nothing has been charged
    // and nothing will be. Numbers the trial bought are released by the
    // customer.subscription.deleted webhook.
    if (profile?.stripe_subscription_id && profile.subscription_status === "trialing") {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      await supabase
        .from("profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", userId);
      return NextResponse.json({ success: true, trialEnded: true });
    }

    if (!profile?.stripe_subscription_id || profile.subscription_status !== "active") {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel at period end (user keeps access until billing period ends)
    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const endTs = updated.cancel_at ?? updated.items?.data?.[0]?.current_period_end;
    const endsAt = endTs ? new Date(endTs * 1000).toISOString() : null;

    // Update profile
    const { data: row } = await supabase.from("profiles").select("plan").eq("id", userId).single();
    await supabase
      .from("profiles")
      .update({ subscription_status: "canceling", plan: { ...((row?.plan as object) || {}), endsAt } })
      .eq("id", userId);

    return NextResponse.json({ success: true, endsAt });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cancel subscription error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
