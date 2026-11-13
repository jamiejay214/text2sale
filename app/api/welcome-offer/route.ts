import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { MARKETING_NOTICE } from "@/lib/welcome-offer";

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({}, {status:403});
  const raw = await req.text();
  if (raw.length > 2048) return NextResponse.json({}, {status:413});
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({}, {status:400}); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({}, {status:400});
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  const ip = req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "unknown";
  const {data,error} = await db.rpc("claim_welcome_offer", {
    claim_email: email, source_path: String(body.path || "/").split(/[?#]/)[0].slice(0,160),
    consent_notice: body.marketing === true ? MARKETING_NOTICE : null,
    request_hash: createHmac("sha256",key).update("offer:"+ip.split(",")[0].trim()).digest("hex"),
  });
  if (error || !data) return NextResponse.json({}, {status:error ? 503 : 429});
  return NextResponse.json({code:"10OFF"});
}
