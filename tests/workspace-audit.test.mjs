import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/workspace-input.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const helpers = {};
vm.runInNewContext(compiled, { exports: helpers });
test("spreadsheet phone values preserve digits and reject ambiguous numbers", () => {
  for (const value of ["9545551234.0", "9.545551234e9", "+1 (954) 555-1234"])
    assert.equal(helpers.normalizeImportPhone(value), "9545551234");
  for (const value of ["954555123400", "555", "not a phone", "+44 7700 900123"])
    assert.equal(helpers.normalizeImportPhone(value), "");
  assert.equal(helpers.importSuppressed("STOP"), true);
  assert.equal(helpers.importSuppressed("false"), false);
});
test("delay quantities round-trip without confusing minutes and hours", () => {
  for (const minutes of [0, 1, 30, 60, 120, 1440, 4320, 10080]) {
    const p = helpers.delayParts(minutes);
    assert.equal(p.quantity * p.unit, minutes);
  }
  assert.equal(helpers.delayParts(60).quantity, 1);
  assert.equal(helpers.delayParts(1440).quantity, 1);
});
test("workspace migration preserves membership, aggregates all records and enforces RLS", async () => {
  const db = new PGlite();
  const user = "00000000-0000-4000-8000-000000000001",
    other = "00000000-0000-4000-8000-000000000002",
    camp = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table contacts(id uuid primary key default gen_random_uuid(),user_id uuid,first_name text,last_name text,phone text,email text,dnc boolean default false,campaign text default '');
 create table campaigns(id uuid primary key default gen_random_uuid(),user_id uuid,name text,sent int default 0,replies int default 0);
 create table conversations(id uuid primary key default gen_random_uuid(),user_id uuid,contact_id uuid,preview text,unread int default 0,last_message_at timestamptz default now(),replied_at timestamptz,ai_replied_at timestamptz,ai_enabled boolean default false,agent_enabled boolean default false);
 create table appointments(id uuid primary key default gen_random_uuid(),user_id uuid,status text);
 alter table contacts enable row level security;alter table campaigns enable row level security;alter table conversations enable row level security;alter table appointments enable row level security;
 create policy owned on contacts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create policy owned on campaigns for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create policy owned on conversations for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create policy owned on appointments for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 grant usage on schema public,auth to authenticated;grant select,insert,update,delete on contacts,campaigns,conversations,appointments to authenticated;`);
    await db.query(
      "insert into campaigns(id,user_id,name,sent,replies) values($1,$2,'Original',20,4)",
      [camp, user],
    );
    await db.query(
      "insert into contacts(user_id,first_name,campaign) values($1,'Jamie','Original')",
      [user],
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20261029180847_audit_workspace_reliability.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query(
      "insert into campaigns(user_id,name,sent) values($1,'Foreign',9999)",
      [other],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select campaign_id from contacts")).rows[0].campaign_id,
      camp,
    );
    await db.query("update campaigns set name='Renamed' where id=$1", [camp]);
    assert.equal(
      (await db.query("select campaign from contacts")).rows[0].campaign,
      "Renamed",
    );
    await db.query(
      "insert into campaigns(user_id,name,sent) select $1,'Bulk '||i,1 from generate_series(1,20)i",
      [user],
    );
    const totals = (
      await db.query("select workspace_totals($1) as totals", [user])
    ).rows[0].totals;
    assert.equal(totals.sent, 40);
    assert.equal(totals.campaigns, 21);
    assert.equal(
      (await db.query("select workspace_totals($1) as totals", [other])).rows[0]
        .totals.sent,
      0,
    );
    await db.query(
      "insert into contacts(user_id,first_name) select $1,'Contact '||i from generate_series(1,220)i",
      [user],
    );
    await db.query(
      "insert into conversations(user_id,contact_id,preview,replied_at) select user_id,id,'hello',now() from contacts where user_id=$1",
      [user],
    );
    const search = (
      await db.query(
        "select workspace_inbox_page($1,'Contact 220','inbox',0,50) as page",
        [user],
      )
    ).rows[0].page;
    assert.equal(search.total, 1);
    const id = search.rows[0].id;
    await db.query("update conversations set archived=true where id=$1", [id]);
    assert.equal(
      (
        await db.query(
          "select workspace_inbox_page($1,'Contact 220','inbox',0,50) as page",
          [user],
        )
      ).rows[0].page.total,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select workspace_inbox_page($1,'Contact 220','archived',0,50) as page",
          [user],
        )
      ).rows[0].page.total,
      1,
    );
    await db.query(
      "update contacts set pipeline_stage='won',deal_value=250 where first_name='Contact 220'",
    );
    assert.equal(
      (await db.query("select workspace_totals($1) as totals", [user])).rows[0]
        .totals.revenue,
      250,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select workspace_totals($1)", [user]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
