import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {exports, require:(name)=>{if (!(name in mocks)) throw new Error(name); return mocks[name];}, process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'test'}}, Date, Math, Map, URL, console, ...globals});
  return exports;
}
const consent = load('lib/sms-consent.ts');
const industry = {messageTypes:'quote follow-ups'};
function routeFixture({logError = null} = {}) {
  const writes = [];
  const owner = {id:'owner',industry:'health_insurance',first_name:'Jamie',a2p_registration:{businessName:'JJ JOHNSON HEALTH'},messaging_status:'MNO_REJECTED',compliance_log:[]};
  const db = {from(table) {
    const q = {select(){return q},eq(){return q},in(){return q},limit(){return q},async maybeSingle(){return {data:table==='profiles'?owner:null}},async insert(value){writes.push({table,value});return {error:null}},update(value){writes.push({table,value});const result={eq(){return result},then(resolve){return Promise.resolve({error:table==='profiles'?logError:null}).then(resolve)}};return result}};
    return q;
  }};
  const route = load('app/api/opt-in/route.ts', {
    'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
    '@supabase/supabase-js':{createClient:()=>db},
    '@/lib/sms-consent':consent,
    '@/lib/industries':{getIndustry:()=>industry},
    '@/lib/business-details':{usPhoneDigits:(phone)=>/^\d{10}$/.test(phone)?phone:null},
    '@/lib/sms-text':{countSegments:()=>1,hasNonGsmChars:()=>false,sanitizeForSms:x=>x},
  });
  return {writes,post:(optedIn)=>route.POST({json:async()=>({slug:'jj-johnson-health',firstName:'Reviewer',phone:'9545550100',consent:optedIn,consentText:'forged disclosure',page:'https://jjjohnsonhealth.us/opt-in',elapsedMs:2000}),headers:{get:()=>null}})};
}
test('unchecked consent submits an inquiry, keeps number suppressed, and records no SMS consent',async()=>{
  const f=routeFixture(); const response=await f.post(false);
  assert.equal(response.status,200); assert.equal(response.body.subscribed,false); assert.equal(response.body.confirmationSent,false);
  assert.equal(f.writes[0].value.dnc,true); assert.equal(f.writes[0].value.lead_source,'web_inquiry');
  assert.equal(f.writes[1].value.compliance_log[0].type,'web_inquiry'); assert.equal(f.writes[1].value.compliance_log[0].consentText,'');
});
test('checked consent records the authoritative disclosure, not client-supplied text',async()=>{
  const f=routeFixture(); const response=await f.post(true);
  assert.equal(response.status,200); assert.equal(response.body.subscribed,true); assert.equal(f.writes[0].value.dnc,true); assert.equal(f.writes[2].value.dnc,false);
  assert.equal(f.writes[1].value.compliance_log[0].consentText,consent.smsConsentText('JJ JOHNSON HEALTH',industry.messageTypes));
});
test('failed consent persistence cannot report successful enrollment',async()=>{
  const f=routeFixture({logError:{message:'database unavailable'}});
  assert.equal((await f.post(true)).status,500); assert.equal(f.writes[0].value.dnc,true); assert.equal(f.writes.length,2);
});
test('the actual connected review domain maps to the correct business instead of redirecting to the CRM',()=>{
  const hosts=load('lib/custom-domains.ts');
  assert.equal(hosts.CUSTOM_DOMAINS.find(x=>x.domain==='jjjohnsonhealth.us').slug,'jj-johnson-health');
  assert.equal(hosts.isBrandedHost('jjjohnsonhealth.us'),true);
});

const reviewText = 'Example Co message frequency varies message and data rates may apply reply stop reply help marketing and customer care optional privacy policy terms of service mobile information marketing or promotional purposes sms text messaging program';
const formHtml = (checkbox='<input type="checkbox">') => `<head><script src="/app.js"></script></head><body>${reviewText}<form>${checkbox}<a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a></form></body>`;
function probe(html, redirected=false) {
  return load('lib/business-site.ts', {}, {AbortSignal,fetch:async(url)=>({status:200,url:redirected?'https://other.test/opt-in':url,text:async()=>html})}).probeComplianceSite('https://business.test','Example Co');
}
test('new website preflight accepts functional form structure and blocks forced consent, missing forms, and wrong-domain redirects',async()=>{
  const valid = await probe(formHtml()); assert.equal(valid.live,true,JSON.stringify(valid));
  assert.equal((await probe(formHtml('<input type="checkbox" checked>'))).live,false);
  assert.equal((await probe(formHtml('<input type="checkbox" required>'))).live,false);
  assert.equal((await probe(reviewText)).live,false);
  assert.equal((await probe(formHtml(),true)).live,false);
  assert.equal((await probe(formHtml().replace('href="/terms"','href="/wrong"'))).live,false);
});

test('keyword confirmations use the customer brand and support details, and contain the promised disclosures',()=>{
  const replies=consent.smsProgramResponses('JJ JOHNSON HEALTH','help@example.com','9545550100');
  for(const message of Object.values(replies)) assert.match(message,/^JJ JOHNSON HEALTH:/);
  assert.match(replies.help,/help@example.com/); assert.match(replies.help,/9545550100/);
  for(const phrase of ['Message frequency varies','Message and data rates may apply','Reply HELP','Reply STOP']) assert.ok(replies.optIn.includes(phrase));
  assert.match(replies.optOut,/no further text messages/);
});
