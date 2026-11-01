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
import { isAccountBlocked, isDailyLimit, listSentByTag, sendEmail } from "@/lib/telnyx-email";
import { EMAIL_FROM, SUPPORT_EMAIL } from "@/lib/email-sender";
import { OWNER_EMAIL } from "@/lib/owner";
import { shouldPause } from "@/lib/email-events";
import { zonedTimeToUtc } from "@/lib/email-schedule";
import { uploadEmails, uploadPhones } from "@/lib/upload-phones";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/** Contacts in ANY of these lead lists, tags, lead sources or uploaded files; null = everyone with an email. */
export type Audience = { lists: string[]; tags: string[]; sources?: string[]; uploads?: string[] };

const PER_SECOND = Math.max(1, Number(process.env.TELNYX_EMAIL_MAX_PER_SECOND) || 10);
/** Most emails one run sends for one campaign, to stay inside the function time limit. */
export const MAX_WAVE = 600;
/** Rows that reached Telnyx; delivery events later move "sent" on to the other three. */
export const SENT_STATUSES = ["sent", "delivered", "bounced", "complained"];
/** How soon emails held by a Telnyx account problem are tried again. */
export const BLOCKED_RETRY_MS = 15 * 60_000;
export const BLOCKED_NOTE = "Email sending is temporarily unavailable. Your emails are held and retried automatically every 15 minutes; you aren't charged until they send.";
/** Longer than any request that runs a wave (maxDuration 300s), so a lease never lapses mid-send. */
const LEASE_MS = 6 * 60 * 1000;
/** A wave stops starting new batches after this; whatever is left stays queued for the next run. */
const WAVE_BUDGET_MS = 120_000;

/** Daily limits reset at midnight UTC; resume a few minutes after. */
export function nextDailyReset(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 0, 5));
}
const PAGE = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? [...new Set(v.map((s) => String(s ?? "").trim()).filter(Boolean))].slice(0, max).map((s) => s.slice(0, 200)) : [];

export function normalizeAudience(a: unknown): Audience | null {
  if (!a || typeof a !== "object") return null;
  const lists = strings((a as Audience).lists, 20);
  const tags = strings((a as Audience).tags, 20);
  const sources = strings((a as Audience).sources, 50);
  const uploads = strings((a as Audience).uploads, 30).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  return lists.length || tags.length || sources.length || uploads.length ? { lists, tags, sources, uploads } : null;
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
  // Uploaded files: match the file's phone numbers and email addresses to contacts.
  const phones: string[] = [];
  const emails: string[] = [];
  if (audience.uploads?.length) {
    const { data: files } = await database.from("csv_uploads").select("file_content").eq("user_id", userId).in("id", audience.uploads);
    for (const f of files || []) {
      if (!f.file_content) continue;
      phones.push(...uploadPhones(f.file_content));
      // Emails as written and lowercased (contacts keep the case they were imported with).
      for (const e of uploadEmails(f.file_content)) emails.push(e, e.toLowerCase());
    }
  }
  const chunk = (values: string[]) => {
    const unique = [...new Set(values)];
    const out: string[][] = [];
    for (let i = 0; i < unique.length; i += 300) out.push(unique.slice(i, i + 300));
    return out;
  };
  const phoneChunks = chunk(phones);
  const emailChunks = chunk(emails);
  const groups = await Promise.all([
    audience.lists.length ? all((q) => q.in("campaign", audience.lists)) : Promise.resolve([]),
    ...audience.tags.map((tag) => all((q) => q.contains("tags", [tag]))),
    audience.sources?.length ? all((q) => q.in("lead_source", audience.sources)) : Promise.resolve([]),
    ...phoneChunks.map((part) => all((q) => q.in("phone", part))),
    ...emailChunks.map((part) => all((q) => q.in("email", part))),
  ]);
  const byId = new Map<string, AudienceRow>();
  for (const row of groups.flat()) byId.set(row.id, row);
  return [...byId.values()];
}

async function suppressionMap(database: Db, userId: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data } = await database.from("email_suppressions").select("email, reason").eq("user_id", userId).order("email", { ascending: true }).range(from, from + PAGE - 1);
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
 * Tell the platform owner the Telnyx account can't send. It stops email (and
 * texting) for every customer, so it's worth an email, at most one every 6
 * hours (Resend drops repeats of the same idempotency key).
 */
async function alertOwnerBlocked(error: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const window = Math.floor(Date.now() / (6 * 3_600_000));
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `telnyx-account-blocked-${window}` },
    body: JSON.stringify({
      from: EMAIL_FROM,
      reply_to: SUPPORT_EMAIL,
      to: [OWNER_EMAIL],
      subject: "Action needed: Telnyx can't send for Text2Sale",
      text: `Telnyx rejected an email campaign send with:\n\n${error}\n\nThis usually means the Telnyx account balance ran out, and it affects texting and calls for every customer too. Add funds in the Telnyx portal (Billing). Queued campaign emails are held and retry every 15 minutes; customers aren't charged until they send.\n\n— Text2Sale`,
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined);
}

/**
 * Send the campaign's due emails, up to its hourly limit. Safe to call from
 * overlapping cron runs: a short lease on the campaign lets only one send.
 */
export async function processCampaign(database: Db, campaignId: string): Promise<{ sent: number; failed: number; skipped: number; outOfFunds?: boolean; done?: boolean }> {
  const now = new Date();
  const { data: before } = await database.from("email_campaigns").select("locked_until").eq("id", campaignId).maybeSingle();
  // A lease that was never released means the last run was cut off mid-send.
  const interrupted = Boolean(before?.locked_until);
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
      await finish({ status: "Paused", pause_reason: !account.ok ? `Paused: ${account.error}` : "Paused: verify your sending domain, then resume." });
      return { sent: 0, failed: 0, skipped: 0 };
    }

    // After a cut-off run, mark whatever Telnyx already accepted as sent before
    // anything else goes out, so nobody gets the same email twice. A run sends
    // at most one wave, so the newest 1,000 accepted messages cover it.
    if (interrupted) {
      const accepted = await listSentByTag(`campaign:${campaignId}`, 10);
      const byEmail = new Map<string, string>();
      for (const m of accepted) for (const to of m.to) byEmail.set(to, m.id);
      const emails = [...byEmail.keys()];
      const at = new Date().toISOString();
      for (let i = 0; i < emails.length; i += 200) {
        const { data: rows } = await database.from("email_sends").select("id, email").eq("campaign_id", campaignId).eq("status", "queued").in("email", emails.slice(i, i + 200));
        await Promise.all((rows || []).map((r: { id: string; email: string }) => database.from("email_sends").update({ status: "sent", provider_message_id: byEmail.get(r.email), sent_at: at }).eq("id", r.id).eq("status", "queued")));
      }
    }

    // Stop a campaign whose bounces or spam complaints are climbing (lib/email-events.ts).
    const tally = async (statuses: string[]) =>
      (await database.from("email_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", statuses)).count || 0;
    const [sentSoFar, bouncedSoFar, complainedSoFar] = await Promise.all([tally(SENT_STATUSES), tally(["bounced"]), tally(["complained"])]);
    const healthPause = campaign.health_override ? null : shouldPause({ sent: sentSoFar, bounced: bouncedSoFar, complained: complainedSoFar });
    if (healthPause) {
      await finish({ status: "Paused", pause_reason: healthPause });
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

    if (campaign.status === "Scheduled") await database.from("email_campaigns").update({ status: "Sending" }).eq("id", campaignId).eq("status", "Scheduled");

    const toSend = sendRows;

    const ids = toSend.map((r) => r.contact_id).filter(Boolean);
    const { data: contacts } = ids.length
      ? await database.from("contacts").select("id, first_name, last_name, city, state").in("id", ids)
      : { data: [] };
    const byId = new Map((contacts || []).map((c: { id: string }) => [c.id, c]));
    const from = `${sender.from_local}@${sender.domain}`;
    const fromName = String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null;
    const agentName = String(campaign.design?.signature || sender.from_name || "").split("\n")[0].trim();

    // Pay for each small batch before sending it, and save its results right
    // away: a run cut off mid-wave loses at most the batch in flight.
    const waveStarted = Date.now();
    let outOfFunds = false;
    let limitedUntil: string | null = null;
    let accountError: string | null = null;
    let stopped = false;
    for (let i = 0; i < toSend.length; i += PER_SECOND) {
      if (Date.now() - waveStarted > WAVE_BUDGET_MS) break;
      // Cancel or pause takes effect before the next batch, not after the whole wave.
      if (i > 0) {
        const { data: live } = await database.from("email_campaigns").select("status").eq("id", campaignId).maybeSingle();
        if (live && live.status !== "Scheduled" && live.status !== "Sending") {
          stopped = true;
          break;
        }
      }
      const started = Date.now();
      const batch = toSend.slice(i, i + PER_SECOND);
      const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(batch.length) });
      if (bal === null || bal === undefined) {
        outOfFunds = true;
        break;
      }
      const out = await Promise.all(
        batch.map(async (row) => {
          try {
            const contact = { ...((row.contact_id && byId.get(row.contact_id)) || {}), agent_name: agentName };
            const footer = footerFor(account, campaign.design, unsubscribeUrl(userId, row.email));
            const msg = buildEmail({ subject: campaign.subject, previewText: campaign.preview_text, body: campaign.body, design: campaign.design, contact, footer });
            const id = await sendEmail({ from, fromName, replyTo: sender.inbox_address || sender.reply_to, to: row.email, tag: `campaign:${campaignId}`, subject: msg.subject, html: msg.html, text: msg.text, unsubscribeUrl: footer.unsubscribeUrl });
            return { id: row.id, status: "sent" as const, provider_message_id: id || null, error: null };
          } catch (e) {
            const error = (e instanceof Error ? e.message : "send failed").slice(0, 300);
            // Daily limit (new-domain warm-up or account quota): keep it queued for after the reset.
            if (isDailyLimit(e)) return { id: row.id, status: "deferred" as const, provider_message_id: null, error };
            // The Telnyx account can't send (deactivated, out of funds): hold it and retry soon.
            if (isAccountBlocked(e)) return { id: row.id, status: "held" as const, provider_message_id: null, error };
            return { id: row.id, status: "failed" as const, provider_message_id: null, error };
          }
        }),
      );
      const at = new Date().toISOString();
      const held = out.some((r) => r.status === "held");
      const resume = held ? new Date(Date.now() + BLOCKED_RETRY_MS).toISOString() : nextDailyReset().toISOString();
      await Promise.all(
        out.map((r) =>
          r.status === "deferred" || r.status === "held"
            ? database.from("email_sends").update({ send_after: r.status === "held" ? resume : nextDailyReset().toISOString(), error: r.error }).eq("id", r.id)
            : database.from("email_sends").update({ status: r.status, provider_message_id: r.provider_message_id, error: r.error, sent_at: at }).eq("id", r.id),
        ),
      );
      const notSent = out.filter((r) => r.status !== "sent").length;
      if (notSent) {
        await database.rpc("credit_wallet", {
          p_user_id: userId,
          p_amount: emailCost(notSent),
          // Unique per attempt: a row that is held or deferred and fails again later gets its own refund.
          p_idempotency_key: `email_refund_${campaignId}_${batch[0].id}_${started}`,
          p_description: `Refund — ${notSent} email(s) not sent`,
        });
      }
      if (held) accountError = out.find((r) => r.status === "held")?.error || "Telnyx account can't send";
      if (held || out.some((r) => r.status === "deferred")) {
        // Everything else due now waits too: until the daily reset, or the next retry.
        limitedUntil = resume;
        const rest = toSend.slice(i + PER_SECOND).map((r) => r.id);
        for (let j = 0; j < rest.length; j += 200) await database.from("email_sends").update({ send_after: resume }).in("id", rest.slice(j, j + 200));
        break;
      }
      const wait = 1000 - (Date.now() - started);
      if (wait > 0 && i + PER_SECOND < toSend.length) await sleep(wait);
    }

    // Totals come from the rows themselves, so they stay right even after a cut-off run.
    const count = async (statuses: string[]) =>
      (await database.from("email_sends").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", statuses)).count || 0;
    // Delivery events move sent rows on to delivered / bounced / complained; they still count as sent.
    const [sentTotal, failedTotal, skippedRows, left] = await Promise.all([count(SENT_STATUSES), count(["failed"]), count(["skipped"]), count(["queued"])]);
    const sent = Math.max(0, sentTotal - campaign.sent);
    const failed = Math.max(0, failedTotal - campaign.failed);
    await finish({
      status: outOfFunds ? "Paused" : left ? "Sending" : "Sent",
      // A campaign cancelled or paused mid-wave keeps whatever reason it was given.
      ...(stopped ? {} : { pause_reason: outOfFunds ? "Paused: add funds to your wallet, then resume." : accountError ? BLOCKED_NOTE : null }),
      ...(limitedUntil ? { scheduled_at: limitedUntil } : {}),
      recipients: sentTotal + failedTotal,
      sent: sentTotal,
      failed: failedTotal,
      skipped: Math.max(campaign.skipped + skipRows.length, skippedRows),
      cost: Number(emailCost(sentTotal).toFixed(4)),
      sent_at: left ? campaign.sent_at : new Date().toISOString(),
    });
    if (accountError) await alertOwnerBlocked(accountError);
    if (outOfFunds) return { sent, failed, skipped: skipRows.length, outOfFunds: true };
    return { sent, failed, skipped: skipRows.length, done: !left };
  } catch (e) {
    console.error("[email-queue]", campaignId, e);
    await finish({});
    throw e;
  }
}
