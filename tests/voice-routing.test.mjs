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
