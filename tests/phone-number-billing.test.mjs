import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("monthly wallet billing charges owned numbers only, regardless of campaign registration", async () => {
  const charges = [];
  const profiles = [0, 1, 2].map(n => ({id: String(n), subscription_status: "active", a2p_registration: {campaignSid: "registered"}, owned_numbers: Array.from({length:n}, () => ({}))}));
  const db = {
    from: () => ({select: async () => ({data: profiles}), update: () => ({eq: async () => ({})})}),
    rpc: async (name, args) => { assert.equal(name, "bill_number_fee"); charges.push([args.p_user_id,args.p_amount]); return {data: 12}; }
  };
  const exports = {};
  const imports = {"next/server": {NextResponse:{json: x => x}}, "@supabase/supabase-js":{createClient: () => db}, "@/lib/telnyx-10dlc":{NUMBER_MONTHLY_FEE:1.5}};
  const source = fs.readFileSync(new URL("../app/api/billing/numbers/route.ts", import.meta.url),"utf8");
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require: key => imports[key],process:{env:{CRON_SECRET:"test"}},console});
  const result = await exports.GET({headers:{get: () => "Bearer test"}});
  assert.deepEqual(charges,[["1",1.5],["2",3]]);
  assert.equal(result.totalRevenue,4.5);
});
