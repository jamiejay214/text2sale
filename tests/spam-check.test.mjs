import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/spam-check.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, RegExp });
const { checkSpam } = exports;
const ids = (result) => JSON.parse(JSON.stringify(result.issues.map((issue) => issue.id)));

test('the Blast message that carriers blocked scores high risk', () => {
  const result = checkSpam('Hi {firstName}, may I send you a quick quote for a PPO plan before rates go up? n', { firstMessage: true, businessName: 'Johnson Health Quotes' });
  assert.equal(result.level, 'high');
  assert.deepEqual(ids(result), ['opt_out', 'identity', 'urgency']);
  assert.match(result.issues[0].text, /single letter/);
});

test('a first text that names the sender and says how to opt out is low risk', () => {
  const result = checkSpam("Hi {firstName}, it's Jamie with Johnson Health Quotes. You asked about health coverage. Want a quick quote? Reply STOP to opt out.", { firstMessage: true, businessName: 'Johnson Health Quotes' });
  assert.equal(result.level, 'low');
  assert.deepEqual(ids(result), []);
});

test('follow-up steps skip the first-contact rules', () => {
  assert.deepEqual(ids(checkSpam('Just checking in, {firstName}. Still interested?')), []);
});

test('shorteners, money and pressure words, caps and punctuation are flagged', () => {
  const result = checkSpam('FREE QUOTE TODAY ONLY!!! Guaranteed lowest rate: bit.ly/abc');
  assert.deepEqual(ids(result), ['shortener', 'urgency', 'money', 'caps', 'punctuation']);
  assert.equal(result.level, 'high');
});

test('words inside other words are not flagged', () => {
  // "freedom" is not "free"; "PPO" is a normal acronym, not shouting.
  assert.deepEqual(ids(checkSpam('Ask about PPO and HMO freedom of choice, {firstName}.')), []);
});

test('without a known business name it still asks who is texting', () => {
  assert.deepEqual(ids(checkSpam('Hi {firstName}, want a quote? Reply STOP to opt out.', { firstMessage: true })), ['identity']);
  assert.deepEqual(ids(checkSpam("Hi {firstName}, it's Jamie. Want a quote? Reply STOP to opt out.", { firstMessage: true })), []);
});

test('an empty message has nothing to report', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(checkSpam('   '))), { score: 0, level: 'low', issues: [] });
});
