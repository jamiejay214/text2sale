import { test } from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup({role='manager',member=true,paused=false,verified=true,auditError=false}={}){
 const writes=[];const actor={id:'00000000-0000-0000-0000-000000000001',email:'manager@example.test',email_confirmed_at:verified?'yes':null};const target='00000000-0000-0000-0000-000000000002';
 class NextResponse extends Response{static json(v,init){return new NextResponse(JSON.stringify(v),init);}}
 const client={auth:{getUser:async()=>({data:{user:actor},error:null})},from(table){return {select(){return this;},in:async()=>({data:[{id:actor.id,role,paused},{id:target,role:'user',manager_id:member?actor.id:null}]}),insert:async(row)=>{writes.push(row);return {error:auditError?{}:null};}};}};
 const modules={'next/server':{NextResponse},'@supabase/supabase-js':{createClient:()=>client},'./owner':{isOwnerEmail:email=>email==='johnsonhealthquotes@gmail.com'}};
 function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>modules[name],process:{env:{}}});return exports;}
 const raw=modules['./auth-guard']=load('lib/auth-guard.ts');const delegated=load('lib/workspace-auth.ts');
 const req={headers:new Headers({authorization:'Bearer test','x-workspace-id':target}),method:'POST',nextUrl:{pathname:'/api/send-sms'}};
 return {raw,delegated,req,writes,target};
}
test('operational routes resolve assigned account and record the real actor',async()=>{const s=setup();const result=await s.delegated.authenticateWorkspace(s.req);assert.equal(result.ok,true);assert.equal(result.user.id,s.target);assert.notEqual(s.writes[0].actor_id,s.target);assert.equal(s.writes[0].target_id,s.target);});
for(const [name,options] of [['outsider',{member:false}],['demoted',{role:'user'}],['paused',{paused:true}],['unverified',{verified:false}]])test(`${name} cannot use a delegation header`,async()=>{const s=setup(options);assert.equal((await s.delegated.authenticateWorkspace(s.req)).response.status,403);assert.equal(s.writes.length,0);});
test('billing/admin auth refuses delegated account headers',async()=>{const s=setup();assert.equal((await s.raw.authenticate(s.req)).response.status,403);});
test('audit failure prevents delegated API execution',async()=>{const s=setup({auditError:true});assert.equal((await s.delegated.authenticateWorkspace(s.req)).response.status,503);});
