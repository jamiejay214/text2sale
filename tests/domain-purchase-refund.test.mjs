import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function domainPurchaseHarness({ refundFailures = 0, domain = "example.com", buySucceeds = false, schemaFailure = false, extraRequired = false, orderStatus = "completed" } = {}) {
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
      businessType: "llc",
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

  const registrar = {};
  const registrarCode = ts.transpileModule(
    readFileSync(new URL("../lib/vercel-domains.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(registrarCode, {
    exports: registrar,
    process: { env: { VERCEL_API_TOKEN: "test", VERCEL_PROJECT_ID: "test", VERCEL_TEAM_ID: "test" } },
    AbortSignal, console: { log() {}, error() {} },
    fetch: async (url, options) => {
      const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
      if (url.includes("contact-info/schema")) {
        events.push({ type: "preflight" });
        if (schemaFailure) return json({}, 503);
        if (extraRequired) return json({ local_presence_id: { type: "text", required: true } });
        return json(domain.endsWith(".us") ? {
          nexus_category: { type: "enum", required: true, options: [{ value: "C21" }] },
          app_purpose: { type: "enum", required: true, options: [{ value: "P1" }, { value: "P2" }] },
        } : {});
      }
      if (url.includes("/availability")) return json({ available: true });
      if (url.includes("/price")) return json({ purchasePrice: 7.99, renewalPrice: 7.99, years: 1 });
      if (url.includes("/buy")) {
        events.push({ type: "buy-domain", args: JSON.parse(options.body) });
        return buySucceeds ? json({ orderId: "order-1" }) : json({ code: "invalid_contact", message: "Registrar rejected purchase" }, 400);
      }
      if (url.includes("/orders/")) { events.push({ type: "poll-order" }); return json({ status: "completed", domains: [{ domainName: domain, status: orderStatus }] }); }
      if (url.includes("/v5/domains/")) return json({}, 404);
      if (url.includes("/projects/")) { events.push({ type: "attach" }); return json({}); }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });
  const mocks = {
    "./vercel-domains": registrar,
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
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => mocks[name],
    console: { log() {}, error() {} },
  });

  return {
    events,
    profile,
    purchase: (override = domain) => exports.purchaseDomainForUser(db, "user-1", override, 12.99),
    setOrderStatus: (value) => { orderStatus = value; },
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

test("a .us business domain supplies the required registry declarations", async () => {
  const harness = domainPurchaseHarness({ domain: "example.us", buySucceeds: true });
  await harness.purchase();
  const purchase = harness.events.find((event) => event.type === "buy-domain");

  assert.deepEqual(
    JSON.parse(JSON.stringify(purchase.args.contactInformation.additional)),
    { us: { nexus_category: "C21", app_purpose: "P1" } },
  );
});

test("schema outage or unknown requirements never debit the wallet", async () => {
  for (const options of [{ schemaFailure: true }, { extraRequired: true }]) {
    const harness = domainPurchaseHarness(options);
    const result = await harness.purchase();
    assert.equal(result.ok, false);
    assert.equal(result.code, options.extraRequired ? "missing_details" : "registrar");
    assert.equal(harness.events.filter((event) => event.type === "decrement_wallet").length, 0);
    assert.equal(harness.events.filter((event) => event.type === "buy-domain").length, 0);
  }
});

for (const tld of ["com", "net", "org", "co", "info", "us"]) {
  test(`.${tld} purchase preflights before debit and reuses completed purchases`, async () => {
    const harness = domainPurchaseHarness({ domain: `example.${tld}`, buySucceeds: true });
    assert.equal((await harness.purchase()).ok, true);
    assert.ok(harness.events.findIndex((event) => event.type === "preflight") < harness.events.findIndex((event) => event.type === "decrement_wallet"));
    assert.equal((await harness.purchase()).ok, true);
    assert.equal(harness.events.filter((event) => event.type === "decrement_wallet").length, 1);
    assert.equal(harness.events.filter((event) => event.type === "buy-domain").length, 1);
    assert.equal(harness.profile.usage_history.length, 1);
  });
}

test("a pending individual domain is neither attached nor purchased again", async () => {
  const harness = domainPurchaseHarness({ buySucceeds: true, orderStatus: "pending" });
  assert.equal((await harness.purchase()).code, "pending");
  assert.equal(harness.profile.a2p_registration.domainPurchase.state, "ordered");
  assert.equal(harness.events.filter((event) => event.type === "attach").length, 0);
  assert.equal((await harness.purchase()).code, "pending");
  assert.equal((await harness.purchase("other.com")).code, "pending");
  harness.setOrderStatus("completed");
  assert.equal((await harness.purchase()).ok, true);
  assert.equal(harness.events.filter((event) => event.type === "decrement_wallet").length, 1);
  assert.equal(harness.events.filter((event) => event.type === "buy-domain").length, 1);
  assert.equal(harness.events.filter((event) => event.type === "attach").length, 2);
});

test("a failed individual domain refunds once even when the parent order completed", async () => {
  const harness = domainPurchaseHarness({ buySucceeds: true, orderStatus: "failed" });
  assert.equal((await harness.purchase()).code, "registrar");
  assert.equal(harness.profile.a2p_registration.domainPurchase.state, "refunded");
  assert.equal(harness.events.filter((event) => event.type === "credit_wallet").length, 1);
  assert.equal(harness.events.filter((event) => event.type === "attach").length, 0);
});
