import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/business-details.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: () => ({ isIndustryId: (v) => v === 'insurance' }), URL });
const base = { businessName: 'Acme Insurance LLC', ein: '12-3456789', businessAddress: '1 Main St', businessCity: 'Miami', businessState: 'FL', businessZip: '33101', contactPhone: '3055550100', contactEmail: 'a@acme.com', industry: 'insurance' };

test('customers can no longer use their own website or their own domain', () => {
  const own = exports.validateBusinessDetails({ ...base, hasWebsite: 'yes', website: 'https://acme.com' });
  assert.equal(own.ok, false);
  assert.match(own.error, /purchase/);
  const byo = exports.validateBusinessDetails({ ...base, customDomain: 'acme.com' });
  assert.equal(byo.ok, false);
  assert.match(byo.error, /purchase/);
});

test('a domain chosen for purchase is accepted', () => {
  const r = exports.validateBusinessDetails({ ...base, domainRequest: { domain: 'acmeinsurance.com', price: 16 } });
  assert.equal(r.ok, true);
  assert.deepEqual({ ...r.value.website, domainRequest: { ...r.value.website.domainRequest } }, { mode: 'hosted', domainRequest: { domain: 'acmeinsurance.com', price: 16 } });
});

test('re-submitting without a new choice keeps the domain already registered (the route checks it was bought here)', () => {
  const r = exports.validateBusinessDetails(base);
  assert.equal(r.ok, true);
  assert.equal(r.value.website.keepExisting, true);
});
