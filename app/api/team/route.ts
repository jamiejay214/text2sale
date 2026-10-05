import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-guard";
import { authenticateWorkspace, teamDatabase } from "@/lib/workspace-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const db = teamDatabase();
  const { data: actor } = await db.from("profiles").select("role,paused,wallet_balance,team_code,referral_code").eq("id",auth.user.id).single();
  if (!actor || actor.paused || !["manager","admin"].includes(actor.role)) return NextResponse.json({ error:"Manager access required." },{status:403});
  const [members, transfers] = await Promise.all([
    db.from("profiles").select("id,first_name,last_name,email,role,wallet_balance,subscription_status,paused,created_at").eq("manager_id",auth.user.id).neq("role","admin").order("created_at",{ascending:false}),
    db.from("team_fund_transfers").select("id,recipient_id,amount,created_at").eq("sender_id",auth.user.id).order("created_at",{ascending:false}).limit(50),
  ]);
  if (members.error || transfers.error) return NextResponse.json({error:"Could not load your team."},{status:503});
  return NextResponse.json({members:members.data,transfers:transfers.data,balance:actor.wallet_balance,code:actor.team_code||actor.referral_code},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.email_confirmed_at) return NextResponse.json({error:"Verify your email first."},{status:403});
  let body;
  try { body=await req.json(); } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  if (!body || typeof body !== "object") return NextResponse.json({error:"Invalid request."},{status:400});
  const db=teamDatabase();
  if (body.action==="join" || body.action==="leave") {
    if (body.action==="join" && (typeof body.code!=="string" || !body.code.trim() || body.code.length>100)) return NextResponse.json({error:"Enter a valid team code."},{status:400});
    const {data,error}=await db.rpc("change_team_membership",{p_actor:auth.user.id,p_code:body.action==="join"?body.code.trim():null});
    if(error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json(data);
  }
  if (body.action==="transfer") {
    if (!Number.isSafeInteger(body.cents) || body.cents<=0 || body.cents>100000000 || !/^[0-9a-f-]{36}$/i.test(body.recipientId||"") || !/^[0-9a-f-]{36}$/i.test(body.requestId||"")) return NextResponse.json({error:"Enter a valid amount and teammate."},{status:400});
    const {data,error}=await db.rpc("transfer_team_funds",{p_actor:auth.user.id,p_recipient:body.recipientId,p_cents:body.cents,p_request:body.requestId});
    if(error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({success:true,transfer:data});
  }
  if (body.action==="open") {
    if (!/^[0-9a-f-]{36}$/i.test(body.targetId||"")) return NextResponse.json({error:"Choose a teammate."},{status:400});
    const headers=new Headers(req.headers); headers.set("x-workspace-id",body.targetId);
    const delegated=await authenticateWorkspace(new NextRequest(req.url,{headers}));
    if(!delegated.ok) return delegated.response;
    return NextResponse.json({success:true});
  }
  return NextResponse.json({error:"Unknown team action."},{status:400});
}
