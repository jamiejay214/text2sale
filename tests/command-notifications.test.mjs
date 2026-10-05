import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema private; create schema auth; create schema vault; create schema net; create schema cron;
    grant usage on schema public, auth to authenticated, anon;
    create function auth.jwt() returns jsonb language sql as
      'select coalesce(nullif(current_setting(''request.jwt.claims'',true),''''),''{}'')::jsonb';
    create table vault.decrypted_secrets(name text, decrypted_secret text);
    insert into vault.decrypted_secrets values ('command_push_secret','test-only-secret');
    create table net.requests(id bigserial primary key, url text, body jsonb, headers jsonb);
    create table net._http_response(id bigint, status_code int, content text);
    create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds int)
      returns bigint language sql as
      'insert into net.requests(url,body,headers) values ($1,$2,$3) returning id';
    create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
    create table public.profiles(id uuid primary key default gen_random_uuid(),email text,first_name text,last_name text);
    create table public.page_views(id uuid primary key default gen_random_uuid(),is_entry boolean,
      user_agent text,path text,city text,region text,country text,session_id text,visitor_id text);
  `);
  await db.exec(readFileSync(new URL("../supabase/migrations/20261005130244_command_center_notifications.sql", import.meta.url), "utf8"));
});
after(async () => { await db?.close(); });

async function transaction(run) {
  await db.exec("begin");
  try { await run(); } finally { await db.exec("rollback"); }
}
async function visit({ session = "session-1", visitor = "visitor-1", entry = true, path = "/pricing", agent = "Mozilla/5.0" } = {}) {
  await db.query("insert into public.page_views(is_entry,path,user_agent,session_id,visitor_id,city,region,country) values ($1,$2,$3,$4,$5,'Miami','FL','US')", [entry,path,agent,session,visitor]);
}
async function rows() { return (await db.query("select * from public.command_notifications order by created_at,id")).rows; }

test("one push per session entry, no repeat on navigation, new alert on a return visit", () => transaction(async () => {
  await visit();
  await visit({ entry: false, path: "/blog" });
  await visit();
  assert.equal((await rows()).length, 1);
  assert.equal((await db.query("select count(*)::int as n from net.requests")).rows[0].n, 1);
  await visit({ session: "return-session" });
  assert.equal((await rows()).length, 2);
}));

test("known bots and internal pages do not alert", () => transaction(async () => {
  for (const path of ["/dashboard", "/admin/users", "/api/test", "/command?biz=text2sale", "/biz/customer"]) {
    await visit({ path, session: path });
  }
  for (const agent of ["Googlebot", "HeadlessChrome", "UptimeRobot", "curl/8"]) {
    await visit({ agent, session: agent });
  }
  assert.equal((await rows()).length, 0);
}));

test("visitor payload omits URL query values and bounds external identifiers", () => transaction(async () => {
  await visit({ session: "s".repeat(10000), path: "/?email=private@example.com" });
  const [item] = await rows();
  assert.equal(item.body, "Miami, FL, US · /");
  assert.ok(item.event_key.length < 100);
  const payload = (await db.query("select body from net.requests")).rows[0].body;
  assert.equal(payload.url, "/command?biz=text2sale");
  assert.ok(payload.tag.startsWith("command-"));
}));

test("real profile insert creates a signup notification; updates and owner account do not", () => transaction(async () => {
  await db.exec("insert into public.profiles(email,first_name,last_name) values ('test@example.com','Test','Account')");
  await db.exec("update public.profiles set first_name='Updated'");
  await db.exec("insert into public.profiles(email) values ('johnsonhealthquotes@gmail.com')");
  const items = await rows();
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "signup");
  assert.equal(items[0].body, "Test Account · test@example.com");
}));

test("a rolled back event leaves no notification or push request", async () => {
  await transaction(async () => { await visit(); assert.equal((await rows()).length, 1); });
  assert.equal((await rows()).length, 0);
  assert.equal((await db.query("select count(*)::int as n from net.requests")).rows[0].n, 0);
});

test("push acceptance is recorded and the worker does not resend successful events", () => transaction(async () => {
  await visit();
  const [item] = await rows();
  await db.query("insert into net._http_response values ($1,200,$2)", [item.push_request_id, '{"sent":1,"total":1}']);
  await db.exec("update public.command_notifications set push_next_attempt_at=now()");
  await db.exec("select private.dispatch_command_notifications()");
  assert.equal((await rows())[0].push_status, "sent");
  await db.exec("select private.dispatch_command_notifications()");
  assert.equal((await db.query("select count(*)::int as n from net.requests")).rows[0].n, 1);
}));

test("failed delivery retries and stops after five attempts", () => transaction(async () => {
  await visit();
  let [item] = await rows();
  await db.query("insert into net._http_response values ($1,503,$2)", [item.push_request_id, 'unavailable']);
  await db.exec("update public.command_notifications set push_next_attempt_at=now()");
  await db.exec("select private.dispatch_command_notifications()");
  [item] = await rows();
  assert.equal(item.push_attempts, 2);
  await db.query("insert into net._http_response values ($1,200,$2)", [item.push_request_id, '{"sent":0}']);
  await db.exec("update public.command_notifications set push_attempts=5,push_next_attempt_at=now()");
  await db.exec("select private.dispatch_command_notifications()");
  assert.equal((await rows())[0].push_status, "failed");
}));

test("missing delivery configuration preserves the event for later dispatch", () => transaction(async () => {
  await db.exec("delete from vault.decrypted_secrets");
  await visit();
  assert.equal((await rows())[0].push_status, "pending");
  await db.exec("insert into vault.decrypted_secrets values ('command_push_secret','test-only-secret')");
  await db.exec("select private.dispatch_command_notifications()");
  assert.equal((await rows())[0].push_status, "queued");
}));

test("only the owner can read notifications through authenticated RLS", () => transaction(async () => {
  await visit();
  await db.exec(`set local role authenticated; set local "request.jwt.claims"='{"email":"another@example.com"}'`);
  assert.equal((await rows()).length, 0);
  await db.exec(`set local "request.jwt.claims"='{"email":"johnsonhealthquotes@gmail.com"}'`);
  assert.equal((await rows()).length, 1);
}));

test("clients cannot invoke delivery or mutate notification records directly", () => transaction(async () => {
  const permissions = (await db.query(`select
    has_function_privilege('authenticated','private.dispatch_command_notifications()','EXECUTE') as dispatch,
    has_table_privilege('anon','public.command_notifications','SELECT') as anon_read,
    has_table_privilege('authenticated','public.command_notifications','INSERT') as insert,
    has_table_privilege('authenticated','public.command_notifications','UPDATE') as update`)).rows[0];
  assert.deepEqual(permissions, { dispatch: false, anon_read: false, insert: false, update: false });
}));
