import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync("lib/opt-out.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
const {hasCampaignOptOutSuffix:valid,campaignFirstMessage:check}=exports;
test("first messages accept the normal footer or configured letter, case insensitively",()=>{
 for(const text of ["Hi. Reply STOP to opt out.","Hi. reply n to opt out","Hi. N","Hi. n"]) assert.equal(valid(text,{}),true,text);
 assert.equal(valid("Hi. Reply X to opt out.",{firstMessageText:"X"}),true);
});
test("missing and misplaced footers fail; follow-ups are not validated by this helper",()=>{
 for(const text of ["Hi there","Reply STOP to opt out. How are you?","Hi. Reply X to opt out."]) assert.equal(valid(text,{}),false,text);
 assert.throws(()=>check("Hello",{},false),/first message/);
});
test("explicit campaign choice preserves text without disabling STOP handling",()=>{
 assert.equal(check("Hello",{},true),"Hello");
 assert.ok(exports.normalizeOptOutSettings({}).keywords.includes("STOP"));
});
