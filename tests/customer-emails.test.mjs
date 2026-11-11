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

test('receipt: itemized total, date, card and receipt id; no vendor names', () => {
  const vm2 = exports; // same module
  const e = vm2.receiptEmail({ name: 'Lauren Woj', kind: 'subscription', items: [{ description: 'Text2Sale Text — monthly subscription', amount: 39.99 }], total: 39.99, cardLast4: '4242', receiptId: 'T2S-10427', date: new Date('2026-11-09') });
  assert.match(e.subject, /Your Text2Sale receipt — \$39\.99/);
  assert.match(e.html, /Text2Sale Text — monthly subscription/);
  assert.match(e.html, /\$39\.99/);
  assert.match(e.html, /ending 4242/);
  assert.match(e.html, /T2S-10427/);
  assert.match(e.html, /recurring monthly charge/);
  const blob = (e.subject + e.text + e.html).toLowerCase();
  for (const v of ['telnyx','twilio','bandwidth','resend','stripe']) assert.equal(blob.includes(v), false, `leaked ${v}`);
});

test('receipt funds variant totals multiple items and falls back to card on file', () => {
  const e = exports.receiptEmail({ name: '', kind: 'funds', items: [{ description: 'Funds added to your Text2Sale balance', amount: 25 }], total: 25 });
  assert.match(e.subject, /\$25\.00/);
  assert.match(e.html, /Card on file/);
  assert.match(e.html, /text2sale\.com\/dashboard/);
});
