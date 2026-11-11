import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";
import { planShape, toPlanKey } from "@/lib/packages";
import { ensurePlanPrice } from "@/lib/stripe-plans";

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
    const { userId: bodyUserId, userEmail, package: requestedPackage } = await req.json();

    if (!bodyUserId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Missing userId or userEmail" },
        { status: 400 }
      );
    }

    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;

    const userId = auth.user.id;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com";

    // Get user's profile including their plan price
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_status, plan")
      .eq("id", userId)
      .single();

    if (profile?.subscription_status === "active") {
      return NextResponse.json(
        { success: false, error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Text, Dialer or Complete (lib/plans.ts): the plan asked for at
    // checkout, else the one chosen at signup, else Text. Prices always come
    // from lib/plans.ts, never from a price stored on the profile.
    const pkg = toPlanKey(requestedPackage) || toPlanKey(profile?.plan?.key) || "text";
    const messageCost = Number(profile?.plan?.messageCost) === 0.0135 ? 0.0135 : undefined;

    let customerId = profile?.stripe_customer_id;

    await supabase
      .from("profiles")
      .update({ plan: planShape(pkg, messageCost) })
      .eq("id", userId);

    // Create or reuse Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const price = await ensurePlanPrice(stripe, pkg);

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}&plan=${pkg}`,
      cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
      metadata: {
        userId,
        type: "subscription",
        package: pkg,
      },
      subscription_data: {
        metadata: {
          userId,
          package: pkg,
        },
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe subscription error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
