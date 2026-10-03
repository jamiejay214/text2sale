import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadVercelDomains(fetchImpl) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/vercel-domains.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
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
};

test("domain purchase includes registry-specific .us contact fields", async () => {
  let requestBody;
  const api = loadVercelDomains(async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ orderId: "order-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  await api.buyDomain({
    ...contact,
    additional: { nexus_category: "C21", app_purpose: "P1" },
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(requestBody.contactInformation.additional)),
    { nexus_category: "C21", app_purpose: "P1" },
  );
});

test("registrar errors preserve Vercel's top-level message and code", async () => {
  const api = loadVercelDomains(async () =>
    new Response(
      JSON.stringify({
        status: "400",
        code: "invalid_contact_info",
        message: "nexus_category is required",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
  );

  await assert.rejects(
    () => api.buyDomain(contact),
    /nexus_category is required \(invalid_contact_info\)/,
  );
});
