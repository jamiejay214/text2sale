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
    const { userId, amount } = await req.json();

    if (!userId || !amount || amount < 20) {
      return NextResponse.json({ success: false, error: "Invalid request. Minimum $20." }, { status: 400 });
    }

    // Get the user's profile to find their Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, wallet_balance, usage_history, auto_recharge")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "No payment method on file. Add a card first." }, { status: 400 });
    }

    // Check auto_recharge is enabled
    if (!profile.auto_recharge?.enabled) {
      return NextResponse.json({ success: false, error: "Auto recharge is not enabled" }, { status: 400 });
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer;

    let paymentMethodId: string | null = null;

    // Try default payment method on customer
    if (customer.invoice_settings?.default_payment_method) {
      paymentMethodId = typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method.id;
    }

    // Fall back to listing payment methods
    if (!paymentMethodId) {
      const methods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
        limit: 1,
      });
      if (methods.data.length > 0) {
        paymentMethodId = methods.data[0].id;
      }
    }

    if (!paymentMethodId) {
      return NextResponse.json({ success: false, error: "No card on file. Add a payment method first." }, { status: 400 });
    }

    // Create a payment intent and confirm it immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: "usd",
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Text2Sale Auto Recharge — $${amount.toFixed(2)}`,
      metadata: {
        userId,
        type: "auto_recharge",
        amount: amount.toString(),
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ success: false, error: "Payment was not successful. Status: " + paymentIntent.status }, { status: 400 });
    }

    // Update the wallet balance
    const currentBalance = profile.wallet_balance || 0;
    const newBalance = Number((currentBalance + amount).toFixed(2));

    // Add to usage history
    const usageHistory = profile.usage_history || [];
    const newEntry = {
      id: `auto_recharge_${Date.now()}`,
      type: "topup",
      amount,
      description: `Auto recharge — $${amount.toFixed(2)}`,
      createdAt: new Date().toISOString(),
      status: "succeeded",
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        wallet_balance: newBalance,
        usage_history: [...usageHistory, newEntry],
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update balance after auto recharge:", updateError.message);
      return NextResponse.json({ success: false, error: "Payment succeeded but failed to update balance. Contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance, charged: amount });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto recharge error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
