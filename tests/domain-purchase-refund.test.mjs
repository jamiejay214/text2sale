import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function domainPurchaseHarness({ refundFailures = 0 } = {}) {
  const events = [];
  let failuresLeft = refundFailures;
  const profile = {
    first_name: "Jamie",
    last_name: "Johnson",
    email: "jamie@example.test",
    phone: "+19545550100",
    business_slug: "jamie-health",
    a2p_registration: {
      businessName: "Jamie Health",
      businessAddress: "123 Main St",
      businessCity: "Fort Lauderdale",
      businessState: "FL",
      businessZip: "33301",
    },
  };

  const db = {
    from(table) {
      assert.equal(table, "profiles");
      const query = {
        select() {
          return query;
        },
        update(values) {
          events.push({ type: "profile-update", values });
          Object.assign(profile, values);
          return query;
        },
        eq() {
          return query;
        },
        single: async () => ({ data: profile, error: null }),
        then(resolve, reject) {
          return Promise.resolve({ data: profile, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      events.push({ type: name, args });
      if (name === "decrement_wallet") return { data: 87.01, error: null };
      if (name === "credit_wallet" && failuresLeft > 0) {
        failuresLeft -= 1;
        return { data: null, error: { message: "refund unavailable" } };
      }
      return { data: 100, error: null };
    },
  };

  const mocks = {
    "./vercel-domains": {
      attachDomainToProject: async () => {},
      buyDomain: async () => {
        throw new Error("registrar request failed (403)");
      },
      getDomainOrder: async () => ({ status: "pending" }),
      isDomainAvailable: async () => ({ available: true, price: 7.99 }),
      isDomainOwned: async () => false,
    },
    "./business-site": {
      getUniqueSlug: async () => "jamie-health",
      isValidDomain: () => true,
      normalizeDomain: (value) => value.toLowerCase(),
      toSlug: (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/domain-purchase.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => mocks[name],
    console: { log() {}, error() {} },
  });

  return {
    events,
    profile,
    purchase: () => exports.purchaseDomainForUser(db, "user-1", "example.com", 12.99),
  };
}

test("a rejected registrar purchase issues an auditable idempotent refund", async () => {
  const harness = domainPurchaseHarness();
  const result = await harness.purchase();
  const credits = harness.events.filter((event) => event.type === "credit_wallet");

  assert.equal(result.code, "registrar");
  assert.equal(credits.length, 1);
  assert.equal(credits[0].args.p_amount, 12.99);
  assert.equal(typeof credits[0].args.p_idempotency_key, "string");
  assert.match(credits[0].args.p_idempotency_key, /^domain_refund_user-1_example\.com_/);
  assert.equal(harness.profile.a2p_registration.domainPurchase.state, "refunded");
});

test("a failed refund keeps the charge marker and retries without charging twice", async () => {
  const harness = domainPurchaseHarness({ refundFailures: 1 });
  const first = await harness.purchase();
  const firstKey = harness.events.find((event) => event.type === "credit_wallet").args.p_idempotency_key;

  assert.equal(first.code, "pending");
  assert.equal(harness.profile.a2p_registration.domainPurchase.state, "charged");

  const second = await harness.purchase();
  const debits = harness.events.filter((event) => event.type === "decrement_wallet");
  const credits = harness.events.filter((event) => event.type === "credit_wallet");

  assert.equal(second.code, "registrar");
  assert.equal(debits.length, 1);
  assert.equal(credits.length, 2);
  assert.equal(credits[1].args.p_idempotency_key, firstKey);
  assert.equal(harness.profile.a2p_registration.domainPurchase.state, "refunded");
});
