import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
function load(file, modules = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
 { exports, require: n => modules[n], process: { env: { STRIPE_SECRET_KEY: 'test' } } });
 return exports;
}
const sessionId = 'cs_live_123456789012345';
const base = {id:sessionId,mode:'subscription',metadata:{userId:'alice',type:'subscription'},status:'complete',payment_status:'paid',amount_total:3999,currency:'usd',livemode:true};
function route(overrides={},auth=true) {
 let calls=0;
 class NextResponse extends Response { static json(body,init){return new NextResponse(JSON.stringify(body),init);} }
 class Stripe { checkout={sessions:{retrieve:async()=>{calls++;return {...base,...overrides};}}}; }
 const api=load('app/api/checkout-conversion/route.ts',{'node:crypto':{createHash},'next/server':{NextResponse},stripe:{default:Stripe},'@/lib/auth-guard':{authenticate:async()=>auth?{ok:true,user:{id:'alice'}}:{ok:false,response:NextResponse.json({}, {status:401})}}});
 return {post:(id=sessionId)=>api.POST({json:async()=>({sessionId:id})}),calls:()=>calls};
}
test('only owner receives verified Stripe total and stable opaque event ID',async()=>{const s=route();const r=await s.post();const a=await r.json();assert.equal(a.verified,true);assert.equal(a.value,39.99);assert.equal(a.eventId.length,64);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await (await s.post()).json()).eventId,a.eventId);assert.ok(!JSON.stringify(a).includes(sessionId));});
for(const [name,changes] of Object.entries({unpaid:{payment_status:'unpaid'},incomplete:{status:'open'},wallet:{mode:'payment'},wrongType:{metadata:{userId:'alice',type:'credits'}},zero:{amount_total:0},currency:{currency:'eur'}}))test(`${name} never becomes a purchase`,async()=>{assert.equal((await (await route(changes).post()).json()).verified,false);});
test('another user cannot inspect checkout',async()=>{assert.equal((await route({metadata:{userId:'bob'}}).post()).status,404);});
test('unauthenticated and malformed requests never reach Stripe',async()=>{const a=route({},false);assert.equal((await a.post()).status,401);assert.equal(a.calls(),0);const b=route();assert.equal((await b.post('bad')).status,400);assert.equal(b.calls(),0);});
test('test payments verify but are excluded from ad tracking',async()=>{const a=await (await route({livemode:false}).post()).json();assert.equal(a.verified,true);assert.equal(a.trackable,false);});
test('pixel waits for readiness, reports once, and survives a page reload',()=>{const storageMap=new Map();const storage={getItem:k=>storageMap.get(k),setItem:(k,v)=>storageMap.set(k,v)};const checkout={verified:true,trackable:true,eventId:'abc',value:39.99,currency:'USD'};const calls=[];const mod=load('lib/track-checkout.ts');assert.equal(mod.trackCheckout(checkout,undefined,storage),false);assert.equal(storageMap.size,0);mod.trackCheckout(checkout,(...a)=>calls.push(a),storage);mod.trackCheckout(checkout,(...a)=>calls.push(a),storage);load('lib/track-checkout.ts').trackCheckout(checkout,(...a)=>calls.push(a),storage);assert.equal(calls.length,1);assert.equal(calls[0][1],'Purchase');assert.equal(calls[0][3].eventID,'abc');});
test('unverified and test-mode checkout never sends a pixel event',()=>{const mod=load('lib/track-checkout.ts');let calls=0;const storage={getItem:()=>null,setItem:()=>{}};for(const fields of [{verified:false,trackable:true},{verified:true,trackable:false}])mod.trackCheckout({...fields,eventId:'x',value:39.99,currency:'USD'},()=>calls++,storage);assert.equal(calls,0);});
