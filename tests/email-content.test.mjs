import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const load = (file, require) => {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require, Buffer });
  return exports;
};
const nodeRequire = createRequire(import.meta.url);
const design = load('lib/email-design.ts', nodeRequire);
const exports = load('lib/email-content.ts', (id) => (id === './email-design' ? design : nodeRequire(id)));
const { personalize, buildEmail, signUnsubscribe, verifyUnsubscribe, normalizeEmail, emailCost, EMAIL_RATE } = exports;

const footer = { businessName: 'Sunrise Insurance', address: '1 Main St, Fort Lauderdale, FL 33301', unsubscribeUrl: 'https://text2sale.com/api/email/unsubscribe?t=abc' };

test('merge fields fill in, and a missing first name reads "there"', () => {
  assert.equal(personalize('Hi {firstName} {lastName} in {city}, {state}', { first_name: 'Maria', last_name: 'Diaz', city: 'Miami', state: 'FL' }), 'Hi Maria Diaz in Miami, FL');
  assert.equal(personalize('Hi {FIRSTNAME},', {}), 'Hi there,');
});

test('every email carries the business name, address and unsubscribe link in both parts', () => {
  const msg = buildEmail({ subject: 'Hello {firstName}', previewText: '', body: 'Line one\n\nLine two', contact: { first_name: 'Sam' }, footer });
  assert.equal(msg.subject, 'Hello Sam');
  for (const part of [msg.html, msg.text]) {
    assert.match(part, /Sunrise Insurance/);
    assert.match(part, /1 Main St, Fort Lauderdale, FL 33301/);
    assert.match(part, /api\/email\/unsubscribe\?t=abc/);
  }
  assert.match(msg.html, /<p style="margin:0 0 16px">Line one<\/p><p style="margin:0 0 16px">Line two<\/p>/);
});

test('contact data and body text are escaped in HTML, and subjects cannot inject headers', () => {
  const msg = buildEmail({ subject: 'Hi\r\nBcc: x@evil.test', previewText: '', body: 'Hello {firstName}', contact: { first_name: '<script>alert(1)</script>' }, footer });
  assert.ok(!msg.html.includes('<script>'));
  assert.match(msg.html, /&lt;script&gt;/);
  assert.ok(!/[\r\n]/.test(msg.subject));
});

test('https links in the body become clickable', () => {
  const msg = buildEmail({ subject: 's', previewText: '', body: 'Book here: https://cal.example.com/jamie', contact: {}, footer });
  assert.match(msg.html, /<a href="https:\/\/cal\.example\.com\/jamie"/);
});

test('unsubscribe tokens round-trip and reject tampering or the wrong secret', () => {
  const token = signUnsubscribe('user-1', 'Maria@Example.com', 'secret');
  assert.deepEqual({ ...verifyUnsubscribe(token, 'secret') }, { userId: 'user-1', email: 'maria@example.com' });
  assert.equal(verifyUnsubscribe(token, 'other-secret'), null);
  const [payload, sig] = token.split('.');
  const forged = Buffer.from('user-2|maria@example.com').toString('base64url');
  assert.equal(verifyUnsubscribe(`${forged}.${sig}`, 'secret'), null);
  assert.equal(verifyUnsubscribe(`${payload}.`, 'secret'), null);
  assert.equal(verifyUnsubscribe('', 'secret'), null);
});

test('email addresses are normalized and junk is rejected', () => {
  assert.equal(normalizeEmail('  Jamie@Example.COM '), 'jamie@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail('a@b.com, c@d.com'), null);
  assert.equal(normalizeEmail(null), null);
});

test('cost is the per-email rate times the count', () => {
  assert.equal(emailCost(1000), Number((1000 * EMAIL_RATE).toFixed(4)));
  assert.equal(emailCost(0), 0);
  assert.equal(emailCost(-5), 0);
});

test('a designed email renders the card with brand color, logo and button, and escapes its text', () => {
  const msg = buildEmail({
    subject: 's', previewText: '', body: '', contact: { first_name: 'Maria' }, footer,
    design: { theme: 'dark', brandColor: '#ff0000', logoUrl: 'https://cdn.example.com/logo.png', headline: 'Hi {firstName} <b>', bullets: ['One', 'Two'], ctaText: 'Book', ctaUrl: 'https://cal.example.com' },
  });
  assert.match(msg.html, /Hi Maria &lt;b&gt;/);
  assert.match(msg.html, /bgcolor="#ff0000"/);
  assert.match(msg.html, /<img src="https:\/\/cdn\.example\.com\/logo\.png"/);
  assert.match(msg.html, /<a href="https:\/\/cal\.example\.com"/);
  assert.match(msg.text, /- One\n- Two/);
  assert.match(msg.text, /Book: https:\/\/cal\.example\.com/);
});

test('designs drop unsafe links and colors', () => {
  const msg = buildEmail({
    subject: 's', previewText: '', body: '', contact: {}, footer,
    design: { brandColor: 'red;background:url(x)', logoUrl: 'javascript:alert(1)', headline: 'H', ctaText: 'Go', ctaUrl: 'javascript:alert(1)' },
  });
  assert.ok(!msg.html.includes('javascript:'));
  assert.ok(!msg.html.includes('url(x)'));
  assert.match(msg.html, /#34d399/);
});

test('snake_case merge fields and {agent_name} fill in', () => {
  assert.equal(personalize('Hi {first_name} {last_name} from {state}, {agent_name} here', { first_name: 'Maria', last_name: 'Diaz', state: 'FL', agent_name: 'Jamie' }), 'Hi Maria Diaz from FL, Jamie here');
  assert.equal(personalize('Hi {first_name},', {}), 'Hi there,');
});

test('a personal email renders the letter, one button and the sign-off', () => {
  const msg = buildEmail({
    subject: 's', previewText: '', body: 'Hi {first_name},\n\nQuick note.', contact: { first_name: 'Maria' }, footer,
    design: { style: 'personal', ctaText: 'Book my review', ctaUrl: 'https://cal.example.com', signature: 'Jamie', brandColor: '#34d399' },
  });
  assert.match(msg.html, /<p style="margin:0 0 16px">Hi Maria,<\/p>/);
  assert.match(msg.html, /<a href="https:\/\/cal\.example\.com"[^>]*>Book my review<\/a>/);
  assert.match(msg.html, />Jamie<\/p>/);
  assert.ok(!msg.html.includes('Free 10-minute review'));
  assert.match(msg.text, /Book my review: https:\/\/cal\.example\.com\n\nJamie/);
});

test('a personal email drops a button without an https link', () => {
  const msg = buildEmail({ subject: 's', previewText: '', body: 'Hello', contact: {}, footer, design: { style: 'personal', ctaText: 'Go', ctaUrl: 'javascript:alert(1)' } });
  assert.ok(!msg.html.includes('javascript:'));
  assert.ok(!msg.html.includes('>Go</a>'));
});

test('a custom footer replaces the business name, address and note, and always keeps unsubscribe', () => {
  const { footerFor } = design;
  const account = { businessName: 'JJ JOHNSON HEALTH', address: '6080 SW 24th Pl Apt 306, Davie, FL 33314' };
  const f = footerFor(account, { footerName: 'Sunrise Insurance', footerAddress: 'PO Box 123, Miami, FL 33101', footerNote: 'You asked us for a quote.' }, 'https://text2sale.com/u?t=1');
  const msg = buildEmail({ subject: 's', previewText: '', body: 'Hi', contact: {}, footer: f, design: { style: 'personal' } });
  for (const part of [msg.html, msg.text]) {
    assert.match(part, /Sunrise Insurance · PO Box 123, Miami, FL 33101/);
    assert.match(part, /You asked us for a quote\./);
    assert.match(part, /text2sale\.com\/u\?t=1/);
    assert.ok(!part.includes('JJ JOHNSON HEALTH'));
  }
});

test('blank or fake footer values fall back to the account details', () => {
  const { footerFor } = design;
  const account = { businessName: 'JJ Johnson Health', address: '6080 SW 24th Pl, Davie, FL 33314' };
  assert.deepEqual({ ...footerFor(account, {}, 'u') }, { businessName: 'JJ Johnson Health', address: '6080 SW 24th Pl, Davie, FL 33314', note: undefined, unsubscribeUrl: 'u' });
  assert.equal(footerFor(account, { footerAddress: 'nowhere' }, 'u').address, '6080 SW 24th Pl, Davie, FL 33314');
  const f = footerFor(account, { footerName: 'A\r\nBcc: x', footerNote: '<b>hi</b>' }, 'u');
  assert.equal(f.businessName, 'A Bcc: x');
  const msg = buildEmail({ subject: 's', previewText: '', body: 'x', contact: {}, footer: f });
  assert.ok(!msg.html.includes('<b>hi</b>'));
});
