// Send a customer notification email through Resend. Kept separate from the
// pure templates in lib/customer-emails.ts so those stay import-free/testable.

import { EMAIL_FROM, SUPPORT_EMAIL } from "./email-sender";
import type { Email } from "./customer-emails";

/**
 * Deliver one customer email. Returns true only on a confirmed send.
 * Pass a stable idempotencyKey for events that should never double-send
 * (Resend dedupes on it for 24h).
 */
export async function sendCustomerEmail(to: string | null | undefined, email: Email, idempotencyKey?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const addr = (to || "").trim();
  if (!key || !addr) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: EMAIL_FROM, reply_to: SUPPORT_EMAIL, to: [addr], subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return !!res && res.ok;
}
