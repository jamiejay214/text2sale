import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/email-campaigns";
import { emailConfigured } from "@/lib/telnyx-email";
import { processCampaign } from "@/lib/email-queue";

// Cron, every minute: send due emails for scheduled and sending campaigns
// (lib/email-queue.ts). Each campaign sends at most its hourly limit.

export const maxDuration = 300;
const BUDGET_MS = 200_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if ((req.headers.get("authorization") || "") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ ok: true, skipped: "email off" });

  const started = Date.now();
  const database = db();
  const { data: due } = await database
    .from("email_campaigns")
    .select("id")
    .in("status", ["Scheduled", "Sending"])
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(25);
  const results: Record<string, unknown> = {};
  for (const { id } of due || []) {
    if (Date.now() - started > BUDGET_MS) break;
    results[id] = await processCampaign(database, id).catch((e) => ({ error: e instanceof Error ? e.message : "failed" }));
  }
  return NextResponse.json({ ok: true, results });
}
