import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/campaign-enqueue.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, console: { error() {} }, Number, JSON });
const { enqueueSequence, explainEnqueueError, FIRST_BATCH } = exports;

// Fake Supabase: the RPC queues its batch under a run id; inserts and deletes act on the queue.
function fakeDb({ rpcError = null, failInsertAt = -1 } = {}) {
  const state = { queue: [], campaign: { status: 'Draft', audience: 0 }, rpcBatch: 0, inserts: 0 };
  const db = {
    state,
    async rpc(name, args) {
      if (rpcError) return { data: null, error: rpcError };
      state.rpcBatch = args.p_messages.length;
      for (const m of args.p_messages) state.queue.push({ ...m, campaign_run_id: 'run-1', status: 'pending', campaign_id: args.p_campaign_id });
      state.campaign.status = 'Sending';
      return { data: { queued: args.p_messages.length, audience: 1, status: 'Sending', resumed: false }, error: null };
    },
    from(table) {
      const filters = [];
      let op = 'select', payload;
      const q = {
        select: () => q, limit: () => q,
        eq: (k, v) => (filters.push((r) => r[k] === v), q),
        not: (k) => (filters.push((r) => r[k] != null), q),
        update: (p) => ((op = 'update'), (payload = p), q),
        delete: () => ((op = 'delete'), q),
        insert: async (rows) => {
          state.inserts += 1;
          if (state.inserts === failInsertAt) return { error: { code: '23502', message: 'null value in column' } };
          state.queue.push(...rows);
          return { error: null };
        },
        maybeSingle: async () => ({ data: table === 'scheduled_messages' ? state.queue.find((r) => filters.every((f) => f(r))) || null : null }),
        then: (resolve) => {
          if (table === 'campaigns' && op === 'update') Object.assign(state.campaign, payload);
          if (table === 'scheduled_messages' && op === 'delete') state.queue = state.queue.filter((r) => !filters.every((f) => f(r)));
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return db;
}

const rows = (n) => Array.from({ length: n }, (_, i) => ({ contact_id: `c${i}`, body: 'Hi', from_number: '+19545550100', scheduled_at: '2026-10-11T17:00:00Z', step_index: 0, delay_minutes: 0 }));
const args = (n) => ({ userId: 'u1', campaignId: 'camp1', rows: rows(n), startsAt: '2026-10-11T17:00:00Z', resume: false, audience: n, previousStatus: 'Draft' });

test('a 2,500-text launch goes through the checked function first, then the rest under the same run', async () => {
  const db = fakeDb();
  const result = await enqueueSequence(db, args(2500));
  assert.equal(result.ok, true);
  assert.equal(db.state.rpcBatch, FIRST_BATCH);
  assert.equal(db.state.queue.length, 2500);
  assert.ok(db.state.queue.every((r) => r.campaign_run_id === 'run-1'));
  assert.equal(result.data.queued, 2500);
  assert.equal(db.state.campaign.audience, 2500);
});

test('a small launch is a single call, unchanged', async () => {
  const db = fakeDb();
  const result = await enqueueSequence(db, args(300));
  assert.equal(result.ok, true);
  assert.equal(db.state.inserts, 0);
  assert.equal(db.state.queue.length, 300);
});

test('a failed batch removes the whole run and restores the campaign', async () => {
  const db = fakeDb({ failInsertAt: 1 });
  const result = await enqueueSequence(db, args(2500));
  assert.equal(result.ok, false);
  assert.match(result.message, /No texts were queued/);
  assert.equal(db.state.queue.length, 0);
  assert.equal(db.state.campaign.status, 'Draft');
});

test('failures say what actually went wrong', async () => {
  const timeout = await enqueueSequence(fakeDb({ rpcError: { code: '57014', message: 'canceling statement due to statement timeout' } }), args(6000));
  assert.match(timeout.message, /6,000 texts took too long/);
  assert.equal(explainEnqueueError({ code: 'P0001', message: 'This campaign already has an active sequence.' }, 10).message, 'This campaign already has an active sequence.');
  assert.match(explainEnqueueError({ code: 'PGRST202', message: 'Could not find the function' }, 10).message, /isn't installed/);
  assert.match(explainEnqueueError({ code: '42703', message: 'column "campaign_run_id" does not exist' }, 10).message, /campaign_run_id/);
  assert.match(explainEnqueueError({ code: 'XX000', message: 'boom' }, 10).message, /XX000: boom/);
});

test('campaigns go out at 200 leads a minute, each lead keeping its own step spacing', () => {
  const seq = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('lib/campaign-sequence.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: seq, Date, Math });
  const start = Date.parse('2026-10-11T17:00:00Z');
  const at = (index) => new Date(seq.waveStart(start, index)).toISOString();
  assert.equal(at(0), '2026-10-11T17:00:00.000Z');
  assert.equal(at(199), '2026-10-11T17:00:00.000Z');
  assert.equal(at(200), '2026-10-11T17:01:00.000Z');
  assert.equal(at(1999), '2026-10-11T17:09:00.000Z');
  const steps = seq.validateSequence([{ message: 'Hi', delayMinutes: 0 }, { message: 'Follow up', delayMinutes: 1440 }]);
  assert.deepEqual(Array.from(seq.sequenceTimes(steps, seq.waveStart(start, 1200))), ['2026-10-11T17:06:00.000Z', '2026-10-12T17:06:00.000Z']);
});
