import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(readFileSync('lib/abandoned-signup.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}) });
const { prettyPhone, signupReach, abandonedMessage } = exports;

const base = { id: '1', name: 'Mike Jones', email: 'mike@acme.com', phone: '5551234567', industry: 'Insurance', source: 'direct', path: '/', created_at: '2026-11-07T16:42:00Z', notes: '' };

test('phone formats US numbers and leaves odd input alone', () => {
  assert.equal(prettyPhone('5551234567'), '(555) 123-4567');
  assert.equal(prettyPhone('+15551234567'), '(555) 123-4567');
  assert.equal(prettyPhone('123'), '123');
  assert.equal(prettyPhone(null), '');
});

test('reach lists the fields the person completed', () => {
  assert.match(signupReach(base), /name, email, phone/);
  assert.match(signupReach({ ...base, phone: '' }), /name, email\)/);
  assert.match(signupReach({ name: '', email: '', phone: '' }), /started the form/);
});

test('the alert carries name, email, phone and how far they got; hides direct source', () => {
  const msg = abandonedMessage(base, 'Nov 7, 11:42am ET');
  assert.match(msg, /Abandoned signup/);
  assert.match(msg, /Mike Jones/);
  assert.match(msg, /mike@acme\.com/);
  assert.match(msg, /\(555\) 123-4567/);
  assert.match(msg, /contact step/);
  assert.match(msg, /Nov 7, 11:42am ET/);
  assert.ok(!/Source:/.test(msg));
  assert.match(abandonedMessage({ ...base, source: 'google' }, 'x'), /Source: google/);
});
