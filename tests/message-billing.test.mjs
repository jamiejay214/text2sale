import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function smsRoute({
  balance = 1,
  providerStatus = 200,
  timeout = false,
  authenticated = true,
} = {}) {
  const events = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: "client" } : null },
        error: null,
      }),
    },
    from(table) {
      const result = {
        data:
          table === "owned_phone_numbers"
            ? [{ user_id: "client" }]
            : table === "contacts"
              ? { dnc: false, state: "FL" }
              : {
                  plan: { messageCost: 0.012 },
                  subscription_status: "active",
                  paused: false,
                  quiet_hours_enabled: false,
                },
        error: null,
      };
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle: async () => result,
        single: async () => result,
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      if (name === "find_sms_contacts") return {data:[{dnc:false,state:"FL"}],error:null};
      events.push({ type: name, args });
      return {
        data:
          name === "decrement_wallet"
            ? balance >= args.p_amount
              ? balance - args.p_amount
              : null
            : balance,
        error: null,
      };
    },
  };
  class NextResponse extends Response {
    static json(value, init) {
      return new NextResponse(JSON.stringify(value), init);
    }
  }
  const mocks = {
    "next/server": { NextResponse },
    "@supabase/supabase-js": { createClient: () => client },
    "@/lib/quiet-hours": {
      inferTimezone: () => "America/New_York",
      isQuietHours: () => false,
    },
    "@/lib/sms-text": {
      sanitizeForSms: (s) => s,
      hasNonGsmChars: () => false,
      countSegments: () => 1,
    },
    "@/lib/sms-pricing": {
      customerSmsRate: () => 0.015,
    },
    "@/lib/opt-out": {
      withFirstMessageOptOut: (body) => `${body}\nReply STOP to opt out.`,
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/send-sms/route.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => mocks[name],
    process: { env: {} },
    crypto: globalThis.crypto,
    AbortSignal,
    console: { log() {}, error() {} },
    fetch: async () => {
      events.push({ type: "provider" });
      if (timeout) throw new Error("timeout");
      return new Response(
        JSON.stringify(
          providerStatus === 200
            ? { data: { id: "message-1" } }
            : { errors: [{ detail: "Rejected" }] },
        ),
        { status: providerStatus },
      );
    },
  });
  return {
    events,
    send: () =>
      exports.POST(
        new Request("https://example.test/api/send-sms", {
          method: "POST",
          headers: {
            authorization: "Bearer test",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            to: "9545550199",
            from: "9545550100",
            body: "Hello",
          }),
        }),
      ),
  };
}

test("an unfunded account never reaches the SMS provider", async () => {
  const route = smsRoute({ balance: 0 });
  assert.equal((await route.send()).status, 402);
  assert.equal(
    route.events.some((e) => e.type === "provider"),
    false,
  );
});
test("a funded send reserves money before dispatch", async () => {
  const route = smsRoute();
  assert.equal((await route.send()).status, 200);
  assert.deepEqual(
    route.events.map((e) => e.type),
    ["decrement_wallet", "provider"],
  );
});
test("a definitive provider rejection refunds the exact reservation", async () => {
  const route = smsRoute({ providerStatus: 400 });
  assert.equal((await route.send()).status, 500);
  assert.deepEqual(
    route.events.map((e) => e.type),
    ["decrement_wallet", "provider", "credit_wallet"],
  );
  assert.equal(route.events[2].args.p_amount, 0.015);
});
test("an uncertain timeout is not silently refunded as an unsent message", async () => {
  const route = smsRoute({ timeout: true });
  const response = await route.send();
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /could not be confirmed/);
  assert.equal(
    route.events.some((e) => e.type === "credit_wallet"),
    false,
  );
});
test("an invalid session cannot reserve money or send", async () => {
  const route = smsRoute({ authenticated: false });
  assert.equal((await route.send()).status, 401);
  assert.equal(route.events.length, 0);
});
