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

    // ── Webhook idempotency ────────────────────────────────────────────────
    // Stripe retries failed webhooks for up to 3 days. Without this guard a
    // retry could double-credit the wallet, re-pay a referral bonus, or
    // re-charge the monthly number fee. We insert the event.id into a
    // dedupe table; a unique-violation means we already processed it.
    try {
      const { error: dedupeErr } = await supabase
        .from("stripe_events")
        .insert({ id: event.id, event_type: event.type });
      if (dedupeErr) {
        // Postgres code 23505 = unique_violation. Everything else is fatal.
        const code = (dedupeErr as { code?: string }).code;
        if (code === "23505") {
          console.log(`[stripe-webhook] duplicate event ${event.id} (${event.type}), skipping`);
          return NextResponse.json({ received: true, duplicate: true });
        }
        console.error("[stripe-webhook] dedupe insert failed:", dedupeErr);
        // Fail open — better to double-process than silently drop, but this
        // should only happen if the migration hasn't been applied.
      }
    } catch (e) {
      console.error("[stripe-webhook] dedupe check threw:", e);
    }

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
          // ── Atomic, idempotent wallet credit ───────────────────────────
          // Previously this read wallet_balance, added `amount`, and wrote
          // back — a classic read-modify-write race. A checkout.session.
          // completed landing on one lambda at the same moment as an
          // invoice.payment_succeeded on another would both read the same
          // starting balance and the second write would clobber the first,
          // silently losing one of the updates. `credit_wallet` is an
          // atomic RPC that also dedupes on the idempotency key — using
          // event.id as the key means even if the stripe_events dedupe
          // above fails open (e.g. migration missing), the same webhook
          // can't credit the wallet twice.
          const { error: creditErr } = await supabase.rpc("credit_wallet", {
            p_user_id: userId,
            p_amount: amount,
            p_idempotency_key: event.id,
            p_description: `Stripe payment — $${amount.toFixed(2)}`,
          });
          if (creditErr) {
            console.error("[stripe-webhook] credit_wallet failed:", creditErr);
          }

          // Read the fresh balance + metadata for the audit log / referral
          // check. Any arithmetic on numbers here is derived; the wallet
          // itself is already settled atomically above.
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance, usage_history, total_deposited, referred_by, referral_rewarded, first_name, last_name")
            .eq("id", userId)
            .single();

          if (profile) {
            const newBalance = Number(profile.wallet_balance) || 0;
            const newTotalDeposited = Number(profile.total_deposited || 0);

            const entry = {
              id: `stripe_${event.id}`,
              type: "fund_add",
              amount,
              description: `Stripe payment — $${amount.toFixed(2)}`,
              createdAt: new Date().toISOString(),
              status: "succeeded",
            };

            // Append audit entry — best-effort. If two concurrent writes
            // race, one audit entry might be lost (JSONB array is not
            // append-atomic here), but the wallet itself is correct.
            await supabase
              .from("profiles")
              .update({
                usage_history: [entry, ...(profile.usage_history || [])],
              })
              .eq("id", userId);

            // ── Referral bonus — atomic flag flip gates the payout ──────
            // Before: check `!referral_rewarded`, then separately write
            //         `referral_rewarded: true`. Two concurrent top-ups
            //         both passed the check and both paid the bonus.
            // Now: the UPDATE with `.eq("referral_rewarded", false)` is
            //      atomic — only the FIRST request wins, and only the
            //      winner proceeds to credit either party. Combined with
            //      distinct idempotency keys per credit, this is safe
            //      against retries AND concurrent events.
            if (
              profile.referred_by &&
              !profile.referral_rewarded &&
              newTotalDeposited >= 50
            ) {
              const { data: flipped } = await supabase
                .from("profiles")
                .update({ referral_rewarded: true })
                .eq("id", userId)
                .eq("referral_rewarded", false)
                .select("id")
                .single();

              if (flipped) {
                const now = new Date().toISOString();

                // Award $50 to the NEW USER
                await supabase.rpc("credit_wallet", {
                  p_user_id: userId,
                  p_amount: 50,
                  p_idempotency_key: `${event.id}_ref_new`,
                  p_description: "Referral bonus — $50 for joining with a code",
                });
                await supabase
                  .from("profiles")
                  .update({
                    usage_history: [
                      {
                        id: `referral_bonus_${event.id}`,
                        type: "fund_add",
                        amount: 50,
                        description: "Referral bonus — $50 reward for joining with a referral code",
                        createdAt: now,
                        status: "succeeded",
                      },
                      ...(profile.usage_history || []),
                      entry,
                    ],
                  })
                  .eq("id", userId);

                // Award $50 to the REFERRER
                await supabase.rpc("credit_wallet", {
                  p_user_id: profile.referred_by,
                  p_amount: 50,
                  p_idempotency_key: `${event.id}_ref_src`,
                  p_description: `Referral bonus — ${profile.first_name || "downline"} deposited $50+`,
                });

                const { data: referrer } = await supabase
                  .from("profiles")
                  .select("usage_history")
                  .eq("id", profile.referred_by)
                  .single();

                if (referrer) {
                  await supabase
                    .from("profiles")
                    .update({
                      usage_history: [
                        {
                          id: `referral_reward_${event.id}`,
                          type: "fund_add",
                          amount: 50,
                          description: `Referral bonus — ${profile.first_name || "Someone"} ${profile.last_name || ""} deposited $50+`,
                          createdAt: now,
                          status: "succeeded",
                        },
                        ...(referrer.usage_history || []),
                      ],
                    })
                    .eq("id", profile.referred_by);
                }

                console.log(`Referral bonus awarded: $50 to ${userId}, $50 to ${profile.referred_by}`);
              }
            }
            // Touch newBalance so linters don't complain about unused
            // state; it's kept for debugging in logs.
            void newBalance;
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

        // Skip status override if admin has granted a free subscription — we
        // don't want Stripe's "inactive" state to clobber the comp.
        const { data: current } = await supabase
          .from("profiles")
          .select("free_subscription")
          .eq("id", userId)
          .single();
        const update: Record<string, unknown> = {
          stripe_subscription_id: subscription.id,
        };
        if (!current?.free_subscription) update.subscription_status = subStatus;
        await supabase.from("profiles").update(update).eq("id", userId);
      }
    }

    // Subscription deleted (fully canceled)
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const { data: current } = await supabase
          .from("profiles")
          .select("free_subscription")
          .eq("id", userId)
          .single();
        const update: Record<string, unknown> = { stripe_subscription_id: null };
        if (!current?.free_subscription) update.subscription_status = "inactive";
        await supabase.from("profiles").update(update).eq("id", userId);
      }
    }

    // Invoice paid — log subscription payment and charge monthly number fees
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;

      if (subDetails) {
        const userId = subDetails.metadata?.userId;

        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("usage_history, owned_numbers, wallet_balance")
            .eq("id", userId)
            .single();

          if (profile) {
            const now = new Date().toISOString();
            const entries = [];

            // Log subscription charge
            entries.push({
              id: `sub_${Date.now()}`,
              type: "charge",
              amount: (invoice.amount_paid || 0) / 100,
              description: "Monthly subscription — Text2Sale Plan",
              createdAt: now,
              status: "succeeded",
            });

            // Charge $1/month per owned phone number
            const ownedNumbers = profile.owned_numbers || [];
            const numberCount = ownedNumbers.length;
            let numberCharge = 0;

            if (numberCount > 0) {
              numberCharge = numberCount * 1;
              entries.push({
                id: `numfee_${Date.now()}`,
                type: "charge",
                amount: numberCharge,
                description: `Monthly phone number fee — ${numberCount} number${numberCount > 1 ? "s" : ""} × $1.00`,
                createdAt: now,
                status: "succeeded",
              });
            }

            const updatedHistory = [...entries, ...(profile.usage_history || [])];

            // Atomic decrement — avoids the read/modify/write race where a
            // parallel top-up would clobber this write (or vice-versa).
            // Only fires if there's actually a fee to debit; the audit log
            // update is a separate best-effort write.
            if (numberCharge > 0) {
              const { error: decErr } = await supabase.rpc("decrement_wallet", {
                p_user_id: userId,
                p_amount: numberCharge,
              });
              if (decErr) {
                console.error("[stripe-webhook] decrement_wallet (number fee) failed:", decErr);
              }
            }

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
