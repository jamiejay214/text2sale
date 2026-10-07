import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, modules = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name], setTimeout, clearTimeout, ...globals });
  return exports;
}

function authSetup(response) {
  let profileCalls = 0;
  let credentials;
  const auth = load('lib/auth.ts', {
    './supabase': { supabase: { auth: { signInWithPassword: async input => { credentials = input; return response; } } } },
    './supabase-data': { fetchProfile: () => { profileCalls++; return new Promise(() => {}); } },
    './request-timeout': {},
  });
  return { auth, profileCalls: () => profileCalls, credentials: () => credentials };
}

test('successful password auth does not wait for database/profile loading', async () => {
  const s = authSetup({ data: { user: { id: 'owner' }, session: {} }, error: null });
  const result = await s.auth.loginUser(' Owner@Example.com ', 'private-test-value');
  assert.equal(result.success, true);
  assert.equal(result.user.id, 'owner');
  assert.equal(s.profileCalls(), 0);
  assert.equal(s.credentials().email, 'owner@example.com');
});

test('invalid credentials remain a failure and never load profile', async () => {
  const s = authSetup({ data: { user: null }, error: { message: 'Invalid login credentials' } });
  assert.equal((await s.auth.loginUser('a@example.test', 'bad')).success, false);
  assert.equal(s.profileCalls(), 0);
});

function adminSetup({ session = true, verified = true, owner = true, role = 'admin', paused = false, failProfile = false, authError = null } = {}) {
  let profileCalls = 0;
  let verifiedToken;
  const access = load('lib/admin-access.ts', {
    './auth': { getSession: async () => session ? { access_token: 'test-token' } : null },
    './supabase': { supabase: { auth: { getUser: async token => {
      verifiedToken = token;
      return { data: { user: { id: 'verified-id', email: owner ? 'owner@example.test' : 'other@example.test', email_confirmed_at: verified ? 'yes' : null } }, error: authError };
    } } } },
    './owner': { isOwnerEmail: email => email === 'owner@example.test' },
    './supabase-data': { fetchProfile: async (id, options) => {
      profileCalls++;
      assert.equal(id, 'verified-id');
      assert.equal(options.throwOnError, true);
      if (failProfile) throw new Error('Profile unavailable');
      return { role, paused };
    } },
  });
  return { ...access, profileCalls: () => profileCalls, verifiedToken: () => verifiedToken };
}

test('signed-out /admin shows sign-in without loading account data', async () => {
  const s = adminSetup({ session: false });
  assert.equal(await s.checkAdminAccess(), 'signed-out');
  assert.equal(s.profileCalls(), 0);
});
for (const [name, input] of [
  ['non-owner', { owner: false }], ['unverified owner', { verified: false }],
  ['non-admin owner', { role: 'user' }], ['paused owner', { paused: true }],
]) test(`${name} cannot enter admin`, async () => {
  assert.equal(await adminSetup(input).checkAdminAccess(), 'denied');
});
test('verified active owner with admin role is admitted', async () => {
  const s = adminSetup();
  assert.equal(await s.checkAdminAccess(), 'authorized');
  assert.equal(s.verifiedToken(), 'test-token');
});
test('profile outage produces a retryable error, never authorization', async () => {
  await assert.rejects(adminSetup({ failProfile: true }).checkAdminAccess(), /unavailable/);
});
test('auth service outage is retryable; expired sessions return sign-in', async () => {
  await assert.rejects(adminSetup({ authError: { status: 503 } }).checkAdminAccess(), /verify/);
  assert.equal(await adminSetup({ authError: { status: 401 } }).checkAdminAccess(), 'signed-out');
});

test('transport timeout aborts stalled auth requests and preserves caller cancellation', async () => {
  const deadlines = [];
  let lastSignal;
  const transport = load('lib/request-timeout.ts', {}, {
    URL, Request,
    AbortSignal: { any: AbortSignal.any.bind(AbortSignal), timeout: ms => {
      assert.equal(ms, 20_000);
      const controller = new AbortController(); deadlines.push(controller); return controller.signal;
    } },
    fetch: (_url, { signal }) => {
      lastSignal = signal;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    },
  });
  const request = transport.boundedFetch('https://example.test/auth/v1/token');
  deadlines[0].abort(new Error('deadline'));
  await assert.rejects(request, /deadline/);
  assert.equal(lastSignal.aborted, true);
  const caller = new AbortController();
  const database = transport.boundedFetch('https://example.test/rest/v1/profiles', { signal: caller.signal });
  caller.abort(new Error('cancelled'));
  await assert.rejects(database, /cancelled/);
});
test('storage uploads retain their original request options', async () => {
  const options = { method: 'POST' };
  const transport = load('lib/request-timeout.ts', {}, {
    URL, Request, AbortSignal,
    fetch: async (_url, init) => { assert.equal(init, options); return 'uploaded'; },
  });
  assert.equal(await transport.boundedFetch('https://example.test/storage/v1/object/file', options), 'uploaded');
});
test('session read deadline clears its timer after success and failure', async () => {
  let callback, cleared = 0;
  const transport = load('lib/request-timeout.ts', {}, {
    setTimeout: fn => { callback = fn; return 123; },
    clearTimeout: id => { assert.equal(id, 123); cleared++; },
  });
  assert.equal(await transport.waitForSession(Promise.resolve('session')), 'session');
  assert.equal(cleared, 1);
  const stalled = transport.waitForSession(new Promise(() => {}));
  callback();
  await assert.rejects(stalled, /session could not be loaded/);
  assert.equal(cleared, 2);
});
