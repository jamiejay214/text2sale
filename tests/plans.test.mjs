import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const run = (file, require) => { const exports = {}; vm.runInNewContext(transpile(file), { exports, require, Date, Number, Math, JSON }); return exports; };

const callPricing = run('lib/call-pricing.ts', () => ({}));
const smsPricing = run('lib/sms-pricing.ts', () => ({}));
const plans = run('lib/plans.ts', (name) => (name.includes('call-pricing') ? callPricing : smsPricing));
const owner = run('lib/owner.ts', () => ({}));
const ent = run('lib/entitlements.ts', (name) => (name.includes('owner') ? owner : plans));
const packages = run('lib/packages.ts', (name) => (name.includes('sms-pricing') ? smsPricing : plans));

const paying = (plan, extra = {}) => ({ email: 'agent@example.com', subscription_status: 'active', free_subscription: false, plan, ...extra });

test('plan prices and Complete savings match the price sheet', () => {
  assert.equal(plans.PLANS.text.price, 39.99);
  assert.equal(plans.PLANS.dialer.price, 89.99);
  assert.equal(plans.PLANS.complete.price, 119.99);
  assert.equal(plans.COMPLETE_SAVINGS, 9.99);
  assert.equal(plans.USAGE_RATES.outboundCallPerMin, 0.025);
  assert.equal(plans.USAGE_RATES.inboundCallPerMin, 0.015);
  assert.equal(plans.USAGE_RATES.forwardedCallPerMin, 0.04);
  assert.equal(plans.USAGE_RATES.aiReceptionistPerMin, 0.18);
  assert.equal(plans.USAGE_RATES.smsPerSegment, 0.015);
  assert.equal(plans.USAGE_RATES.aiReplyFee, 0.02);
});

test('Text texts, Dialer calls, Complete does both', () => {
  assert.equal(ent.canText(paying({ key: 'text' })), true);
  assert.equal(ent.canCall(paying({ key: 'text' })), false);
  assert.equal(ent.canText(paying({ key: 'dialer' })), false);
  assert.equal(ent.canCall(paying({ key: 'dialer' })), true);
  assert.equal(ent.canText(paying({ key: 'complete' })), true);
  assert.equal(ent.canCall(paying({ key: 'complete' })), true);
});

test('accounts from before the three plans stay on Text', () => {
  const legacy = paying({ name: 'Text2Sale', price: 39.99, messageCost: 0.015 });
  assert.equal(ent.planKeyOf(legacy), 'text');
  assert.equal(ent.canText(legacy), true);
  assert.equal(ent.canCall(legacy), false);
});

test('no access without a subscription; comped accounts keep their plan; the owner keeps everything', () => {
  assert.equal(ent.canCall(paying({ key: 'complete' }, { subscription_status: 'inactive' })), false);
  assert.equal(ent.canCall(paying({ key: 'complete' }, { subscription_status: 'past_due' })), false);
  assert.equal(ent.canCall(paying({ key: 'complete' }, { subscription_status: 'canceling' })), true);
  assert.equal(ent.canCall(paying({ key: 'dialer' }, { subscription_status: 'inactive', free_subscription: true })), true);
  assert.equal(ent.canText(paying({ key: 'dialer' }, { subscription_status: 'inactive', free_subscription: true })), false);
  const ownerAccount = paying({ key: 'text' }, { email: 'johnsonhealthquotes@gmail.com', subscription_status: 'inactive' });
  assert.equal(ent.canCall(ownerAccount), true);
  assert.equal(ent.canText(ownerAccount), true);
  assert.equal(ent.canCall(null), false);
});

test('a downgrade booked for renewal keeps today\'s plan until its date', () => {
  const booked = paying({ key: 'complete', pendingKey: 'dialer', pendingAt: '2026-11-20T00:00:00Z' });
  assert.equal(ent.planKeyOf(booked, new Date('2026-11-01T00:00:00Z')), 'complete');
  assert.equal(ent.canText(booked, new Date('2026-11-01T00:00:00Z')), true);
  assert.equal(ent.planKeyOf(booked, new Date('2026-11-20T00:00:01Z')), 'dialer');
  assert.equal(ent.canText(booked, new Date('2026-11-21T00:00:00Z')), false);
});

test('upgrades are the higher-priced moves', () => {
  assert.equal(plans.isUpgrade('text', 'complete'), true);
  assert.equal(plans.isUpgrade('dialer', 'complete'), true);
  assert.equal(plans.isUpgrade('text', 'dialer'), true);
  assert.equal(plans.isUpgrade('complete', 'dialer'), false);
  assert.equal(plans.isUpgrade('dialer', 'text'), false);
});

test('legacy package keys map to Text; profile plan shape carries the key and volume rate', () => {
  assert.equal(packages.toPlanKey('standard'), 'text');
  assert.equal(packages.toPlanKey('ai'), 'text');
  assert.equal(packages.toPlanKey('dialer'), 'dialer');
  assert.equal(packages.toPlanKey('premium'), null);
  assert.deepEqual(JSON.parse(JSON.stringify(packages.planShape('complete'))), { key: 'complete', name: 'Text2Sale Complete', price: 119.99, messageCost: 0.015 });
  assert.equal(packages.planShape('text', 0.0135).messageCost, 0.0135);
});
