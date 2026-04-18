import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header (admin only)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const notAdmin = await requireAdmin(auth.user);
    if (notAdmin) return notAdmin;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test if columns exist by trying a select
    const { error } = await supabase
      .from("page_views")
      .select("region, country, city")
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        message: "Columns don't exist yet. Please run this SQL in the Supabase SQL Editor:\n\nALTER TABLE page_views ADD COLUMN IF NOT EXISTS region TEXT;\nALTER TABLE page_views ADD COLUMN IF NOT EXISTS country TEXT;\nALTER TABLE page_views ADD COLUMN IF NOT EXISTS city TEXT;",
      });
    }

    return NextResponse.json({ success: true, message: "Geo columns already exist." });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
