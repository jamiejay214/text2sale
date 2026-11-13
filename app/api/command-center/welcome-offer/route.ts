import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const denied = await requireAdmin(auth.user);
  if (denied) return denied;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const audience = db.from("welcome_offer_audience");
  const fail = () => NextResponse.json({error:"Couldn't load the offer audience."},{status:503});
  if (req.nextUrl.searchParams.get("export") === "1") {
    const lines = ["Email,Claimed at,Marketing opt-in at,Landing page"];
    let cursor = "";
    for (;;) {
      const {data,error} = await audience.select("email,claimed_at,marketing_consent_at,source").eq("marketable",true)
        .gt("email",cursor).order("email").limit(500);
      if (error) return fail();
      for (const row of data) {
        const cells = [row.email,row.claimed_at,row.marketing_consent_at,row.source];
        lines.push(cells.map(v => '"' + String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""') + '"').join(","));
      }
      if (data.length < 500) break;
      cursor = data[data.length-1].email;
    }
    return new NextResponse(lines.join("\r\n"),{headers:{"Content-Type":"text/csv;charset=utf-8","Cache-Control":"private, no-store"}});
  }
  const [all,marketing] = await Promise.all([
    audience.select("email,claimed_at,marketable,source",{count:"exact"}).order("claimed_at",{ascending:false}).limit(20),
    audience.select("email",{count:"exact",head:true}).eq("marketable",true),
  ]);
  if (all.error || marketing.error) return fail();
  return NextResponse.json({total:all.count,marketable:marketing.count,recent:all.data},{headers:{"Cache-Control":"private, no-store"}});
}
