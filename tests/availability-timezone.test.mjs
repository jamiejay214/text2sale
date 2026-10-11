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

test('a local business time becomes the right moment for calendar lookups', () => {
  // 10:30 Monday in New York (EDT) is 14:30 UTC; in January (EST) it is 15:30.
  assert.equal(exports.zonedTimeToUtc('2026-10-12', '10:30:00', 'America/New_York').toISOString(), '2026-10-12T14:30:00.000Z');
  assert.equal(exports.zonedTimeToUtc('2027-01-11', '10:30:00', 'America/New_York').toISOString(), '2027-01-11T15:30:00.000Z');
  assert.equal(exports.zonedTimeToUtc('2026-10-12', '09:00', 'America/Los_Angeles').toISOString(), '2026-10-12T16:00:00.000Z');
  // The morning after clocks fall back still lands on the standard-time offset.
  assert.equal(exports.zonedTimeToUtc('2026-11-01', '09:00:00', 'America/New_York').toISOString(), '2026-11-01T14:00:00.000Z');
  assert.equal(exports.zonedTimeToUtc('2026-10-12', '10:30:00', 'Not/AZone').toISOString(), '2026-10-12T14:30:00.000Z');
});

test('a slot overlapping a Google Calendar event counts as busy', () => {
  const busy = [{ start: Date.parse('2026-10-12T14:00:00Z'), end: Date.parse('2026-10-12T15:00:00Z') }]; // 10-11 AM New York
  assert.equal(exports.overlapsBusy('2026-10-12', '10:30:00', 30, 'America/New_York', busy), true);
  assert.equal(exports.overlapsBusy('2026-10-12', '09:45:00', 30, 'America/New_York', busy), true, 'runs into the event');
  assert.equal(exports.overlapsBusy('2026-10-12', '09:00:00', 30, 'America/New_York', busy), false);
  assert.equal(exports.overlapsBusy('2026-10-12', '11:00:00', 30, 'America/New_York', busy), false, 'starts as the event ends');
  assert.equal(exports.overlapsBusy('2026-10-12', '10:30:00', 30, 'America/New_York', []), false);
});

test('offered slots skip times taken on Google Calendar', async () => {
  const busy = [{ start: Date.parse('2026-10-12T14:00:00Z'), end: Date.parse('2026-10-12T15:30:00Z') }]; // 10-11:30 AM Monday
  // Sunday evening: Monday's slots are 9:00, 9:45, 10:30, 11:15, 12:00...
  const slots = await exports.getAvailableSlots(db, 'user', hours, 4, new Date('2026-10-11T22:00:00Z'), busy);
  assert.deepEqual(JSON.parse(JSON.stringify(slots.map((s) => `${s.date} ${s.time}`))), ['2026-10-12 09:00:00', '2026-10-12 12:00:00', '2026-10-12 12:45:00', '2026-10-12 13:30:00']);
});
