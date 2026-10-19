import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const nodeRequire = createRequire(import.meta.url);
const owner = {}; vm.runInNewContext(transpile('lib/owner.ts'), { exports: owner });
const browser = {}; vm.runInNewContext(transpile('lib/browser-calls.ts'), { exports: browser, Date });
const access = {}; vm.runInNewContext(transpile('lib/calling-access.ts'), { exports: access, require: () => owner });
const csv = {}; vm.runInNewContext(transpile('lib/csv-phones.ts'), { exports: csv, require: (name) => name === 'papaparse' ? nodeRequire('papaparse') : browser });
const plain = (value) => JSON.parse(JSON.stringify(value));

const OWNER = { id: 'owner1', email: 'johnsonhealthquotes@gmail.com', wallet_balance: 600, owned_numbers: [{ number: '(954) 676-1423' }] };
function db({ sponsors = {}, profiles = { owner1: OWNER, other1: { id: 'other1', email: 'someone@example.com' } } } = {}) {
  return {
    from(table) {
      const filters = {};
      const b = { select: () => b, eq: (k, v) => ((filters[k] = v), b), maybeSingle: async () => {
        if (table === 'calling_sponsors') return { data: sponsors[filters.agent_id] ? { sponsor_id: sponsors[filters.agent_id] } : null };
        return { data: profiles[filters.id] || null };
      } };
      return b;
    },
  };
}

test('the owner calls on their own account', async () => {
  const result = await access.callingAccess(db(), { id: 'owner1', email: 'johnsonhealthquotes@gmail.com' });
  assert.equal(result.payer.id, 'owner1');
  assert.equal(result.sponsored, false);
});

test('a sponsored agent calls on the sponsor\'s numbers and wallet', async () => {
  const result = await access.callingAccess(db({ sponsors: { maria: 'owner1' } }), { id: 'maria', email: 'jjjohnsonhealthllc@gmail.com' });
  assert.equal(result.userId, 'maria');
  assert.equal(result.payer.id, 'owner1');
  assert.equal(result.sponsored, true);
});

test('no sponsor, or a sponsor who can\'t call, means no calling', async () => {
  assert.equal(await access.callingAccess(db(), { id: 'maria', email: 'jjjohnsonhealthllc@gmail.com' }), null);
  assert.equal(await access.callingAccess(db({ sponsors: { maria: 'other1' } }), { id: 'maria', email: 'jjjohnsonhealthllc@gmail.com' }), null);
});

test('phone numbers come from the CSV phone column, in any common format', () => {
  const phones = csv.phonesFromCsv('First Name,Phone Number,Zip\nAmy,(954) 555-0101,33301\nBo,1-305-555-0102,33101\nCy,,33102\nAmy,954.555.0101,33301\n');
  assert.deepEqual(plain(Array.from(phones)), ['+19545550101', '+13055550102']);
});

test('with no phone header, the column that holds phone numbers is used', () => {
  const phones = csv.phonesFromCsv('Name,Contact,Zip\nAmy,9545550101,33301\nBo,3055550102,33101\n');
  assert.deepEqual(plain(Array.from(phones)), ['+19545550101', '+13055550102']);
  assert.equal(csv.phonesFromCsv('Name,Zip\nAmy,33301\n').size, 0);
});

test('phone numbers are found in any column (Business, Mobile, Home)', () => {
  const csvText = 'FirstName,Business,Mobile,Home,ZipCode\nLuis,9205417526,,,33128\nAna,,(305) 555-0102,,33101\nBo,,,786-555-0103,33102\n';
  assert.deepEqual(plain(Array.from(csv.phonesFromCsv(csvText))), ['+19205417526', '+13055550102', '+17865550103']);
});
