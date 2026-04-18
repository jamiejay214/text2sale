import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CALL_RATE_OUTBOUND_PER_MIN } from "@/lib/call-pricing";

// ─── POST /api/calls/log ─────────────────────────────────────────────────────
// Lightweight companion to browser WebRTC calling. The browser places the
// call directly via the Telnyx SDK; this route just creates the `calls` row
// so we have a record for billing / call-history purposes.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { to, from, contactId } = await req.json();
    if (!to || !from) {
      return NextResponse.json({ error: "Missing to/from" }, { status: 400 });
    }

    const { data: callRow, error } = await adminSupabase
      .from("calls")
      .insert({
        user_id: userId,
        contact_id: contactId || null,
        direction: "outbound",
        from_number: from,
        to_number: to,
        status: "initiating",
        cost_per_min: CALL_RATE_OUTBOUND_PER_MIN,
      })
      .select("id")
      .single();

    if (error || !callRow) {
      return NextResponse.json({ error: "Could not create call record" }, { status: 500 });
    }

    return NextResponse.json({ callId: callRow.id });
  } catch (err) {
    console.error("[calls/log] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
