// ── Email campaigns: server helpers ────────────────────────────────────────
// Shared by the /api/email routes: who may send, the business details every
// email's footer needs, and the unsubscribe link.

import { teamDatabase } from "@/lib/workspace-auth";
import { isEntitled } from "@/lib/messaging-status";
import { signUnsubscribe } from "@/lib/email-content";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export const db = teamDatabase;

export function unsubscribeSecret(): string {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function unsubscribeUrl(userId: string, email: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com").replace(/\/$/, "");
  return `${base}/api/email/unsubscribe?t=${signUnsubscribe(userId, email, unsubscribeSecret())}`;
}

export type EmailAccount = {
  ok: boolean;
  error?: string;
  businessName: string;
  address: string;
  replyTo: string | null;
  customDomain: string | null;
  logoUrl: string | null;
  industry: string | null;
};

/** The account's email-sending readiness and the details its footer needs. */
export async function emailAccount(database: Db, userId: string): Promise<EmailAccount> {
  const { data: p } = await database
    .from("profiles")
    .select("email, paused, subscription_status, free_subscription, custom_domain, business_logo_url, industry, a2p_registration")
    .eq("id", userId)
    .maybeSingle();
  const reg = (p?.a2p_registration || {}) as Record<string, string | undefined>;
  const businessName = (reg.businessName || "").trim();
  const parts = [reg.businessAddress, reg.businessCity, [reg.businessState, reg.businessZip].filter(Boolean).join(" ")]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  const address = parts.join(", ");
  const base = {
    businessName,
    address,
    replyTo: (reg.contactEmail || p?.email || "").trim() || null,
    customDomain: p?.custom_domain || null,
    logoUrl: p?.business_logo_url || null,
    industry: p?.industry || null,
  };
  if (!p || p.paused || !isEntitled(p)) return { ok: false, error: "An active account and subscription are required.", ...base };
  if (!businessName || parts.length < 3) {
    return { ok: false, error: "Add your business name and address in Business details first. Every email must include them.", ...base };
  }
  return { ok: true, ...base };
}
