// ── Email open and click tracking ───────────────────────────────────────────
// Campaign emails carry a 1×1 image (opens) and route their links through
// Text2Sale (clicks), each tied to one email_sends row. The links are signed,
// so nobody can forge a click or use the redirect to send people elsewhere.
//
// Opens are approximate: Apple Mail loads images for privacy (counts as an
// open), and some apps block images (no open). Clicks are the stronger signal.

import { createHmac, timingSafeEqual } from "crypto";

export function trackingSecret(): string {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function trackingBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com").replace(/\/$/, "");
}

function sign(sendId: string, what: string, secret: string): string {
  return createHmac("sha256", secret).update(`${sendId}\n${what}`).digest("base64url").slice(0, 24);
}

export function verifyTracking(sendId: string, what: string, sig: string, secret: string): boolean {
  if (!sendId || !sig || !secret) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(sendId, what, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function openUrl(base: string, sendId: string, secret: string): string {
  return `${base}/api/email/t/open?s=${encodeURIComponent(sendId)}&k=${sign(sendId, "open", secret)}`;
}

export function clickUrl(base: string, sendId: string, url: string, secret: string): string {
  return `${base}/api/email/t/click?s=${encodeURIComponent(sendId)}&u=${encodeURIComponent(url)}&k=${sign(sendId, url, secret)}`;
}

/** Tag a link so the site's analytics can tell visits came from this campaign. Existing tags win. */
export function withUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return url;
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "text2sale");
    if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "email");
    const slug = campaign.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    if (slug && !u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", slug);
    return u.toString();
  } catch {
    return url;
  }
}

const unescapeAttr = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * Route every http(s) link in the email through click tracking (except the
 * ones in `skip`, such as unsubscribe) and add the open pixel at the end.
 */
export function addTracking(html: string, t: { open: string; click: (url: string) => string; skip: string[] }): string {
  const skip = new Set(t.skip);
  const linked = html.replace(/href="(https?:\/\/[^"]+)"/g, (whole, raw: string) => {
    const url = unescapeAttr(raw);
    return skip.has(url) ? whole : `href="${escapeAttr(t.click(url))}"`;
  });
  const pixel = `<img src="${escapeAttr(t.open)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`;
  return linked.includes("</body>") ? linked.replace("</body>", `${pixel}</body>`) : linked + pixel;
}
