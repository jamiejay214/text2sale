import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(readFileSync('lib/customer-emails.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}), Intl });
const { accountCreatedEmail, messagingApprovedEmail, lowBalanceEmail } = exports;

test('first name personalizes the subject, with a clean fallback', () => {
  assert.match(accountCreatedEmail('Lauren Woj').subject, /Welcome to Text2Sale, Lauren/);
  assert.equal(accountCreatedEmail('').subject, "Welcome to Text2Sale — let's get you set up");
  assert.match(messagingApprovedEmail('Lauren').subject, /^Lauren, you're approved/);
  assert.equal(messagingApprovedEmail('  ').subject.startsWith("You're approved"), true);
  // a junk "name" must not leak into the subject line
  assert.equal(accountCreatedEmail('<script>').subject, "Welcome to Text2Sale — let's get you set up");
});

test('low balance shows the amount in subject and body, and names auto recharge', () => {
  const e = lowBalanceEmail('Lauren', 4.12);
  assert.match(e.subject, /Lauren, your Text2Sale balance is running low \(\$4\.12\)/);
  assert.match(e.text, /\$4\.12/);
  assert.match(e.html, /\$4\.12/);
  assert.match(e.text, /Auto Recharge/);
});

test('no customer email ever names the underlying provider', () => {
  for (const e of [accountCreatedEmail('Lauren'), messagingApprovedEmail('Lauren'), lowBalanceEmail('Lauren', 3)]) {
    const blob = (e.subject + ' ' + e.text + ' ' + e.html).toLowerCase();
    for (const vendor of ['telnyx', 'twilio', 'bandwidth', 'resend']) assert.equal(blob.includes(vendor), false, `leaked ${vendor}`);
  }
});

test('welcome and approved emails link to the dashboard', () => {
  assert.match(accountCreatedEmail('Lauren').html, /text2sale\.com\/dashboard/);
  assert.match(messagingApprovedEmail('Lauren').html, /text2sale\.com\/dashboard/);
});
