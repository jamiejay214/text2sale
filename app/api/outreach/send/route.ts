import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailConfigured } from "@/lib/telnyx-email";
import { processOutreach } from "@/lib/outreach";

// ─── GET /api/outreach/send ────────────────────────────────────────────────
// Every-5-minutes cron: delivers the owner's queued outreach emails
// (lib/outreach.ts) through the verified Telnyx email sender.

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if ((req.headers.get("authorization") || "") !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    return NextResponse.json({ ok: true, ...(await processOutreach(db)) });
  } catch (err) {
    console.error("[outreach send]", err);
    return NextResponse.json({ error: "Outreach send failed" }, { status: 500 });
  }
}
