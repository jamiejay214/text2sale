import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('lib/ai-call.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load(fetchImpl = async () => ({ ok: true, text: async () => '' })) {
  const exports = {};
  vm.runInNewContext(source, {
    exports, fetch: fetchImpl, JSON, console: { error() {} }, process: { env: {} }, Date,
    require: () => ({ formatDateNice: (d) => d, formatTime12: (t) => t }),
  });
  return exports;
}

test('old Kokoro voices and unknown voices fall back to the HD default', () => {
  const { voiceOrDefault, DEFAULT_VOICE, settingsFromProfile } = load();
  assert.match(DEFAULT_VOICE, /DragonHD/);
  for (const old of ['Telnyx.KokoroTTS.af', 'Telnyx.KokoroTTS.af_heart', '', null, undefined]) assert.equal(voiceOrDefault(old), DEFAULT_VOICE);
  assert.equal(voiceOrDefault('AWS.Polly.Matthew-Neural'), 'AWS.Polly.Matthew-Neural');
  assert.equal(settingsFromProfile({ ai_call_voice: 'Telnyx.KokoroTTS.af' }).voice, DEFAULT_VOICE);
});

test('speak retries with the fallback voice when Telnyx refuses the chosen one', async () => {
  const voices = [];
  const { speak, FALLBACK_VOICE } = load(async (url, init) => {
    const body = JSON.parse(init.body);
    voices.push(body.voice);
    return { ok: body.voice === FALLBACK_VOICE, status: 422, text: async () => 'bad voice' };
  });
  assert.equal(await speak('cc1', 'Hi **there**', 'Azure.en-US-Andrew:DragonHDLatestNeural', 'state'), true);
  assert.deepEqual(voices, ['Azure.en-US-Andrew:DragonHDLatestNeural', FALLBACK_VOICE]);
});

test('speak sends one request when the voice works, and reports a total failure', async () => {
  let calls = 0;
  const ok = load(async () => (calls++, { ok: true, text: async () => '' }));
  assert.equal(await ok.speak('cc1', 'Hello', 'AWS.Polly.Matthew-Neural', 's'), true);
  assert.equal(calls, 1);
  const down = load(async () => ({ ok: false, status: 500, text: async () => '' }));
  assert.equal(await down.speak('cc1', 'Hello', 'AWS.Polly.Matthew-Neural', 's'), false);
});
