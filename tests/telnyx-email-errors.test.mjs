import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The error helpers only; nothing here calls Telnyx.
const exports = {};
const source = ts.transpileModule(readFileSync('lib/telnyx-email.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}), process: { env: {} } });
const { TelnyxEmailError, isAccountBlocked, isDailyLimit } = exports;

test('a deactivated or unfunded Telnyx account holds emails instead of failing them', () => {
  // The exact error Telnyx returned on 2026-11-01.
  assert.equal(isAccountBlocked(new TelnyxEmailError('The request cannot be fulfilled because your account has been deactivated. It may be out of funds.', '10010', 403)), true);
  assert.equal(isAccountBlocked(new TelnyxEmailError('Authentication failed', '10009', 401)), true);
  assert.equal(isAccountBlocked(new TelnyxEmailError('Insufficient balance', 'x', 400)), true);
});

test('recipient and content errors still fail, and daily limits stay separate', () => {
  assert.equal(isAccountBlocked(new TelnyxEmailError('Invalid recipient address', '10002', 422)), false);
  assert.equal(isAccountBlocked(new Error('deactivated')), false);
  assert.equal(isAccountBlocked(new TelnyxEmailError('Daily limit', 'domain_graduation_limit_exceeded', 429)), false);
  assert.equal(isDailyLimit(new TelnyxEmailError('Daily limit', 'domain_graduation_limit_exceeded', 429)), true);
});
