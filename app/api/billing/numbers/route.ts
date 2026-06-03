import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── GET /api/billing/numbers ─────────────────────────────────────────────────
// Vercel cron — runs on the 1st of every month at 08:00 UTC.
// Charges every active user $1.00 per owned phone number by decrementing
// their wallet via the `decrement_wallet` RPC.
//
// Protected by CRON_SECRET so it can't be triggered manually by anyone
// without the secret. Vercel sets Authorization: Bearer <CRON_SECRET>
// automatically on cron invocations.

const NUMBER_FEE_PER_MONTH = 1.00;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron call. FAIL CLOSED: if CRON_SECRET isn't
  // configured we refuse to run rather than billing every user unauthenticated.
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) {
    console.error("[billing/numbers] CRON_SECRET not configured — refusing to run");
    return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-period idempotency key (e.g. "2026-06"). bill_number_fee claims this
  // period atomically with the charge, so a retried/replayed cron run can
  // never double-charge a user within the same month.
  const period = new Date().toISOString().slice(0, 7);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load all profiles that have at least one owned number
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, wallet_balance, owned_numbers")
    .not("owned_numbers", "is", null);

  if (error || !profiles) {
    console.error("[billing/numbers] failed to load profiles:", error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const results: Array<{ userId: string; email: string; numbers: number; charged: number; newBalance: number }> = [];
  const skipped: Array<{ userId: string; email: string; numbers: number; reason: string }> = [];
  const errors: Array<{ userId: string; email: string; error: string }> = [];

  for (const profile of profiles) {
    const ownedNumbers = (profile.owned_numbers as unknown[]) || [];
    const count = ownedNumbers.length;
    if (count === 0) continue;

    const charge = Number((count * NUMBER_FEE_PER_MONTH).toFixed(2));

    try {
      // bill_number_fee returns the new balance ONLY when it actually charged
      // (not already billed this period AND sufficient funds). NULL means
      // "skipped" — either already billed for `period` or insufficient balance.
      // It never fabricates a balance and never charges twice for one period.
      const { data, error: rpcError } = await supabase.rpc("bill_number_fee", {
        p_user_id: profile.id,
        p_amount: charge,
        p_period: period,
      });

      if (rpcError) {
        errors.push({ userId: profile.id, email: profile.email, error: rpcError.message });
        continue;
      }

      if (data === null || data === undefined) {
        skipped.push({
          userId: profile.id,
          email: profile.email,
          numbers: count,
          reason: "already billed this period or insufficient funds",
        });
        continue;
      }

      const newBalance = Number(data);
      results.push({
        userId: profile.id,
        email: profile.email,
        numbers: count,
        charged: charge,
        newBalance,
      });

      console.log(`[billing/numbers] charged ${profile.email} $${charge} for ${count} number(s) → balance $${newBalance}`);
    } catch (e) {
      errors.push({ userId: profile.id, email: profile.email, error: String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    period,
    charged: results.length,
    skipped: skipped.length,
    errors: errors.length,
    totalRevenue: Number(results.reduce((s, r) => s + r.charged, 0).toFixed(2)),
    results,
    ...(skipped.length > 0 ? { skippedDetails: skipped } : {}),
    ...(errors.length > 0 ? { errorDetails: errors } : {}),
  });
}
