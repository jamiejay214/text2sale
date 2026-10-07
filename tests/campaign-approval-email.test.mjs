import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

function load(file, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: n => modules[n], process: { env: {} }, ...globals });
  return exports;
}
const statuses = load('lib/messaging-status.ts');
const template = load('lib/campaign-approval-email.ts');
test('only carrier approval qualifies; early acceptance and failures do not', () => {
  for (const s of ['TCR_ACCEPTED','TCR_PENDING','TELNYX_ACCEPTED','MNO_PENDING',undefined]) assert.equal(statuses.mapCampaignStatus(s), 'pending');
  for (const s of ['MNO_ACCEPTED','MNO_PROVISIONED','ACTIVE']) assert.equal(statuses.mapCampaignStatus(s), 'approved');
  assert.equal(statuses.mapCampaignStatus('MNO_ACCEPTED','FAILED'), 'failed');
  assert.equal(statuses.mapCampaignStatus('MNO_REJECTED'), 'failed');
});
test('email escapes names and clearly separates approval from number activation', () => {
  const email = template.campaignApprovalEmail('<img src=x>');
  assert.ok(!email.html.includes('<img src=x>'));
  assert.ok(email.html.includes('&lt;img src=x&gt;'));
  assert.match(email.text, /Approval alone does not mean the number is ready/);
  assert.match(email.text, /https:\/\/text2sale.com\/dashboard/);
  assert.match(email.text, /opt-out instruction at the end/);
});

let pg;
before(async () => {
  pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.profiles(id uuid primary key default gen_random_uuid(),a2p_registration jsonb);
    grant usage on schema public to anon,authenticated,service_role;
    grant all on public.profiles to authenticated,service_role;
    insert into profiles(a2p_registration) values ('{"campaignSid":"historical","campaignStatus":"MNO_ACCEPTED"}');`);
  await pg.exec(readFileSync('supabase/migrations/20261007175157_campaign_approval_emails.sql','utf8'));
});
after(async () => { await pg?.close(); });
async function transaction(run) { await pg.exec('begin'); try { await run(); } finally { await pg.exec('rollback'); } }
async function createProfile(status='TCR_ACCEPTED') {
  return (await pg.query('insert into profiles(a2p_registration) values ($1) returning id',[{campaignSid:'campaign-1',campaignStatus:status}])).rows[0].id;
}
async function change(id,status,campaign='campaign-1') { await pg.query('update profiles set a2p_registration=$1 where id=$2',[{campaignSid:campaign,campaignStatus:status},id]); }
async function jobs() { return (await pg.query('select * from campaign_approval_email_jobs')).rows; }
test('migration never emails historical approvals', async () => { assert.equal((await jobs()).length,0); });
test('approval transition queues once and repeated polls/reapprovals do not duplicate', () => transaction(async () => {
  const id = await createProfile(); assert.equal((await jobs()).length,0);
  await change(id,'MNO_PENDING'); assert.equal((await jobs()).length,0);
  await change(id,'MNO_ACCEPTED'); await change(id,'MNO_PROVISIONED');
  await change(id,'MNO_REJECTED'); await change(id,'MNO_ACCEPTED');
  assert.equal((await jobs()).length,1);
  await change(id,'MNO_ACCEPTED','campaign-2'); assert.equal((await jobs()).length,2);
}));
test('claim leases prevent overlapping workers and sent jobs are never reclaimed', () => transaction(async () => {
  await createProfile('MNO_ACCEPTED');
  const first = (await pg.query('select * from claim_campaign_approval_emails()')).rows;
  assert.equal(first.length,1); assert.ok(first[0].lease_id);
  assert.equal((await pg.query('select * from claim_campaign_approval_emails()')).rows.length,0);
  await pg.exec("update campaign_approval_email_jobs set next_attempt_at=now()-interval '1 minute'");
  const second = (await pg.query('select * from claim_campaign_approval_emails()')).rows;
  assert.notEqual(second[0].lease_id,first[0].lease_id);
  await pg.exec("update campaign_approval_email_jobs set status='sent',next_attempt_at=now()");
  assert.equal((await pg.query('select * from claim_campaign_approval_emails()')).rows.length,0);
}));
test('client edits cannot queue emails or access the outbox', () => transaction(async () => {
  await pg.exec('set local role authenticated'); await createProfile('MNO_ACCEPTED'); await pg.exec('reset role');
  assert.equal((await jobs()).length,0);
  const p = (await pg.query(`select has_table_privilege('authenticated','campaign_approval_email_jobs','SELECT') as read,
    has_table_privilege('authenticated','campaign_approval_email_jobs','INSERT') as write,
    has_function_privilege('anon','claim_campaign_approval_emails()','EXECUTE') as claim`)).rows[0];
  assert.deepEqual(p,{read:false,write:false,claim:false});
  await pg.exec('set local role service_role'); await createProfile('MNO_ACCEPTED');
  assert.equal((await jobs()).length,1);
}));

function worker(options={}) {
  const job={id:'job-1',user_id:'user-1',campaign_id:'campaign-1',lease_id:'lease-1',attempts:0,status:'pending',...options.job};
  const sends=[];
  const db={rpc:async()=>({data:job.status==='sent'?[]:[job]}),
    auth:{admin:{getUserById:async()=>({data:{user:{email:'customer@example.com',email_confirmed_at:options.unverified?null:'2026-10-01'}}})}},
    from:(table)=>({select:()=>({eq:()=>({single:async()=>({data:{first_name:'Jamie',a2p_registration:{campaignSid:'campaign-1',campaignStatus:options.status||'MNO_ACCEPTED'}}})})}),
      update:values=>{
        const q={eq:()=>q,select:async()=>{if(options.reserveFailure)return {error:{message:'write failed'}};Object.assign(job,values);return {data:[{id:job.id}]};},
          then:(resolve,reject)=>{if(values.status==='sent'&&options.saveFailure)return Promise.resolve({error:{message:'write failed'}}).then(resolve,reject);Object.assign(job,values);return Promise.resolve({}).then(resolve,reject);}};
        return q;
      }})};
  class NextResponse extends Response {static json(body,init){return new NextResponse(JSON.stringify(body),init);}}
  const route=load('app/api/email/campaign-approved/route.ts',{'next/server':{NextResponse},'@/lib/workspace-auth':{teamDatabase:()=>db},'@/lib/campaign-approval-email':template,'@/lib/messaging-status':statuses},
    {process:{env:{CRON_SECRET:'test-secret',RESEND_API_KEY:options.noKey?'':'test-key'}},AbortSignal,
      fetch:async(url,init)=>{sends.push({url,...init});return {ok:!options.sendFailure,status:options.sendFailure?503:200,json:async()=>options.sendFailure?{}:{id:'provider-1'}};}});
  return {job,sends,run:(auth=true)=>route.GET({headers:{get:()=>auth?'Bearer test-secret':null}})};
}
test('cron refuses unauthorized requests and missing provider config never sends',async()=>{
  const a=worker();assert.equal((await a.run(false)).status,401);assert.equal(a.sends.length,0);
  const b=worker({noKey:true});await b.run();assert.equal(b.sends.length,0);
});
test('verified customer receives one email and completed jobs stay sent',async()=>{
  const s=worker();await s.run();await s.run();assert.equal(s.sends.length,1);assert.equal(s.job.status,'sent');
  const payload=JSON.parse(s.sends[0].body);assert.deepEqual(payload.to,['customer@example.com']);assert.equal(payload.reply_to,'support@text2sale.com');
});
test('unconfirmed email, pending review, withdrawn approval and lost lease never send',async()=>{
  for(const opts of [{unverified:true},{status:'TCR_ACCEPTED'},{status:'MNO_REJECTED'},{reserveFailure:true}]){
    const s=worker(opts);await s.run();assert.equal(s.sends.length,0);
  }
});
test('ambiguous delivery retries reuse identical payload/key and stop before key expiration',async()=>{
  const s=worker({saveFailure:true});await s.run();await s.run();assert.equal(s.sends.length,2);
  assert.equal(s.sends[0].body,s.sends[1].body);
  assert.equal(s.sends[0].headers['Idempotency-Key'],s.sends[1].headers['Idempotency-Key']);
  s.job.first_attempt_at=new Date(Date.now()-24*3600000).toISOString();await s.run();assert.equal(s.sends.length,2);assert.equal(s.job.status,'failed');
});
test('provider errors back off and stop after five attempts',async()=>{
  const s=worker({sendFailure:true,job:{attempts:4}});await s.run();assert.equal(s.job.status,'failed');assert.equal(s.job.attempts,5);
});
