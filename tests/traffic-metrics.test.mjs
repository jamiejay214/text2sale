import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/traffic-metrics.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { easternMidnight, reportingSince, publicTraffic, uniqueVisitors } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("Eastern today handles UTC date boundaries and daylight saving time", () => {
  assert.equal(easternMidnight(new Date("2026-10-07T02:00:00Z")), "2026-10-06T04:00:00.000Z");
  assert.equal(easternMidnight(new Date("2026-12-10T15:00:00Z")), "2026-12-10T05:00:00.000Z");
});

test("reset excludes pre-Oct-6 traffic while retaining today's visits", () => {
  const base = { path: "/", user_agent: "Mozilla/5.0" };
  const rows = publicTraffic([
    { ...base, created_at: "2026-10-06T03:59:59.000Z", visitor_id: "old" },
    { ...base, created_at: "2026-10-06T04:00:00.000Z", visitor_id: "today" },
    { ...base, created_at: "2026-10-06T05:00:00.000Z", visitor_id: "bot", user_agent: "Googlebot" },
    { ...base, created_at: "2026-10-06T05:00:00.000Z", visitor_id: "owner", path: "/command" },
  ]);
  assert.deepEqual(rows.map(r => r.visitor_id), ["today"]);
  assert.equal(reportingSince("2020-01-01T00:00:00Z"), "2026-10-06T04:00:00.000Z");
});

test("multiple pages and return sessions do not inflate unique visitors", () => {
  const at = "2026-10-06T10:00:00Z";
  assert.equal(uniqueVisitors([
    { created_at: at, visitor_id: "a", session_id: "1" },
    { created_at: at, visitor_id: "a", session_id: "1" },
    { created_at: at, visitor_id: "a", session_id: "2" },
    { created_at: at, visitor_id: "b", session_id: "3" },
  ]), 2);
});
