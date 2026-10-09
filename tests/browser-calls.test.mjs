import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/browser-calls.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date });

function fakeDb(results) {
  const ops = [];
  return { ops, from(table) {
    const op = { table, filters: [], update: null };
    ops.push(op);
    const q = {
      select: () => q, order: () => q, limit: () => q,
      eq: (k, v) => (op.filters.push(['eq', k, v]), q), is: (k, v) => (op.filters.push(['is', k, v]), q),
      gte: (k, v) => (op.filters.push(['gte', k, v]), q),
      update: (u) => (op.update = u, q),
      maybeSingle: async () => ({ data: results.shift() ?? null }),
    };
    return q;
  } };
}

test('normalizes US numbers', () => {
  assert.equal(exports.toE164('(954) 555-0100'), '+19545550100');
  assert.equal(exports.toE164('19545550100'), '+19545550100');
  assert.equal(exports.toE164('555-0100'), null);
});

test('binds a Telnyx leg to the call the browser logged, by its signed from/to numbers', async () => {
  const db = fakeDb([{ id: 'row1' }, { id: 'row1' }]);
  const id = await exports.bindBrowserCall(db, { ccid: 'cc1', from: '+19545550100', to: '+13055550199', sessionId: 's', legId: 'l' }, new Date('2026-10-09T12:00:00Z'));
  assert.equal(id, 'row1');
  const [find, bind] = db.ops;
  assert.deepEqual(find.filters.filter((f) => f[0] === 'eq'), [['eq', 'direction', 'outbound'], ['eq', 'status', 'initiating'], ['eq', 'from_number', '+19545550100'], ['eq', 'to_number', '+13055550199']]);
  assert.deepEqual(find.filters.find((f) => f[0] === 'gte'), ['gte', 'started_at', '2026-10-09T11:55:00.000Z']);
  assert.equal(bind.update.call_control_id, 'cc1');
  assert.equal(bind.update.status, 'ringing');
  assert.ok(bind.filters.some((f) => f[0] === 'is' && f[1] === 'call_control_id' && f[2] === null));
});

test('an unlogged or malformed leg binds nothing', async () => {
  assert.equal(await exports.bindBrowserCall(fakeDb([null]), { ccid: 'cc1', from: '+19545550100', to: '+13055550199' }), null);
  const db = fakeDb([]);
  assert.equal(await exports.bindBrowserCall(db, { ccid: 'cc1', from: 'sip:user@sip.telnyx.com', to: '+13055550199' }), null);
  assert.equal(db.ops.length, 0);
});
