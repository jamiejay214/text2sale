import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ALERT_EMAIL_FROM, SUPPORT_EMAIL } from "@/lib/email-sender";
import { OWNER_EMAIL } from "@/lib/owner";
import { sendAdminAlertSMS } from "@/lib/admin-alert";
import { balanceAlert, balanceLevel, getTelnyxBalance, shouldAlert, type BalanceLevel } from "@/lib/telnyx-balance";

// Cron (every 15 min): watch the master Telnyx account balance and warn the
// owner before the platform can go dark. Gated by CRON_SECRET.
//
// Email is the primary channel on purpose — an SMS warning would ride the very
// account that's running out. SMS is sent too, best-effort, as a bonus.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ROW_ID = "telnyx_balance";

async function emailOwner(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ALERT_EMAIL_FROM, reply_to: SUPPORT_EMAIL, to: [OWNER_EMAIL], subject, text }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return !!res && res.ok;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (secret && (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.TELNYX_API_KEY) return NextResponse.json({ error: "Telnyx not configured" }, { status: 500 });

  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let balance;
  try {
    balance = await getTelnyxBalance();
  } catch (e) {
    // Can't read the balance — tell the owner once (email), it may itself be a sign of trouble.
    const { data: prev } = await db.from("platform_health").select("level, alerted_at").eq("id", ROW_ID).maybeSingle();
    const was = (prev?.level as string | null) ?? null;
    if (was !== "unknown_err") {
      await emailOwner(
        "⚠️ Text2Sale can't read the Telnyx balance",
        `The balance-check couldn't reach Telnyx: ${e instanceof Error ? e.message : "unknown error"}. ` +
          `This may be transient, or a sign the account needs attention. Check the Telnyx portal.`,
      );
      await db.from("platform_health").upsert({ id: ROW_ID, level: "unknown_err", alerted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: false, error: "balance read failed" }, { status: 502 });
  }

  const level = balanceLevel(balance.available);
  const now = Date.now();

  const { data: prev } = await db
    .from("platform_health")
    .select("level, alerted_at")
    .eq("id", ROW_ID)
    .maybeSingle();
  const prevLevel = (prev?.level === "ok" || prev?.level === "low" || prev?.level === "critical" ? prev.level : null) as BalanceLevel | null;

  let alerted = false;
  if (shouldAlert({ level: prevLevel, alertedAt: prev?.alerted_at ?? null }, level, now)) {
    const { subject, text } = balanceAlert(level, balance);
    const sentEmail = await emailOwner(subject, text);
    // SMS may fail if the account is already out — that's fine, email is primary.
    await sendAdminAlertSMS(`${level === "critical" ? "⛔" : level === "low" ? "⚠️" : "✅"} Telnyx balance ${balance.currency} ${balance.available.toFixed(2)} (${level}).`).catch(() => {});
    alerted = sentEmail;
  }

  await db.from("platform_health").upsert({
    id: ROW_ID,
    level,
    value: balance.available,
    detail: { balance: balance.balance, creditLimit: balance.creditLimit, currency: balance.currency },
    // Only move the alert clock when we actually alerted, so re-alert timing stays honest.
    ...(alerted ? { alerted_at: new Date(now).toISOString() } : {}),
    updated_at: new Date(now).toISOString(),
  });

  return NextResponse.json({ ok: true, level, available: balance.available, currency: balance.currency, alerted });
}
