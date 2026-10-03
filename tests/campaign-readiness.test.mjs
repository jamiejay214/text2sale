import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/campaign-sequence.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, Date, Math });

test("campaigns preserve hour/day delays, resolve spin text, and reject invalid steps", () => {
  const steps = exports.validateSequence([
    { message: "Hello", delayMinutes: 0 },
    { message: "One hour", delayMinutes: 60 },
    { message: "One day", delayMinutes: 1440 },
    { message: "Three days", delayMinutes: 4320 },
  ]);
  assert.deepEqual(
    Array.from(
      exports.sequenceTimes(steps, Date.parse("2026-09-27T09:00:00Z")),
    ),
    [
      "2026-09-27T09:00:00.000Z",
      "2026-09-27T10:00:00.000Z",
      "2026-09-28T10:00:00.000Z",
      "2026-10-01T10:00:00.000Z",
    ],
  );
  assert.equal(
    exports.renderCampaignMessage(
      "{Hi|Hello} {firstName} in {city}!",
      { first_name: "Jamie", city: "Miami" },
      () => 0.9,
    ),
    "Hello Jamie in Miami!",
  );
  assert.equal(
    exports.renderCampaignMessage(
      "{firstName}",
      { first_name: "{Hi|Hello}" },
      () => 0,
    ),
    "{Hi|Hello}",
  );
  for (const step of [
    { message: "", delayMinutes: 0 },
    { message: "Hello", delayMinutes: -1 },
    { message: "Hi", delayMinutes: Infinity },
  ])
    assert.throws(() => exports.validateSequence([step]));
});

test("database gates campaign ownership, duplicate sends, timing, balance, pause/resume, and owner access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create table public.profiles(id uuid primary key,role text default 'user',wallet_balance numeric default 10,paused boolean default false);
      create table public.campaigns(id uuid primary key,user_id uuid,name text,status text default 'Draft',audience integer default 0,sent integer default 0,failed integer default 0,scheduled_at timestamptz);
      create table public.contacts(id uuid primary key,user_id uuid,dnc boolean default false,phone text,state text);
      create table public.owned_phone_numbers(user_id uuid,digits text);
      create table public.scheduled_messages(id uuid primary key default gen_random_uuid(),user_id uuid,contact_id uuid,body text,from_number text,scheduled_at timestamptz,status text default 'pending',campaign_id uuid,cancel_on_reply boolean default false,created_at timestamptz default now());
      create function public.decrement_wallet(p_user_id uuid,p_amount numeric) returns numeric language sql as $$ update public.profiles set wallet_balance=wallet_balance-p_amount where id=p_user_id and wallet_balance>=p_amount returning wallet_balance; $$;
    `);
    const owner = "00000000-0000-4000-8000-000000000001",
      user = "00000000-0000-4000-8000-000000000002",
      campaign = "00000000-0000-4000-8000-000000000003",
      contact = "00000000-0000-4000-8000-000000000004",
      foreign = "00000000-0000-4000-8000-000000000005";
    await db.query(
      "insert into auth.users values ($1,'johnsonhealthquotes@gmail.com',now()),($2,'client@example.com',now())",
      [owner, user],
    );
    await db.query(
      "insert into profiles(id,role) values ($1,'admin'),($2,'admin')",
      [owner, user],
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/012_owner_admin_scope.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      (await db.query("select role from profiles where id=$1", [user])).rows[0]
        .role,
      "user",
    );
    await assert.rejects(
      db.query("update profiles set role='admin' where id=$1", [user]),
      /verified workspace owner/,
    );
    await db.query(
      "update auth.users set email='changed@example.com' where id=$1",
      [owner],
    );
    assert.equal(
      (await db.query("select role from profiles where id=$1", [owner])).rows[0]
        .role,
      "user",
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/013_durable_campaign_sequences.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query(
      "insert into campaigns(id,user_id,name) values($1,$2,'Follow-up')",
      [campaign, user],
    );
    await db.query("insert into contacts(id,user_id) values($1,$2),($3,$4)", [
      contact,
      user,
      foreign,
      owner,
    ]);
    await db.query("insert into owned_phone_numbers values($1,'9545550100')", [
      user,
    ]);
    await db.query("update contacts set phone='(954) 555-0142',state='FL',dnc=true where id=$1",[contact]);
    assert.equal((await db.query("select * from find_sms_contacts($1,'9545550142')",[user])).rows[0].dnc,true);
    await db.query("update contacts set dnc=false where id=$1",[contact]);
    const rows = [
      {
        contact_id: contact,
        body: "Hello",
        from_number: "+19545550100",
        scheduled_at: "2026-01-01T00:00:00Z",
        step_index: 0,
        delay_minutes: 0,
      },
      {
        contact_id: contact,
        body: "Following up",
        from_number: "+19545550100",
        scheduled_at: "2026-01-01T01:00:00Z",
        step_index: 1,
        delay_minutes: 60,
      },
    ];
    const enqueue = (messages = rows, resume = false) =>
      db.query(
        "select enqueue_campaign_sequence($1,$2,$3::jsonb,now(),$4) as result",
        [user, campaign, JSON.stringify(messages), resume],
      );
    await assert.rejects(
      enqueue([{ ...rows[0], contact_id: foreign }]),
      /not eligible/,
    );
    assert.equal(
      (await db.query("select count(*)::int n from scheduled_messages")).rows[0]
        .n,
      0,
    );
    assert.equal((await enqueue()).rows[0].result.queued, 2);
    await assert.rejects(enqueue(), /active sequence/);
    const first = (
      await db.query("select * from claim_scheduled_messages(200)")
    ).rows;
    assert.equal(first.length, 1, "Only the first step may be claimed");
    assert.equal(
      (await db.query("select * from claim_scheduled_messages(200)")).rows
        .length,
      0,
      "A second worker must not take an active lease",
    );
    const id = first[0].id;
    await db.query("select reserve_scheduled_message($1,2)", [id]);
    await db.query("select reserve_scheduled_message($1,2)", [id]);
    assert.equal(
      Number(
        (
          await db.query("select wallet_balance from profiles where id=$1", [
            user,
          ])
        ).rows[0].wallet_balance,
      ),
      8,
      "A retry must not debit twice",
    );
    await db.query("select accept_scheduled_message($1,'provider-123')", [id]);
    const next = (
      await db.query(
        "select id,extract(epoch from scheduled_at-now()) gap from scheduled_messages where campaign_step_index=1",
      )
    ).rows[0];
    assert.ok(
      Number(next.gap) > 3590,
      "The next delay starts from actual send acceptance",
    );
    await db.query(
      "update scheduled_messages set scheduled_at=now()-interval '1 minute',processing_at=null where id=$1",
      [next.id],
    );
    await db.query("update campaigns set status='Paused' where id=$1", [
      campaign,
    ]);
    assert.equal(
      (await db.query("select * from claim_scheduled_messages(200)")).rows
        .length,
      0,
    );
    assert.equal((await enqueue(rows, true)).rows[0].result.resumed, true);
    assert.equal(
      (await db.query("select * from claim_scheduled_messages(200)")).rows
        .length,
      1,
    );
    await db.query(
      "update scheduled_messages set dispatch_started_at=now()-interval '10 minutes',processing_at=now()-interval '10 minutes' where id=$1",
      [next.id],
    );
    assert.equal(
      (await db.query("select * from claim_scheduled_messages(200)")).rows
        .length,
      0,
      "An uncertain provider outcome is never automatically resent",
    );
    await db.query("select reconcile_campaign_sequences()");
    const result = (
      await db.query("select status,sent,failed from campaigns where id=$1", [
        campaign,
      ])
    ).rows[0];
    assert.deepEqual(result, { status: "Completed", sent: 1, failed: 1 });
    await enqueue();
    await db.query(
      "update scheduled_messages set status='cancelled' where status='pending' and campaign_step_index=0",
    );
    await db.query("select reconcile_campaign_sequences()");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from scheduled_messages where status='pending'",
        )
      ).rows[0].n,
      0,
      "Reply/opt-out cancellation stops later steps",
    );
    const grants = (
      await db.query(
        "select has_function_privilege('authenticated','public.enqueue_campaign_sequence(uuid,uuid,jsonb,timestamptz,boolean)','execute') allowed",
      )
    ).rows[0];
    assert.equal(
      grants.allowed,
      false,
      "Only server code may enqueue using the privileged RPC",
    );
  } finally {
    await db.close();
  }
});
