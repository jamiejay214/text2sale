// ── Owner outreach sender ──────────────────────────────────────────────────
// The morning growth routine writes one personalized email per prospect into
// outreach_emails. This sends the due ones through the account's verified
// Telnyx email sender, a few per run and a capped number per day, skipping
// anyone who unsubscribed. Each row is claimed (queued -> sending) before it
// is sent, so overlapping runs can never email the same person twice.

import { sendEmail } from "@/lib/telnyx-email";
import { unsubscribeUrl } from "@/lib/email-campaigns";
import { normalizeEmail } from "@/lib/email-content";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/** Most outreach emails one account sends per UTC day. */
export const DAILY_CAP = Number(process.env.OUTREACH_DAILY_CAP || 500);
/** Most sent per cron run, so sends trickle out instead of bursting. */
export const PER_RUN = 10;

type Row = { id: string; user_id: string; to_email: string; subject: string; html: string; text_body: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Adds a working one-click unsubscribe link to the email (CAN-SPAM). */
export function withUnsubscribe(html: string, text: string, url: string): { html: string; text: string } {
  const link = `<p style="font-size:12px;color:#6b7280;"><a href="${escapeHtml(url)}" style="color:#6b7280;">Unsubscribe</a></p>`;
  const closing = html.lastIndexOf("</div>");
  return {
    html: closing >= 0 ? html.slice(0, closing) + link + html.slice(closing) : html + link,
    text: `${text}\n\nUnsubscribe: ${url}`,
  };
}

export async function processOutreach(database: Db, now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  const { data: due, error } = await database
    .from("outreach_emails")
    .select("id, user_id, to_email, subject, html, text_body")
    .eq("status", "queued")
    .lte("send_after", now.toISOString())
    .order("send_after", { ascending: true })
    .limit(PER_RUN * 5);
  if (error) throw error;
  const byUser = new Map<string, Row[]>();
  for (const row of (due || []) as Row[]) byUser.set(row.user_id, [...(byUser.get(row.user_id) || []), row]);

  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  for (const [userId, rows] of byUser) {
    const { data: sender } = await database.from("email_senders").select("from_local, domain, from_name, reply_to, status").eq("user_id", userId).maybeSingle();
    if (!sender || sender.status !== "verified") continue; // stays queued until the sender is verified
    const { count: sentToday } = await database
      .from("outreach_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["sending", "sent"])
      .gte("sent_at", dayStart);
    const allowance = Math.min(PER_RUN, DAILY_CAP - (sentToday || 0));
    if (allowance <= 0) continue;

    const batch = rows.slice(0, allowance);
    const emails = batch.map((r) => normalizeEmail(r.to_email)).filter((e): e is string => Boolean(e));
    const { data: blocked } = emails.length
      ? await database.from("email_suppressions").select("email").eq("user_id", userId).in("email", emails)
      : { data: [] };
    const blockedSet = new Set((blocked || []).map((b: { email: string }) => b.email));

    for (const row of batch) {
      const email = normalizeEmail(row.to_email);
      if (!email || blockedSet.has(email)) {
        await database.from("outreach_emails").update({ status: "skipped", error: email ? "Unsubscribed" : "Invalid address" }).eq("id", row.id).eq("status", "queued");
        result.skipped++;
        continue;
      }
      // Claim the row first; if another run already took it, move on.
      const { data: claimed } = await database
        .from("outreach_emails")
        .update({ status: "sending", sent_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "queued")
        .select("id");
      if (!claimed?.length) continue;
      try {
        const unsub = unsubscribeUrl(userId, email);
        const body = withUnsubscribe(row.html, row.text_body, unsub);
        const id = await sendEmail({
          from: `${sender.from_local}@${sender.domain}`,
          fromName: String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null,
          replyTo: sender.reply_to || null,
          to: email,
          subject: row.subject.replace(/[\r\n]/g, " ").trim(),
          html: body.html,
          text: body.text,
          unsubscribeUrl: unsub,
          tag: "outreach",
        });
        await database.from("outreach_emails").update({ status: "sent", provider_message_id: id || null, sent_at: new Date().toISOString() }).eq("id", row.id);
        result.sent++;
      } catch (err) {
        await database.from("outreach_emails").update({ status: "failed", error: err instanceof Error ? err.message.slice(0, 500) : "Send failed" }).eq("id", row.id);
        result.failed++;
      }
    }
  }
  return result;
}
