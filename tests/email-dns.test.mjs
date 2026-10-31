import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(readFileSync('lib/email-dns.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: createRequire(import.meta.url) });
const { mergeSpf, relativeHost, providerFromNs, planRecords } = exports;

const TELNYX = [
  { type: 'TXT', name: 'telnyx1._domainkey.example.com', value: 'v=DKIM1; k=rsa; p=ABC' },
  { type: 'TXT', name: '_dmarc.example.com', value: 'v=DMARC1; p=none; rua=mailto:dmarc@telnyx.com' },
  { type: 'TXT', name: 'example.com', value: 'telnyx-domain-verification=123' },
  { type: 'TXT', name: 'example.com', value: 'v=spf1 include:spf.telnyx.com ~all' },
];

test('SPF includes merge into the existing record before its "all"', () => {
  assert.equal(mergeSpf('v=spf1 include:spf.privateemail.com ~all', 'v=spf1 include:spf.telnyx.com ~all'), 'v=spf1 include:spf.privateemail.com include:spf.telnyx.com ~all');
  assert.equal(mergeSpf('v=spf1 include:_spf.google.com -all', 'v=spf1 include:spf.telnyx.com ~all'), 'v=spf1 include:_spf.google.com include:spf.telnyx.com -all');
  assert.equal(mergeSpf('v=spf1 mx redirect=_spf.example.net', 'v=spf1 include:spf.telnyx.com ~all'), 'v=spf1 mx include:spf.telnyx.com redirect=_spf.example.net');
  assert.equal(mergeSpf('v=spf1 include:spf.telnyx.com ~all', 'v=spf1 include:spf.telnyx.com ~all'), 'v=spf1 include:spf.telnyx.com ~all');
});

test('hosts are shown the way DNS providers expect', () => {
  assert.equal(relativeHost('example.com', 'example.com'), '@');
  assert.equal(relativeHost('telnyx1._domainkey.news.example.com.', 'example.com'), 'telnyx1._domainkey.news');
  assert.equal(relativeHost('_dmarc.Example.com', 'example.com'), '_dmarc');
});

test('common DNS providers are recognized from their nameservers', () => {
  assert.equal(providerFromNs(['pdns1.registrar-servers.com.']).name, 'Namecheap');
  assert.equal(providerFromNs(['ns41.domaincontrol.com']).name, 'GoDaddy');
  assert.equal(providerFromNs(['ada.ns.cloudflare.com']).name, 'Cloudflare');
  assert.equal(providerFromNs(['ns1.unknown-host.net']), null);
});

test('a domain with existing email: edit SPF, keep DMARC, add the rest, suggest a subdomain', () => {
  const plan = planRecords({
    domain: 'example.com', zone: 'example.com', records: TELNYX, domainHasMail: true,
    existing: { 'example.com': ['v=spf1 include:spf.privateemail.com ~all'], '_dmarc.example.com': ['v=DMARC1; p=quarantine'] },
  });
  const by = Object.fromEntries(plan.steps.map((s) => [s.value.slice(0, 12), s]));
  const spf = plan.steps.find((s) => s.value.startsWith('v=spf1'));
  assert.equal(spf.action, 'edit');
  assert.equal(spf.current, 'v=spf1 include:spf.privateemail.com ~all');
  assert.equal(spf.value, 'v=spf1 include:spf.privateemail.com include:spf.telnyx.com ~all');
  assert.equal(spf.host, '@');
  assert.equal(plan.steps.find((s) => s.name === '_dmarc.example.com').action, 'keep');
  assert.equal(by['v=DKIM1; k=r'].action, 'add');
  assert.equal(by['v=DKIM1; k=r'].host, 'telnyx1._domainkey');
  assert.equal(plan.suggestSubdomain, 'news.example.com');
});

test('records already published read as found, and a fresh subdomain needs only adds', () => {
  const done = planRecords({
    domain: 'example.com', zone: 'example.com', records: TELNYX, domainHasMail: false,
    existing: { 'example.com': ['telnyx-domain-verification=123', 'v=spf1 include:x.com include:spf.telnyx.com ~all'], 'telnyx1._domainkey.example.com': ['v=DKIM1;  k=rsa; p=ABC'], '_dmarc.example.com': ['v=DMARC1; p=none; rua=mailto:dmarc@telnyx.com'] },
  });
  assert.deepEqual(done.steps.map((s) => s.action), ['done', 'done', 'done', 'done']);
  assert.equal(done.suggestSubdomain, null);

  const sub = planRecords({
    domain: 'news.example.com', zone: 'example.com', domainHasMail: false, existing: {},
    records: TELNYX.map((r) => ({ ...r, name: r.name.replace('example.com', 'news.example.com') })),
  });
  assert.deepEqual(sub.steps.map((s) => s.action), ['add', 'add', 'add', 'add']);
  assert.deepEqual(sub.steps.map((s) => s.host), ['telnyx1._domainkey.news', '_dmarc.news', 'news', 'news']);
  assert.equal(sub.suggestSubdomain, null);
});

test('quoted and chunked TXT answers are joined back into one value', () => {
  const { txtValue } = exports;
  assert.equal(txtValue('"v=spf1 include:spf.privateemail.com ~all"'), 'v=spf1 include:spf.privateemail.com ~all');
  assert.equal(txtValue('"v=DKIM1; k=rsa; p=AB" "CD"'), 'v=DKIM1; k=rsa; p=ABCD');
  assert.equal(txtValue('plain'), 'plain');
});
