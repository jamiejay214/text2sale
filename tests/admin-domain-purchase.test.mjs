import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function ownerRoute({ owner = true, orderStatus = "completed" } = {}) {
  const events = [];
  const profile = {
    id: "client", first_name: "Old", last_name: "Contact", email: "old@example.test", phone: "000",
    business_slug: "jamie-health", custom_domain: null,
    a2p_registration: {
      businessName: "Jamie Health LLC", businessType: "llc", businessCountry: "US",
      businessAddress: "123 Main St", businessCity: "Fort Lauderdale", businessState: "FL", businessZip: "33301",
      contactFirstName: "Jamie", contactLastName: "Johnson", contactEmail: "jamie@example.test", contactPhone: "9545550100",
    },
  };
  const db = {
    from() {
      const query = {
        select() { return query; }, eq() { return query; },
        update(value) { Object.assign(profile, value); events.push({ type: "update", value }); return query; },
        single: async () => ({ data: profile, error: null }),
        then(resolve, reject) { return Promise.resolve({ data: profile, error: null }).then(resolve, reject); },
      };
      return query;
    },
    rpc() { throw new Error("Owner-sponsored orders must not debit a customer wallet"); },
  };
  class NextResponse extends Response {
    static json(value, init) { return new NextResponse(JSON.stringify(value), init); }
  }
  class DomainContactError extends Error {}
  const modules = {
    "next/server": { NextResponse },
    "@supabase/supabase-js": { createClient: () => db },
    "@/lib/auth-guard": {
      authenticate: async () => ({ ok: true, user: { id: "caller" } }),
      requireAdmin: async () => owner ? null : NextResponse.json({ error: "Owner access required" }, { status: 403 }),
    },
    "@/lib/vercel-domains": {
      DomainContactError,
      isDomainAvailable: async () => ({ available: true, price: 7.99 }),
      suggestDomains: () => ["jamiehealth.com"], suggestDomainBase: () => "jamiehealth",
      buyDomain: async (args) => { events.push({ type: "buy", args }); return { domain: args.domain, orderId: "order-1" }; },
      getDomainOrder: async (orderId, domain) => { events.push({ type: "poll", orderId, domain }); return { status: orderStatus }; },
    },
    "@/lib/domain-purchase": { ensureDomainAttached: async (domain) => { events.push({ type: "attach", domain }); return null; } },
    "@/lib/business-site": {
      normalizeDomain: (domain) => (domain || "").trim().toLowerCase(),
      isValidDomain: (domain) => /^[a-z0-9-]+\.[a-z]+$/.test(domain),
      toSlug: () => "jamie-health", getUniqueSlug: async () => "jamie-health",
    },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../app/api/admin/purchase-domain/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => modules[name], process: { env: {} } });
  return {
    events, profile,
    setOrderStatus: (status) => { orderStatus = status; },
    buy: (extra = {}) => exports.POST(new Request("https://example.test/api/admin/purchase-domain", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "client", domain: "jamiehealth.us", ...extra }),
    })),
  };
}

test("owner purchases read current onboarding fields, preserve registration, and keep sponsor billing", async () => {
  const harness = ownerRoute();
  const response = await harness.buy();
  assert.equal(response.status, 200);
  const args = harness.events.find((event) => event.type === "buy").args;
  assert.equal(args.firstName, "Jamie");
  assert.equal(args.email, "jamie@example.test");
  assert.equal(args.city, "Fort Lauderdale");
  assert.equal(args.state, "FL");
  assert.equal(args.postalCode, "33301");
  assert.equal(args.country, "US");
  assert.equal(args.businessType, "llc");
  assert.equal(harness.profile.a2p_registration.domainPurchase.charged, 0);
  assert.equal(harness.profile.a2p_registration.businessName, "Jamie Health LLC");
  assert.equal(harness.profile.custom_domain, "jamiehealth.us");
});

test("owner retries poll the same pending order and attach only after it completes", async () => {
  const harness = ownerRoute({ orderStatus: "pending" });
  assert.equal((await harness.buy()).status, 202);
  assert.equal((await harness.buy()).status, 202);
  assert.equal(harness.events.filter((event) => event.type === "buy").length, 1);
  assert.equal(harness.events.filter((event) => event.type === "attach").length, 0);
  assert.equal(harness.profile.custom_domain, null);
  harness.setOrderStatus("completed");
  assert.equal((await harness.buy()).status, 200);
  assert.equal(harness.events.filter((event) => event.type === "buy").length, 1);
  assert.equal(harness.events.filter((event) => event.type === "attach").length, 1);
});

test("owner-only authorization and dry-run never place an order", async () => {
  const nonOwner = ownerRoute({ owner: false });
  assert.equal((await nonOwner.buy()).status, 403);
  assert.equal(nonOwner.events.length, 0);
  const owner = ownerRoute();
  assert.equal((await owner.buy({ dryRun: true })).status, 200);
  assert.equal(owner.events.filter((event) => event.type === "buy").length, 0);
});
