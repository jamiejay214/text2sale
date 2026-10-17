import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/spam-check.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, RegExp });
const { checkSpam } = exports;
const ids = (result) => JSON.parse(JSON.stringify(result.issues.map((issue) => issue.id)));

test('a plain text with no flagged words is low risk, without needing a business name', () => {
  const result = checkSpam('Hi {firstName}, may I send you a quick quote for a PPO plan? n');
  assert.deepEqual(ids(result), []);
  assert.equal(result.level, 'low');
  assert.equal(result.score, 0);
});

test('the Blast message is graded on its words only: one pressure phrase', () => {
  const result = checkSpam('Hi {firstName}, may I send you a quick quote for a PPO plan before rates go up? n');
  assert.deepEqual(ids(result), ['urgency']);
  assert.match(result.issues[0].text, /before rates go up/);
  assert.equal(result.level, 'medium');
});

test('prize, restricted and shortener patterns are high risk', () => {
  assert.equal(checkSpam('Congratulations! You have won a gift card, claim your prize').level, 'high');
  assert.equal(checkSpam('Get CBD delivered today').level, 'high');
  assert.deepEqual(ids(checkSpam('See details: bit.ly/abc')), ['shortener']);
});

test('several flagged signals stack up', () => {
  const result = checkSpam('FREE QUOTE TODAY ONLY!!! Guaranteed lowest rate. Click here: https://a.com and https://b.com');
  assert.deepEqual(ids(result), ['urgency', 'money', 'pushy', 'links', 'caps', 'punctuation']);
  assert.equal(result.level, 'high');
});

test('everyday wording is not flagged', () => {
  assert.deepEqual(ids(checkSpam('Feel free to text back anytime, {firstName}. Ask about PPO and HMO freedom of choice.')), []);
  assert.deepEqual(ids(checkSpam('Your appointment is approved for Tuesday at 2 pm.')), []);
});

test('an empty message has nothing to report', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(checkSpam('   '))), { score: 0, level: 'low', issues: [] });
});
