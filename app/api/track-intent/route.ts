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
    const { visitor_id, session_id, path } = body || {};

    // Two body shapes accepted:
    //  A. SINGLE:   { kind, detail, value }                 (legacy)
    //  B. BATCH:    { events: [{kind, detail, value}, ...] } (new — one insert)
    const eventsRaw: Array<{ kind?: string; detail?: string; value?: string }> =
      Array.isArray(body?.events) ? body.events : [{ kind: body?.kind, detail: body?.detail, value: body?.value }];

    const rows = eventsRaw
      .filter((e) => e?.kind && ALLOWED_KINDS.has(String(e.kind)))
      .slice(0, 20) // hard cap so a misbehaving client can't insert 500 rows
      .map((e) => ({
        visitor_id: visitor_id || null,
        session_id: session_id || null,
        path: (path || "").slice(0, 500),
        kind: String(e.kind),
        detail: e.detail ? String(e.detail).slice(0, 200) : null,
        value: e.value !== undefined && e.value !== null ? String(e.value).slice(0, 60) : null,
      }));

    if (rows.length === 0) return NextResponse.json({ ok: false, error: "no valid events" }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("lead_intents").insert(rows); // single bulk insert

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (e) {
    console.error("track-intent error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
