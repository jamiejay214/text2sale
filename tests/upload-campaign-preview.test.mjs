import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";
function load(name, deps={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync("lib/"+name+".ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:key=>deps[key]});
  return exports;
}
const {campaignSegmentPreview:preview}=load("campaign-segment-preview",{"./sms-text":load("sms-text"),"./campaign-sequence":load("campaign-sequence")});
test("editor counts actual sample text including the footer, not all spin options or field tokens",()=>{
 const p=preview("{Hi|Hey|Hello} {firstName}, this is Sarah! I help families find savings on health plans. {Are you|Would you be} open to comparing options for 2027? Reply STOP to opt out");
 assert.equal(p.segments,1); assert.equal(preview("{firstName}", "Sarah").sample,"Sarah"); assert.equal(preview("a".repeat(155)+"{firstName}", "Alexandra").segments,2); assert.equal(p.estimated,true); assert.equal(p.maxLength,155); assert.equal(p.length,132);
 const mixed=preview("a".repeat(155)+"{firstName}"); assert.equal(mixed.segments,1); assert.equal(mixed.maxSegments,2);
 assert.equal(preview("a".repeat(155)+"{firstName}","",{first_name:"Sam"}).maxSegments,1);
 assert.equal(preview("a".repeat(155)+"{firstName}","",{first_name:"Alexandra"}).segments,2);
 assert.equal(preview("a".repeat(158)+"{hi|hello}").maxSegments,2);
 assert.equal(preview("").segments,0);
 assert.equal(preview("a".repeat(160)).segments,1); assert.equal(preview("a".repeat(161)).segments,2);
 assert.equal(preview("^".repeat(81)).segments,2); assert.equal(preview("😀".repeat(36)).segments,2);
});
test("CSV queue is atomic, specific to a file, retry-safe, and preserves a paused campaign",async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create table contacts(id uuid primary key,user_id uuid,dnc boolean default false);
 create table csv_uploads(id uuid primary key,user_id uuid);
 create table campaigns(id uuid primary key,user_id uuid,status text,audience integer);
 create table owned_phone_numbers(user_id uuid,digits text);
 create table scheduled_messages(user_id uuid,contact_id uuid,body text,from_number text,scheduled_at timestamptz,status text,campaign_id uuid,cancel_on_reply boolean,campaign_run_id uuid,campaign_step_index integer,campaign_delay_minutes numeric);`);
 await db.exec(readFileSync("supabase/migrations/20261110154000_upload_campaign_runs.sql","utf8"));
 const [user,camp,batch,other,a,b]=Array.from({length:6},(_,i)=>"00000000-0000-4000-8000-00000000000"+i);
 await db.query("insert into csv_uploads values ($1,$2,true)",[batch,user]);
 await db.query("insert into campaigns values ($1,$2,'Paused',9)",[camp,user]);
 await db.query("insert into contacts values ($1,$2,false,$3),($4,$2,false,$5)",[a,user,batch,b,other]);
 await db.query("insert into owned_phone_numbers values ($1,'9545550123')",[user]);
 const enqueue=ids=>db.query("select queue_csv_campaign($1,$2,$3,$4) as result",[user,camp,batch,JSON.stringify(ids.map(id=>({contact_id:id,from_number:"+19545550123",body:"Hi. Reply STOP to opt out.",scheduled_at:"2026-11-10T16:00:00Z",step_index:0,delay_minutes:0})))]);
 await assert.rejects(enqueue([a,b]),/lead or sender changed/);
 assert.equal((await db.query("select * from scheduled_messages")).rows.length,0);
 const result=(await enqueue([a])).rows[0].result;
 assert.equal(result.queued,1); assert.equal(result.paused,true);
 await assert.rejects(enqueue([a]),/already queued/);
 assert.equal((await db.query("select * from scheduled_messages")).rows.length,1);
 } finally {await db.close();}
});
