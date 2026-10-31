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

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: unknown; errors?: { detail?: string; title?: string; code?: string }[] };
  if (!res.ok) {
    const err = json.errors?.[0];
    throw new Error(err?.detail || err?.title || `Telnyx email request failed (${res.status})`);
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
}): Promise<string> {
  const out = await call<{ data: { id: string } }>("POST", "/email_messages", {
    from: args.fromName ? { email: args.from, name: args.fromName } : args.from,
    to: [args.to],
    reply_to: args.replyTo || undefined,
    subject: args.subject,
    html_body: args.html,
    text_body: args.text,
    // One-click unsubscribe (RFC 8058), required by Gmail and Yahoo for bulk senders.
    headers: { "List-Unsubscribe": `<${args.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    tags: args.tag ? [args.tag] : undefined,
  });
  return out.data?.id || "";
}
