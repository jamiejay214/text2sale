// ── Email campaign content ────────────────────────────────────────────────
// Server helpers (no I/O) for campaign email: price, the signed unsubscribe
// token and address checks; rendering is re-exported from
// lib/email-design.ts. Tested in tests/email-content.test.mjs.

import { createHmac, timingSafeEqual } from "node:crypto";

// What customers pay per email, charged from the wallet before sending.
// Telnyx Email costs Text2Sale $0.0003 per email; change the price here only.
export const EMAIL_RATE = 0.003;

export const MAX_EMAIL_BODY = 20000;

// Rendering lives in lib/email-design.ts so the composer's live preview can
// use exactly what is sent.
export { buildEmail, bodyToHtml, footerText, personalize } from "./email-design";
export type { EmailDesign, Footer, MergeContact } from "./email-design";

// ── Unsubscribe tokens ─────────────────────────────────────────────────────
// token = base64url(userId|email) + "." + HMAC. Lets the unsubscribe link
// work without a login while making it impossible to unsubscribe someone
// else's contact by editing the URL.

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export function signUnsubscribe(userId: string, email: string, secret: string): string {
  const payload = b64(`${userId}|${email.toLowerCase()}`);
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUnsubscribe(token: string, secret: string): { userId: string; email: string } | null {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, email] = unb64(payload).split("|");
  if (!userId || !email || !email.includes("@")) return null;
  return { userId, email };
}

/** A plausible single address, lower-cased; null otherwise. */
export function normalizeEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/.test(e) && e.length <= 254 ? e : null;
}

/** Wallet cost of sending `count` emails, to 4 decimal places. */
export function emailCost(count: number): number {
  return Number((Math.max(0, count) * EMAIL_RATE).toFixed(4));
}
