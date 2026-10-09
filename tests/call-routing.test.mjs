import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const browser = {}; vm.runInNewContext(transpile('lib/browser-calls.ts'), { exports: browser, Date });

function load(fetchImpl) {
  const exports = {};
  const require = (name) => name.includes('browser-calls') ? browser : name.includes('call-pricing') ? { CALL_RATE_FORWARD_PER_MIN: 0.04, CALL_RATE_INBOUND_PER_MIN: 0.015 } : { isEntitled: (p) => p.subscription_status === 'active' };
  vm.runInNewContext(transpile('lib/call-routing.ts'), { exports, require, fetch: fetchImpl, Buffer, JSON, AbortSignal, encodeURIComponent, console: { error() {} }, process: { env: { TELNYX_API_KEY: 'k' } } });
  return exports;
}
function db(profile) {
  const updates = [];
  return { updates, from: () => {
    const c = { select: () => c, eq: () => c, maybeSingle: async () => ({ data: profile, error: null }), update: (u) => (updates.push(u), c) };
    return c;
  } };
}
const ok = (json = {}) => ({ ok: true, status: 200, json: async () => json });
const decode = (s) => JSON.parse(Buffer.from(s, 'base64').toString());
const base = { wallet_balance: 5, subscription_status: 'active', telnyx_credential_id: 'cred1' };
const call = { ccid: 'cc1', rowId: 'row1', userId: 'u1', callerNumber: '+13055550199', businessNumber: '+19545550100' };

test('forwarding target: off, missing, or the business number itself means no forwarding', () => {
  const { forwardingTarget } = load(async () => ok());
  assert.equal(forwardingTarget({ call_forward_enabled: false, call_forward_number: '5551234567' }, '+19545550100'), null);
  assert.equal(forwardingTarget({ call_forward_enabled: true, call_forward_number: '' }, '+19545550100'), null);
  assert.equal(forwardingTarget({ call_forward_enabled: true, call_forward_number: '(954) 555-0100' }, '+19545550100'), null);
  assert.equal(forwardingTarget({ call_forward_enabled: true, call_forward_number: '(305) 555-1234' }, '+19545550100'), '+13055551234');
});

test('forwarding on: transfers the call to the cell showing the caller, billed at the forward rate', async () => {
  const calls = [];
  const { routeInboundCall } = load(async (url, init) => (calls.push([url, init && init.body && JSON.parse(init.body)]), ok()));
  const d = db({ ...base, call_forward_enabled: true, call_forward_number: '3055551234' });
  assert.equal(await routeInboundCall(d, call), 'forward');
  const [url, body] = calls[0];
  assert.ok(url.endsWith('/calls/cc1/actions/transfer'));
  assert.equal(body.to, '+13055551234');
  assert.equal(body.from, '+13055550199');
  assert.deepEqual(decode(body.client_state), { v: 1, callRowId: 'row1', route: 'forward' });
  assert.equal(decode(body.target_leg_client_state).leg, 'target');
  assert.equal(d.updates[0].cost_per_min, 0.04);
  assert.equal(d.updates[0].outcome, 'forwarded');
});

test('forwarding off: rings the browser SIP user at the inbound rate', async () => {
  const calls = [];
  const { routeInboundCall } = load(async (url, init) => {
    calls.push([url, init && init.body && JSON.parse(init.body)]);
    return url.includes('/telephony_credentials/') ? ok({ data: { sip_username: 'gencredABC' } }) : ok();
  });
  const d = db(base);
  assert.equal(await routeInboundCall(d, call), 'browser');
  assert.equal(calls[1][1].to, 'sip:gencredABC@sip.telnyx.com');
  assert.equal(d.updates[0].cost_per_min, 0.015);
});

test('caller ID refused: retries the transfer with the default caller ID', async () => {
  const bodies = [];
  const { routeInboundCall } = load(async (url, init) => {
    const body = init && init.body && JSON.parse(init.body);
    bodies.push(body);
    return body && body.from ? { ok: false, status: 422, json: async () => ({}) } : ok();
  });
  assert.equal(await routeInboundCall(db({ ...base, call_forward_enabled: true, call_forward_number: '3055551234' }), call), 'forward');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].from, undefined);
});

test('no subscription or no money for the first minute: the call rings out', async () => {
  let fetched = 0;
  const { routeInboundCall } = load(async () => (fetched++, ok()));
  assert.equal(await routeInboundCall(db({ ...base, subscription_status: 'canceled' }), call), null);
  assert.equal(await routeInboundCall(db({ ...base, wallet_balance: 0.01, call_forward_enabled: true, call_forward_number: '3055551234' }), call), null);
  assert.equal(fetched, 0);
});
