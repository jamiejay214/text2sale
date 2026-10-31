// ── Email delivery events ───────────────────────────────────────────────────
// Telnyx reports what happened to each email (delivered, bounced, spam
// complaint, unsubscribed, opened, clicked) to /api/email/events, one webhook
// per sending domain. Events are matched to email_sends by Telnyx message id,
// so an event can only touch the account that sent that email. Bounces and
// complaints are suppressed for good; the queue pauses a campaign whose bounce
// or complaint rate climbs (shouldPause).

import { normalizeEmail } from "@/lib/email-content";
import { createDomainWebhook, listEmailEvents, type EmailEvent } from "@/lib/telnyx-email";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/** "email.delivered" / "delivered" → "delivered". */
export function eventKind(e: Pick<EmailEvent, "event_type" | "canonical_event_type">): string {
  return String(e.canonical_event_type || e.event_type || "").replace(/^email\./, "").toLowerCase();
}

/**
 * Pause a campaign when, after enough emails to judge, bounces pass 5% or
 * spam complaints pass 0.3% (the line Gmail and Yahoo hold bulk senders to).
 */
export function shouldPause(stats: { sent: number; bounced: number; complained: number }): string | null {
  if (stats.sent < 100) return null;
  if (stats.complained / stats.sent > 0.003) return `Paused automatically: spam complaints reached ${((stats.complained / stats.sent) * 100).toFixed(1)}% (limit 0.3%).`;
  if (stats.bounced / stats.sent > 0.05) return `Paused automatically: bounces reached ${((stats.bounced / stats.sent) * 100).toFixed(1)}% (limit 5%). Clean the list before resuming.`;
  return null;
}

/** Apply one event. Returns true when it matched an email we sent. */
export async function applyEvent(database: Db, event: EmailEvent): Promise<boolean> {
  const messageId = String(event.payload?.id || "");
  if (!messageId) return false;
  const kind = eventKind(event);
  const { data: row } = await database.from("email_sends").select("id, user_id, email, status, delivered_at, opened_at, clicked_at").eq("provider_message_id", messageId).maybeSingle();
  if (!row) return false;
  const at = event.occurred_at || new Date().toISOString();
  const patch: Record<string, unknown> = {};
  let suppress: "bounce" | "complaint" | "unsubscribe" | null = null;

  if (kind === "delivered") {
    if (!row.delivered_at) patch.delivered_at = at;
    if (row.status === "sent") patch.status = "delivered";
  } else if (kind === "bounced") {
    patch.status = "bounced";
    suppress = "bounce";
  } else if (kind === "complained") {
    patch.status = "complained";
    suppress = "complaint";
  } else if (kind === "unsubscribed") {
    suppress = "unsubscribe";
  } else if (kind === "opened") {
    if (!row.opened_at) patch.opened_at = at;
  } else if (kind === "clicked") {
    if (!row.clicked_at) patch.clicked_at = at;
    if (!row.opened_at) patch.opened_at = at; // a click means it was opened
  } else {
    return false;
  }

  if (Object.keys(patch).length) await database.from("email_sends").update(patch).eq("id", row.id);
  const email = normalizeEmail(row.email);
  if (suppress && email) {
    // A complaint outranks an earlier unsubscribe or bounce.
    await database.from("email_suppressions").upsert({ user_id: row.user_id, email, reason: suppress }, { onConflict: "user_id,email", ignoreDuplicates: suppress !== "complaint" });
  }
  return true;
}

/** Subscribe a verified sender's domain to delivery events and catch up on what happened before. */
export async function ensureEventWebhook(database: Db, sender: { user_id: string; provider_domain_id: string | null; webhook_id: string | null; verified_at: string | null }): Promise<number> {
  if (!sender.provider_domain_id) return 0;
  if (!sender.webhook_id) {
    const base = (process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com").replace(/\/$/, "");
    const id = await createDomainWebhook(sender.provider_domain_id, `${base}/api/email/events`);
    await database.from("email_senders").update({ webhook_id: id }).eq("user_id", sender.user_id);
  }
  // Events from before the webhook existed. Only events for this account's
  // own message ids match, so reading account-wide events is safe.
  const from = sender.verified_at || new Date(Date.now() - 7 * 86400_000).toISOString();
  let applied = 0;
  for (const event of await listEmailEvents(from)) if (await applyEvent(database, event)) applied++;
  await database.from("email_senders").update({ events_backfilled_at: new Date().toISOString() }).eq("user_id", sender.user_id);
  return applied;
}
