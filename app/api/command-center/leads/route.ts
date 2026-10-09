import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { getAllLeads } from "@/lib/leads-intel";
import { createClient } from "@supabase/supabase-js";
import { PROSPECT_STATUSES } from "@/lib/prospect-capture";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const result = await getAllLeads(40);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (!/^[0-9a-f-]{36}$/i.test(body.id || "") || !PROSPECT_STATUSES.includes(body.status) || typeof body.notes !== "string" || body.notes.length > 5000) {
      return NextResponse.json({ error: "Invalid lead update" }, { status: 400 });
    }
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from("text2sale_prospects")
      .update({ status: body.status, notes: body.notes, updated_at: new Date().toISOString() }).eq("id", body.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save lead. Please retry." }, { status: 400 });
  }
}
