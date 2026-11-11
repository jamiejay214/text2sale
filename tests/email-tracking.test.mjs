import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const exports = {};
const source = ts.transpileModule(readFileSync('lib/email-tracking.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require, Buffer, URL, process: { env: {} } });
const { openUrl, clickUrl, verifyTracking, withUtm, addTracking } = exports;

const base = 'https://text2sale.com';
const secret = 'test-secret';

test('signed open and click links verify, and tampering fails', () => {
  const o = new URL(openUrl(base, 'row-1', secret));
  assert.equal(verifyTracking('row-1', 'open', o.searchParams.get('k'), secret), true);
  assert.equal(verifyTracking('row-2', 'open', o.searchParams.get('k'), secret), false);
  const c = new URL(clickUrl(base, 'row-1', 'https://example.com/a?b=1', secret));
  assert.equal(c.searchParams.get('u'), 'https://example.com/a?b=1');
  assert.equal(verifyTracking('row-1', c.searchParams.get('u'), c.searchParams.get('k'), secret), true);
  assert.equal(verifyTracking('row-1', 'https://evil.example', c.searchParams.get('k'), secret), false);
});

test('UTM tags are added without overriding existing ones', () => {
  const u = new URL(withUtm('https://www.text2sale.com', 'RE: Your Client Is Waiting'));
  assert.equal(u.searchParams.get('utm_source'), 'text2sale');
  assert.equal(u.searchParams.get('utm_medium'), 'email');
  assert.equal(u.searchParams.get('utm_campaign'), 're-your-client-is-waiting');
  assert.equal(new URL(withUtm('https://x.com/?utm_source=mine', 'c')).searchParams.get('utm_source'), 'mine');
  assert.equal(withUtm('mailto:a@b.com', 'c'), 'mailto:a@b.com');
});

test('links are wrapped, unsubscribe is left alone, and the pixel is added', () => {
  const html = '<html><body><a href="https://a.com/?x=1&amp;y=2">A</a><a href="https://unsub.example/u?t=1">Unsubscribe</a></body></html>';
  const out = addTracking(html, { open: 'https://t/open?s=1&k=2', click: (u) => `https://t/c?u=${encodeURIComponent(u)}`, skip: ['https://unsub.example/u?t=1'] });
  assert.match(out, /href="https:\/\/t\/c\?u=https%3A%2F%2Fa\.com%2F%3Fx%3D1%26y%3D2"/);
  assert.match(out, /href="https:\/\/unsub\.example\/u\?t=1"/);
  assert.match(out, /<img src="https:\/\/t\/open\?s=1&amp;k=2"[^>]*><\/body>/);
});
