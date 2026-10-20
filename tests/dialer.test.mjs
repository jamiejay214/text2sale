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
function setup({ claim = true, item = {}, session = {}, extra = {}, lists = {}, routing = {} } = {}) {
  const writes = [];
  const telnyx = [];
  const rows = {
    dialer_sessions: { id: 's1', user_id: 'u1', status: 'active', agent_state: 'ready', sip_username: 'gencred123', agent_name: 'Sarah', business_name: 'Johnson Health Quotes', ...session },
    dialer_queue: { id: 'i1', status: 'dialing', result: null, phone: '+13055550199', from_number: '+19546761423', contact_id: 'c1', user_id: 'u1', call_control_id: 'lead-cc', ...item },
    calls: { id: 'row1', user_id: 'u1', answered_at: new Date().toISOString(), cost_per_min: 0.025, cost_charged: null },
    ...extra,
  };
  const db = {
    rpc: async (name) => ({ data: name === 'dialer_claim_agent' ? claim : name === 'dialer_stats' ? {} : [], error: null }),
    from(table) {
      const q = { table, op: 'select', filters: [] };
      const b = {
        select: () => b, eq: (k, v) => (q.filters.push([k, v]), b), neq: () => b, is: () => b, in: () => b, lt: () => b, lte: () => b, not: () => b, gte: () => b, order: () => b, range: () => b, limit: () => b,
        update: (payload) => { q.op = 'update'; q.payload = payload; writes.push(q); return b; },
        insert: (payload) => { q.op = 'insert'; q.payload = payload; writes.push(q); return b; },
        maybeSingle: async () => ({ data: rows[table] || null, error: null }),
        single: async () => ({ data: rows[table] || null, error: null }),
        then: (resolve) => resolve({ data: lists[table] || null, error: null }),
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
    if (name.includes('call-routing')) return routing;
    if (name.includes('telnyx-voice')) return { ensureCallControlApp: async () => ({ ok: true, id: 'app1' }) };
    return {};
  };
  const dialer = run('lib/dialer.ts', require, { fetch, Buffer, AbortSignal, Promise, Array, console: { error() {}, log() {} }, process: { env: { TELNYX_API_KEY: 'k' } } });
  const state = { v: 1, dialer: 's1', item: 'i1', callRowId: 'row1', leg: 'lead' };
  const handle = (type, payload, legState = state) => dialer.handleDialerEvent(db, type, { call_control_id: 'lead-cc', ...payload }, legState);
  return { dialer, writes, telnyx, state, handle, dbRef: db };
}
const updatesTo = (writes, table) => writes.filter((w) => w.table === table && w.op === 'update').map((w) => plain(w.payload));

test('answering machine: hung up at once and marked voicemail', async () => {
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

test('after a transfer to the cell, the browser dropping off keeps the call; the cell hanging up ends it', async () => {
  const moved = setup({ item: { result: 'connected', status: 'dialing', transferred_to: '+19548057882' } });
  assert.equal(await moved.handle('call.hangup', { call_control_id: 'agent-cc' }, { ...moved.state, leg: 'agent' }), true);
  assert.deepEqual(moved.telnyx.map((t) => t.path), []);

  const cell = setup({ item: { result: 'connected', status: 'dialing', transferred_to: '+19548057882' } });
  assert.equal(await cell.handle('call.hangup', { call_control_id: 'cell-cc' }, { ...cell.state, leg: 'cell' }), true);
  assert.deepEqual(cell.telnyx.map((t) => t.path), ['/calls/lead-cc/actions/hangup']);
});

// ── Sharing calls between the owner and their agents ──
const held = [];
const released = [];
const routing = (sip = 'mariaSIP') => ({
  holdSession: async (_db, userId, hold) => (held.push([userId, plain(hold)]), { id: `held-${userId}`, sip_username: sip }),
  releaseHold: async (_db, id) => (released.push(id), 'ready'),
});

test('a lead answers while the agent is busy and sharing is on: put through to a free teammate instead of abandoned', async () => {
  held.length = 0;
  const ctx = setup({
    claim: false,
    session: { user_id: 'maria' },
    extra: { calling_sponsors: { sponsor_id: 'jamie', take_overflow: true } },
    lists: { calling_sponsors: [{ agent_id: 'maria', take_overflow: true }] },
    routing: routing('jamieSIP'),
  });
  await ctx.handle('call.machine.detection.ended', { result: 'human' });
  assert.deepEqual(held[0][0], 'jamie');
  assert.deepEqual(held[0][1].states, ['ready'], 'only a teammate waiting for a lead, never mid-call');
  const transfer = ctx.telnyx.find((t) => t.path === '/calls/lead-cc/actions/transfer');
  assert.equal(transfer.body.to, 'sip:jamieSIP@sip.telnyx.com');
  assert.deepEqual(transfer.body.custom_headers, [{ name: 'X-Text2Sale-Route', value: 'autoanswer' }]);
  assert.equal(decode(transfer.body.target_leg_client_state).leg, 'team');
  assert.ok(!updatesTo(ctx.writes, 'dialer_queue').some((u) => u.result === 'abandoned'));
  assert.ok(updatesTo(ctx.writes, 'dialer_queue').some((u) => u.transferred_to === 'team'), 'protected from the sender hanging up their leads');
});

test('sharing off: a busy agent\'s extra answer is abandoned as before', async () => {
  held.length = 0;
  const ctx = setup({
    claim: false,
    session: { user_id: 'maria' },
    extra: { calling_sponsors: { sponsor_id: 'jamie', take_overflow: false } },
    routing: routing(),
  });
  await ctx.handle('call.machine.detection.ended', { result: 'human' });
  assert.equal(held.length, 0);
  assert.ok(updatesTo(ctx.writes, 'dialer_queue').some((u) => u.result === 'abandoned'));
});

test('send to teammate: rings their browser for them to accept; the sender moves on to wrap-up', async () => {
  held.length = 0;
  const ctx = setup({
    item: { result: 'connected', status: 'dialing', call_row_id: 'row1' },
    session: { user_id: 'jamie', active_item: 'i1' },
    extra: { profiles: { first_name: 'Maria', ai_call_transfer_number: null } },
    lists: { calling_sponsors: [{ agent_id: 'maria', take_overflow: false }] },
    routing: routing('mariaSIP'),
  });
  const session = { id: 's1', user_id: 'jamie', active_item: 'i1', agent_name: 'Jamie' };
  assert.equal(await ctx.dialer.sendToTeammate(ctx.dbRef, session, 'maria'), null);
  const transfer = ctx.telnyx.find((t) => t.path === '/calls/lead-cc/actions/transfer');
  assert.equal(transfer.body.to, 'sip:mariaSIP@sip.telnyx.com');
  assert.deepEqual(transfer.body.custom_headers, [{ name: 'X-Text2Sale-Route', value: 'overflow' }]);
  assert.equal(decode(transfer.body.target_leg_client_state).back, 's1');
  assert.ok(updatesTo(ctx.writes, 'dialer_sessions').some((u) => u.agent_state === 'wrap'));
  assert.equal(await ctx.dialer.sendToTeammate(ctx.dbRef, session, 'stranger'), "You can't send calls to that person.");
});

test('teammate leg: answered then hung up ends the call; never answered comes back to the sender', async () => {
  released.length = 0;
  const done = setup({ item: { result: 'connected', status: 'dialing', team_answered_at: new Date().toISOString() }, routing: routing() });
  await done.handle('call.hangup', { call_control_id: 'team-cc' }, { ...done.state, leg: 'team', team: 'held-maria', back: 's1' });
  assert.deepEqual(released, ['held-maria']);
  assert.ok(done.telnyx.some((t) => t.path === '/calls/lead-cc/actions/hangup'));

  held.length = 0;
  const missed = setup({ item: { result: 'connected', status: 'dialing', team_answered_at: null }, routing: routing('jamieSIP') });
  await missed.handle('call.hangup', { call_control_id: 'team-cc' }, { ...missed.state, leg: 'team', team: 'held-maria', back: 's1' });
  assert.equal(held[0][0], 'u1', 'the sender (session s1\'s user) is rung again');
  const back = missed.telnyx.find((t) => t.path === '/calls/lead-cc/actions/transfer');
  assert.equal(back.body.to, 'sip:jamieSIP@sip.telnyx.com');
  assert.ok(!missed.telnyx.some((t) => t.path.endsWith('/hangup') && t.path.includes('lead-cc')));
});

// ── Scheduled callbacks ──
test('callback time: must be in the future and within 90 days', () => {
  const { dialer } = setup();
  const now = new Date('2026-10-20T15:00:00Z');
  assert.equal(dialer.callbackTime('2026-10-20T19:30:00.000Z', now), '2026-10-20T19:30:00.000Z');
  assert.equal(dialer.callbackTime('2026-10-20T14:00:00Z', now), null, 'in the past');
  assert.equal(dialer.callbackTime('2027-03-01T15:00:00Z', now), null, 'too far out');
  assert.equal(dialer.callbackTime('soon', now), null);
  assert.equal(dialer.callbackTime(undefined, now), null);
});

test('a callback counts as requested from its time until two hours late', () => {
  const { dialer } = setup();
  const due = '2026-10-20T19:30:00Z';
  assert.equal(dialer.callbackWindowOpen(due, new Date('2026-10-20T19:30:20Z')), true);
  assert.equal(dialer.callbackWindowOpen(due, new Date('2026-10-20T21:00:00Z')), true);
  assert.equal(dialer.callbackWindowOpen(due, new Date('2026-10-20T22:00:00Z')), false, 'well overdue: an ordinary call again');
  assert.equal(dialer.callbackWindowOpen(due, new Date('2026-10-20T19:00:00Z')), false, 'not yet');
  assert.equal(dialer.callbackWindowOpen(null), false);
});

test('due callbacks go to the front of the queue, from the number that first called the lead', async () => {
  const callback = { id: 'cb1', user_id: 'u1', contact_id: 'c1', phone: '+13055550199', from_number: '+19546761423', due_at: '2026-10-20T19:30:00Z', status: 'scheduled' };
  const ctx = setup({ extra: { dialer_callbacks: { id: 'cb1' } }, lists: { dialer_callbacks: [callback] } });
  const added = await ctx.dialer.enqueueDueCallbacks(ctx.dbRef, { id: 's1', user_id: 'u1', status: 'active' }, new Date('2026-10-20T19:31:00Z'));
  assert.equal(added, 1);
  const insert = ctx.writes.find((w) => w.table === 'dialer_queue' && w.op === 'insert');
  assert.equal(insert.payload.position, -1);
  assert.equal(insert.payload.call_from, '+19546761423');
  assert.equal(insert.payload.callback_id, 'cb1');
  assert.ok(updatesTo(ctx.writes, 'dialer_callbacks').some((u) => u.status === 'dialed'), 'claimed so it is queued only once');

  const idle = setup();
  assert.equal(await idle.dialer.enqueueDueCallbacks(idle.dbRef, { id: 's1', user_id: 'u1', status: 'paused' }), 0, 'not while paused');
});
