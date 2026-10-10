import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatCallLog } from "@/lib/call-log";
import { telnyxRequest } from "@/lib/telnyx-10dlc";

// ─── GET /api/ai-call/log?session=<id> ────────────────────────────────────
// Plain-text report of one AI call for troubleshooting: the session's own
// record plus Telnyx's event log for the call (every command and webhook,
// with failures). Scoped to the signed-in workspace's own calls.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function telnyxEvents(filter: string) {
  const res = await telnyxRequest(`/v2/call_events?${filter}&page[size]=250`);
  return res.ok ? { events: (res.json?.data || []) as Array<Record<string, unknown>>, error: null } : { events: [], error: `Telnyx call log unavailable (HTTP ${res.status})` };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const id = req.nextUrl.searchParams.get("session") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid call." }, { status: 400 });

  const db = createClient(supabaseUrl, supabaseKey);
  const { data: session } = await db
    .from("ai_call_sessions")
    .select("id, call_id, state, outcome, turns, pending_transcript, collected, started_at, ended_at")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Call not found." }, { status: 404 });

  const { data: call } = session.call_id
    ? await db.from("calls").select("status, hangup_cause, duration_seconds, call_leg_id, call_session_id").eq("id", session.call_id).maybeSingle()
    : { data: null };

  let result: { events: Array<Record<string, unknown>>; error: string | null } = { events: [], error: "No Telnyx call id was recorded for this call." };
  if (call?.call_leg_id) result = await telnyxEvents(`filter[leg_id]=${encodeURIComponent(call.call_leg_id)}`);
  if (!result.events.length && call?.call_session_id) {
    const bySession = await telnyxEvents(`filter[application_session_id]=${encodeURIComponent(call.call_session_id)}`);
    if (bySession.events.length || !result.error) result = bySession;
  }

  return NextResponse.json({
    text: formatCallLog({ session, call, events: result.events, telnyxError: result.error }),
  });
}
