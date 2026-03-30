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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const sessionType = session.metadata?.type;

      if (sessionType === "subscription") {
        // Subscription checkout completed — handled by customer.subscription.created
        // Just log it
        console.log("Subscription checkout completed for user:", userId);
      } else {
        // Wallet top-up
        const amount = parseFloat(session.metadata?.amount || "0");

        if (userId && amount) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance, usage_history")
            .eq("id", userId)
            .single();

          if (profile) {
            const currentBalance = Number(profile.wallet_balance) || 0;
            const newBalance = Number((currentBalance + amount).toFixed(2));

            const entry = {
              id: `stripe_${Date.now()}`,
              type: "fund_add",
              amount,
              description: `Stripe payment — $${amount.toFixed(2)}`,
              createdAt: new Date().toISOString(),
              status: "succeeded",
            };

            const updatedHistory = [entry, ...(profile.usage_history || [])];

            await supabase
              .from("profiles")
              .update({
                wallet_balance: newBalance,
                usage_history: updatedHistory,
              })
              .eq("id", userId);
          }
        }
      }
    }

    // Subscription created or updated
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const status = subscription.status; // active, past_due, canceled, etc.

      if (userId) {
        const subStatus = subscription.cancel_at_period_end
          ? "canceling"
          : status === "active"
            ? "active"
            : status === "past_due"
              ? "past_due"
              : "inactive";

        await supabase
          .from("profiles")
          .update({
            subscription_status: subStatus,
            stripe_subscription_id: subscription.id,
          })
          .eq("id", userId);
      }
    }

    // Subscription deleted (fully canceled)
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "inactive",
            stripe_subscription_id: null,
          })
          .eq("id", userId);
      }
    }

    // Invoice paid — log subscription payment in usage history
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;

      if (subDetails) {
        const userId = subDetails.metadata?.userId;

        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("usage_history")
            .eq("id", userId)
            .single();

          if (profile) {
            const entry = {
              id: `sub_${Date.now()}`,
              type: "charge",
              amount: (invoice.amount_paid || 0) / 100,
              description: "Monthly subscription — Text2Sale Plan",
              createdAt: new Date().toISOString(),
              status: "succeeded",
            };

            const updatedHistory = [entry, ...(profile.usage_history || [])];

            await supabase
              .from("profiles")
              .update({ usage_history: updatedHistory })
              .eq("id", userId);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
