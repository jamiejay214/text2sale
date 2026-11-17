// 7-day free trial (lib/trial.ts): what a trialing account may do, and the
// release of numbers bought in a trial that ends unpaid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadEntitlements } from './entitlements-helper.mjs';

const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const ent = loadEntitlements();
const status = (() => { const exports = {}; vm.runInNewContext(transpile('lib/messaging-status.ts'), { exports, require: () => ({}), Date, Number, Math, JSON }); return exports; })();
const src = (f) => readFileSync(f, 'utf8');

const trial = (key) => ({ email: 'agent@example.com', subscription_status: 'trialing', free_subscription: false, plan: { key } });

test('a Dialer or Complete trial can call; no trial counts as paid', () => {
  for (const key of ['dialer', 'complete']) {
    assert.equal(ent.isTrialing(trial(key)), true);
    assert.equal(ent.canCall(trial(key)), true, key);
    assert.equal(ent.isActiveSubscriber(trial(key)), false, key);
    // isEntitled gates everything Text2Sale pays for (10DLC) and every text send.
    assert.equal(status.isEntitled(trial(key)), false, key);
  }
  assert.equal(ent.canCall(trial('text')), false);
});

test('the trial unlocks the workspace and shows the plan, but is flagged as a trial', () => {
  const e = ent.entitlementsOf(trial('complete'));
  assert.equal(e.active, true);
  assert.equal(e.trial, true);
  assert.equal(ent.planIncludes(trial('text'), 'texting'), true);
  assert.equal(ent.planIncludes(trial('dialer'), 'texting'), false);
});

test('comped accounts are never treated as a trial; canceled or past-due trials get nothing', () => {
  assert.equal(ent.isTrialing({ ...trial('dialer'), free_subscription: true }), false);
  assert.equal(ent.canCall({ ...trial('dialer'), subscription_status: 'inactive' }), false);
  assert.equal(ent.canCall({ ...trial('dialer'), subscription_status: 'past_due' }), false);
});

test('checkout starts a 7-day trial with a card, once per customer', () => {
  const s = src('app/api/create-subscription/route.ts');
  assert.match(s, /trial_period_days: TRIAL_DAYS/);
  assert.match(s, /payment_method_collection: "always"/);
  assert.match(s, /missing_payment_method: "cancel"/);
  assert.match(s, /subscriptions\.list\(\{ customer: customerId, status: "all", limit: 1 \}\)/);
  assert.match(src('lib/trial.ts'), /TRIAL_DAYS = 7/);
});

test('texting stays off in the trial and registration waits for the first payment', () => {
  const send = src('app/api/send-sms/route.ts');
  assert.ok(send.indexOf('isTrialing(profileCfg)') < send.indexOf('canText(profileCfg)'), 'trial check runs before the plan check');
  // The activation driver only spends for paying accounts.
  assert.match(src('lib/messaging-driver.ts'), /SPENDING_STATUSES\.includes\(profile\.messaging_status\) && !isEntitled\(profile\)/);
  // The webhook keeps a trial set to cancel as "trialing", never "canceling" (which counts as paid).
  const hook = src('app/api/stripe-webhook/route.ts');
  assert.ok(hook.indexOf('status === "trialing"') < hook.indexOf('subscription.cancel_at_period_end\n          ? "canceling"'));
  assert.match(hook, /update\.ai_plan = subStatus === "active" \|\| subStatus === "canceling"/);
});

// ── Number release when a trial ends unpaid ──────────────────────────────────

function fakeDb({ owned, sharedDigits = [], legacyShared = [] }) {
  const state = { owned: [...owned], deleted: [], updated: null };
  const query = (table) => {
    const filters = {};
    const q = {
      select: () => q, limit: () => q,
      eq: (k, v) => { filters[k] = v; return q; },
      neq: (k, v) => { filters[`not_${k}`] = v; return q; },
      contains: (_k, v) => { filters.contains = v[0].number; return q; },
      maybeSingle: async () => ({ data: { owned_numbers: state.owned } }),
      delete: () => ({ eq: () => ({ eq: async (_k, d) => { state.deleted.push(d); return {}; } }) }),
      update: (row) => ({ eq: async () => { state.updated = row.owned_numbers; return {}; } }),
      then: (resolve) => {
        if (table === 'owned_phone_numbers') return resolve({ data: sharedDigits.includes(filters.digits) ? [{ user_id: 'other' }] : [] });
        return resolve({ data: legacyShared.includes(filters.contains) ? [{ id: 'other' }] : [] });
      },
    };
    return q;
  };
  return { db: { from: query }, state };
}

function loadRelease(fetchImpl) {
  const exports = {};
  vm.runInNewContext(transpile('lib/release-numbers.ts'), {
    exports, require: () => ({}), console, fetch: fetchImpl, encodeURIComponent,
    process: { env: { TELNYX_API_KEY: 'test' } },
  });
  return exports;
}

test('a trial that ends unpaid releases its numbers, but not ones another account shares', async () => {
  const deletes = [];
  const fetchImpl = async (url, init) => {
    if (init?.method === 'DELETE') { deletes.push(url); return { ok: !url.endsWith('/fail'), status: url.endsWith('/fail') ? 500 : 200 }; }
    const digits = decodeURIComponent(url).replace(/\D/g, '').slice(-10);
    return { json: async () => ({ data: [{ id: digits === '5550000003' ? 'fail' : `pn-${digits}` }] }) };
  };
  const { releaseAccountNumbers } = loadRelease(fetchImpl);
  const { db, state } = fakeDb({
    owned: [
      { id: 'a', number: '+15550000001' },
      { id: 'b', number: '+15550000002' },
      { id: 'c', number: '+15550000003' },
      { id: 'd', number: '+15550000004' },
    ],
    sharedDigits: ['5550000002'],
    legacyShared: ['+15550000004'],
  });
  const released = await releaseAccountNumbers(db, 'trial-user');
  assert.deepEqual([...released], ['+15550000001']);
  assert.ok(deletes.some((u) => u.endsWith('/pn-5550000001')));
  assert.ok(!deletes.some((u) => u.includes('5550000002') || u.includes('5550000004')), 'shared numbers are not released');
  // The failed release stays on the account so it can be released by hand.
  assert.deepEqual([...state.updated].map((n) => n.number), ['+15550000003']);
});

test('only a subscription that ended inside its trial releases numbers', () => {
  const hook = src('app/api/stripe-webhook/route.ts');
  assert.match(hook, /subscription\.ended_at <= subscription\.trial_end/);
  assert.match(hook, /endedInTrial && !current\?\.free_subscription/);
});
