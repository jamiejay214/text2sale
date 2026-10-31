import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(readFileSync('lib/email-schedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, Intl, Date, Object, Number });
const { zonedTimeToUtc } = exports;

test('a local send time lands at that wall-clock time in each zone', () => {
  assert.equal(zonedTimeToUtc('2026-11-03T09:30', 'America/New_York').toISOString(), '2026-11-03T14:30:00.000Z');
  assert.equal(zonedTimeToUtc('2026-11-03T09:30', 'America/Los_Angeles').toISOString(), '2026-11-03T17:30:00.000Z');
  assert.equal(zonedTimeToUtc('2026-07-14T09:30', 'America/Chicago').toISOString(), '2026-07-14T14:30:00.000Z');
  assert.equal(zonedTimeToUtc('2026-11-03T09:30', 'America/Phoenix').toISOString(), '2026-11-03T16:30:00.000Z');
});

test('the day clocks change still resolves correctly', () => {
  // Nov 1 2026: US clocks fall back at 2 AM; 9:30 AM is standard time.
  assert.equal(zonedTimeToUtc('2026-11-01T09:30', 'America/New_York').toISOString(), '2026-11-01T14:30:00.000Z');
  // Mar 8 2026: clocks spring forward at 2 AM; 9:30 AM is daylight time.
  assert.equal(zonedTimeToUtc('2026-03-08T09:30', 'America/New_York').toISOString(), '2026-03-08T13:30:00.000Z');
});

test('malformed times are rejected', () => {
  assert.throws(() => zonedTimeToUtc('tomorrow 9am', 'America/New_York'));
});
