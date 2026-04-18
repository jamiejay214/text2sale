import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.TELNYX_API_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// Let the UI hang up a live call. Verifies the row belongs to the caller
// before hitting Telnyx so nobody can drop another tenant's line.
export async function POST(req: NextRequest) {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { callId } = await req.json();
  if (!callId) {
    return NextResponse.json(
      { success: false, error: "Missing callId" },
      { status: 400 }
    );
  }

  const { data: row } = await adminSupabase
    .from("calls")
    .select("user_id, call_control_id, status")
    .eq("id", callId)
    .maybeSingle();

  if (!row || row.user_id !== userId) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }
  if (!row.call_control_id) {
    // No Telnyx handle yet — just mark the row canceled locally.
    await adminSupabase
      .from("calls")
      .update({
        status: "canceled",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);
    return NextResponse.json({ success: true, note: "Call canceled locally" });
  }

  const res = await fetch(
    `https://api.telnyx.com/v2/calls/${row.call_control_id}/actions/hangup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[hangup-call] Telnyx error:", text);
    return NextResponse.json(
      { success: false, error: "Telnyx hangup failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
