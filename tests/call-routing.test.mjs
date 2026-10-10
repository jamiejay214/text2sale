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

const owned = (forward) => [{ number: '(954) 555-0100', ...forward }];
test('forwarding target: off, missing, or one of the account\'s own numbers means no forwarding', () => {
  const { forwardingTarget } = load(async () => ok());
  assert.equal(forwardingTarget(owned({ forwardEnabled: false, forwardTo: '3055551234' }), '+19545550100'), null);
  assert.equal(forwardingTarget(owned({ forwardEnabled: true, forwardTo: '' }), '+19545550100'), null);
  assert.equal(forwardingTarget(owned({ forwardEnabled: true, forwardTo: '(954) 555-0100' }), '+19545550100'), null);
  assert.equal(forwardingTarget(owned({ forwardEnabled: true, forwardTo: '(305) 555-1234' }), '+19545550100'), '+13055551234');
  assert.equal(forwardingTarget(owned({ forwardEnabled: true, forwardTo: '3055551234' }), '+17865550000'), null);
  assert.equal(forwardingTarget(null, '+19545550100'), null);
});

test('forwarding on: transfers the call to the cell showing the caller, billed at the forward rate', async () => {
  const calls = [];
  const { routeInboundCall } = load(async (url, init) => (calls.push([url, init && init.body && JSON.parse(init.body)]), ok()));
  const d = db({ ...base, owned_numbers: owned({ forwardEnabled: true, forwardTo: '3055551234' }) });
  assert.equal(await routeInboundCall(d, call), 'forward');
  const [url, body] = calls[0];
  assert.ok(url.endsWith('/calls/cc1/actions/transfer'));
  assert.equal(body.to, '+13055551234');
  assert.equal(body.from, undefined, 'the cell sees the business number, which Telnyx always accepts');
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

test('browser shows the caller; if Telnyx refuses that caller ID, retries with the default', async () => {
  const bodies = [];
  const { routeInboundCall } = load(async (url, init) => {
    if (url.includes('/telephony_credentials/')) return ok({ data: { sip_username: 'gencredABC' } });
    const body = init && init.body && JSON.parse(init.body);
    bodies.push(body);
    return body && body.from ? { ok: false, status: 422, json: async () => ({}) } : ok();
  });
  assert.equal(await routeInboundCall(db(base), call), 'browser');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].from, '+13055550199');
  assert.equal(bodies[1].from, undefined);
});

test('no subscription or no money for the first minute: the call rings out', async () => {
  let fetched = 0;
  const { routeInboundCall } = load(async () => (fetched++, ok()));
  assert.equal(await routeInboundCall(db({ ...base, subscription_status: 'canceled' }), call), null);
  assert.equal(await routeInboundCall(db({ ...base, wallet_balance: 0.01, owned_numbers: owned({ forwardEnabled: true, forwardTo: '3055551234' }) }), call), null);
  assert.equal(fetched, 0);
});

const plain = (v) => JSON.parse(JSON.stringify(v));
function ownerDb(tables) {
  return { from: (table) => {
    const filters = [];
    const c = {
      select: () => c, not: () => c, order: () => c, limit: () => c,
      eq: (k, v) => (filters.push((r) => r[k] === v), c),
      in: (k, vs) => (filters.push((r) => vs.includes(r[k])), c),
      maybeSingle: async () => ({ data: (tables[table] || []).filter((r) => filters.every((f) => f(r)))[0] || null }),
      then: (resolve) => resolve({ data: (tables[table] || []).filter((r) => filters.every((f) => f(r))) }),
    };
    return c;
  } };
}

test('call owner: a number shared by two accounts no longer rejects the call', async () => {
  const { findCallOwner } = load(async () => ok());
  const shared = { owned_phone_numbers: [{ user_id: 'a', digits: '9545550100' }, { user_id: 'b', digits: '9545550100' }] };
  assert.deepEqual(plain(await findCallOwner(ownerDb({ ...shared, profiles: [{ id: 'b', ai_call_enabled: true }] }), '+19545550100', '+13055550199')), { userId: 'b', contactId: null });
  assert.deepEqual(plain(await findCallOwner(ownerDb({ ...shared, profiles: [] }), '+19545550100', '+13055550199')), { userId: 'a', contactId: null });
  const withContact = { ...shared, contacts: [{ id: 'c1', user_id: 'a', phone: '(305) 555-0199' }], profiles: [{ id: 'b', ai_call_enabled: true }] };
  assert.deepEqual(plain(await findCallOwner(ownerDb(withContact), '+19545550100', '+13055550199')), { userId: 'a', contactId: 'c1' });
});

test('call owner: legacy numbers on the profile are found; unknown numbers are not', async () => {
  const { findCallOwner } = load(async () => ok());
  const legacy = { owned_phone_numbers: [], profiles: [{ id: 'u9', owned_numbers: [{ number: '(954) 555-0100' }] }] };
  assert.deepEqual(plain(await findCallOwner(ownerDb(legacy), '+19545550100', '+13055550199')), { userId: 'u9', contactId: null });
  assert.equal(await findCallOwner(ownerDb(legacy), '+17865550000', '+13055550199'), null);
  assert.equal(await findCallOwner(ownerDb(legacy), 'garbage', '+13055550199'), null);
});
