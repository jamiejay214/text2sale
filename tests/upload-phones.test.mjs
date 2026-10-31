import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const load = (file, require) => {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require, Number, String, Set });
  return exports;
};
const input = load('lib/workspace-input.ts', nodeRequire);
const { uploadPhones } = load('lib/upload-phones.ts', (id) => (id === '@/lib/workspace-input' ? input : nodeRequire(id)));

test('phones come from every phone-like column and are normalized', () => {
  const csv = 'ContactID,First Name,Business,Mobile,Home,Last Result Code\r\n1,Ana,Acme Roofing,(954) 555-0123,+1 305-555-0199,No answer\r\n2,Bo,,9545550123,,\r\n';
  assert.deepEqual([...uploadPhones(csv).sort()], ['3055550199', '9545550123']);
});

test('other export layouts work too', () => {
  assert.deepEqual([...uploadPhones('"Lead ID","Phone 1"\n"7","7865550142"\n')], ['7865550142']);
  assert.deepEqual([...uploadPhones('First name,Phone number\nAl,786.555.0143\n')], ['7865550143']);
  assert.deepEqual([...uploadPhones('Name,Email\nAl,al@x.com\n')], []);
});
