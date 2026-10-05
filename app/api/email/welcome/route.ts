import { NextRequest, NextResponse } from "next/server";
import { teamDatabase } from "@/lib/workspace-auth";
import { welcomeEmail } from "@/lib/welcome-email";
export const maxDuration=60;
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const key=process.env.RESEND_API_KEY;
 if(!key)return NextResponse.json({configured:false,sent:0,reason:"Email provider is not connected. New signups remain queued."});
 const db=teamDatabase();const {data:jobs,error}=await db.rpc("claim_welcome_emails");
 if(error)return NextResponse.json({error:"Unable to claim welcome emails."},{status:503});
 let sent=0;
 for(const job of jobs||[]){
  const {data:auth,error:authError}=await db.auth.admin.getUserById(job.user_id);
  if(authError||!auth?.user?.email_confirmed_at||!auth.user.email){await db.from("welcome_email_jobs").update({status:"pending",next_attempt_at:new Date(Date.now()+3600000).toISOString(),last_error:authError?"Account lookup temporarily unavailable":"Waiting for email confirmation"}).eq("user_id",job.user_id);continue;}
  // Resend retains idempotency keys for 24 hours. Never automatically resend
  // an ambiguous attempt after that window has elapsed.
  if(job.first_attempt_at&&Date.now()-Date.parse(job.first_attempt_at)>23*3600000){await db.from("welcome_email_jobs").update({status:"failed",last_error:"Delivery requires review before retrying"}).eq("user_id",job.user_id);continue;}
  const {data:profile}=await db.from("profiles").select("first_name").eq("id",job.user_id).single();
  const attempts=job.attempts+1;
  const payload=job.payload||{from:process.env.RESEND_FROM_ADDRESS||"Text2Sale <hello@text2sale.com>",to:[auth.user.email],...welcomeEmail(profile?.first_name||"there")};
  const {error:claimError}=await db.from("welcome_email_jobs").update({payload,attempts,first_attempt_at:job.first_attempt_at||new Date().toISOString()}).eq("user_id",job.user_id);
  if(claimError)continue;
  try{
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`welcome-${job.user_id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
   const result=await response.json();if(!response.ok||!result.id)throw Error(`Email provider returned ${response.status}`);
   const {error:saveError}=await db.from("welcome_email_jobs").update({status:"sent",sent_at:new Date().toISOString(),provider_id:result.id,last_error:null}).eq("user_id",job.user_id);
   if(!saveError)sent++;
  }catch(e){await db.from("welcome_email_jobs").update({status:attempts>=5?"failed":"pending",next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**attempts)).toISOString(),last_error:e instanceof Error?e.message:"Email delivery could not be confirmed"}).eq("user_id",job.user_id);}
 }
 return NextResponse.json({configured:true,sent});
}
