// ── Telnyx Email API ────────────────────────────────────────────────────────
// Customer email campaigns go out through Telnyx Email, from each customer's
// own domain, on the same Telnyx account as texting (TELNYX_API_KEY).
// Text2Sale's own mail (welcome, billing) stays on Resend
// (lib/email-sender.ts), so a customer's list can never hurt it.
//
// Email campaigns stay switched off until TELNYX_EMAIL_ENABLED=true, so
// having the texting key set doesn't turn email on by accident.
// Docs: https://developers.telnyx.com/docs/messaging/email/domains

const API = "https://api.telnyx.com/v2";

export type DnsRecord = { type: "TXT" | "MX" | "CNAME"; name: string; value: string; required?: boolean };

export type EmailDomain = { id: string; verified: boolean; records: DnsRecord[] };

export function emailConfigured(): boolean {
  return process.env.TELNYX_EMAIL_ENABLED === "true" && Boolean(process.env.TELNYX_API_KEY);
}

/** A Telnyx error with its code, e.g. "domain_graduation_limit_exceeded". */
export class TelnyxEmailError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

/** The new-domain warm-up cap or the account's daily quota: retry after midnight UTC, not a failure. */
export const isDailyLimit = (e: unknown) => e instanceof TelnyxEmailError && (e.code === "domain_graduation_limit_exceeded" || e.code === "10011");

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    // A hung request must not stall a whole send wave past the function's time limit.
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown; errors?: { detail?: string; title?: string; code?: string }[] };
  if (!res.ok) {
    const err = json.errors?.[0];
    throw new TelnyxEmailError(err?.detail || err?.title || `Telnyx email request failed (${res.status})`, String(err?.code || ""), res.status);
  }
  return json as T;
}

type DomainData = {
  id: string;
  status: string;
  usable_for_sending?: boolean;
  dns_records?: { record_type: string; host: string; value: string; required: boolean; status: string; purpose: string }[];
};

function toDomain(d: DomainData): EmailDomain {
  return {
    id: d.id,
    verified: d.status === "verified" && d.usable_for_sending !== false,
    records: (d.dns_records || [])
      // MX is only needed for inbound mail, which campaigns don't use.
      .filter((r) => r.purpose !== "mx" && r.status !== "not_required")
      .map((r) => ({ type: r.record_type as DnsRecord["type"], name: r.host, value: r.value, required: r.required })),
  };
}

/** Register a sending domain and return the DNS records to publish. */
export async function createEmailDomain(domain: string): Promise<EmailDomain> {
  const out = await call<{ data: DomainData }>("POST", "/email_domains", { domain, inbound_enabled: false });
  return toDomain(out.data);
}

/** Re-check the published DNS records. Only "verified" means the domain can send. */
export async function verifyEmailDomain(domainId: string): Promise<EmailDomain> {
  const out = await call<{ data: DomainData }>("POST", `/email_domains/${encodeURIComponent(domainId)}/verify`);
  return toDomain(out.data);
}

/** Remove a sending domain the customer replaced. */
export async function deleteEmailDomain(domainId: string): Promise<void> {
  await call("DELETE", `/email_domains/${encodeURIComponent(domainId)}`);
}

/** Send one email. Returns the Telnyx message id. */
export async function sendEmail(args: {
  from: string;
  fromName?: string | null;
  replyTo?: string | null;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  tag?: string;
  /** Message-ID of the email this answers, so it threads in the recipient's inbox. */
  inReplyTo?: string | null;
}): Promise<string> {
  const out = await call<{ data: { id: string } }>("POST", "/email_messages", {
    from: args.fromName ? { email: args.from, name: args.fromName } : args.from,
    to: [args.to],
    reply_to: args.replyTo || undefined,
    subject: args.subject,
    html_body: args.html,
    text_body: args.text,
    // One-click unsubscribe (RFC 8058), required by Gmail and Yahoo for bulk senders.
    headers: {
      "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      ...(args.inReplyTo ? { "In-Reply-To": args.inReplyTo, References: args.inReplyTo } : {}),
    },
    tags: args.tag ? [args.tag] : undefined,
  });
  return out.data?.id || "";
}

// ── Inboxes (replies) ───────────────────────────────────────────────────────
// Each sender gets an inbox on Telnyx's shared inbound domain (no DNS), used
// as the campaigns' Reply-To. lib/email-inbox.ts collects what arrives.

export type InboxMessage = {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  from: { email: string; name?: string | null } | null;
  subject: string | null;
  reply_text: string | null;
  text_body_url: string | null;
  received_at: string;
};

/** Create an inbox; returns its id and full address. */
export async function createInbox(username: string): Promise<{ id: string; address: string }> {
  const out = await call<{ data: { id: string; address: string } }>("POST", "/email_inboxes", { username });
  return { id: out.data.id, address: out.data.address };
}

/** The newest messages in an inbox (newest first). */
export async function listInboxMessages(inboxId: string, pageSize = 25): Promise<InboxMessage[]> {
  const out = await call<{ data: InboxMessage[] }>("GET", `/email_inboxes/${encodeURIComponent(inboxId)}/messages?page_size=${pageSize}`);
  return out.data || [];
}

/** A stored message body (text_body_url), when a message has no extracted reply text. */
export async function fetchInboxText(url: string): Promise<string> {
  const res = await fetch(url, { headers: url.startsWith(API) ? { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` } : {} });
  if (!res.ok) return "";
  return (await res.text()).slice(0, 20000);
}

/** Messages already accepted by Telnyx with this tag: their ids and recipient addresses. */
export async function listSentByTag(tag: string, maxPages = 100): Promise<{ id: string; to: string[] }[]> {
  const out: { id: string; to: string[] }[] = [];
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const q = `filter[tags]=${encodeURIComponent(tag)}&page_size=100${cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await call<{ data: { id: string; to?: { email: string }[] }[]; meta?: { page_cursor?: string } }>("GET", `/email_messages?${q}`);
    for (const m of res.data || []) out.push({ id: m.id, to: (m.to || []).map((t) => String(t.email || "").toLowerCase()) });
    cursor = res.meta?.page_cursor || "";
    if (!cursor || !(res.data || []).length) break;
  }
  return out;
}

// ── Delivery events ─────────────────────────────────────────────────────────

export const TRACKED_EVENTS = ["email.delivered", "email.bounced", "email.complained", "email.unsubscribed", "email.opened", "email.clicked"];

export type EmailEvent = {
  id: string;
  event_type: string;
  canonical_event_type?: string;
  occurred_at: string;
  payload?: { id?: string; to?: { email?: string } | { email?: string }[]; status?: string };
};

/** Subscribe a sending domain's delivery events to our webhook. Returns the webhook id. */
export async function createDomainWebhook(domainId: string, url: string): Promise<string> {
  const out = await call<{ data: { id: string } }>("POST", `/email_domains/${encodeURIComponent(domainId)}/webhooks`, { url, events: TRACKED_EVENTS });
  return out.data.id;
}

/** Account email events since a time (oldest first), to catch up on events from before the webhook existed. */
export async function listEmailEvents(from: string, maxPages = 50): Promise<EmailEvent[]> {
  const out: EmailEvent[] = [];
  const types = TRACKED_EVENTS.map((t) => t.replace(/^email\./, "")).join(",");
  let cursor = "";
  for (let page = 0; page < maxPages; page++) {
    const q = `from=${encodeURIComponent(from)}&event_type=${types}&page_size=100${cursor ? `&page[cursor]=${encodeURIComponent(cursor)}` : ""}`;
    const res = await call<{ data: EmailEvent[]; meta?: { page_cursor?: string; next_cursor?: string } }>("GET", `/email_events?${q}`);
    out.push(...(res.data || []));
    cursor = res.meta?.page_cursor || res.meta?.next_cursor || "";
    if (!cursor || !(res.data || []).length) break;
  }
  return out;
}
