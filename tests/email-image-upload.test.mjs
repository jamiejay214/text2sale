import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";

function endpoint({authorized=true}={}) {
  const stored=[];
  const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{subscription_status:"active"}})})})}),
    storage:{from:()=>({upload:async(path,bytes,options)=>{stored.push({path,bytes,options});return {};},getPublicUrl:path=>({data:{publicUrl:"https://images.example/"+path}})})}};
  const deps={"next/server":{NextResponse:Response},"sharp":sharp,"@/lib/workspace-auth":{authenticateWorkspace:async()=>authorized?{ok:true,user:{id:"owner"}}:{ok:false,response:new Response(null,{status:401})},teamDatabase:()=>db},"@/lib/messaging-status":{isEntitled:p=>p.subscription_status==="active"}};
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync("app/api/email/images/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:id=>deps[id],Buffer,crypto,File});
  return {stored,send:(data)=>{const form=new FormData();form.set("image",new File([data],"marketing.png",{type:"image/png"}));return exports.POST(new Request("https://example.test",{method:"POST",body:form}));}};
}
test("upload processes a real PNG into a bounded JPEG that mail readers can fetch",async()=>{
 const src=await sharp({create:{width:1800,height:800,channels:3,background:"#008855"}}).png().toBuffer();
 const api=endpoint();const response=await api.send(src);assert.equal(response.status,200);
 const item=api.stored[0];assert.match(item.path,/^owner\/[a-f0-9-]+\.jpg$/);
 assert.equal((await response.json()).url,"https://images.example/"+item.path);
 const meta=await sharp(item.bytes).metadata();assert.equal(meta.width,1440);assert.equal(meta.format,"jpeg");
});
test("invalid files and unauthenticated uploads do not write an image",async()=>{
 for(const [authorization,status] of [[false,401],[true,400]]){const api=endpoint({authorized:authorization});assert.equal((await api.send("not an image")).status,status);assert.equal(api.stored.length,0);}
});
