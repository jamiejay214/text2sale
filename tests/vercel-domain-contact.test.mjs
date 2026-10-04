import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadVercelDomains(fetchImpl) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/vercel-domains.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      throw new Error(`Unexpected module import: ${name}`);
    },
    fetch: fetchImpl,
    process: {
      env: {
        VERCEL_API_TOKEN: "test-token",
        VERCEL_PROJECT_ID: "test-project",
        VERCEL_TEAM_ID: "test-team",
      },
    },
    console: { log() {}, error() {} },
    URLSearchParams,
    AbortSignal,
  });
  return exports;
}

const contact = {
  domain: "example.us",
  expectedPrice: 7.99,
  firstName: "Jamie",
  lastName: "Johnson",
  email: "jamie@example.test",
  phone: "+19545550100",
  address1: "123 Main St",
  city: "Fort Lauderdale",
  state: "FL",
  postalCode: "33301",
  orgName: "Jamie Health LLC",
  businessType: "llc",
};

// Registry schema observed from Vercel's live, read-only contact-info endpoint.
const usSchema = {
  nexus_category: { type: "enum", required: true, options: ["C11", "C12", "C21", "C31", "C32"].map((value) => ({ value })) },
  app_purpose: { type: "enum", required: true, options: ["P1", "P2", "P3", "P4", "P5"].map((value) => ({ value })) },
};
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test(".us additional fields use nested extension records, never flat strings", async () => {
  let requestBody;
  const requests = [];
  const api = loadVercelDomains(async (url, options) => {
    requests.push({ url, options });
    if (url.includes("contact-info/schema")) return jsonResponse(usSchema);
    requestBody = JSON.parse(options.body);
    return jsonResponse({ orderId: "order-1" });
  });
  const prepared = await api.prepareDomainPurchase(contact);
  await api.buyDomain(prepared);
  assert.deepEqual(
    JSON.parse(JSON.stringify(requestBody.contactInformation.additional)),
    { us: { nexus_category: "C21", app_purpose: "P1" } },
  );
  assert.equal(requests.filter((item) => item.url.includes("contact-info/schema")).length, 1);
  assert.equal(requests[0].options.cache, "no-store");
  assert.ok(Object.isFrozen(prepared));
  assert.ok(Object.isFrozen(prepared.additional.us));
});

for (const tld of ["com", "net", "org", "co", "info"]) {
  test(`.${tld} purchases check registry requirements and omit .us fields`, async () => {
    let body;
    const api = loadVercelDomains(async (url, options) => {
      if (url.includes("contact-info/schema")) return jsonResponse({});
      body = JSON.parse(options.body);
      return jsonResponse({ orderId: "order-1" });
    });
    await api.buyDomain({ ...contact, domain: `example.${tld}` });
    assert.equal(body.contactInformation.additional, undefined);
    assert.equal(body.contactInformation.companyName, contact.orgName);
  });
}

test("nonprofit .us websites use the nonprofit purpose", async () => {
  const api = loadVercelDomains(async () => jsonResponse(usSchema));
  const result = await api.prepareDomainPurchase({ ...contact, businessType: "non_profit" });
  assert.equal(result.additional.us.app_purpose, "P2");
});

test("unknown required registry fields stop before a purchase request", async () => {
  let buys = 0;
  const api = loadVercelDomains(async (_url, options) => {
    if (options.method === "POST") buys++;
    return jsonResponse({ local_presence_id: { type: "text", required: true } });
  });
  await assert.rejects(() => api.buyDomain({ ...contact, domain: "example.test" }), /local_presence_id/);
  assert.equal(buys, 0);
});

test("invalid declarations, flat fields, and foreign .us registrants are not guessed", async () => {
  const api = loadVercelDomains(async () => jsonResponse(usSchema));
  await assert.rejects(() => api.prepareDomainPurchase({ ...contact, additional: { us: { nexus_category: "wrong" } } }), /nexus_category/);
  await assert.rejects(() => api.prepareDomainPurchase({ ...contact, additional: { nexus_category: "C21", app_purpose: "P1" } }), /grouped by extension/);
  await assert.rejects(() => api.prepareDomainPurchase({ ...contact, country: "GB" }), /nexus_category/);
});

test("schema failure and incomplete contacts never reach the buy endpoint", async () => {
  let calls = 0;
  const api = loadVercelDomains(async () => { calls++; return jsonResponse({}, 503); });
  await assert.rejects(() => api.buyDomain(contact), /requirements \(503\)/);
  await assert.rejects(() => api.buyDomain({ ...contact, city: " " }), /contact details/);
  await assert.rejects(() => api.buyDomain({ ...contact, expectedPrice: 0 }), /valid registrar price/);
  assert.equal(calls, 1);
});

test("phone normalization preserves all US digits and strips formatting", async () => {
  const api = loadVercelDomains(async () => jsonResponse({}));
  for (const [phone, expected] of [["954-555-0100", "+19545550100"], ["1 (954) 555-0100", "+19545550100"], ["+1 (954) 555-0100", "+19545550100"], ["1234567890", "+11234567890"]]) {
    const result = await api.prepareDomainPurchase({ ...contact, domain: "example.com", phone });
    assert.equal(result.phone, expected);
  }
});

test("registrar errors preserve Vercel's top-level message and code", async () => {
  const api = loadVercelDomains(async (url) =>
    url.includes("contact-info/schema") ? jsonResponse(usSchema) : jsonResponse({
        status: "400",
        code: "invalid_contact_info",
        message: "nexus_category is required",
      }, 400),
  );

  await assert.rejects(
    () => api.buyDomain(contact),
    /nexus_category is required \(invalid_contact_info\)/,
  );
});

test("completed order requires the selected domain to be completed too", async () => {
  for (const [order, expected] of [
    [{ status: "completed", domains: [{ domainName: "example.us", status: "pending" }] }, "pending"],
    [{ status: "completed", domains: [{ domainName: "other.us", status: "completed" }] }, "pending"],
    [{ status: "purchasing", domains: [{ domainName: "example.us", status: "completed" }] }, "pending"],
    [{ status: "completed", domains: [{ domainName: "example.us", status: "failed" }] }, "failed"],
    [{ status: "completed", domains: [{ domainName: "example.us", status: "refunded" }] }, "failed"],
    [{ status: "completed", domains: [{ domainName: "example.us", status: "completed" }] }, "completed"],
  ]) {
    const api = loadVercelDomains(async () => jsonResponse(order));
    assert.equal((await api.getDomainOrder("order-1", "example.us")).status, expected);
  }
});

test("accepted orders without IDs and server errors are uncertain, not refundable rejections", async () => {
  for (const [response, status] of [[{}, 200], [{ message: "gateway timeout" }, 504]]) {
    const api = loadVercelDomains(async (url) => url.includes("contact-info/schema") ? jsonResponse(usSchema) : jsonResponse(response, status));
    await assert.rejects(() => api.buyDomain(contact), (error) => error instanceof api.DomainPurchasePendingError);
  }
});
