import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/opt-out.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });

test("first campaign message gets one opt-out and follow-up text remains unchanged", () => {
  const settings = {
    keywords: ["STOP", "N"],
    firstMessageText: "N",
  };
  assert.equal(
    exports.withFirstMessageOptOut("Hi Jamie, are you still looking?", settings),
    "Hi Jamie, are you still looking? N",
  );
  assert.equal(
    exports.withFirstMessageOptOut(
      "Hi Jamie, are you still looking? N",
      settings,
    ),
    "Hi Jamie, are you still looking? N",
  );
  assert.equal(
    exports.hasOptOutInstruction("Text N to opt out.", ["N"]),
    true,
  );
  assert.equal(
    exports.withFirstMessageOptOut("Hi Jamie", {
      keywords: ["STOP"],
      firstMessageText: "Reply STOP to opt out.",
    }),
    "Hi Jamie N",
  );
});

test("carrier-required opt-out keywords cannot be removed", () => {
  const keywords = Array.from(exports.normalizeOptOutKeywords(["N"]));
  for (const required of ["STOP", "END", "QUIT", "CANCEL", "UNSUBSCRIBE"])
    assert.equal(keywords.includes(required), true);
  assert.equal(keywords.includes("N"), true);
});
