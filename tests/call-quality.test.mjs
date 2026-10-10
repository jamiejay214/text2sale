import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/call-quality.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Number, Math, String, parseFloat });
const { summarizeCallQuality } = exports;
const plain = (v) => JSON.parse(JSON.stringify(v));

test("summarizes Telnyx's own example: MOS 4.5 but 1.5% of the caller's audio lost is only fair", () => {
  const q = plain(summarizeCallQuality({
    inbound: { jitter_max_variance: '2.74', jitter_packet_count: '0', mos: '4.50', packet_count: '591', skip_packet_count: '9' },
    outbound: { packet_count: '0', skip_packet_count: '0' },
  }));
  assert.deepEqual(q, { mos: 4.5, inboundLossPct: 1.5, jitterMs: 2.74, outboundLossPct: null, rating: 'fair' });
});

test('clean audio is good; heavy loss or a low MOS is poor', () => {
  assert.equal(summarizeCallQuality({ inbound: { mos: '4.4', packet_count: '1000', skip_packet_count: '0' }, outbound: { packet_count: '900', skip_packet_count: '0' } }).rating, 'good');
  assert.equal(summarizeCallQuality({ inbound: { mos: '4.4', packet_count: '1000', skip_packet_count: '0' }, outbound: { packet_count: '900', skip_packet_count: '60' } }).rating, 'poor');
  assert.equal(summarizeCallQuality({ inbound: { mos: '3.2', packet_count: '1000', skip_packet_count: '0' } }).rating, 'poor');
  assert.equal(summarizeCallQuality({ inbound: { mos: '3.8' } }).rating, 'fair');
});

test('nothing to report gives null', () => {
  for (const stats of [null, undefined, 'x', {}, { inbound: {}, outbound: {} }, { outbound: { packet_count: '0', skip_packet_count: '0' } }]) {
    assert.equal(summarizeCallQuality(stats), null);
  }
});
