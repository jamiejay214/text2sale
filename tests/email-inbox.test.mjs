import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Load only the pure helpers (the module's imports are server-side).
const exports = {};
const source = ts.transpileModule(readFileSync('lib/email-inbox.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}) });
const { isUnsubscribeReply, replySubject, stripQuoted } = exports;

test('unsubscribe replies are recognized only as the whole first line', () => {
  for (const t of ['Unsubscribe', 'remove me.', 'STOP', 'Please remove me', 'take me off your list!']) assert.equal(isUnsubscribeReply(t), true, t);
  for (const t of ["Don't stop, this is great", 'Can you remove me from the 3pm slot and book 4pm?', 'Yes please call me']) assert.equal(isUnsubscribeReply(t), false, t);
});

test('reply subjects get one "Re:" and a fallback', () => {
  assert.equal(replySubject('Your 2027 coverage', 'x'), 'Re: Your 2027 coverage');
  assert.equal(replySubject('RE: Your 2027 coverage', 'x'), 'RE: Your 2027 coverage');
  assert.equal(replySubject('  ', 'Message from Sunrise'), 'Message from Sunrise');
  assert.equal(replySubject('Line\r\nBcc: x@evil.test', 'x'), 'Re: Line Bcc: x@evil.test');
});

test('quoted history is cut from plain-text replies', () => {
  assert.equal(stripQuoted('Yes, Tuesday works.\n\nOn Mon, Nov 2, 2026 at 9:30 AM Jamie <j@x.com> wrote:\n> Hi Maria'), 'Yes, Tuesday works.');
  assert.equal(stripQuoted('Sounds good\r\n> earlier text'), 'Sounds good');
  assert.equal(stripQuoted('Call me\n-----Original Message-----\nFrom: Jamie'), 'Call me');
});
