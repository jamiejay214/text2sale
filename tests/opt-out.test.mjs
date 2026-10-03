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
    firstMessageText: "Text N to opt out.",
  };
  assert.equal(
    exports.withFirstMessageOptOut("Hi Jamie, are you still looking?", settings),
    "Hi Jamie, are you still looking?\nText N to opt out.",
  );
  assert.equal(
    exports.withFirstMessageOptOut(
      "Hi Jamie. Reply STOP to opt out.",
      settings,
    ),
    "Hi Jamie. Reply STOP to opt out.",
  );
  assert.equal(
    exports.hasOptOutInstruction("Text N to opt out.", ["N"]),
    true,
  );
  assert.throws(
    () =>
      exports.withFirstMessageOptOut("Hi Jamie", {
        keywords: ["STOP"],
        firstMessageText: "No thanks",
      }),
    /clear first-message opt-out/,
  );
});

test("carrier-required opt-out keywords cannot be removed", () => {
  const keywords = Array.from(exports.normalizeOptOutKeywords(["N"]));
  for (const required of ["STOP", "END", "QUIT", "CANCEL", "UNSUBSCRIBE"])
    assert.equal(keywords.includes(required), true);
  assert.equal(keywords.includes("N"), true);
});
