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

    if (!profile?.stripe_subscription_id || profile.subscription_status !== "active") {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel at period end (user keeps access until billing period ends)
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update profile
    await supabase
      .from("profiles")
      .update({ subscription_status: "canceling" })
      .eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cancel subscription error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
