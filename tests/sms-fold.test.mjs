import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Load lib/sms-text.ts (self-contained, no imports) and expose foldToGsm.
const exports = {};
const code = ts.transpileModule(
  readFileSync(new URL("../lib/sms-text.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(code, { exports, console: { log() {}, error() {} } });
const { foldToGsm, hasNonGsmChars } = exports;

test("foldToGsm strips the replacement char from a bad-encoding CSV name", () => {
  // "Ren��e" is how "Renée" arrives from a non-UTF-8 upload.
  const merged = "Hi Ren��e it's Lorraine.";
  const out = foldToGsm(merged);
  assert.equal(hasNonGsmChars(out), false);
  assert.equal(out, "Hi Rene it's Lorraine.");
});

test("foldToGsm transliterates accented names to ASCII", () => {
  assert.equal(foldToGsm("Hi José"), "Hi Jose");
  assert.equal(foldToGsm("Hi Renée"), "Hi Renee");
  assert.equal(foldToGsm("Hi Núñez"), "Hi Nunez");
  assert.equal(foldToGsm("Hi François"), "Hi Francois");
});

test("foldToGsm drops emoji but keeps the rest", () => {
  const out = foldToGsm("Thanks 🙏 for your time");
  assert.equal(hasNonGsmChars(out), false);
  assert.match(out, /Thanks\s+for your time/);
});

test("foldToGsm still normalizes curly quotes and dashes (sanitizeForSms behavior)", () => {
  assert.equal(foldToGsm("it’s a test — really"), "it's a test - really");
});

test("foldToGsm leaves plain GSM text untouched", () => {
  const plain = "Hi Michael, reply STOP to opt out.";
  assert.equal(foldToGsm(plain), plain);
});
