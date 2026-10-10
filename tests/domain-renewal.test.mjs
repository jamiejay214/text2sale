import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/domain-renewal.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date });
const { processDomainRenewal } = exports;

const NOW = new Date('2026-10-10T12:00:00Z');
const days = (n) => NOW.getTime() + n * 86400000;
function deps({ expiresAt, renew = false, wallet = true, order = { ok: true, orderId: 'o1' }, orderStatus = 'pending' } = {}) {
  const log = [];
  return {
    log,
    getInfo: async () => ({ expiresAt, renew }),
    setAutoRenew: async (d, on) => (log.push(['autoRenew', on]), 'ok'),
    getRenewalPrice: async () => 11,
    priceToCharge: (p) => p + 5,
    renew: async (d, price) => (log.push(['renew', price]), order),
    getOrder: async () => ({ status: orderStatus }),
    charge: async (amount) => (log.push(['charge', amount]), wallet),
    refund: async (amount, key) => log.push(['refund', amount, key]),
    save: async (m) => log.push(['save', m]),
    notifyInsufficient: async (d, amount) => log.push(['notify', amount]),
    recordCharge: async (d, amount, catchUp) => log.push(['record', amount, catchUp]),
  };
}
const saved = (d) => d.log.filter((e) => e[0] === 'save').at(-1)?.[1];

test('turns off Vercel auto-renew and records the paid term the first time it sees a domain', async () => {
  const d = deps({ expiresAt: days(200), renew: true });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker: null, entitled: true, now: NOW }, d), 'not_due');
  assert.deepEqual(d.log.find((e) => e[0] === 'autoRenew'), ['autoRenew', false]);
  assert.equal(saved(d).coveredUntil, new Date(days(200)).toISOString());
  assert.ok(!d.log.some((e) => e[0] === 'charge'));
});

test('inside the window: charges renewal price + $5 first, then orders the renewal', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString() };
  const d = deps({ expiresAt: days(40) });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'ordered');
  const order = d.log.map((e) => e[0]);
  assert.ok(order.indexOf('charge') < order.indexOf('renew'));
  assert.deepEqual(d.log.find((e) => e[0] === 'charge'), ['charge', 16]);
  assert.deepEqual(d.log.find((e) => e[0] === 'renew'), ['renew', 11]);
  assert.equal(saved(d).pending.orderId, 'o1');
});

test('short wallet: no order, one email per cycle, retried later', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString() };
  const d = deps({ expiresAt: days(40), wallet: false });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'insufficient');
  assert.ok(!d.log.some((e) => e[0] === 'renew'));
  assert.equal(d.log.filter((e) => e[0] === 'notify').length, 1);
  const again = deps({ expiresAt: days(39), wallet: false });
  await processDomainRenewal({ domain: 'acme.com', marker: { ...saved(d), notifiedFor: new Date(days(39)).toISOString() }, entitled: true, now: NOW }, again);
  assert.equal(again.log.filter((e) => e[0] === 'notify').length, 0);
});

test('a rejected order is refunded in full', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString() };
  const d = deps({ expiresAt: days(40), order: { ok: false, code: 'expected_price_mismatch', message: 'price changed' } });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'failed');
  assert.equal(d.log.find((e) => e[0] === 'refund')[1], 16);
  assert.equal(saved(d).pending, null);
});

test('a pending renewal completes when the expiry moves forward', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString(), pending: { fromExpiry: new Date(days(40)).toISOString(), charged: 16, orderId: 'o1', at: NOW.toISOString() } };
  const d = deps({ expiresAt: days(405) });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'renewed');
  assert.equal(saved(d).coveredUntil, new Date(days(405)).toISOString());
  assert.ok(!d.log.some((e) => e[0] === 'charge'));
});

test('a failed pending order is refunded', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString(), pending: { fromExpiry: new Date(days(40)).toISOString(), charged: 16, orderId: 'o1', at: NOW.toISOString() } };
  const d = deps({ expiresAt: days(40), orderStatus: 'failed' });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'failed');
  assert.equal(d.log.find((e) => e[0] === 'refund')[1], 16);
});

test('a renewal Vercel already ran on the platform card is billed to the customer once', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(10)).toISOString() };
  const d = deps({ expiresAt: days(375) });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: true, now: NOW }, d), 'caught_up');
  assert.deepEqual(d.log.find((e) => e[0] === 'record'), ['record', 16, true]);
  assert.equal(saved(d).coveredUntil, new Date(days(375)).toISOString());
});

test('inactive subscriptions and expired domains are never renewed', async () => {
  const marker = { domain: 'acme.com', coveredUntil: new Date(days(40)).toISOString() };
  const inactive = deps({ expiresAt: days(40) });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker, entitled: false, now: NOW }, inactive), 'inactive');
  assert.ok(!inactive.log.some((e) => e[0] === 'charge'));
  const expired = deps({ expiresAt: days(-1) });
  assert.equal(await processDomainRenewal({ domain: 'acme.com', marker: { ...marker, coveredUntil: new Date(days(-1)).toISOString() }, entitled: true, now: NOW }, expired), 'expired');
  assert.ok(!expired.log.some((e) => e[0] === 'charge'));
});
