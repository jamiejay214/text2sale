import Stripe from "stripe";

const couponId = "text2sale-welcome-first-month-v1";

export async function prepareWelcomeCode(stripe: Stripe, customer: string) {
  const history = await stripe.subscriptions.list({customer,status:"all",limit:1});
  if (history.data.length) return false;
  const existing = await stripe.promotionCodes.list({customer, code:"10OFF", limit:1});
  if (existing.data.length) return existing.data[0].active && existing.data[0].times_redeemed === 0;
  try {
    await stripe.coupons.retrieve(couponId);
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError) || error.code !== "resource_missing") throw error;
    await stripe.coupons.create({id:couponId,name:"10% off your first month",percent_off:10,duration:"once"},
      {idempotencyKey:couponId});
  }
  await stripe.promotionCodes.create({
    promotion:{type:"coupon",coupon:couponId}, customer, code:"10OFF", max_redemptions:1,
    metadata:{offer:"first_subscription_month"},
  }, {idempotencyKey:couponId+"-"+customer});
  return true;
}
