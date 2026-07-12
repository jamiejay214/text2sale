import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSnapshot } from "@/lib/wifi-live";

// The home-network collector POSTs a metadata snapshot here every ~minute.
// Auth is a shared secret in the `x-wifi-key` header (set WIFI_INGEST_SECRET on
// the server and give the same value to the collector). No user session — the
// caller is a headless script on the home LAN.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.WIFI_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }
  const key = req.headers.get("x-wifi-key") ?? "";
  // constant-time-ish compare
  if (key.length !== secret.length || key !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const snapshot = normalizeSnapshot(body);
  const household = typeof (body as { household?: unknown })?.household === "string" ? (body as { household: string }).household : "home";

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabase
    .from("wifi_live")
    .upsert({ household, snapshot, updated_at: new Date().toISOString() }, { onConflict: "household" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, devices: snapshot.devices.length });
}
