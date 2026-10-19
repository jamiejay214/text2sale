import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const transpile = (f) => ts.transpileModule(readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const run = (file, require, extra = {}) => { const exports = {}; vm.runInNewContext(transpile(file), { exports, require, Intl, Date, Math, Number, String, JSON, ...extra }); return exports; };

const quiet = run('lib/quiet-hours.ts', () => ({}));
const pacing = run('lib/dialer-pacing.ts', () => quiet);
const browser = run('lib/browser-calls.ts', () => ({}));
const plain = (value) => JSON.parse(JSON.stringify(value));
const decode = (s) => JSON.parse(Buffer.from(s, 'base64').toString());

test('expected abandon rate: none on one line, p/2 on two, about p on three', () => {
  assert.equal(pacing.expectedAbandonRate(1, 0.3), 0);
  assert.ok(Math.abs(pacing.expectedAbandonRate(2, 0.1) - 0.05) < 1e-9);
  assert.ok(Math.abs(pacing.expectedAbandonRate(3, 0.03) - (0.03 - 0.03 ** 2 / 3)) < 1e-6);
  assert.equal(pacing.expectedAbandonRate(3, 0), 0);
});

test('lines: a new list dials one at a time until it shows few people answer', () => {
  const base = { maxLines: 3, abandoned30d: 0, connected30d: 0 };
  assert.equal(pacing.chooseLines({ ...base, dials: 0, liveAnswers: 0 }), 1);
  // 3% answer: two lines (1.5% expected abandons) but not three (~3%).
  assert.equal(pacing.chooseLines({ ...base, dials: 400, liveAnswers: 10 }), 2);
  // 1% answer: three lines.
  assert.equal(pacing.chooseLines({ ...base, dials: 1000, liveAnswers: 8 }), 3);
  assert.equal(pacing.chooseLines({ ...base, maxLines: 2, dials: 1000, liveAnswers: 8 }), 2);
  // Plenty of people answering: extra lines would abandon too many.
  assert.equal(pacing.chooseLines({ ...base, dials: 400, liveAnswers: 80 }), 1);
});

test('lines: the real 30-day abandon rate nearing 3% drops to one line', () => {
  const low = { maxLines: 3, dials: 1000, liveAnswers: 8 };
  assert.equal(pacing.chooseLines({ ...low, abandoned30d: 2, connected30d: 98 }), 3);
  assert.equal(pacing.chooseLines({ ...low, abandoned30d: 3, connected30d: 97 }), 1);
  assert.equal(pacing.abandonRate(0, 0), 0);
});

test('calling hours are 8 AM to 8 PM in the lead\'s state', () => {
  const at = (iso) => new Date(iso);
  assert.equal(pacing.withinCallingHours('FL', at('2026-10-19T12:30:00Z')), true); // 8:30 AM EDT
  assert.equal(pacing.withinCallingHours('CA', at('2026-10-19T12:30:00Z')), false); // 5:30 AM PDT
  assert.equal(pacing.withinCallingHours('FL', at('2026-10-19T23:30:00Z')), true); // 7:30 PM
  assert.equal(pacing.withinCallingHours('FL', at('2026-10-20T00:30:00Z')), false); // 8:30 PM
  assert.equal(pacing.withinCallingHours(null, at('2026-10-19T16:00:00Z')), true); // defaults to Eastern
});

test('abandoned-call message names the caller and business, a callback number, and press 9', () => {
  const text = pacing.abandonMessage({ agentName: 'Sarah', businessName: 'Johnson Health Quotes', callbackNumber: '+19546761423' });
  assert.match(text, /Sarah with Johnson Health Quotes/);
  assert.match(text, /9 5 4, 6 7 6, 1 4 2 3/);
  assert.match(text, /press 9/);
});

// ── Call flow ──
function setup({ claim = true, item = {}, session = {} } = {}) {
  const writes = [];
  const telnyx = [];
  const rows = {
    dialer_sessions: { id: 's1', user_id: 'u1', status: 'active', agent_state: 'ready', sip_username: 'gencred123', agent_name: 'Sarah', business_name: 'Johnson Health Quotes', ...session },
    dialer_queue: { id: 'i1', status: 'dialing', result: null, phone: '+13055550199', from_number: '+19546761423', contact_id: 'c1', user_id: 'u1', call_control_id: 'lead-cc', ...item },
    calls: { id: 'row1', user_id: 'u1', answered_at: new Date().toISOString(), cost_per_min: 0.025, cost_charged: null },
  };
  const db = {
    rpc: async (name) => ({ data: name === 'dialer_claim_agent' ? claim : name === 'dialer_stats' ? {} : [], error: null }),
    from(table) {
      const q = { table, op: 'select', filters: [] };
      const b = {
        select: () => b, eq: (k, v) => (q.filters.push([k, v]), b), neq: () => b, is: () => b, in: () => b, lt: () => b, gte: () => b, order: () => b, range: () => b, limit: () => b,
        update: (payload) => { q.op = 'update'; q.payload = payload; writes.push(q); return b; },
        insert: (payload) => { q.op = 'insert'; q.payload = payload; writes.push(q); return b; },
        maybeSingle: async () => ({ data: rows[table] || null, error: null }),
        single: async () => ({ data: rows[table] || null, error: null }),
        then: (resolve) => resolve({ data: null, error: null }),
      };
      return b;
    },
  };
  const fetch = async (url, init) => {
    telnyx.push({ path: url.replace('https://api.telnyx.com/v2', ''), body: init?.body ? JSON.parse(init.body) : null });
    return { ok: true, status: 200, json: async () => ({ data: {} }) };
  };
  const require = (name) => {
    if (name.includes('dialer-pacing')) return pacing;
    if (name.includes('browser-calls')) return browser;
    if (name.includes('call-pricing')) return { CALL_RATE_OUTBOUND_PER_MIN: 0.025 };
    if (name.includes('call-metering')) return { chargeStartedMinutes: async () => 'ok' };
    if (name.includes('messaging-status')) return { isEntitled: () => true };
    if (name.includes('owner')) return { canUseCalling: () => true };
    if (name.includes('calling-access')) return { callingAccess: async (_db, user) => ({ userId: user.id, payer: { id: 'u1', wallet_balance: 100, paused: false }, sponsored: false }) };
    if (name.includes('telnyx-voice')) return { ensureCallControlApp: async () => ({ ok: true, id: 'app1' }) };
    return {};
  };
  const dialer = run('lib/dialer.ts', require, { fetch, Buffer, AbortSignal, Promise, Array, console: { error() {}, log() {} }, process: { env: { TELNYX_API_KEY: 'k' } } });
  const state = { v: 1, dialer: 's1', item: 'i1', callRowId: 'row1', leg: 'lead' };
  const handle = (type, payload, legState = state) => dialer.handleDialerEvent(db, type, { call_control_id: 'lead-cc', ...payload }, legState);
  return { dialer, writes, telnyx, state, handle };
}
const updatesTo = (writes, table) => writes.filter((w) => w.table === table && w.op === 'update').map((w) => plain(w.payload));

test('answering machine: hung up and marked voicemail (not billed)', async () => {
  const ctx = setup();
  assert.equal(await ctx.handle('call.machine.detection.ended', { result: 'machine' }), true);
  assert.ok(updatesTo(ctx.writes, 'dialer_queue').some((u) => u.result === 'voicemail'));
  assert.ok(updatesTo(ctx.writes, 'calls').some((u) => u.outcome === 'voicemail'));
  assert.deepEqual(ctx.telnyx.map((t) => t.path), ['/calls/lead-cc/actions/hangup']);
});

test('a person answers and the agent is free: put through to the browser phone', async () => {
  const ctx = setup({ claim: true });
  await ctx.handle('call.machine.detection.ended', { result: 'human' });
  const transfer = ctx.telnyx.find((t) => t.path === '/calls/lead-cc/actions/transfer');
  assert.ok(transfer);
  assert.equal(transfer.body.to, 'sip:gencred123@sip.telnyx.com');
  assert.equal(transfer.body.from, '+13055550199');
  assert.equal(decode(transfer.body.target_leg_client_state).leg, 'agent');
  assert.ok(!ctx.telnyx.some((t) => t.path.includes('gather')));
});

test('a person answers while the agent is busy: abandoned message with press-9 opt-out', async () => {
  const ctx = setup({ claim: false });
  await ctx.handle('call.machine.detection.ended', { result: 'not_sure' });
  assert.ok(updatesTo(ctx.writes, 'dialer_queue').some((u) => u.result === 'abandoned'));
  const gather = ctx.telnyx.find((t) => t.path === '/calls/lead-cc/actions/gather_using_speak');
  assert.ok(gather);
  assert.equal(gather.body.valid_digits, '9');
  assert.match(gather.body.payload, /Sarah with Johnson Health Quotes/);
  assert.match(gather.body.payload, /9 5 4, 6 7 6, 1 4 2 3/);
  assert.equal(decode(gather.body.client_state).stage, 'abandon');
  assert.ok(!ctx.telnyx.some((t) => t.path.includes('transfer')));
});

test('pressing 9 adds the lead to Do Not Call; anything else just hangs up', async () => {
  const opted = setup();
  await opted.handle('call.gather.ended', { digits: '9' }, { ...opted.state, stage: 'abandon' });
  assert.ok(updatesTo(opted.writes, 'contacts').some((u) => u.dnc === true));
  assert.ok(updatesTo(opted.writes, 'dialer_queue').some((u) => u.opted_out === true));
  assert.equal(decode(opted.telnyx.find((t) => t.path.endsWith('/speak')).body.client_state).stage, 'bye');

  const silent = setup();
  await silent.handle('call.gather.ended', { digits: '' }, { ...silent.state, stage: 'abandon' });
  assert.ok(!updatesTo(silent.writes, 'contacts').length);
  assert.deepEqual(silent.telnyx.map((t) => t.path), ['/calls/lead-cc/actions/hangup']);
});

test('the browser phone never picks up: dialer pauses and the lead hears the message', async () => {
  const ctx = setup({ item: { result: null, status: 'dialing' } });
  await ctx.handle('call.hangup', { call_control_id: 'agent-cc' }, { ...ctx.state, leg: 'agent' });
  const sessionUpdates = updatesTo(ctx.writes, 'dialer_sessions');
  assert.ok(sessionUpdates.some((u) => u.status === 'paused' && u.agent_state === 'away'));
  assert.ok(ctx.telnyx.some((t) => t.path === '/calls/lead-cc/actions/gather_using_speak'));
});

test('agent hangs up a connected call: the lead leg is ended too', async () => {
  const ctx = setup({ item: { result: 'connected', status: 'dialing' } });
  assert.equal(await ctx.handle('call.hangup', { call_control_id: 'agent-cc' }, { ...ctx.state, leg: 'agent' }), true);
  assert.deepEqual(ctx.telnyx.map((t) => t.path), ['/calls/lead-cc/actions/hangup']);
});

test('lead hangup closes the queue item and lets the webhook bill the call', async () => {
  const ctx = setup({ item: { result: null, status: 'dialing', answered_at: null }, session: { agent_state: 'wrap', active_item: 'other' } });
  assert.equal(await ctx.handle('call.hangup', { hangup_cause: 'timeout' }), false);
  assert.ok(updatesTo(ctx.writes, 'dialer_queue').some((u) => u.status === 'done' && u.result === 'no-answer'));
});

test('unanswered results come from the hangup cause', () => {
  const { dialer } = setup();
  assert.equal(dialer.unansweredResult('user_busy'), 'busy');
  assert.equal(dialer.unansweredResult('unallocated_number'), 'failed');
  assert.equal(dialer.unansweredResult('timeout'), 'no-answer');
  assert.equal(dialer.unansweredResult(''), 'no-answer');
});
