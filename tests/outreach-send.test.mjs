import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Load lib/outreach.ts with stubbed imports: Telnyx send is recorded, not sent.
function load(sent) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL("../lib/outreach.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const stubs = {
    "@/lib/telnyx-email": { sendEmail: async (args) => { sent.push(args); return `msg-${sent.length}`; } },
    "@/lib/email-campaigns": { unsubscribeUrl: (u, e) => `https://text2sale.com/api/email/unsubscribe?t=${u}:${e}` },
    "@/lib/email-content": { normalizeEmail: (raw) => { const e = String(raw || "").trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) ? e : null; } },
  };
  vm.runInNewContext(code, { exports, require: (m) => stubs[m], process: { env: {} }, console });
  return exports;
}

// Minimal in-memory stand-in for the Supabase query builder used by processOutreach.
function fakeDb(tables) {
  return {
    from(name) {
      const rows = tables[name] || (tables[name] = []);
      const filters = [];
      let patch = null, head = false, limit = Infinity, selected = false;
      const match = (r) => filters.every((f) => f(r));
      const q = {
        select(_c, opts) { selected = true; if (opts?.head) head = true; return q; },
        update(p) { patch = p; return q; },
        eq(k, v) { filters.push((r) => r[k] === v); return q; },
        in(k, vs) { filters.push((r) => vs.includes(r[k])); return q; },
        lte(k, v) { filters.push((r) => r[k] <= v); return q; },
        gte(k, v) { filters.push((r) => r[k] != null && r[k] >= v); return q; },
        order() { return q; },
        limit(n) { limit = n; return q; },
        maybeSingle() { return Promise.resolve({ data: rows.find(match) || null }); },
        then(resolve) {
          const hit = rows.filter(match);
          if (patch) { hit.forEach((r) => Object.assign(r, patch)); return resolve({ data: selected ? hit.map((r) => ({ id: r.id })) : null }); }
          if (head) return resolve({ count: hit.length });
          return resolve({ data: hit.slice(0, limit) });
        },
      };
      return q;
    },
  };
}

const USER = "owner-1";
const sender = { user_id: USER, from_local: "no-reply", domain: "news.text2sale.com", from_name: "Text2Sale", reply_to: "support@text2sale.com", status: "verified" };
const row = (id, email, extra = {}) => ({ id, user_id: USER, to_email: email, subject: "Quick idea for Acme", html: "<div><p>Hi</p></div>", text_body: "Hi", status: "queued", send_after: "2026-11-14T00:00:00.000Z", ...extra });
const NOW = new Date("2026-11-14T14:00:00.000Z");

test("sends due outreach through the verified sender with reply-to and unsubscribe", async () => {
  const sent = [];
  const { processOutreach } = load(sent);
  const tables = { email_senders: [sender], email_suppressions: [], outreach_emails: [row("a", "Owner@Acme.com")] };
  const result = await processOutreach(fakeDb(tables), NOW);
  assert.deepEqual({ ...result }, { sent: 1, failed: 0, skipped: 0 });
  assert.equal(sent[0].from, "no-reply@news.text2sale.com");
  assert.equal(sent[0].replyTo, "support@text2sale.com");
  assert.equal(sent[0].to, "owner@acme.com");
  assert.equal(sent[0].tag, "outreach");
  assert.match(sent[0].html, /Unsubscribe<\/a><\/p><\/div>$/);
  assert.match(sent[0].text, /Unsubscribe: https:/);
  assert.equal(tables.outreach_emails[0].status, "sent");
});

test("skips unsubscribed addresses and leaves future rows queued", async () => {
  const sent = [];
  const { processOutreach } = load(sent);
  const tables = {
    email_senders: [sender],
    email_suppressions: [{ user_id: USER, email: "gone@acme.com" }],
    outreach_emails: [row("a", "gone@acme.com"), row("b", "later@acme.com", { send_after: "2026-11-15T00:00:00.000Z" })],
  };
  const result = await processOutreach(fakeDb(tables), NOW);
  assert.deepEqual({ ...result }, { sent: 0, failed: 0, skipped: 1 });
  assert.equal(tables.outreach_emails[0].status, "skipped");
  assert.equal(tables.outreach_emails[1].status, "queued");
  assert.equal(sent.length, 0);
});

test("stops at the daily cap and never resends a row another run claimed", async () => {
  const sent = [];
  const { processOutreach, DAILY_CAP } = load(sent);
  const already = Array.from({ length: DAILY_CAP - 1 }, (_, i) => row(`s${i}`, `s${i}@x.com`, { status: "sent", sent_at: "2026-11-14T10:00:00.000Z" }));
  const tables = {
    email_senders: [sender],
    email_suppressions: [],
    outreach_emails: [...already, row("claimed", "busy@acme.com", { status: "sending", sent_at: NOW.toISOString() }), row("a", "a@acme.com"), row("b", "b@acme.com")],
  };
  const result = await processOutreach(fakeDb(tables), NOW);
  // DAILY_CAP - 1 sent + 1 in flight = cap reached: nothing more goes out today.
  assert.equal(result.sent, 0);
  assert.equal(sent.length, 0);
  assert.equal(tables.outreach_emails.find((r) => r.id === "a").status, "queued");
});

test("does nothing until the sender is verified", async () => {
  const sent = [];
  const { processOutreach } = load(sent);
  const tables = { email_senders: [{ ...sender, status: "pending" }], email_suppressions: [], outreach_emails: [row("a", "a@acme.com")] };
  assert.deepEqual({ ...(await processOutreach(fakeDb(tables), NOW)) }, { sent: 0, failed: 0, skipped: 0 });
  assert.equal(tables.outreach_emails[0].status, "queued");
});
