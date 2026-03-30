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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amount = parseFloat(session.metadata?.amount || "0");

      if (!userId || !amount) {
        return NextResponse.json({ received: true });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch current profile
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
