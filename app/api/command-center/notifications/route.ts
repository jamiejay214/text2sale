import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { TRAFFIC_START } from "@/lib/traffic-metrics";

export const dynamic = "force-dynamic";

function database() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function authorize(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  return requireAdmin(auth.user);
}

export async function GET(req: NextRequest) {
  const denied = await authorize(req);
  if (denied) return denied;
  const db = database();
  const [items, unread] = await Promise.all([
    db.from("command_notifications")
      .select("id,kind,title,body,url,created_at,read_at,push_status")
      .or(`kind.neq.visit,created_at.gte.${TRAFFIC_START}`)
      .order("created_at", { ascending: false }).limit(100),
    db.from("command_notifications").select("id", { count: "exact", head: true }).is("read_at", null)
      .or(`kind.neq.visit,created_at.gte.${TRAFFIC_START}`),
  ]);
  if (items.error || unread.error) {
    console.error("[command-notifications] Read failed", items.error?.code || unread.error?.code);
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 });
  }
  return NextResponse.json({ items: items.data, unread: unread.count ?? 0 }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(req: NextRequest) {
  const denied = await authorize(req);
  if (denied) return denied;
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const db = database();
  let query = db.from("command_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (typeof body?.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
    query = query.eq("id", body.id);
  } else if (typeof body?.before === "string" && Number.isFinite(Date.parse(body.before))) {
    // Use the newest displayed record as the cutoff: a new arrival stays unread.
    query = query.lte("created_at", new Date(body.before).toISOString());
  } else {
    return NextResponse.json({ error: "Choose a notification or a valid cutoff." }, { status: 400 });
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Couldn't mark notifications as read." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
