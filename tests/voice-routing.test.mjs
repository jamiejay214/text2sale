import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('lib/telnyx-voice.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const HOOK = 'https://text2sale.com/api/call-webhook';
const clone = (v) => JSON.parse(JSON.stringify(v));

// A small in-memory Telnyx: the credential connection, Voice API apps and
// phone numbers, answering the requests lib/telnyx-voice.ts makes.
function telnyx(state, fail = () => false) {
  const calls = [];
  const res = (data, status = 200) => ({ ok: status < 300, status, json: data === undefined ? {} : { data: clone(data) } });
  const request = async (path, init = {}) => {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    if (fail(method, path)) return { ok: false, status: 500, json: {} };
    let m;
    if ((m = path.match(/^\/v2\/credential_connections\/([^/?]+)$/))) {
      if (!state.connection || decodeURIComponent(m[1]) !== state.connection.id) return res(undefined, 404);
      if (method === 'PATCH') Object.assign(state.connection, body);
      return res(state.connection);
    }
    if (path.startsWith('/v2/call_control_applications?')) return res(state.apps);
    if (path === '/v2/call_control_applications' && method === 'POST') {
      const app = { id: `app-${state.apps.length + 1}`, ...body };
      state.apps.push(app);
      return res(app, 201);
    }
    if ((m = path.match(/^\/v2\/call_control_applications\/([^/?]+)$/))) {
      const app = state.apps.find((a) => a.id === decodeURIComponent(m[1]));
      if (!app) return res(undefined, 404);
      if (method === 'PATCH') Object.assign(app, body);
      return res(app);
    }
    if ((m = path.match(/^\/v2\/phone_numbers\?filter\[phone_number\]=(.+)$/))) {
      return res(state.numbers.filter((n) => n.phone_number === decodeURIComponent(m[1])));
    }
    if ((m = path.match(/^\/v2\/phone_numbers\/([^/?]+)$/)) && method === 'PATCH') {
      const number = state.numbers.find((n) => n.id === m[1]);
      Object.assign(number, body);
      return res(number);
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { calls, request };
}

function load(state, env = {}, fail) {
  const api = telnyx(state, fail);
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, encodeURIComponent, decodeURIComponent, Date,
    console: { warn() {}, error() {} },
    process: { env: { TELNYX_CREDENTIAL_CONNECTION_ID: 'cred', ...env } },
    require: () => ({ telnyxRequest: api.request }),
  });
  return { ...exports, calls: api.calls, state };
}

const PROD = { VERCEL_ENV: 'production' };
const connection = (extra = {}) => ({ id: 'cred', encrypted_media: null, sip_uri_calling_preference: 'internal', webhook_event_url: HOOK, webhook_api_version: '2', outbound: { outbound_voice_profile_id: 'ovp1' }, ...extra });
const number = (connection_id, phone_number = '+19545550101') => ({ id: `n${phone_number.slice(-4)}`, phone_number, connection_id });
const patches = (calls, prefix) => calls.filter((c) => c.method === 'PATCH' && c.path.startsWith(prefix));

test('production creates the inbound calling app and moves the number onto it', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [number('cred')] }, PROD);
  assert.deepEqual(clone(await t.ensureVoiceRouting('+19545550101')), { ok: true, inbound: true });
  const [app] = t.state.apps;
  assert.equal(app.application_name, 'Text2Sale inbound calls');
  assert.equal(app.webhook_event_url, HOOK);
  assert.equal(app.webhook_api_version, '2');
  assert.equal(app.outbound.outbound_voice_profile_id, 'ovp1', 'forwarding to a cell needs an outbound voice profile');
  assert.equal(app.anchorsite_override, 'Ashburn, VA', 'audio must not be routed by a ping to Vercel\'s worldwide edge');
  assert.equal(t.state.numbers[0].connection_id, app.id);
});

test('an existing app and a number already on it need no changes', async () => {
  const app = { id: 'app9', application_name: 'Text2Sale inbound calls', webhook_event_url: HOOK, webhook_api_version: '2', anchorsite_override: 'Ashburn, VA', outbound: { outbound_voice_profile_id: 'ovp1' } };
  const t = load({ connection: connection(), apps: [app], numbers: [number('app9')] }, PROD);
  assert.deepEqual(clone(await t.ensureVoiceRouting('+19545550101')), { ok: true, inbound: true });
  assert.equal(t.calls.filter((c) => c.method !== 'GET').length, 0);
});

test('production repairs the app: webhook, API version, outbound profile, active', async () => {
  const app = { id: 'app9', application_name: 'Text2Sale inbound calls', webhook_event_url: 'https://www.text2sale.com/api/call-webhook', webhook_api_version: '1', active: false, outbound: {} };
  const t = load({ connection: connection(), apps: [app], numbers: [number('app9')] }, PROD);
  await t.ensureVoiceRouting('+19545550101');
  assert.equal(app.webhook_event_url, HOOK);
  assert.equal(app.webhook_api_version, '2');
  assert.equal(app.active, true);
  assert.equal(app.anchorsite_override, 'Ashburn, VA');
  assert.equal(app.outbound.outbound_voice_profile_id, 'ovp1');
});

test('the audio site can be chosen per deployment', async () => {
  const app = { id: 'app9', application_name: 'Text2Sale inbound calls', webhook_event_url: HOOK, webhook_api_version: '2', anchorsite_override: 'Latency' };
  const t = load({ connection: connection(), apps: [app], numbers: [number('app9')] }, { ...PROD, TELNYX_ANCHORSITE: 'Chicago, IL' });
  await t.ensureVoiceRouting('+19545550101');
  assert.equal(app.anchorsite_override, 'Chicago, IL');
});

test('TELNYX_VOICE_APP_ID is used when it reports here, skipped when it belongs to something else', async () => {
  const ours = { id: 'cfg', application_name: 'Old voice app', webhook_event_url: HOOK, webhook_api_version: '2', outbound: { outbound_voice_profile_id: 'ovp1' } };
  const t = load({ connection: connection(), apps: [ours], numbers: [number('cred')] }, { ...PROD, TELNYX_VOICE_APP_ID: 'cfg' });
  await t.ensureVoiceRouting('+19545550101');
  assert.equal(t.state.numbers[0].connection_id, 'cfg');

  const foreign = { id: 'cfg', application_name: 'Other product', webhook_event_url: 'https://elsewhere.example/hook', webhook_api_version: '2' };
  const u = load({ connection: connection(), apps: [foreign], numbers: [number('cred')] }, { ...PROD, TELNYX_VOICE_APP_ID: 'cfg' });
  await u.ensureVoiceRouting('+19545550101');
  assert.equal(foreign.webhook_event_url, 'https://elsewhere.example/hook', 'never repoints another system\'s app');
  const created = u.state.apps.find((a) => a.application_name === 'Text2Sale inbound calls');
  assert.ok(created);
  assert.equal(u.state.numbers[0].connection_id, created.id);
});

test('previews never create the app; routed numbers stay put, unassigned ones get the calling connection', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [number('cred'), number('', '+19545550102')] }, { VERCEL_ENV: 'preview' });
  const routed = clone(await t.ensureVoiceRouting('+19545550101'));
  assert.equal(routed.ok, true);
  assert.equal(routed.inbound, false);
  assert.equal(t.state.apps.length, 0);
  assert.equal(t.state.numbers[0].connection_id, 'cred');
  assert.deepEqual(clone(await t.ensureVoiceRouting('+19545550102')), { ok: true, inbound: false });
  assert.equal(t.state.numbers[1].connection_id, 'cred');
});

test('a Telnyx outage never moves a number off working routing', async () => {
  const app = { id: 'app9', application_name: 'Text2Sale inbound calls', webhook_event_url: HOOK, webhook_api_version: '2' };
  const t = load({ connection: connection(), apps: [app], numbers: [number('app9')] }, PROD, (method, path) => path.startsWith('/v2/call_control_applications'));
  const result = clone(await t.ensureVoiceRouting('+19545550101'));
  assert.equal(result.ok, true);
  assert.equal(result.inbound, false);
  assert.equal(patches(t.calls, '/v2/phone_numbers').length, 0);
  assert.equal(t.state.numbers[0].connection_id, 'app9');
});

test('invalid numbers, missing numbers and failed moves are reported', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [] }, PROD);
  assert.equal((await t.ensureVoiceRouting('bad')).ok, false);
  assert.equal(t.calls.length, 0);
  const missing = await t.ensureVoiceRouting('+19545550101');
  assert.equal(missing.ok, false);
  assert.ok(missing.error);
  const u = load({ connection: connection(), apps: [], numbers: [number('cred')] }, PROD, (method, path) => method === 'PATCH' && path.startsWith('/v2/phone_numbers'));
  const failed = await u.ensureVoiceRouting('+19545550101');
  assert.equal(failed.ok, false);
  assert.ok(failed.error);
});

test('browser connection: SRTP off (488) and SIP URI calling on so calls can ring the browser', async () => {
  const t = load({ connection: connection({ encrypted_media: 'SRTP', sip_uri_calling_preference: 'disabled' }), apps: [], numbers: [] });
  assert.equal((await t.ensureWebrtcMedia()).ok, true);
  assert.equal(t.state.connection.encrypted_media, null);
  assert.equal(t.state.connection.sip_uri_calling_preference, 'internal');
});

test('browser connection: a correct connection is left alone; failures are reported', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [] }, PROD);
  assert.equal((await t.ensureWebrtcMedia()).ok, true);
  assert.equal(patches(t.calls, '/v2/credential_connections').length, 0);
  const missing = load({ connection: connection(), apps: [], numbers: [] }, { TELNYX_CREDENTIAL_CONNECTION_ID: '' });
  assert.equal((await missing.ensureWebrtcMedia()).ok, false);
  const down = load({ connection: connection(), apps: [], numbers: [] }, PROD, () => true);
  assert.equal((await down.ensureWebrtcMedia()).ok, false);
  const stuck = load({ connection: connection({ encrypted_media: 'SRTP' }), apps: [], numbers: [] }, PROD, (method) => method === 'PATCH');
  const r = await stuck.ensureWebrtcMedia();
  assert.equal(r.ok, false);
  assert.ok(r.error);
});

test('browser connection webhook: production fills an empty or stale one, never a foreign one; previews never touch it', async () => {
  const empty = load({ connection: connection({ webhook_event_url: '', webhook_api_version: '1' }), apps: [], numbers: [] }, PROD);
  await empty.ensureWebrtcMedia();
  assert.equal(empty.state.connection.webhook_event_url, HOOK);
  assert.equal(empty.state.connection.webhook_api_version, '2');
  const stale = load({ connection: connection({ webhook_event_url: 'https://www.text2sale.com/api/call-webhook' }), apps: [], numbers: [] }, PROD);
  await stale.ensureWebrtcMedia();
  assert.equal(stale.state.connection.webhook_event_url, HOOK);
  const foreign = load({ connection: connection({ webhook_event_url: 'https://elsewhere.example/hook' }), apps: [], numbers: [] }, PROD);
  await foreign.ensureWebrtcMedia();
  assert.equal(foreign.state.connection.webhook_event_url, 'https://elsewhere.example/hook');
  const preview = load({ connection: connection({ webhook_event_url: '' }), apps: [], numbers: [] }, { VERCEL_ENV: 'preview' });
  await preview.ensureWebrtcMedia();
  assert.equal(preview.state.connection.webhook_event_url, '');
});

test('stale app webhooks: old addresses of this app only', () => {
  const { isStaleAppWebhook } = load({ connection: connection(), apps: [], numbers: [] });
  for (const url of ['https://www.text2sale.com/api/call-webhook', 'http://text2sale.com/api/call-webhook', 'https://text2sale-abc.vercel.app/api/call-webhook/']) assert.equal(isStaleAppWebhook(url), true, url);
  for (const url of [HOOK, 'https://elsewhere.example/api/call-webhook', 'https://text2sale.com/api/other', 'not a url']) assert.equal(isStaleAppWebhook(url), false, url);
});

test('inbound voice check connects every number once and reports the app webhook', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [number('cred'), number('other', '+19545550102')] }, PROD);
  const r = clone(await t.ensureInboundVoice(['9545550101', '(954) 555-0101', '+19545550102', '+13055550111', 'bad']));
  assert.equal(r.webhook, true);
  assert.deepEqual(r.numbers.map((n) => [n.number, n.ok]), [['+19545550101', true], ['+19545550102', true], ['+13055550111', false]]);
  assert.ok(t.state.numbers.every((n) => n.connection_id === t.state.apps[0].id));
});

test('inbound voice check reports why when the app cannot be set up', async () => {
  const t = load({ connection: connection(), apps: [], numbers: [number('cred')] }, { VERCEL_ENV: 'preview' });
  const r = clone(await t.ensureInboundVoice(['9545550101']));
  assert.equal(r.webhook, false);
  assert.ok(r.error);
  assert.equal(r.numbers[0].ok, false);
});
