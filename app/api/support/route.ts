import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { teamDatabase } from "@/lib/workspace-auth";
const uuid=(value:unknown)=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
async function context(req:NextRequest){
 const auth=await authenticate(req);if(!auth.ok)return {denied:auth.response};
 const admin=req.nextUrl.searchParams.get("admin")==="1";
 if(admin){const denied=await requireAdmin(auth.user);if(denied)return{denied};}
 return {user:auth.user,admin,db:teamDatabase()};
}
export async function GET(req:NextRequest){
 const ctx=await context(req);if(ctx.denied)return ctx.denied;
 const {db,user,admin}=ctx;
 const target=admin?req.nextUrl.searchParams.get("userId"):user!.id;
 if(admin&&!target){const {data,error}=await db!.rpc("command_support_threads");if(error)return NextResponse.json({error:"Could not load support inbox."},{status:503});return NextResponse.json({threads:data},{headers:{"Cache-Control":"private, no-store"}});}
 if(!uuid(target))return NextResponse.json({error:"Invalid conversation."},{status:400});
 const {data,error}=await db!.from("support_messages").select("id,user_id,sender_role,message,read,created_at").eq("user_id",target).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"Could not load messages."},{status:503});
 return NextResponse.json({messages:(data||[]).reverse()},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:NextRequest){
 const ctx=await context(req);if(ctx.denied)return ctx.denied;
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid request."},{status:400});
 const {db,user,admin}=ctx;const target=admin?body.userId:user!.id;
 if(!uuid(target)||!uuid(body.requestId)||typeof body.message!=="string"||!body.message.trim()||body.message.trim().length>4000)return NextResponse.json({error:"Enter a message of 1–4,000 characters."},{status:400});
 const sender=admin?"admin":"user";const message=body.message.trim();
 const {data:existing}=await db!.from("support_messages").select("user_id,sender_role,message").eq("id",body.requestId).maybeSingle();
 if(existing){if(existing.user_id===target&&existing.sender_role===sender&&existing.message===message)return NextResponse.json({success:true});return NextResponse.json({error:"Message request already used."},{status:409});}
 const {error}=await db!.from("support_messages").insert({id:body.requestId,user_id:target,sender_role:sender,message});
 if(error)return NextResponse.json({error:"Message could not be confirmed. Retry to check safely."},{status:503});
 return NextResponse.json({success:true});
}
export async function PATCH(req:NextRequest){
 const ctx=await context(req);if(ctx.denied)return ctx.denied;
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid request."},{status:400});
 const target=ctx.admin?body.userId:ctx.user!.id;
 if(!uuid(target)||typeof body.before!=="string"||!Number.isFinite(Date.parse(body.before)))return NextResponse.json({error:"Invalid conversation cutoff."},{status:400});
 const {error}=await ctx.db!.from("support_messages").update({read:true}).eq("user_id",target).eq("sender_role",ctx.admin?"user":"admin").lte("created_at",new Date(body.before).toISOString());
 if(error)return NextResponse.json({error:"Could not mark read."},{status:503});
 return NextResponse.json({success:true});
}
