import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/call-log.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, JSON, Date, Number, String, Object, Array, Set });
const { formatCallLog } = exports;

test('the call log puts the session record and Telnyx events in order, with failures marked', () => {
  const text = formatCallLog({
    session: {
      id: 's1', state: 'listening', outcome: null, started_at: '2026-10-10T17:00:00Z',
      turns: [{ role: 'assistant', content: 'Hi, thanks for calling!' }],
      pending_transcript: "I'm looking for a family plan",
      collected: { call_quality: { mos: 4.4, rating: 'good' } },
    },
    call: { status: 'completed', duration_seconds: 20, hangup_cause: 'normal_clearing' },
    events: [
      { type: 'webhook', name: 'call.transcription', event_timestamp: '2026-10-10T17:00:06.500Z', metadata: { event: { payload: { client_state: 'eyJ2Ijox', transcription_data: { transcript: "I'm looking for a family plan", is_final: true } } } } },
      { type: 'command', name: 'answer', event_timestamp: '2026-10-10T17:00:01.000Z', metadata: { command: { send_silence_when_idle: true } } },
      { type: 'command', name: 'speak', event_timestamp: '2026-10-10T17:00:02.000Z', metadata: { errors: [{ title: 'Invalid voice' }] } },
    ],
  });
  assert.match(text, /Heard but not answered: I'm looking for a family plan/);
  assert.match(text, /audio: \{"mos":4.4,"rating":"good"\}/);
  const events = text.split('Telnyx events:')[1].trim().split('\n').map((line) => line.trim());
  assert.match(events[0], /^\+0\.0s command answer/);
  assert.match(events[1], /^\+1\.0s command speak .*ERROR .*Invalid voice/);
  assert.match(events[2], /^\+5\.5s webhook call\.transcription heard "I'm looking for a family plan"/);
  assert.doesNotMatch(text, /client_state|eyJ2Ijox/);
});

test('missing Telnyx data is said plainly', () => {
  const text = formatCallLog({ session: { id: 's2', turns: [] }, events: [], telnyxError: 'Telnyx call log unavailable (HTTP 401)' });
  assert.match(text, /Transcript:\n  \(none\)/);
  assert.match(text, /Telnyx call log unavailable \(HTTP 401\)/);
});
