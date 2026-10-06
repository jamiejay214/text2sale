import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticate } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const headers = { "Cache-Control": "no-store" };
  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  if (typeof sessionId !== "string" || !/^cs_(live|test)_[A-Za-z0-9]{10,255}$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400, headers });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503, headers });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== auth.user.id) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404, headers });
    }
    if (session.mode !== "subscription" || session.metadata?.type !== "subscription" ||
        session.status !== "complete" || session.payment_status !== "paid" ||
        !session.amount_total || session.amount_total <= 0 || session.currency !== "usd") {
      return NextResponse.json({ verified: false }, { headers });
    }
    // Never return customer details or send a checkout session secret to Meta.
    const eventId = createHash("sha256").update(`text2sale:purchase:${session.id}`).digest("hex");
    return NextResponse.json({ verified: true, trackable: session.livemode,
      eventId, value: session.amount_total / 100, currency: "USD" }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 502, headers });
  }
}
