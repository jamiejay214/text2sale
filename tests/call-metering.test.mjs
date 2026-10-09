import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/call-metering.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date });

function fakeDb({ claim = { id: 'c1' }, balance = 10 } = {}) {
  const log = [];
  const builder = (op) => {
    const q = { filters: [] };
    const chain = { eq: (k, v) => (q.filters.push(['eq', k, v]), chain), is: (k, v) => (q.filters.push(['is', k, v]), chain), select: () => chain, maybeSingle: async () => ({ data: op.update && op.first ? claim : null }), then: (r) => r({ data: null }) };
    op.q = q;
    return chain;
  };
  return {
    log,
    from: () => ({ update: (u) => { const op = { update: u, first: !log.some((e) => e.update) }; log.push(op); return builder(op); } }),
    rpc: async (name, args) => { log.push({ rpc: name, args }); return name === 'decrement_wallet' ? { data: balance, error: null } : { data: 1, error: null }; },
  };
}

test('a minute is billed as soon as it starts', () => {
  const at = '2026-10-09T12:00:00Z';
  assert.equal(exports.startedMinutes(at, new Date('2026-10-09T12:00:00Z')), 1);
  assert.equal(exports.startedMinutes(at, new Date('2026-10-09T12:01:00Z')), 1);
  assert.equal(exports.startedMinutes(at, new Date('2026-10-09T12:01:01Z')), 2);
});

test('charges the minute just started and nothing already paid', async () => {
  const db = fakeDb();
  const call = { id: 'c1', user_id: 'u1', answered_at: '2026-10-09T12:00:00Z', cost_per_min: 0.025, cost_charged: 0.025 };
  assert.equal(await exports.chargeStartedMinutes(db, call, new Date('2026-10-09T12:01:05Z')), 'ok');
  const debit = db.log.find((e) => e.rpc === 'decrement_wallet');
  assert.equal(debit.args.p_amount, 0.025);
  assert.equal(db.log[0].update.cost_charged, 0.05);
  assert.equal(await exports.chargeStartedMinutes(fakeDb(), call, new Date('2026-10-09T12:00:30Z')), 'ok');
});

test('an empty wallet reports insufficient so the call is hung up, and the claim is undone', async () => {
  const db = fakeDb({ balance: null });
  const call = { id: 'c1', user_id: 'u1', answered_at: '2026-10-09T12:00:00Z', cost_per_min: 0.025, cost_charged: null };
  assert.equal(await exports.chargeStartedMinutes(db, call, new Date('2026-10-09T12:00:01Z')), 'insufficient');
  const updates = db.log.filter((e) => e.update);
  assert.equal(updates.at(-1).update.cost_charged, 0);
});

test('a claim lost to another worker charges nothing', async () => {
  const db = fakeDb({ claim: null });
  const call = { id: 'c1', user_id: 'u1', answered_at: '2026-10-09T12:00:00Z', cost_per_min: 0.025, cost_charged: 0 };
  assert.equal(await exports.chargeStartedMinutes(db, call, new Date('2026-10-09T12:00:01Z')), 'skip');
  assert.ok(!db.log.some((e) => e.rpc));
});

test('hangup reconciles: refunds over-collection and collects any shortfall', async () => {
  const refund = fakeDb();
  await exports.settleCallCharge(refund, { id: 'c1', user_id: 'u1' }, 0.05, 0.075);
  const credit = refund.log.find((e) => e.rpc === 'credit_wallet');
  assert.equal(credit.args.p_amount, 0.025);
  assert.equal(credit.args.p_idempotency_key, 'call_settle_c1');
  const short = fakeDb();
  await exports.settleCallCharge(short, { id: 'c1', user_id: 'u1' }, 0.075, 0.05);
  assert.equal(short.log.find((e) => e.rpc === 'decrement_wallet').args.p_amount, 0.025);
});
