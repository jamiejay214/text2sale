import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/inbox-filter.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date });
const { tabQueries, belongsInTab, mergeNewestFirst, CONVERSATION_COLUMNS, ARCHIVED_BATCH } = exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('All texts is every conversation, with no filters', () => {
  assert.deepEqual(plain(tabQueries('all', ['a1'])), [{ select: CONVERSATION_COLUMNS, steps: [] }]);
});

test('Inbox only asks for leads who replied, leaving out opt-outs and archived ones', () => {
  const [plan] = plain(tabQueries('inbox', ['a1', 'a2']));
  assert.match(plan.select, /contacts!inner\(dnc\)$/);
  assert.deepEqual(plan.steps, [
    { op: 'not', column: 'contacts.dnc', operator: 'is', value: true },
    { op: 'not', column: 'id', operator: 'in', value: '(a1,a2)' },
    { op: 'not', column: 'replied_at', operator: 'is', value: null },
  ]);
});

test('Unread and AI handled filter in the database too', () => {
  assert.deepEqual(plain(tabQueries('unread'))[0].steps.at(-1), { op: 'gt', column: 'unread', value: 0 });
  assert.deepEqual(plain(tabQueries('ai'))[0].steps.at(-1), { op: 'or', filters: 'ai_replied_at.not.is.null,ai_enabled.is.true,agent_enabled.is.true' });
});

test('a long archive list only goes in the URL up to the batch size', () => {
  const ids = Array.from({ length: ARCHIVED_BATCH + 40 }, (_, i) => `id${i}`);
  const [plan] = plain(tabQueries('inbox', ids));
  const hidden = plan.steps.find((step) => step.column === 'id').value;
  assert.equal(hidden.split(',').length, ARCHIVED_BATCH);
});

test('Archived merges opted-out leads with archived ids, in batches', () => {
  const ids = Array.from({ length: ARCHIVED_BATCH + 1 }, (_, i) => `id${i}`);
  const plans = plain(tabQueries('archived', ids));
  assert.equal(plans.length, 3);
  assert.deepEqual(plans[0].steps, [{ op: 'eq', column: 'contacts.dnc', value: true }]);
  assert.equal(plans[1].steps[0].values.length, ARCHIVED_BATCH);
  assert.deepEqual(plans[2].steps[0].values, [`id${ARCHIVED_BATCH}`]);
  assert.equal(plain(tabQueries('archived', [])).length, 1);
});

test('which tab a loaded conversation belongs in', () => {
  const quiet = { id: 'c1', unread: 0, replied_at: null, ai_replied_at: null, ai_enabled: false, agent_enabled: false };
  const replied = { ...quiet, replied_at: '2026-10-11T21:33:30Z', unread: 2 };
  const aiAnswered = { ...replied, ai_replied_at: '2026-10-11T21:33:40Z' };
  assert.equal(belongsInTab(quiet, 'inbox', false), false, 'a campaign text with no reply stays out of the Inbox');
  assert.equal(belongsInTab(quiet, 'all', true), true);
  assert.equal(belongsInTab(replied, 'inbox', false), true);
  assert.equal(belongsInTab(replied, 'inbox', true), false, 'archived or opted out');
  assert.equal(belongsInTab(replied, 'unread', false), true);
  assert.equal(belongsInTab(replied, 'ai', false), false);
  assert.equal(belongsInTab(aiAnswered, 'ai', false), true);
  assert.equal(belongsInTab({ ...quiet, ai_enabled: true }, 'ai', false), true);
  assert.equal(belongsInTab(quiet, 'archived', true), true);
  assert.equal(belongsInTab(replied, 'archived', false), false);
});

test('merged lists come back newest first, each conversation once', () => {
  const merged = mergeNewestFirst([
    [{ id: 'a', last_message_at: '2026-10-11T21:30:00+00:00' }, { id: 'b', last_message_at: '2026-10-11T21:29:00.5+00:00' }],
    [{ id: 'b', last_message_at: '2026-10-11T21:29:00.5+00:00' }, { id: 'c', last_message_at: '2026-10-11T21:31:00.123+00:00' }],
  ]);
  assert.deepEqual(plain(merged.map((row) => row.id)), ['c', 'a', 'b']);
});
