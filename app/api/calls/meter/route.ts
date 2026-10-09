import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chargeStartedMinutes } from "@/lib/call-metering";
import { hangupLeg, legIsAlive } from "@/lib/call-routing";

// ─── GET /api/calls/meter ─────────────────────────────────────────────────
// Every-minute cron. Charges each live call for the minute it has just
// started (the first minute was charged at answer) and hangs up any call
// whose wallet can't cover it, so a call can never run on unpaid.
// AI receptionist calls are excluded — they hold their own reserve.
//
// A call whose hangup webhook was lost would otherwise be charged forever,
// so before charging a further minute we confirm with Telnyx the leg is
// still live, and close it out if not.

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(supabaseUrl, supabaseKey);
  const { data: calls, error } = await db
    .from("calls")
    .select("id, user_id, answered_at, cost_per_min, cost_charged, call_control_id, handled_by_ai")
    .eq("status", "answered")
    .is("ended_at", null)
    .not("answered_at", "is", null)
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let charged = 0;
  let cutOff = 0;
  let closed = 0;
  const now = new Date();
  for (const call of calls || []) {
    if (call.handled_by_ai || !call.call_control_id) continue;
    if (!(await legIsAlive(call.call_control_id))) {
      const duration = Math.max(0, Math.round((now.getTime() - new Date(call.answered_at).getTime()) / 1000));
      const { data: done } = await db
        .from("calls")
        .update({ status: "completed", ended_at: now.toISOString(), duration_seconds: duration, hangup_cause: "lost_webhook" })
        .eq("id", call.id)
        .eq("status", "answered")
        .select("id")
        .maybeSingle();
      if (done) closed++;
      continue;
    }
    const result = await chargeStartedMinutes(db, call, now);
    if (result === "ok") charged++;
    if (result === "insufficient") {
      await hangupLeg(call.call_control_id);
      cutOff++;
    }
  }

  return NextResponse.json({ ok: true, live: calls?.length || 0, charged, cutOff, closed });
}
