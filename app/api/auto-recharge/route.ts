import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
    const stripe = getStripe();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, amount } = await req.json();

    if (!userId || !amount || amount < 20) {
      return NextResponse.json({ success: false, error: "Invalid request. Minimum $20." }, { status: 400 });
    }

    // Get the user's profile to find their Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, auto_recharge")
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

    // Create + confirm a PaymentIntent with a Stripe-side idempotency key.
    // If this route runs twice (client retry, transient network error) Stripe
    // will return the original PI instead of charging the card a second time.
    // We also cache an idempotency key per minute so two rapid retries don't
    // produce separate PIs either. If a truly new recharge is needed, the
    // minute bucket advances and the key changes.
    const stripeIdemKey = `auto_recharge_${userId}_${Math.floor(Date.now() / 60000)}_${Math.round(amount * 100)}`;
    const paymentIntent = await stripe.paymentIntents.create(
      {
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
      },
      { idempotencyKey: stripeIdemKey }
    );

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ success: false, error: "Payment was not successful. Status: " + paymentIntent.status }, { status: 400 });
    }

    // Atomic credit via RPC. The PaymentIntent id is the idempotency token —
    // if Stripe retries a webhook or we accidentally call this twice for the
    // same PI, the RPC returns the existing balance instead of double-crediting.
    const { data: newBalance, error: creditErr } = await supabase.rpc("credit_wallet", {
      p_user_id: userId,
      p_amount: Number(amount.toFixed(2)),
      p_idempotency_key: paymentIntent.id,
      p_description: `Auto recharge — $${amount.toFixed(2)}`,
    });

    if (creditErr || newBalance === null) {
      console.error("credit_wallet failed after auto-recharge:", creditErr?.message);
      // Payment succeeded at Stripe. Don't 500 — surface enough detail that
      // support can reconcile using the PI id.
      return NextResponse.json(
        {
          success: false,
          error: "Payment succeeded but balance update failed. Contact support with PI: " + paymentIntent.id,
          paymentIntentId: paymentIntent.id,
        },
        { status: 500 }
      );
    }

    // Best-effort usage_history append for UI history. Not atomic with the
    // credit, but the credit is the authoritative record; this is just cosmetic.
    try {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("usage_history")
        .eq("id", userId)
        .single();
      const usageHistory = (currentProfile?.usage_history as Array<Record<string, unknown>>) || [];
      const newEntry = {
        id: `auto_recharge_${paymentIntent.id}`,
        type: "topup",
        amount,
        description: `Auto recharge — $${amount.toFixed(2)}`,
        createdAt: new Date().toISOString(),
        status: "succeeded",
      };
      await supabase
        .from("profiles")
        .update({ usage_history: [...usageHistory, newEntry] })
        .eq("id", userId);
    } catch (historyErr) {
      console.warn("usage_history append failed (non-fatal):", historyErr);
    }

    return NextResponse.json({ success: true, newBalance: Number(newBalance), charged: amount });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Auto recharge error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
