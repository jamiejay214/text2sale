import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('lib/ai-call-turn.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

// In-memory Supabase: just enough of the query builder and the turn RPCs.
function fakeDb(rows) {
  const tables = { ai_call_sessions: rows, profiles: [{ id: 'u1', ai_call_voice: null }] };
  const match = (row, filters) => filters.every(([op, k, v]) => (op === 'eq' ? row[k] === v : row[k] !== v));
  const db = {
    from(table) {
      const filters = [];
      let patch = null;
      const q = {
        select: () => q, eq: (k, v) => (filters.push(['eq', k, v]), q), neq: (k, v) => (filters.push(['neq', k, v]), q),
        update: (u) => ((patch = u), q),
        async maybeSingle() {
          const hit = (tables[table] || []).filter((r) => match(r, filters));
          if (patch) hit.forEach((r) => Object.assign(r, patch));
          return { data: hit[0] ? { ...hit[0] } : null };
        },
        then(resolve) { return q.maybeSingle().then(resolve); },
      };
      return q;
    },
    async rpc(name, args) {
      const s = rows.find((r) => r.call_control_id === args.p_ccid);
      if (name === 'ai_call_append_transcript') { s.pending_transcript = `${s.pending_transcript} ${args.p_text}`.trim(); return { data: s.pending_transcript }; }
      if (name === 'ai_call_claim_turn') {
        const stale = !s.turn_lock_at || Date.now() - new Date(s.turn_lock_at).getTime() > args.p_lease_seconds * 1000;
        if (s.state === 'done' || !stale) return { data: false };
        Object.assign(s, { turn_lock_at: new Date().toISOString(), state: 'thinking' });
        return { data: true };
      }
      if (name === 'ai_call_consume_transcript') { const t = s.pending_transcript; s.pending_transcript = ''; return { data: t }; }
      return { data: 1 };
    },
  };
  return db;
}

function load(overrides = {}) {
  const calls = { speak: [], transcription: 0 };
  const aiCall = {
    MAX_TURNS: 40, TURN_DEBOUNCE_MS: 0, TURN_LEASE_SECONDS: 25,
    settingsFromProfile: () => ({ voice: 'v', maxMinutes: 10, greeting: null }),
    businessNameFor: () => 'Acme', defaultGreeting: () => 'Hi there',
    startTranscription: async () => (calls.transcription++, true),
    speak: async (ccid, line) => (calls.speak.push(line), true),
    stopTranscription: async () => true, hangupCall: async () => true, transferCall: async () => true,
    buildVoicePrompt: () => 'prompt', buildVoiceTools: () => [], speakableTime: (t) => t,
    runModelTurn: async () => ({ say: 'Sure thing.', toolName: null, toolInput: {} }),
    ...overrides,
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, console: { error() {}, warn() {} }, Date, JSON, Math, Buffer, setTimeout, Promise,
    require: (name) => name.includes('ai-call') ? aiCall
      : name.includes('availability') ? { DEFAULT_AVAILABLE_HOURS: { enabled: false }, getAvailableSlots: async () => [], formatDateNice: (d) => d, formatTime12: (t) => t }
      : name.includes('call-pricing') ? { AI_CALL_MIN_RESERVE: 0.36, AI_CALL_RATE_PER_MIN: 0.18, AI_CALL_RESERVE_MINUTES: 2, calcAiCallCharge: () => 0 }
      : {},
  });
  return { ...exports, calls };
}

const session = (extra = {}) => ({
  id: 's1', user_id: 'u1', call_id: 'c1', call_control_id: 'cc1', contact_id: null, from_number: '+13055550100',
  state: 'listening', turns: [], pending_transcript: '', turn_lock_at: null, turn_count: 0, collected: {},
  reserved_amount: 3.6, started_at: new Date().toISOString(), ...extra,
});

test('a repeated call.answered greets and starts transcription only once', async () => {
  const t = load();
  const row = session({ state: 'greeting' });
  const db = fakeDb([row]);
  await t.openConversation(db, row, { voice: 'v' }, {});
  await t.openConversation(db, row, { voice: 'v' }, {});
  assert.equal(t.calls.transcription, 1);
  assert.deepEqual(t.calls.speak, ['Hi there']);
});

test('the caller is answered after they speak', async () => {
  const t = load();
  const row = session();
  await t.onTranscript(fakeDb([row]), 'cc1', 'I want it for myself');
  assert.deepEqual(t.calls.speak, ['Sure thing.']);
  assert.equal(row.state, 'speaking');
  assert.equal(row.turn_lock_at, null);
});

test('a failed turn asks the caller to repeat instead of going silent', async () => {
  const t = load({ runModelTurn: async () => { throw new Error('timeout'); } });
  const row = session();
  await t.onTranscript(fakeDb([row]), 'cc1', 'hello?');
  assert.equal(t.calls.speak.length, 1);
  assert.match(t.calls.speak[0], /say it one more time/);
  assert.equal(row.turn_lock_at, null);
  assert.equal(row.state, 'speaking');
});

test('a turn stuck past its lease is recovered when the caller speaks again', async () => {
  const t = load();
  const row = session({ state: 'thinking', turn_lock_at: new Date(Date.now() - 60_000).toISOString() });
  await t.onTranscript(fakeDb([row]), 'cc1', 'hello, are you there?');
  assert.deepEqual(t.calls.speak, ['Sure thing.']);
});

test('a live turn is not interrupted: speech is banked for after it', async () => {
  const t = load();
  const row = session({ state: 'thinking', turn_lock_at: new Date().toISOString() });
  await t.onTranscript(fakeDb([row]), 'cc1', 'one more thing');
  assert.equal(t.calls.speak.length, 0);
  assert.equal(row.pending_transcript, 'one more thing');
});

test('words that land just as the greeting ends are still answered', async () => {
  const t = load();
  const row = session({ state: 'speaking' });
  const db = fakeDb([row]);
  // speak.ended reads the session, then the caller's transcript is banked
  // before the handler switches to listening.
  const realFrom = db.from.bind(db);
  let reads = 0;
  db.from = (table) => {
    const q = realFrom(table);
    const maybeSingle = q.maybeSingle;
    q.maybeSingle = async () => {
      const result = await maybeSingle();
      if (table === 'ai_call_sessions' && ++reads === 1) row.pending_transcript = 'I am looking for a family plan';
      return result;
    };
    return q;
  };
  await t.onSpeakEnded(db, 'cc1', 'completed');
  assert.deepEqual(t.calls.speak, ['Sure thing.']);
  assert.equal(row.pending_transcript, '');
});
