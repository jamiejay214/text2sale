import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
function load(path, modules = {}, globals = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports,require:n=>modules[n],process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-only'}},URL, ...globals});
 return exports;
}
const parser=load('lib/prospect-capture.ts');
const valid={name:'Test Prospect',email:'TEST@example.test',phone:'(954) 555-0101',kind:'signup',followup:true,path:'/insurance-agents?secret=omit',source:'facebook',campaign:'phase-one',password:'never-store'};
test('capture explicitly whitelists fields, normalizes contacts and removes query strings',()=>{
 const row=parser.parseProspect(valid);
 assert.equal(row.email,'test@example.test');assert.equal(row.phone,'9545550101');assert.equal(row.path,'/insurance-agents');assert.ok(!JSON.stringify(row).includes('never-store'));assert.ok(!('followup' in row));
});
for(const [name,patch] of [['no permission',{followup:false}],['invalid email',{email:'bad'}],['invalid phone',{phone:'123'}],['missing name',{name:''}]])test(`rejects ${name}`,()=>assert.throws(()=>parser.parseProspect({...valid,...patch})));
let db;
before(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(readFileSync(new URL('../supabase/migrations/20261009100203_text2sale_prospect_capture.sql',import.meta.url),'utf8'));});
after(async()=>await db.close());
async function tx(fn){await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}}
const capture=async(row=parser.parseProspect(valid),ip='test-ip')=>(await db.query('select capture_text2sale_prospect($1::jsonb,$2) as ok',[JSON.stringify(row),ip])).rows[0].ok;
test('captures once, and public resubmission cannot overwrite owner notes or suppression',()=>tx(async()=>{
 await db.exec('set local role service_role');assert.equal(await capture(),true);
 await db.exec("update text2sale_prospects set notes='Owner note',status='do_not_contact'");
 assert.equal(await capture({...parser.parseProspect(valid),name:'Replacement'}),true);
 const r=(await db.query('select * from text2sale_prospects')).rows;assert.equal(r.length,1);assert.equal(r[0].name,'Test Prospect');assert.equal(r[0].status,'do_not_contact');assert.equal(r[0].notes,'Owner note');assert.ok(r[0].consent_at);
}));
test('durable rate limit stops request 11 and resets after 15 minutes',()=>tx(async()=>{
 await db.exec('set local role service_role');for(let i=0;i<10;i++)assert.equal(await capture(),true);assert.equal(await capture(),false);
 await db.exec("update prospect_capture_limits set window_start=now()-interval '16 minutes'");assert.equal(await capture(),true);
}));
for(const role of ['anon','authenticated'])for(const action of ['select * from text2sale_prospects','select * from prospect_capture_limits',"select capture_text2sale_prospect('{}','x')"])test(`${role} cannot access private prospects or bypass the server`,()=>tx(async()=>{await db.exec(`set local role ${role}`);await assert.rejects(db.exec(action),/permission denied/);}));
class NextResponse extends Response {static json(value,init){return new NextResponse(JSON.stringify(value),init);}}
function routeSetup({limited=false,fail=false}={}){
 let writes=0,received;
 const route=load('app/api/prospects/route.ts',{'next/server':{NextResponse},'node:crypto':{createHmac},'@/lib/prospect-capture':parser,'@supabase/supabase-js':{createClient:()=>({rpc:async(name,args)=>{writes++;received=args;return {data:!limited,error:fail?{}:null};}})}});
 const request=(body=valid,origin='https://text2sale.com')=>({headers:new Headers({'origin':origin}),nextUrl:new URL('https://text2sale.com/api/prospects'),text:async()=>JSON.stringify(body)});
 return {...route,request,writes:()=>writes,received:()=>received};
}
test('public capture saves sanitized data and returns no contact identifiers',async()=>{const s=routeSetup();const response=await s.POST(s.request());assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(s.writes(),1);assert.equal(s.received().ip_hash.length,64);assert.ok(!JSON.stringify(s.received()).includes('never-store'));});
test('cross-origin and honeypot submissions never write',async()=>{const s=routeSetup();assert.equal((await s.POST(s.request(valid,'https://unrelated.test'))).status,403);assert.equal((await s.POST(s.request({...valid,website:'spam'}))).status,200);assert.equal(s.writes(),0);});
test('rate limit and unavailable storage do not falsely confirm capture',async()=>{for(const [options,status] of [[{limited:true},429],[{fail:true},503]]){const s=routeSetup(options);assert.equal((await s.POST(s.request())).status,status);}});

test('lead inbox deduplicates completed signups and keeps unfinished/inquiry leads', async()=>{
 const rows={profiles:[{first_name:'Existing',last_name:'Account',email:'joined@example.test',phone:'9545550102',role:'user',created_at:'2026-10-09',subscription_status:'active'}],text2sale_prospects:[
 {id:'one',name:'Existing Account',email:'joined@example.test',kind:'signup',status:'contacted',notes:'Called',source:'facebook',created_at:'2026-10-09'},
 {id:'two',name:'Unfinished',email:'partial@example.test',kind:'signup',status:'new',source:'direct',created_at:'2026-10-09'},
 {id:'three',name:'Inquiry',email:'inquiry@example.test',kind:'inquiry',status:'do_not_contact',source:'direct',created_at:'2026-10-09'},
 ],website_leads:[]};
 const client={from(table){return {select(){return this;},order(){return this;},limit(){return this;},in(){return this;},then(resolve){return Promise.resolve({data:rows[table]||[],error:null}).then(resolve);}};}};
 const {getAllLeads}=load('lib/leads-intel.ts',{'@supabase/supabase-js':{createClient:()=>client}});
 const result=await getAllLeads();assert.equal(result.counts.text2sale,3);
 const joined=result.leads.filter(l=>l.email==='joined@example.test');assert.equal(joined.length,1);assert.equal(joined[0].kind,'signup');assert.equal(joined[0].id,'one');
 assert.equal(result.leads.find(l=>l.id==='two').kind,'partial');assert.equal(result.leads.find(l=>l.id==='two').hot,true);assert.equal(result.leads.find(l=>l.id==='three').hot,false);
});

test('lead update denies signed-out and non-owner users before writing',async()=>{
 for(const loggedIn of [false,true]){
 let writes=0;
 const route=load('app/api/command-center/leads/route.ts',{
  'next/server':{NextResponse},'@/lib/leads-intel':{},'@/lib/prospect-capture':parser,
  '@/lib/auth-guard':{authenticate:async()=>loggedIn?{ok:true,user:{}}:{ok:false,response:NextResponse.json({}, {status:401})},requireAdmin:async()=>NextResponse.json({}, {status:403})},
  '@supabase/supabase-js':{createClient:()=>{writes++;return {};}}
 });
 const response=await route.PATCH({});assert.equal(response.status,loggedIn?403:401);assert.equal(writes,0);
 }
});
