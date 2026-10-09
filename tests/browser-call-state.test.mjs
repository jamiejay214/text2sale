import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/browser-call-state.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
test('early media stays ringing and all Telnyx terminal states stop the dialer',()=>{
 assert.equal(exports.browserCallState('early'),'ringing');
 for(const state of ['hangup','done','destroy','purge'])assert.equal(exports.browserCallState(state),'ended');
 assert.equal(exports.browserCallState('active'),'active');
});
test('failed calls expose provider reasons; normal hangups do not become errors',()=>{
 assert.match(exports.callFailure({sipCode:403,sipReason:'Destination is not allowed'}),/403.*Destination is not allowed/);
 assert.match(exports.callFailure({sipCode:486}),/busy/);
 assert.match(exports.callFailure({sipCode:404}),/Check the number/);
 assert.equal(exports.callFailure({sipCode:200,cause:'NORMAL_CLEARING'}),undefined);
});
