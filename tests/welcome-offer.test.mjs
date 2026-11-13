import assert from "node:assert/strict";
import test from "node:test";
import { prepareWelcomeCode } from "../lib/stripe-welcome-offer.ts";

function fixture({ codes = [], subscriptions = [] } = {}) {
  const created = [];
  const stripe = {
    coupons: {retrieve: async () => ({})},
    promotionCodes: {list: async () => ({data:codes}), create: async params => created.push(params)},
    subscriptions: {list: async () => ({data:subscriptions})},
  };
  return {stripe,created};
}
test("claimed first subscription gets a customer-bound code redeemable once", async () => {
  const {stripe,created} = fixture();
  assert.equal(await prepareWelcomeCode(stripe,"cus_test"),true);
  assert.equal(created.length,1);
  assert.deepEqual([created[0].code,created[0].customer,created[0].max_redemptions],["10OFF","cus_test",1]);
});
test("past subscribers and previously redeemed codes cannot claim again", async () => {
  for (const input of [{subscriptions:[{}]},{codes:[{active:false,times_redeemed:1}]}]) {
    const {stripe,created} = fixture(input);
    assert.equal(await prepareWelcomeCode(stripe,"cus_test"),false);
    assert.equal(created.length,0);
  }
});
