import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureInboundVoice } from "@/lib/telnyx-voice";

// ─── GET /api/calls/voice-setup ───────────────────────────────────────────
// Hourly cron. Inbound calls only reach the app (ring-through, forwarding,
// AI receptionist) when the number is on the calling connection and that
// connection sends call events to /api/call-webhook. Both used to be set
// only when someone opened the dialer, so a number nobody had dialed out
// from never rang anywhere. This keeps every owned number connected.

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_CREDENTIAL_CONNECTION_ID) {
    return NextResponse.json({ error: "Calling is not configured" }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await db.from("owned_phone_numbers").select("digits").limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const numbers = Array.from(new Set((data || []).map((row) => String(row.digits || ""))));

  const result = await ensureInboundVoice(numbers);
  const failed = result.numbers.filter((n) => !n.ok);
  if (failed.length) console.warn(`[voice-setup] ${failed.length} number(s) not connected:`, failed.slice(0, 20));
  if (result.webhook === false) console.error("[voice-setup] calling connection is not sending call events to /api/call-webhook");
  return NextResponse.json({ checked: result.numbers.length, failed: failed.length, webhook: result.webhook });
}
