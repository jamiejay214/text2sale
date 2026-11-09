import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEntitled } from "@/lib/messaging-status";
import { lowBalanceEmail } from "@/lib/customer-emails";
import { sendCustomerEmail } from "@/lib/customer-email-send";

// Cron (hourly): email active customers once when their wallet gets low, so
// their texts and calls don't quietly stop. Gated by CRON_SECRET.
//
// Hysteresis prevents nagging: we email at <= $5 and only re-arm once the
// balance climbs back above $10. Per-customer state is kept in platform_health
// under id "low_balance:<userId>" (no new table needed).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const LOW = Number(process.env.CUSTOMER_BALANCE_LOW) || 5;
const CLEAR = Number(process.env.CUSTOMER_BALANCE_CLEAR) || 10;
const MAX_PER_RUN = 25;
const key = (userId: string) => `low_balance:${userId}`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (secret && (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── Re-arm: anyone we flagged who has since topped back up above CLEAR. ──
  const { data: flagged } = await db
    .from("platform_health")
    .select("id")
    .like("id", "low_balance:%")
    .eq("level", "low")
    .limit(500);
  const flaggedIds = ((flagged || []) as Array<{ id: string }>).map((r) => r.id.slice("low_balance:".length)).filter(Boolean);
  if (flaggedIds.length) {
    const { data: recovered } = await db.from("profiles").select("id, wallet_balance").in("id", flaggedIds).gt("wallet_balance", CLEAR);
    for (const r of recovered || []) {
      await db.from("platform_health").update({ level: "ok", updated_at: new Date().toISOString() }).eq("id", key(r.id));
    }
  }

  // ── Alert: active customers at or below LOW who aren't already flagged. ──
  const { data: low } = await db
    .from("profiles")
    .select("id, email, first_name, wallet_balance, subscription_status, free_subscription, paused, role")
    .lte("wallet_balance", LOW)
    .order("wallet_balance", { ascending: true })
    .limit(200);

  let alerted = 0;
  for (const p of (low || []) as Array<Record<string, unknown>>) {
    if (alerted >= MAX_PER_RUN) break;
    const email = String(p.email || "");
    if (!email || p.role === "admin" || p.paused) continue;
    if (!isEntitled({ subscription_status: p.subscription_status as string | null, free_subscription: p.free_subscription as boolean | null })) continue;

    const id = String(p.id);
    const { data: state } = await db.from("platform_health").select("level").eq("id", key(id)).maybeSingle();
    if (state?.level === "low") continue; // already told them this dip

    const balance = Number(p.wallet_balance) || 0;
    const sent = await sendCustomerEmail(email, lowBalanceEmail(String(p.first_name || ""), balance));
    if (!sent) continue;
    await db.from("platform_health").upsert({
      id: key(id),
      level: "low",
      value: balance,
      alerted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    alerted += 1;
  }

  return NextResponse.json({ ok: true, alerted, threshold: LOW });
}
