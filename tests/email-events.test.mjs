import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Only the pure helpers; the module's imports are server-side.
const exports = {};
const source = ts.transpileModule(readFileSync('lib/email-events.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports, require: () => ({}) });
const { eventKind, shouldPause } = exports;

test('event types are read with or without the "email." prefix, canonical name first', () => {
  assert.equal(eventKind({ event_type: 'email.delivered' }), 'delivered');
  assert.equal(eventKind({ event_type: 'bounced' }), 'bounced');
  assert.equal(eventKind({ event_type: 'email.failed', canonical_event_type: 'email.expired' }), 'expired');
});

test('campaigns pause only after enough sends and past the limits', () => {
  assert.equal(shouldPause({ sent: 50, bounced: 20, complained: 5 }), null);
  assert.equal(shouldPause({ sent: 1000, bounced: 40, complained: 2 }), null);
  assert.match(shouldPause({ sent: 1000, bounced: 10, complained: 4 }), /spam complaints reached 0\.4%/);
  assert.match(shouldPause({ sent: 1000, bounced: 60, complained: 0 }), /bounces reached 6\.0%/);
});
