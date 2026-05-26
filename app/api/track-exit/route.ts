import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

// Logs outbound link clicks — where they went AFTER us.
// Called via navigator.sendBeacon from components/Tracker.tsx and the
// cross-site /t2s.js embed script.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitor_id, session_id, from_path, to_url, to_domain } = body || {};
    if (!to_url) return NextResponse.json({ ok: false }, { status: 400 });

    let domain = to_domain || "";
    if (!domain) {
      try {
        domain = new URL(to_url).hostname;
      } catch {}
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("exit_clicks").insert({
      visitor_id: visitor_id || null,
      session_id: session_id || null,
      from_path: (from_path || "").slice(0, 500),
      to_url: String(to_url).slice(0, 1000),
      to_domain: domain ? domain.replace(/^www\./, "").slice(0, 200) : null,
      is_outbound: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track-exit error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
