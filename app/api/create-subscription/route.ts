import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    const stripe = getStripe();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, userEmail } = await req.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Missing userId or userEmail" },
        { status: 400 }
      );
    }

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

    // Get the user's plan price (default to $39.99 if not set)
    const planPrice = profile?.plan?.price || 39.99;
    const planPriceCents = Math.round(planPrice * 100);
    const messageCost = profile?.plan?.messageCost || 0.012;

    let customerId = profile?.stripe_customer_id;

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

    // Create or find the product
    const products = await stripe.products.list({ limit: 10, active: true });
    let product = products.data.find((p) => p.name === "Text2Sale Monthly Plan");

    if (!product) {
      product = await stripe.products.create({
        name: "Text2Sale Monthly Plan",
        description: `Unlimited access to Text2Sale CRM — $${messageCost} per message`,
      });
    }

    // Find existing price matching user's plan price, or create one
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 50,
    });

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

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
      metadata: {
        userId,
        type: "subscription",
      },
      subscription_data: {
        metadata: {
          userId,
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
