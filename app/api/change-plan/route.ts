import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import { planShape, toPlanKey } from "@/lib/packages";
import { isUpgrade, PLANS, type PlanKey } from "@/lib/plans";
import { ensurePlanPrice } from "@/lib/stripe-plans";

// ── Switch between Text, Dialer and Complete ───────────────────────────────
//
// POST { plan, confirm?: false } previews the change; { plan, confirm: true }
// makes it.
//
//   Upgrade (to a higher price): takes effect now. The prorated difference is
//     invoiced and collected first (error_if_incomplete); if the card is
//     declined nothing changes.
//   Downgrade: booked for the next renewal. The subscription's price changes
//     without proration, so the next invoice is at the new price, and the
//     account keeps its current features until then (profiles.plan.pendingKey,
//     read by lib/entitlements.ts). Picking the current plan again cancels a
//     booked downgrade.
//
// Contacts, history, numbers and settings are never touched by a plan change.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** What stops working when an account moves from one plan to another. */
function featuresLost(from: PlanKey, to: PlanKey): string[] {
  const lost: string[] = [];
  const has = (key: PlanKey, capability: "texting" | "calling") => PLANS[key].capabilities.includes(capability);
  if (has(from, "texting") && !has(to, "texting")) {
    lost.push(
      "Texting stops: one-off texts, campaigns, scheduled drips and AI text replies won't send.",
      "Your messaging registration stays in place (and its monthly campaign fee continues) so texting can be switched back on; ask support to deactivate it.",
    );
  }
  if (has(from, "calling") && !has(to, "calling")) {
    lost.push(
      "The dialer, browser phone and AI receptionist stop. Calls to your numbers still forward to your cell if forwarding is on.",
    );
  }
  return lost;
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "Payments aren't configured." }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
  const body = await req.json().catch(() => ({}));
  const target = toPlanKey(body.plan);
  if (!target) return NextResponse.json({ success: false, error: "Choose Text, Dialer or Complete." }, { status: 400 });

  const db = createClient(supabaseUrl, serviceKey);
  const userId = auth.user.id;
  const { data: profile } = await db
    .from("profiles")
    .select("plan, free_subscription, stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", userId)
    .single();
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  if (profile.free_subscription) {
    return NextResponse.json({ success: false, error: "Your plan is managed by our team. Message support to change it." }, { status: 403 });
  }
  if (!profile.stripe_subscription_id || !["active", "canceling"].includes(String(profile.subscription_status))) {
    return NextResponse.json({ success: false, needsSubscription: true, error: "Start your subscription first." }, { status: 402 });
  }

  const plan = (profile.plan || {}) as Record<string, unknown>;
  const current = toPlanKey(plan.key) || "text";
  const pendingKey = toPlanKey(plan.pendingKey);
  const messageCost = Number(plan.messageCost) === 0.0135 ? 0.0135 : undefined;

  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  } catch {
    return NextResponse.json({ success: false, error: "We couldn't load your subscription. Please try again." }, { status: 502 });
  }
  const item = sub.items.data[0];
  if (!item || sub.status !== "active") {
    return NextResponse.json({ success: false, error: "Your subscription isn't active. Update your payment method first." }, { status: 402 });
  }
  const renewsAt = new Date(item.current_period_end * 1000).toISOString();

  // Same plan: nothing to do, unless that cancels a booked downgrade.
  if (target === current) {
    if (!pendingKey) return NextResponse.json({ success: true, unchanged: true });
    if (!body.confirm) {
      return NextResponse.json({ success: true, preview: { direction: "keep", plan: PLANS[target], renewsAt, message: `Cancel the switch to ${PLANS[pendingKey].name} and stay on ${PLANS[target].name}.` } });
    }
    try {
      const price = await ensurePlanPrice(stripe, target);
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: price.id }],
        proration_behavior: "none",
        metadata: { ...(sub.metadata || {}), userId, package: target },
      });
    } catch (e) {
      console.error("[change-plan] cancel downgrade failed:", e instanceof Error ? e.message : e);
      return NextResponse.json({ success: false, error: "We couldn't update your plan. Please try again." }, { status: 502 });
    }
    await db.from("profiles").update({ plan: { ...plan, pendingKey: null, pendingAt: null } }).eq("id", userId);
    return NextResponse.json({ success: true, plan: target });
  }

  if (isUpgrade(current, target)) {
    const price = await ensurePlanPrice(stripe, target);
    if (!body.confirm) {
      let dueNow: number | null = null;
      try {
        const preview = await stripe.invoices.createPreview({
          customer: profile.stripe_customer_id || undefined,
          subscription: sub.id,
          subscription_details: { items: [{ id: item.id, price: price.id }], proration_behavior: "always_invoice" },
        });
        dueNow = (preview.amount_due || 0) / 100;
      } catch (e) {
        console.error("[change-plan] preview failed:", e instanceof Error ? e.message : e);
      }
      return NextResponse.json({
        success: true,
        preview: {
          direction: "upgrade",
          from: PLANS[current],
          plan: PLANS[target],
          dueNow,
          renewsAt,
          message: `${PLANS[target].name} starts now at $${PLANS[target].price}/month. ${dueNow !== null ? `You'll be charged $${dueNow.toFixed(2)} today for the rest of this billing period.` : "The prorated difference for the rest of this billing period is charged today."}${PLANS[target].capabilities.includes("texting") && !PLANS[current].capabilities.includes("texting") ? " Texting also needs your business registered for messaging (EIN and business details), which you can start right after." : ""}`,
        },
      });
    }
    try {
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: price.id }],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        metadata: { ...(sub.metadata || {}), userId, package: target },
      });
    } catch (e) {
      const declined = e instanceof Stripe.errors.StripeError && (e.type === "StripeCardError" || e.statusCode === 402);
      console.error("[change-plan] upgrade failed:", e instanceof Error ? e.message : e);
      return NextResponse.json(
        {
          success: false,
          error: declined
            ? "Your card couldn't be charged for the upgrade. Update your payment method and try again. You haven't been charged."
            : "We couldn't upgrade your plan right now. You haven't been charged. Please try again.",
        },
        { status: declined ? 402 : 502 },
      );
    }
    await db.from("profiles").update({ plan: { ...plan, ...planShape(target, messageCost), pendingKey: null, pendingAt: null } }).eq("id", userId);
    return NextResponse.json({ success: true, plan: target, needsMessagingSetup: PLANS[target].capabilities.includes("texting") && !PLANS[current].capabilities.includes("texting") });
  }

  // Downgrade: at the next renewal.
  if (!body.confirm) {
    return NextResponse.json({
      success: true,
      preview: {
        direction: "downgrade",
        from: PLANS[current],
        plan: PLANS[target],
        dueNow: 0,
        renewsAt,
        lost: featuresLost(current, target),
        message: `You keep ${PLANS[current].name} until ${new Date(renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}, then switch to ${PLANS[target].name} at $${PLANS[target].price}/month. Nothing is charged today. Contacts, history, numbers and settings stay.`,
      },
    });
  }
  // Book it on the profile first: the subscription.updated webhook the
  // Stripe change fires must see the booking and keep today's plan.
  await db.from("profiles").update({ plan: { ...plan, pendingKey: target, pendingAt: renewsAt } }).eq("id", userId);
  try {
    const price = await ensurePlanPrice(stripe, target);
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: price.id }],
      proration_behavior: "none",
      metadata: { ...(sub.metadata || {}), userId, package: target },
    });
  } catch (e) {
    console.error("[change-plan] downgrade failed:", e instanceof Error ? e.message : e);
    await db.from("profiles").update({ plan: { ...plan, pendingKey: pendingKey || null, pendingAt: plan.pendingAt || null } }).eq("id", userId);
    return NextResponse.json({ success: false, error: "We couldn't book the change. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ success: true, plan: current, pendingPlan: target, effectiveAt: renewsAt });
}
