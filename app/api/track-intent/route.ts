import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Logs lead-intent signals BEFORE someone converts:
//   form_start, form_field, cta_click, scroll_50, scroll_90, engagement
// Called via navigator.sendBeacon from components/Tracker.tsx.
// IMPORTANT: NEVER stores form input VALUES — only field names / event kinds.
const ALLOWED_KINDS = new Set([
  "form_start",
  "form_field",
  "cta_click",
  "scroll_50",
  "scroll_90",
  "exit_intent",
  "engagement",
  "time_60s",
]);

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitor_id, session_id, path, kind, detail, value } = body || {};
    if (!kind || !ALLOWED_KINDS.has(String(kind))) {
      return NextResponse.json({ ok: false, error: "bad kind" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("lead_intents").insert({
      visitor_id: visitor_id || null,
      session_id: session_id || null,
      path: (path || "").slice(0, 500),
      kind: String(kind),
      detail: detail ? String(detail).slice(0, 200) : null,
      // For 'engagement' kind, value = engagement_ms; for others, optional.
      // Never accept arbitrary text that might contain PII (numbers/short strings only).
      value: value !== undefined && value !== null ? String(value).slice(0, 60) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track-intent error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
