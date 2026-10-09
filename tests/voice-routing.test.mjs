import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function setup(responses, connection='connection') {
 const calls=[]; const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('lib/telnyx-voice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
 exports, process:{env:{TELNYX_CREDENTIAL_CONNECTION_ID:connection}},encodeURIComponent,
 require:()=>({telnyxRequest:async(...args)=>{calls.push(args);return responses.shift();}})
 });
 return {calls,run:exports.ensureVoiceRouting};
}
test('repairs existing routing on the exact owned number without ordering anything',async()=>{
 const s=setup([{ok:true,json:{data:[{id:'wrong',phone_number:'+19545550100'},{id:'owned',phone_number:'+19545550101',connection_id:''}]}},{ok:true,json:{data:{connection_id:'connection'}}}]);
 assert.equal((await s.run('+19545550101')).ok,true);
 assert.equal(s.calls[1][0],'/v2/phone_numbers/owned');
 assert.equal(JSON.parse(s.calls[1][1].body).connection_id,'connection');
 assert.equal(s.calls.length,2);
});
test('already routed numbers require no mutation',async()=>{
 const s=setup([{ok:true,json:{data:[{id:'owned',phone_number:'+19545550101',connection_id:'connection'}]}}]);
 assert.equal((await s.run('+19545550101')).ok,true);assert.equal(s.calls.length,1);
});
test('missing config, invalid numbers, lookup failures and routing failures fail visibly',async()=>{
 for(const s of [setup([],''),setup([{ok:false,json:{}}]),setup([{ok:true,json:{data:[]}}]),setup([{ok:true,json:{data:[{id:'owned',phone_number:'+19545550101'}]}},{ok:false,json:{}}])]) {
 const r=await s.run('+19545550101');assert.equal(r.ok,false);assert.ok(r.error);
 }
 const s=setup([]);assert.equal((await s.run('bad')).ok,false);assert.equal(s.calls.length,0);
});
function setupMedia(responses, connection='connection') {
 const calls=[]; const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('lib/telnyx-voice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
 exports, process:{env:{TELNYX_CREDENTIAL_CONNECTION_ID:connection}},encodeURIComponent,
 require:()=>({telnyxRequest:async(...args)=>{calls.push(args);return responses.shift();}})
 });
 return {calls,run:exports.ensureWebrtcMedia};
}
test('turns off SRTP on the WebRTC connection so browser calls are not rejected with 488',async()=>{
 const s=setupMedia([{ok:true,json:{data:{encrypted_media:'SRTP'}}},{ok:true,json:{data:{encrypted_media:null}}}]);
 assert.equal((await s.run()).ok,true);
 assert.equal(s.calls[1][0],'/v2/credential_connections/connection');
 assert.equal(s.calls[1][1].method,'PATCH');
 assert.equal(JSON.parse(s.calls[1][1].body).encrypted_media,null);
});
test('leaves an unencrypted connection alone and reports failures',async()=>{
 const ok=setupMedia([{ok:true,json:{data:{encrypted_media:null}}}]);
 assert.equal((await ok.run()).ok,true);assert.equal(ok.calls.length,1);
 for(const s of [setupMedia([],''),setupMedia([{ok:false,json:{}}]),setupMedia([{ok:true,json:{data:{encrypted_media:'SRTP'}}},{ok:false,json:{}}])]){
 const r=await s.run();assert.equal(r.ok,false);assert.ok(r.error);
 }
});
function setupProd(responses, env) {
 const calls=[]; const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('lib/telnyx-voice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
 exports, process:{env:{TELNYX_CREDENTIAL_CONNECTION_ID:'connection',...env}},encodeURIComponent,console:{warn(){},error(){}},
 require:()=>({telnyxRequest:async(...args)=>{calls.push(args);return responses.shift();}})
 });
 return {calls,run:exports.ensureWebrtcMedia};
}
test('production fills an empty call-event webhook so browser calls can be billed',async()=>{
 const s=setupProd([{ok:true,json:{data:{encrypted_media:null,webhook_event_url:''}}},{ok:true,json:{data:{}}}],{VERCEL_ENV:'production'});
 assert.equal((await s.run()).ok,true);
 const body=JSON.parse(s.calls[1][1].body);
 assert.equal(body.webhook_event_url,'https://text2sale.com/api/call-webhook');
 assert.equal(body.webhook_api_version,'2');
});
test('never overwrites a webhook someone else set, and previews never touch it',async()=>{
 const other=setupProd([{ok:true,json:{data:{encrypted_media:null,webhook_event_url:'https://elsewhere.example/hook'}}}],{VERCEL_ENV:'production'});
 assert.equal((await other.run()).ok,true);assert.equal(other.calls.length,1);
 const preview=setupProd([{ok:true,json:{data:{encrypted_media:null,webhook_event_url:''}}}],{VERCEL_ENV:'preview'});
 assert.equal((await preview.run()).ok,true);assert.equal(preview.calls.length,1);
});
