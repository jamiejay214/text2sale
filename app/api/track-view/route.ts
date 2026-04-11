import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json();

    // Hash the IP for privacy (don't store raw IPs)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "text2sale-salt").digest("hex").slice(0, 16);

    const userAgent = req.headers.get("user-agent") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("page_views").insert({
      path: path || "/",
      referrer: referrer || "",
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
