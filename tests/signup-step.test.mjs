// Command-center signup step (lib/signup-step.ts): a signup is not a customer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const js = ts.transpileModule(readFileSync('lib/signup-step.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = {}; vm.runInNewContext(js, { exports: m, Date, Number, Array, String });
const { signupStep } = m;
const plain = (o) => JSON.parse(JSON.stringify(o));

test('new signup that never reached payment is step 1 and not finished', () => {
  const s = plain(signupStep({ subscription_status: 'inactive' }));
  assert.equal(s.n, 1); assert.equal(s.key, 'account'); assert.equal(s.finished, false);
  assert.match(s.label, /never opened checkout/);
});

test('a payment customer with no subscription stopped at checkout (step 2, not finished)', () => {
  const s = plain(signupStep({ subscription_status: 'inactive', stripe_customer_id: 'cus_1', stripe_subscription_id: null }));
  assert.equal(s.n, 2); assert.equal(s.key, 'checkout'); assert.equal(s.finished, false);
  assert.match(s.label, /no card entered/);
});

test('trialing is step 3 and finished; a trial set to cancel says no charge', () => {
  const t = plain(signupStep({ subscription_status: 'trialing', plan: { trialEndsAt: '2026-11-25T12:00:00Z' } }));
  assert.equal(t.n, 3); assert.equal(t.key, 'trial'); assert.equal(t.finished, true);
  assert.match(t.label, /first charge Nov 25/);
  const c = plain(signupStep({ subscription_status: 'trialing', plan: { trialEndsAt: '2026-11-25T12:00:00Z', trialCancels: true } }));
  assert.equal(c.key, 'trial_canceling'); assert.match(c.label, /no charge/);
});

test('active, canceling, past due and comped are step 4', () => {
  assert.equal(signupStep({ subscription_status: 'active' }).key, 'paying');
  assert.equal(signupStep({ subscription_status: 'canceling' }).key, 'canceling');
  assert.equal(signupStep({ subscription_status: 'past_due' }).key, 'past_due');
  assert.equal(signupStep({ subscription_status: 'inactive', free_subscription: true }).key, 'comped');
  for (const st of ['active', 'canceling', 'past_due']) assert.equal(signupStep({ subscription_status: st }).n, 4);
});

test('a former subscriber who is now inactive is "cancelled", not "never finished"', () => {
  const s = plain(signupStep({ subscription_status: 'inactive', stripe_customer_id: 'cus_1', usage_history: [{ id: 'sub_in_123' }] }));
  assert.equal(s.key, 'cancelled'); assert.equal(s.finished, false);
});

test('missing or odd data never throws and defaults to step 1', () => {
  assert.equal(signupStep({}).n, 1);
  assert.equal(signupStep({ subscription_status: null, usage_history: null, plan: null }).n, 1);
});
