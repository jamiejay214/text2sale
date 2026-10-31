// ── Email campaign queue ────────────────────────────────────────────────────
// Scheduling a campaign queues one email_sends row per recipient (status
// 'queued', send_after = when it may go out: a fixed time, or a local time in
// each contact's own time zone). processCampaign() then sends due rows in
// waves, at most hourly_limit per hour, from the once-a-minute cron and right
// after scheduling.
//
// Pay first: each wave is charged to the wallet before anything reaches
// Telnyx, and failed emails are refunded. Suppressed addresses (unsubscribed,
// bounced, complained) are skipped when queued and again when sent.

import { inferTimezone } from "@/lib/quiet-hours";
import { buildEmail, emailCost, normalizeEmail } from "@/lib/email-content";
import { footerFor } from "@/lib/email-design";
import { emailAccount, unsubscribeUrl } from "@/lib/email-campaigns";
import { sendEmail } from "@/lib/telnyx-email";
import { zonedTimeToUtc } from "@/lib/email-schedule";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type Audience = { lists: string[]; tags: string[] };

const PER_SECOND = Math.max(1, Number(process.env.TELNYX_EMAIL_MAX_PER_SECOND) || 10);
/** Most emails one run sends for one campaign, to stay inside the function time limit. */
export const MAX_WAVE = 600;
const LEASE_MS = 4 * 60 * 1000;
const PAGE = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? [...new Set(v.map((s) => String(s ?? "").trim()).filter(Boolean))].slice(0, max).map((s) => s.slice(0, 200)) : [];

export function normalizeAudience(a: unknown): Audience | null {
  if (!a || typeof a !== "object") return null;
  const lists = strings((a as Audience).lists, 20);
  const tags = strings((a as Audience).tags, 20);
  return lists.length || tags.length ? { lists, tags } : null;
}

type AudienceRow = { id: string; email: string | null; state: string | null };

/** Contacts with an email who may be emailed: in any of the lists or tags (or everyone). */
export async function audienceContacts(database: Db, userId: string, audience: Audience | null): Promise<AudienceRow[]> {
  const all = async (narrow: (q: any) => any) => {
    const out: AudienceRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const q = narrow(database.from("contacts").select("id, email, state").eq("user_id", userId).eq("dnc", false).like("email", "%@%"));
      const { data, error } = await q.order("id", { ascending: true }).range(from, from + PAGE - 1);
      if (error) throw error;
      out.push(...((data || []) as AudienceRow[]));
      if (!data || data.length < PAGE) return out;
    }
  };
  if (!audience) return all((q) => q);
  const groups = await Promise.all([
    audience.lists.length ? all((q) => q.in("campaign", audience.lists)) : Promise.resolve([]),
    ...audience.tags.map((tag) => all((q) => q.contains("tags", [tag]))),
  ]);
  const byId = new Map<string, AudienceRow>();
  for (const row of groups.flat()) byId.set(row.id, row);
  return [...byId.values()];
}

async function suppressionMap(database: Db, userId: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data } = await database.from("email_suppressions").select("email, reason").eq("user_id", userId).range(from, from + PAGE - 1);
    for (const r of data || []) out.set(r.email, r.reason);
    if (!data || data.length < PAGE) return out;
  }
}

/** Unique addresses in the audience, split into who'll receive it and who's suppressed. */
export async function audienceSummary(database: Db, userId: string, audience: Audience | null) {
  const [contacts, suppressed] = await Promise.all([audienceContacts(database, userId, audience), suppressionMap(database, userId)]);
  const seen = new Set<string>();
  const receive: (AudienceRow & { email: string })[] = [];
  let unsubscribed = 0;
  let bounced = 0;
  for (const c of contacts) {
    const email = normalizeEmail(c.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const reason = suppressed.get(email);
    if (reason === "unsubscribe") unsubscribed++;
    else if (reason) bounced++;
    else receive.push({ ...c, email });
  }
  return { receive, unsubscribed, bounced };
}

/** Queue every recipient. Returns how many were queued and the earliest send time. */
export async function queueCampaign(
  database: Db,
  userId: string,
  campaign: { id: string; audience: unknown; local_time: string | null; scheduled_at: string | null },
): Promise<{ queued: number; skipped: number; firstSendAt: string }> {
  const { receive, unsubscribed, bounced } = await audienceSummary(database, userId, normalizeAudience(campaign.audience));
  const fixed = campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date();
  const rows = receive.map((c) => ({
    user_id: userId,
    campaign_id: campaign.id,
    contact_id: c.id,
    email: c.email,
    status: "queued",
    send_after: (campaign.local_time ? zonedTimeToUtc(campaign.local_time, inferTimezone(c.state || undefined)) : fixed).toISOString(),
  }));
  for (let i = 0; i < rows.length; i += PAGE) {
    const { error } = await database.from("email_sends").upsert(rows.slice(i, i + PAGE), { onConflict: "campaign_id,email", ignoreDuplicates: true });
    if (error) throw error;
  }
  const firstSendAt = rows.reduce((min, r) => (r.send_after < min ? r.send_after : min), rows[0]?.send_after || fixed.toISOString());
  return { queued: rows.length, skipped: unsubscribed + bounced, firstSendAt };
}

type QueuedRow = { id: string; contact_id: string | null; email: string };

/**
 * Send the campaign's due emails, up to its hourly limit. Safe to call from
 * overlapping cron runs: a short lease on the campaign lets only one send.
 */
export async function processCampaign(database: Db, campaignId: string): Promise<{ sent: number; failed: number; skipped: number; outOfFunds?: boolean; done?: boolean }> {
  const now = new Date();
  const { data: campaign } = await database
    .from("email_campaigns")
    .update({ locked_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq("id", campaignId)
    .in("status", ["Scheduled", "Sending"])
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("*")
    .maybeSingle();
  if (!campaign) return { sent: 0, failed: 0, skipped: 0 };
  const userId: string = campaign.user_id;
  // Totals always land; a status change never overrides a cancel made mid-wave.
  const finish = async ({ status, ...patch }: Record<string, unknown>) => {
    await database.from("email_campaigns").update({ ...patch, locked_until: null, updated_at: new Date().toISOString() }).eq("id", campaignId);
    if (status) await database.from("email_campaigns").update({ status }).eq("id", campaignId).in("status", ["Scheduled", "Sending"]);
  };

  try {
    const account = await emailAccount(database, userId);
    const { data: sender } = await database.from("email_senders").select("*").eq("user_id", userId).maybeSingle();
    if (!account.ok || !sender || sender.status !== "verified") {
      await finish({ status: "Paused" });
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { count: lastHour } = await database
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .gte("sent_at", hourAgo);
    const allowance = Math.min(MAX_WAVE, Number(campaign.hourly_limit || 500) - (lastHour || 0));
    if (allowance <= 0) {
      await finish({});
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const { data: due } = await database
      .from("email_sends")
      .select("id, contact_id, email")
      .eq("campaign_id", campaignId)
      .eq("status", "queued")
      .lte("send_after", now.toISOString())
      .order("send_after", { ascending: true })
      .limit(allowance);
    const wave = (due || []) as QueuedRow[];
    if (!wave.length) {
      const { count: left } = await database.from("email_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "queued");
      if (!left) await finish({ status: "Sent", sent_at: campaign.sent_at || now.toISOString() });
      else await finish({});
      return { sent: 0, failed: 0, skipped: 0, done: !left };
    }

    // Anyone who unsubscribed or bounced since this was queued is skipped, free.
    const { data: blocked } = await database.from("email_suppressions").select("email").eq("user_id", userId).in("email", wave.map((r) => r.email));
    const blockedSet = new Set((blocked || []).map((r: { email: string }) => r.email));
    const skipRows = wave.filter((r) => blockedSet.has(r.email));
    const sendRows = wave.filter((r) => !blockedSet.has(r.email));
    if (skipRows.length) await database.from("email_sends").update({ status: "skipped" }).in("id", skipRows.map((r) => r.id));

    if (!sendRows.length) {
      await finish({ skipped: campaign.skipped + skipRows.length });
      return { sent: 0, failed: 0, skipped: skipRows.length };
    }

    const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(sendRows.length) });
    if (bal === null || bal === undefined) {
      await finish({ status: "Paused", skipped: campaign.skipped + skipRows.length });
      return { sent: 0, failed: 0, skipped: skipRows.length, outOfFunds: true };
    }
    if (campaign.status === "Scheduled") await database.from("email_campaigns").update({ status: "Sending" }).eq("id", campaignId).eq("status", "Scheduled");

    const ids = sendRows.map((r) => r.contact_id).filter(Boolean);
    const { data: contacts } = ids.length
      ? await database.from("contacts").select("id, first_name, last_name, city, state").in("id", ids)
      : { data: [] };
    const byId = new Map((contacts || []).map((c: { id: string }) => [c.id, c]));
    const from = `${sender.from_local}@${sender.domain}`;
    const fromName = String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null;
    const agentName = String(campaign.design?.signature || sender.from_name || "").split("\n")[0].trim();

    const results: { id: string; status: "sent" | "failed"; provider_message_id: string | null; error: string | null }[] = [];
    for (let i = 0; i < sendRows.length; i += PER_SECOND) {
      const started = Date.now();
      const batch = sendRows.slice(i, i + PER_SECOND);
      const out = await Promise.all(
        batch.map(async (row) => {
          try {
            const contact = { ...((row.contact_id && byId.get(row.contact_id)) || {}), agent_name: agentName };
            const footer = footerFor(account, campaign.design, unsubscribeUrl(userId, row.email));
            const msg = buildEmail({ subject: campaign.subject, previewText: campaign.preview_text, body: campaign.body, design: campaign.design, contact, footer });
            const id = await sendEmail({ from, fromName, replyTo: sender.inbox_address || sender.reply_to, to: row.email, tag: `campaign:${campaignId}`, subject: msg.subject, html: msg.html, text: msg.text, unsubscribeUrl: footer.unsubscribeUrl });
            return { id: row.id, status: "sent" as const, provider_message_id: id || null, error: null };
          } catch (e) {
            return { id: row.id, status: "failed" as const, provider_message_id: null, error: (e instanceof Error ? e.message : "send failed").slice(0, 300) };
          }
        }),
      );
      results.push(...out);
      const wait = 1000 - (Date.now() - started);
      if (wait > 0 && i + PER_SECOND < sendRows.length) await sleep(wait);
    }

    const sentAt = new Date().toISOString();
    for (let i = 0; i < results.length; i += 50) {
      await Promise.all(results.slice(i, i + 50).map((r) => database.from("email_sends").update({ status: r.status, provider_message_id: r.provider_message_id, error: r.error, sent_at: sentAt }).eq("id", r.id)));
    }
    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.length - sent;
    if (failed) {
      await database.rpc("credit_wallet", {
        p_user_id: userId,
        p_amount: emailCost(failed),
        p_idempotency_key: `email_refund_${campaignId}_${results[0].id}`,
        p_description: `Refund — ${failed} email(s) not sent`,
      });
    }
    const { count: left } = await database.from("email_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "queued");
    await finish({
      status: left ? "Sending" : "Sent",
      recipients: campaign.recipients + sent + failed,
      sent: campaign.sent + sent,
      failed: campaign.failed + failed,
      skipped: campaign.skipped + skipRows.length,
      cost: Number((Number(campaign.cost) + emailCost(sent)).toFixed(4)),
      sent_at: left ? campaign.sent_at : sentAt,
    });
    return { sent, failed, skipped: skipRows.length, done: !left };
  } catch (e) {
    console.error("[email-queue]", campaignId, e);
    await finish({});
    throw e;
  }
}
