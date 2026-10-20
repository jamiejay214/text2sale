import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const browser = {}; vm.runInNewContext(transpile('lib/browser-calls.ts'), { exports: browser, Date });
const ownerLib = {}; vm.runInNewContext(transpile('lib/owner.ts'), { exports: ownerLib });

function load(fetchImpl) {
  const exports = {};
  const require = (name) => name.includes('browser-calls') ? browser : name.includes('owner') ? ownerLib : name.includes('call-pricing') ? { CALL_RATE_FORWARD_PER_MIN: 0.04, CALL_RATE_INBOUND_PER_MIN: 0.015 } : { isEntitled: (p) => p.subscription_status === 'active' };
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
const base = { wallet_balance: 5, subscription_status: 'active', telnyx_credential_id: 'cred1', email: 'johnsonhealthquotes@gmail.com' };
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

test('texting-only accounts: no browser phone, but forwarding to a cell still works', async () => {
  const { routeInboundCall } = load(async (url) => url.includes('/telephony_credentials/') ? ok({ data: { sip_username: 'gencredABC' } }) : ok());
  const customer = { ...base, email: 'agent@example.com' };
  assert.equal(await routeInboundCall(db(customer), call), null);
  assert.equal(await routeInboundCall(db({ ...customer, owned_numbers: owned({ forwardEnabled: true, forwardTo: '3055551234' }) }), call), 'forward');
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

test('call owner: an agent sharing the sponsor\'s numbers never takes the call, even for their own lead', async () => {
  const { findCallOwner } = load(async () => ok());
  const shared = {
    owned_phone_numbers: [{ user_id: 'owner', digits: '9545550100' }, { user_id: 'maria', digits: '9545550100' }],
    calling_sponsors: [{ agent_id: 'maria', sponsor_id: 'owner' }],
    contacts: [{ id: 'c9', user_id: 'maria', phone: '(305) 555-0199' }],
    profiles: [],
  };
  assert.deepEqual(plain(await findCallOwner(ownerDb(shared), '+19545550100', '+13055550199')), { userId: 'owner', contactId: null });
});

test('call owner: legacy numbers on the profile are found; unknown numbers are not', async () => {
  const { findCallOwner } = load(async () => ok());
  const legacy = { owned_phone_numbers: [], profiles: [{ id: 'u9', owned_numbers: [{ number: '(954) 555-0100' }] }] };
  assert.deepEqual(plain(await findCallOwner(ownerDb(legacy), '+19545550100', '+13055550199')), { userId: 'u9', contactId: null });
  assert.equal(await findCallOwner(ownerDb(legacy), '+17865550000', '+13055550199'), null);
  assert.equal(await findCallOwner(ownerDb(legacy), 'garbage', '+13055550199'), null);
});

// ── Overflow: owner dialing → ring the opted-in agent ──
function tables(t) {
  const log = [];
  const from = (table) => {
    const q = { table, filters: {}, update: null };
    const rows = () => (t[table] || []).filter((r) => Object.entries(q.filters).every(([k, v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v));
    const c = {
      select: () => c,
      eq: (k, v) => ((q.filters[k] = v), c),
      in: (k, v) => ((q.filters[k] = v), c),
      is: (k, v) => ((q.filters[k] = v ?? undefined), c),
      not: () => c,
      update: (u) => ((q.update = u), c),
      maybeSingle: async () => {
        const hit = rows()[0] || null;
        if (q.update && hit) { Object.assign(hit, q.update); log.push([table, q.update]); }
        return { data: hit };
      },
      then: (resolve) => {
        const hits = rows();
        if (q.update) { hits.forEach((h) => Object.assign(h, q.update)); log.push([table, q.update]); }
        return resolve({ data: hits });
      },
    };
    return c;
  };
  return { from, log };
}
const fresh = () => new Date().toISOString();
const telnyxFake = (calls, fail = false) => async (url, init) => {
  calls.push([url, init && init.body && JSON.parse(init.body)]);
  if (url.includes('/telephony_credentials/')) return ok({ data: { sip_username: 'mariaSIP' } });
  return fail && url.includes('/transfer') ? { ok: false, status: 422, json: async () => ({}) } : ok();
};
const world = (over = {}) => ({
  profiles: [{ id: 'u1', ...base, inbound_from: undefined }, { id: 'm1', telnyx_credential_id: 'credM', paused: false }],
  calling_sponsors: [{ agent_id: 'm1', sponsor_id: 'u1', take_overflow: true }],
  dialer_sessions: [{ id: 's-owner', user_id: 'u1', status: 'active', agent_state: 'on_call', agent_seen_at: fresh() }],
  dialer_queue: [],
  calls: [{ id: 'row1' }],
  ...over,
});

test('overflow: owner dialing → rings the agent, with a header so her dialer doesn\'t auto-answer', async () => {
  const calls = [];
  const { routeOverflow } = load(telnyxFake(calls));
  const d = tables(world());
  assert.equal(await routeOverflow(d, call), true);
  const transfer = calls.find(([u]) => u.endsWith('/actions/transfer'))[1];
  assert.equal(transfer.to, 'sip:mariaSIP@sip.telnyx.com');
  assert.deepEqual(transfer.custom_headers, [{ name: 'X-Text2Sale-Route', value: 'overflow' }]);
  assert.equal(decode(transfer.client_state).route, 'overflow');
  assert.equal(decode(transfer.target_leg_client_state).overflow.agentId, 'm1');
});

test('overflow: off unless the owner is dialing and the agent is opted in', async () => {
  const calls = [];
  const { routeOverflow } = load(telnyxFake(calls));
  assert.equal(await routeOverflow(tables(world({ dialer_sessions: [] })), call), false);
  const stale = new Date(Date.now() - 120_000).toISOString();
  assert.equal(await routeOverflow(tables(world({ dialer_sessions: [{ id: 's', user_id: 'u1', status: 'active', agent_state: 'ready', agent_seen_at: stale }] })), call), false);
  assert.equal(await routeOverflow(tables(world({ calling_sponsors: [{ agent_id: 'm1', sponsor_id: 'u1', take_overflow: false }] })), call), false);
  assert.equal(calls.filter(([u]) => u.includes('/transfer')).length, 0);
});

test('overflow: agent mid-call is skipped; agent waiting on her dialer is held, then handed back', async () => {
  const calls = [];
  const { routeOverflow, releaseOverflow } = load(telnyxFake(calls));
  const busy = world();
  busy.dialer_sessions.push({ id: 's-maria', user_id: 'm1', status: 'active', agent_state: 'on_call', agent_seen_at: fresh() });
  assert.equal(await routeOverflow(tables(busy), call), false);

  const waiting = world({ dialer_queue: [{ session_id: 's-maria', status: 'dialing', call_control_id: 'lead-leg', human_at: undefined }] });
  waiting.dialer_sessions.push({ id: 's-maria', user_id: 'm1', status: 'active', agent_state: 'ready', agent_seen_at: fresh() });
  const d = tables(waiting);
  assert.equal(await routeOverflow(d, call), true);
  const maria = waiting.dialer_sessions[1];
  assert.equal(maria.agent_state, 'on_call');
  assert.equal(maria.inbound_from, '+13055550199');
  assert.ok(calls.some(([u]) => u.endsWith('/calls/lead-leg/actions/hangup')), 'her ringing lead lines are dropped');
  const transfer = calls.find(([u]) => u.endsWith('/calls/cc1/actions/transfer'))[1];
  await releaseOverflow(d, decode(transfer.target_leg_client_state).overflow);
  assert.equal(maria.agent_state, 'ready');
  assert.equal(maria.inbound_from, null);
});

test('overflow: a failed transfer hands the agent\'s dialer back and falls through', async () => {
  const calls = [];
  const { routeOverflow } = load(telnyxFake(calls, true));
  const w = world();
  w.dialer_sessions.push({ id: 's-maria', user_id: 'm1', status: 'active', agent_state: 'wrap', agent_seen_at: fresh() });
  assert.equal(await routeOverflow(tables(w), call), false);
  assert.equal(w.dialer_sessions[1].agent_state, 'wrap');
  assert.equal(w.dialer_sessions[1].inbound_from, null);
});
