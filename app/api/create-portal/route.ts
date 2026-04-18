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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com";

    // Get stripe customer ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: "No billing account found. Subscribe first." },
        { status: 400 }
      );
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard?tab=billing`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe portal error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
