// ── Email replies ───────────────────────────────────────────────────────────
// Campaign emails use the sender's Telnyx inbox as their Reply-To. The poll
// cron (/api/email/inbox/poll) collects new replies into the contact's
// conversation, next to their texts, and emails the customer a heads-up.
// Replies from people this account never emailed are ignored, so the inbox
// can't be used to inject strangers into the CRM.

import { createInbox, fetchInboxText, listInboxMessages, type InboxMessage } from "@/lib/telnyx-email";
import { normalizeEmail } from "@/lib/email-content";
import { EMAIL_FROM, SUPPORT_EMAIL } from "@/lib/email-sender";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

type SenderRow = {
  user_id: string;
  status: string;
  from_name: string | null;
  reply_to: string | null;
  inbox_id: string | null;
  inbox_address: string | null;
  inbox_polled_at: string | null;
  notify_replies: boolean | null;
};

/** "unsubscribe", "remove me", "stop emailing me"... as the whole reply's first line. */
export function isUnsubscribeReply(text: string): boolean {
  const first = String(text || "").trim().split(/\r?\n/)[0].trim().toLowerCase().replace(/[.!]+$/, "");
  return /^(unsubscribe|remove me|remove|stop|stop emailing me|take me off( your list)?|please remove me|opt out)$/.test(first);
}

/** "Re: subject", without stacking "Re: Re:". */
export function replySubject(subject: string | null | undefined, fallback: string): string {
  const s = String(subject || "").replace(/[\r\n]+/g, " ").trim();
  if (!s) return fallback;
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

/** Strip quoted history from a plain-text body when Telnyx gives no reply_text. */
export function stripQuoted(text: string): string {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line) || /^On .+wrote:\s*$/.test(line) || /^-{2,}\s*Original Message/i.test(line) || /^From: /.test(line)) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

/** Give a verified sender its reply inbox (once). Returns the inbox address, or null. */
export async function ensureInbox(database: Db, userId: string): Promise<string | null> {
  const { data: sender } = await database.from("email_senders").select("status, inbox_id, inbox_address").eq("user_id", userId).maybeSingle();
  if (!sender || sender.status !== "verified") return null;
  if (sender.inbox_id && sender.inbox_address) return sender.inbox_address;
  const username = `r-${userId.replace(/-/g, "").slice(0, 12)}`;
  const inbox = await createInbox(username);
  await database.from("email_senders").update({ inbox_id: inbox.id, inbox_address: inbox.address, inbox_polled_at: new Date().toISOString() }).eq("user_id", userId);
  return inbox.address;
}

async function notifyCustomer(to: string | null, from: string, subject: string, text: string, id: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com").replace(/\/$/, "");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `email-reply-${id}` },
    body: JSON.stringify({
      from: EMAIL_FROM,
      reply_to: SUPPORT_EMAIL,
      to: [to],
      subject: `New email reply from ${from}`,
      text: `${from} replied to your email${subject ? ` "${subject}"` : ""}:\n\n${text.slice(0, 2000)}\n\nReply in Text2Sale: ${base}/dashboard?view=conversations\n\n— Text2Sale`,
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined);
}

/** Store one inbound email in its contact's conversation. Returns false when skipped. */
async function ingest(database: Db, sender: SenderRow, msg: InboxMessage): Promise<boolean> {
  const email = normalizeEmail(msg.from?.email);
  if (!email) return false;
  const userId = sender.user_id;

  // Only people this account emailed (or already has as a contact).
  const { data: contacts } = await database.from("contacts").select("id, first_name, last_name").eq("user_id", userId).ilike("email", email).limit(1);
  let contact = contacts?.[0] || null;
  if (!contact) {
    const { data: sent } = await database.from("email_sends").select("contact_id").eq("user_id", userId).eq("email", email).not("contact_id", "is", null).limit(1);
    if (sent?.[0]?.contact_id) {
      const { data: c } = await database.from("contacts").select("id, first_name, last_name").eq("id", sent[0].contact_id).maybeSingle();
      contact = c;
    }
  }
  if (!contact) return false;

  let body = String(msg.reply_text || "").trim();
  if (!body && msg.text_body_url) body = stripQuoted(await fetchInboxText(msg.text_body_url).catch(() => ""));
  if (!body) body = "(No message text)";
  body = body.slice(0, 5000);
  const subject = String(msg.subject || "").slice(0, 300) || null;
  const at = msg.received_at || new Date().toISOString();

  const { data: convs } = await database.from("conversations").select("id, unread").eq("contact_id", contact.id).order("last_message_at", { ascending: false }).limit(1);
  let conversationId: string | null = convs?.[0]?.id || null;
  const preview = `Email: ${body}`.slice(0, 100);
  if (!conversationId) {
    const { data: created } = await database
      .from("conversations")
      .insert({ user_id: userId, contact_id: contact.id, preview, unread: 1, last_message_at: at, replied_at: at })
      .select("id")
      .single();
    conversationId = created?.id || null;
  }
  if (!conversationId) return false;

  const { error } = await database.from("messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    body,
    status: "received",
    channel: "email",
    email_subject: subject,
    email_message_id: msg.message_id ? String(msg.message_id).slice(0, 500) : null,
    email_address: email,
    telnyx_message_id: msg.id,
    created_at: at,
  });
  if (error) return false; // already stored (unique on the Telnyx id)

  if (convs?.[0]) {
    await database
      .from("conversations")
      .update({ preview, unread: (Number(convs[0].unread) || 0) + 1, last_message_at: at, replied_at: at, archived: false })
      .eq("id", conversationId);
  }
  if (isUnsubscribeReply(body)) {
    await database.from("email_suppressions").upsert({ user_id: userId, email, reason: "unsubscribe" }, { onConflict: "user_id,email", ignoreDuplicates: true });
  }
  if (sender.notify_replies !== false) {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || msg.from?.name || email;
    await notifyCustomer(sender.reply_to, name, subject || "", body, msg.id);
  }
  return true;
}

/** Collect new replies for one sender. */
export async function pollInbox(database: Db, sender: SenderRow): Promise<number> {
  if (!sender.inbox_id) return 0;
  const since = sender.inbox_polled_at ? new Date(sender.inbox_polled_at).getTime() - 10 * 60 * 1000 : 0;
  const polledAt = new Date().toISOString();
  const messages = await listInboxMessages(sender.inbox_id);
  let stored = 0;
  for (const msg of messages.reverse()) {
    if (Date.parse(msg.received_at) < since) continue;
    if (await ingest(database, sender, msg)) stored++;
  }
  await database.from("email_senders").update({ inbox_polled_at: polledAt }).eq("user_id", sender.user_id);
  return stored;
}
