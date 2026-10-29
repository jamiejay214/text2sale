import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
function load(file,mocks={}) {
 const exports={}; vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require(name){if(!(name in mocks))throw Error('Unexpected dependency '+name);return mocks[name]},process:{env:{}},console,Date,Math,Map,Set,URL}); return exports;
}
const json=(body,options={})=>({body,status:options.status||200});
function database(tables){
 const writes=[];
 return {writes,from(table){let filters=[],action='select',values,range,single=false;const q={
 select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},gte(k,v){filters.push(r=>r[k]>=v);return q},order(){return q},range(a,b){range=[a,b];return q},single(){single=true;return q},maybeSingle(){single=true;return q},update(v){action='update';values=v;return q},
 then(resolve,reject){try{let rows=(tables[table]||[]).filter(r=>filters.every(f=>f(r)));if(range)rows=rows.slice(range[0],range[1]+1);if(action==='update'){writes.push({table,values});rows.forEach(r=>Object.assign(r,values))}return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject)}catch(e){return Promise.reject(e).then(resolve,reject)}}};return q}};
}
const standard={ 'next/server':{NextResponse:{json}}, '@/lib/workspace-auth':{authenticateWorkspace:async()=>({ok:true,user:{id:'owner'}})}};
function campaignFixture({subscription='active',suppressionFailure=false}={}) {
 const campaign={id:'campaign',user_id:'owner',name:'Follow up',steps:[{message:'Hi {firstName}, reply STOP to opt out',delayMinutes:0},{message:'Following up',delayMinutes:60}],selected_numbers:['+19545550100'],status:'draft'};
 const tables={campaigns:[campaign],profiles:[{id:'owner',subscription_status:subscription,plan:'text',owned_numbers:[],opt_out_settings:{}}],owned_phone_numbers:[{user_id:'owner',digits:'9545550100'}],contacts:[
 {id:'a',user_id:'owner',campaign_id:'campaign',phone:'9545550101',first_name:'Alex',dnc:false},
 {id:'b',user_id:'owner',campaign_id:'campaign',phone:'19545550101',first_name:'Duplicate',dnc:false},
 {id:'c',user_id:'owner',campaign_id:'campaign',phone:'9545550102',first_name:'Suppressed duplicate',dnc:false},
 {id:'d',user_id:'owner',campaign_id:null,phone:'9545550102',first_name:'Opted out',dnc:true}]};
 const db=database(tables);let queued=0;
 const from=db.from.bind(db);if(suppressionFailure)db.from=(table)=>{const q=from(table),eq=q.eq;q.eq=(k,v)=>{if(table==='contacts'&&k==='dnc'&&v===true)q.then=(resolve)=>Promise.resolve({data:null,error:{message:'unavailable'}}).then(resolve);return eq(k,v)};return q};
 const route=load('app/api/campaigns/enroll/route.ts',{...standard,'node:crypto':{createHash},'@supabase/supabase-js':{createClient:()=>db},'@/lib/campaign-sequence':load('lib/campaign-sequence.ts'),'@/lib/sms-text':load('lib/sms-text.ts'),'@/lib/sms-pricing':load('lib/sms-pricing.ts'),'@/lib/workspace-input':load('lib/workspace-input.ts'),'@/lib/opt-out':load('lib/opt-out.ts'),'@/lib/campaign-enqueue':{enqueueSequence:async()=>{queued++;return{ok:true,data:{queued:2}}}}});
 return {campaign,db,get queued(){return queued},post:input=>route.POST({json:async()=>({campaignId:'campaign',audience:'assigned',...input})})};
}
test('campaign preview deduplicates and suppresses across campaign boundaries without queueing',async()=>{const f=campaignFixture(),r=await f.post({dryRun:true});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.recipients,1);assert.equal(r.body.messages,2);assert.match(r.body.samples[0].body,/Alex/);assert.equal(Date.parse(r.body.samples[1].scheduledAt)-Date.parse(r.body.samples[0].scheduledAt),3600000);assert.equal(f.queued,0);assert.equal(f.db.writes.length,0)});
test('changed campaign revision blocks queueing after review',async()=>{const f=campaignFixture(),preview=await f.post({dryRun:true});f.campaign.name='Changed';assert.equal((await f.post({expectedRevision:preview.body.revision})).status,409);assert.equal(f.queued,0)});
test('suppression lookup failure blocks preview and launch',async()=>{const f=campaignFixture({suppressionFailure:true});assert.equal((await f.post({dryRun:true})).status,503);assert.equal(f.queued,0)});
test('inactive subscriptions cannot preview or launch',async()=>{const f=campaignFixture({subscription:'inactive'});assert.equal((await f.post({dryRun:true})).status,403);assert.equal(f.queued,0)});
function appointmentFixture({foreign=false,conflict=false,calendarFailure=false,deleteFailure=false}={}) {
 const appointment={id:'apt',user_id:foreign?'other':'owner',status:'confirmed',date:'2026-11-02',time:'10:00:00',duration_minutes:30,google_event_id:'event',title:'Consultation'};
 const tables={appointments:[appointment,...(conflict?[{id:'conflict',user_id:'owner',status:'confirmed',date:'2026-11-03',time:'11:15:00',duration_minutes:30}]:[])],profiles:[{id:'owner',available_hours:{timezone:'America/New_York'}}]};const db=database(tables),calls=[];
 const route=load('app/api/appointments/route.ts',{...standard,'@supabase/supabase-js':{createClient:()=>db},'@/lib/auth-guard':{requireSameUser:(a,b)=>a===b?null:json({error:'Forbidden'},{status:403})},'@/lib/availability':{overlapsBusy:()=>false},'@/lib/google-calendar':{checkCalendarConflict:async(...args)=>{calls.push(['check',...args]);return false},createCalendarEvent:async(...args)=>{calls.push(['create',...args]);if(calendarFailure)throw Error('Google unavailable');return 'event'},deleteCalendarEvent:async(...args)=>{calls.push(['delete',...args]);if(deleteFailure)throw Error('Google unavailable')},getCalendarBusy:async()=>[]}});
 return{appointment,db,calls,patch:input=>route.PATCH({json:async()=>({id:'apt',...input})})};
}
test('reschedule excludes its own Google event and updates it without duplicating',async()=>{const f=appointmentFixture(),r=await f.patch({date:'2026-11-03',time:'11:00'});assert.equal(r.status,200);assert.equal(f.appointment.date,'2026-11-03');assert.equal(f.calls[0].at(-1),'event');assert.equal(f.calls[1].at(-1),'event');assert.equal(f.appointment.reminder_sent,false)});
test('overlapping reschedule is rejected before writes or Google calls',async()=>{const f=appointmentFixture({conflict:true});assert.equal((await f.patch({date:'2026-11-03',time:'11:00'})).status,409);assert.equal(f.db.writes.length,0);assert.equal(f.calls.length,0)});
test('Google sync failure keeps appointment and returns visible retry state',async()=>{const f=appointmentFixture({calendarFailure:true}),r=await f.patch({date:'2026-11-03',time:'11:00'});assert.equal(r.status,200);assert.match(r.body.appointment.calendar_sync_error,/sync failed/);assert.equal(f.appointment.date,'2026-11-03')});
test('cancel retry removes the Google event and never recreates it',async()=>{const f=appointmentFixture();await f.patch({status:'cancelled'});await f.patch({retrySync:true});assert.equal(f.appointment.google_event_id,null);assert.equal(f.calls.filter(c=>c[0]==='create').length,0);assert.equal(f.calls.filter(c=>c[0]==='delete').length,1)});
test('failed Google cancellation retains event id for retry',async()=>{const f=appointmentFixture({deleteFailure:true}),r=await f.patch({status:'cancelled'});assert.equal(r.status,200);assert.equal(f.appointment.google_event_id,'event');assert.match(f.appointment.calendar_sync_error,/removal failed/)});
test('appointment ownership and invalid status reject changes',async()=>{const foreign=appointmentFixture({foreign:true});assert.equal((await foreign.patch({status:'completed'})).status,403);assert.equal(foreign.db.writes.length,0);const f=appointmentFixture();assert.equal((await f.patch({status:'invalid'})).status,400);assert.equal(f.db.writes.length,0)});
