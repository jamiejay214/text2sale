import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/availability.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Intl, Date });
const db = { from: () => { const q = { select: () => q, eq: () => q, gte: () => q, lte: () => Promise.resolve({ data: [] }) }; return q; } };
const weekdays = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((d) => [d, { enabled: true, start: '09:00', end: '17:00' }]));
const hours = { enabled: true, timezone: 'America/New_York', slots: weekdays, slotDuration: 30, bufferMinutes: 15, maxDaysOut: 14 };

test('reads the clock in the business time zone, not the server zone', () => {
  // 14:00 UTC on Thu 2026-10-08 is 10:00 in New York.
  assert.deepEqual({ ...exports.nowInTimezone('America/New_York', new Date('2026-10-08T14:00:00Z')) }, { date: '2026-10-08', minutes: 600 });
  // 02:00 UTC Friday is still Thursday evening in Los Angeles.
  assert.deepEqual({ ...exports.nowInTimezone('America/Los_Angeles', new Date('2026-10-09T02:00:00Z')) }, { date: '2026-10-08', minutes: 1140 });
  assert.equal(exports.nowInTimezone('Not/AZone', new Date('2026-10-08T14:00:00Z')).date, '2026-10-08');
});

test('offers same-day slots on a weekday morning in the business zone', async () => {
  const slots = await exports.getAvailableSlots(db, 'user', hours, 3, new Date('2026-10-08T14:00:00Z'));
  assert.equal(slots[0].date, '2026-10-08');
  assert.equal(slots[0].time, '10:30:00');
});

test('an evening request starts with the next business day, not a UTC date', async () => {
  // 7 PM Thursday in New York is already Friday in UTC.
  const slots = await exports.getAvailableSlots(db, 'user', hours, 1, new Date('2026-10-08T23:00:00Z'));
  assert.equal(slots[0].date, '2026-10-09');
  assert.equal(slots[0].time, '09:00:00');
});
