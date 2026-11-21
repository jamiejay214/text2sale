import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// Undo "cancel at the end of the billing period": the plan keeps renewing.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId: bodyUserId } = await req.json();
    if (!bodyUserId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_status, plan")
      .eq("id", userId)
      .single();
    if (!profile?.stripe_subscription_id || profile.subscription_status !== "canceling") {
      return NextResponse.json({ success: false, error: "Your plan is not set to end." }, { status: 400 });
    }

    await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: false });
    await supabase
      .from("profiles")
      .update({ subscription_status: "active", plan: { ...((profile.plan as object) || {}), endsAt: null } })
      .eq("id", userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Resume subscription error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
