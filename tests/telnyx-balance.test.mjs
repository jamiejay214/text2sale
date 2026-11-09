import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(readFileSync('lib/telnyx-balance.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}), process: { env: {} }, Intl });
const { balanceLevel, shouldAlert, balanceAlert } = exports;

test('balance bands use the spendable amount', () => {
  assert.equal(balanceLevel(100), 'ok');
  assert.equal(balanceLevel(50), 'low');   // boundary is inclusive
  assert.equal(balanceLevel(35), 'low');
  assert.equal(balanceLevel(20), 'critical');
  assert.equal(balanceLevel(0), 'critical');
  assert.equal(balanceLevel(-5), 'critical');
});

test('alerts fire on getting worse, on recovery, and never on a steady ok', () => {
  const now = Date.now();
  // first reading: only speak up if not ok
  assert.equal(shouldAlert({ level: null, alertedAt: null }, 'ok', now), false);
  assert.equal(shouldAlert({ level: null, alertedAt: null }, 'low', now), true);
  // worsening
  assert.equal(shouldAlert({ level: 'ok', alertedAt: null }, 'low', now), true);
  assert.equal(shouldAlert({ level: 'low', alertedAt: null }, 'critical', now), true);
  // steady states stay quiet
  assert.equal(shouldAlert({ level: 'low', alertedAt: null }, 'low', now), false);
  assert.equal(shouldAlert({ level: 'ok', alertedAt: null }, 'ok', now), false);
  // recovery speaks once
  assert.equal(shouldAlert({ level: 'critical', alertedAt: new Date(now).toISOString() }, 'ok', now), true);
});

test('a standing critical re-alerts only after the re-alert window', () => {
  const now = Date.now();
  const recent = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
  const old = new Date(now - 7 * 60 * 60 * 1000).toISOString(); // 7h ago
  assert.equal(shouldAlert({ level: 'critical', alertedAt: recent }, 'critical', now), false);
  assert.equal(shouldAlert({ level: 'critical', alertedAt: old }, 'critical', now), true);
});

test('the critical email names the platform-wide stakes and auto recharge', () => {
  const msg = balanceAlert('critical', { balance: 8, creditLimit: 0, available: 8, currency: 'USD' });
  assert.match(msg.subject, /URGENT/);
  assert.match(msg.text, /\$8\.00/);
  assert.match(msg.text, /everyone at once/);
  assert.match(msg.text, /Auto Recharge/);
});
