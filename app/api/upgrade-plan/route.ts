import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import { PACKAGES, planShape } from "@/lib/packages";
import { isIndustryId } from "@/lib/industries";
import { ensureMonthlyPrice } from "@/lib/stripe-plans";

// ── Upgrade to the AI plan ─────────────────────────────────────────────────
//
// The dashboard's "Activate AI Plan" button used to write ai_plan straight to
// the profile. A database trigger blocks clients from writing that column (so
// nobody can grant themselves AI for free), the write was silently refused,
// and the button showed "AI plan activated!" anyway — the customer believed
// they had upgraded and saw no change.
//
// This is the real upgrade. It follows the pay-first rule: the subscription
// is moved to the AI price with the difference invoiced and collected *before*
// the change takes effect (`error_if_incomplete`). If the card is declined the
// subscription is untouched and nothing is switched on.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "Payments aren't configured." }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });

  const body = await req.json().catch(() => ({}));
  const db = createClient(supabaseUrl, serviceKey);
  const userId = auth.user.id;

  const { data: profile } = await db
    .from("profiles")
    .select("ai_plan, free_subscription, is_usha, stripe_subscription_id, subscription_status, industry")
    .eq("id", userId)
    .single();
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

  const industry = isIndustryId(body.industry) ? body.industry : null;
  const saveIndustry = async () => {
    if (industry && industry !== profile.industry) await db.from("profiles").update({ industry }).eq("id", userId);
  };

  if (profile.ai_plan) {
    await saveIndustry();
    return NextResponse.json({ success: true, alreadyActive: true });
  }
  if (profile.is_usha) {
    return NextResponse.json({ success: false, error: "The AI plan isn't available on your account." }, { status: 403 });
  }
  if (profile.free_subscription) {
    return NextResponse.json(
      { success: false, error: "Your plan is managed by our team — message support and we'll add AI for you." },
      { status: 403 }
    );
  }
  if (!profile.stripe_subscription_id || profile.subscription_status !== "active") {
    return NextResponse.json(
      { success: false, needsSubscription: true, error: "Start or resume your subscription first, then add AI." },
      { status: 402 }
    );
  }

  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    if (sub.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Your subscription isn't active — update your payment method first." },
        { status: 402 }
      );
    }
    const item = sub.items.data[0];
    if (!item) throw new Error("Subscription has no items");

    const price = await ensureMonthlyPrice(stripe, Math.round(PACKAGES.ai.price * 100));

    // Charge the prorated difference now and refuse the change if it fails.
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: price.id }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
      metadata: { ...(sub.metadata || {}), userId, package: "ai" },
    });
  } catch (e) {
    const declined = e instanceof Stripe.errors.StripeError && (e.type === "StripeCardError" || e.statusCode === 402);
    console.error("[upgrade-plan] stripe error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      {
        success: false,
        error: declined
          ? "Your card couldn't be charged for the upgrade. Update your payment method and try again — you haven't been charged."
          : "We couldn't upgrade your plan right now. You haven't been charged — please try again.",
      },
      { status: declined ? 402 : 502 }
    );
  }

  // Paid. Now turn it on. (The webhook will also set ai_plan from the
  // subscription's package; doing it here means the dashboard sees it at once.)
  await db
    .from("profiles")
    .update({ plan: planShape("ai"), ai_plan: true, ...(industry ? { industry } : {}) })
    .eq("id", userId);

  return NextResponse.json({ success: true, plan: planShape("ai") });
}
