import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/email-campaigns";
import { emailConfigured } from "@/lib/telnyx-email";
import { ensureInbox, pollInbox } from "@/lib/email-inbox";
import { ensureEventWebhook } from "@/lib/email-events";

// Cron, every minute: give verified senders a reply inbox and a delivery-event
// webhook (catching up on earlier events once), and collect new email replies
// into Conversations (lib/email-inbox.ts, lib/email-events.ts).

export const maxDuration = 120;
const BUDGET_MS = 90_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if ((req.headers.get("authorization") || "") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ ok: true, skipped: "email off" });

  const started = Date.now();
  const database = db();
  const { data: senders } = await database
    .from("email_senders")
    .select("user_id, status, from_name, reply_to, inbox_id, inbox_address, inbox_polled_at, notify_replies, provider_domain_id, webhook_id, events_backfilled_at, verified_at")
    .eq("status", "verified")
    .or(`inbox_polled_at.is.null,inbox_polled_at.lte.${new Date().toISOString()}`)
    .order("inbox_polled_at", { ascending: true, nullsFirst: true })
    .limit(100);
  let stored = 0;
  const errors: string[] = [];
  for (const sender of senders || []) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      if (!sender.inbox_id) {
        try {
          await ensureInbox(database, sender.user_id);
        } catch (e) {
          // Back off an hour so a sender whose inbox can't be created isn't retried every minute.
          await database.from("email_senders").update({ inbox_polled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() }).eq("user_id", sender.user_id);
          throw e;
        }
        continue; // collect from the next run
      }
      stored += await pollInbox(database, sender);
      if (!sender.webhook_id || !sender.events_backfilled_at) {
        await ensureEventWebhook(database, sender).catch((e) => errors.push(`${sender.user_id.slice(0, 8)} events: ${e instanceof Error ? e.message : "failed"}`));
      }
    } catch (e) {
      errors.push(`${sender.user_id.slice(0, 8)}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  if (errors.length) console.warn("[email/inbox/poll]", errors);
  return NextResponse.json({ ok: true, stored, errors: errors.length });
}
