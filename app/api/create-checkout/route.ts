import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { amount, userId, userEmail } = await req.json();

    if (!amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing amount or userId" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Text2Sale Wallet — $${amount.toFixed(2)}`,
              description: `Add $${amount.toFixed(2)} to your Text2Sale wallet`,
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/dashboard?payment=success&amount=${amount}`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled`,
      metadata: {
        userId,
        amount: amount.toString(),
        type: "wallet_topup",
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe checkout error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
