import { NextRequest, NextResponse } from "next/server";
import { AUTOBUY_ENABLED, createServiceClient, runBatch } from "@/lib/messaging-driver";

// ── Activation cron ────────────────────────────────────────────────────────
//
// Fires every minute (vercel.json) and moves every in-flight texting
// activation forward — see lib/messaging-driver.ts for what each stage does
// and why. The customer's browser only displays progress; this owns it, so
// closing the tab is harmless.

// A batch can include slow stages (a supplier round-trip, a site check).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Fail closed, same as the billing cron: without a configured secret we
  // refuse rather than letting anyone trigger purchases.
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) {
    console.error("[messaging/advance] CRON_SECRET not configured — refusing to run");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const batch = await runBatch(db);

  if (batch.error) {
    // The migration adds messaging_status and friends. Until it has been
    // applied this query cannot work, and the cron runs every minute — so
    // say so once, clearly, instead of emitting an opaque error 1,440 times
    // a day.
    const needsMigration = /messaging_status|messaging_next_attempt_at|column .* does not exist/i.test(
      batch.error.message
    );
    if (needsMigration) {
      console.warn("[messaging/advance] schema not ready — apply supabase/migrations/010_messaging_status.sql");
      return NextResponse.json({ ok: false, skipped: true, reason: "migration_not_applied" }, { status: 200 });
    }
    console.error("[messaging/advance] query failed:", batch.error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const results = batch.results;
  return NextResponse.json({
    ok: true,
    autobuy: AUTOBUY_ENABLED,
    examined: batch.examined,
    activated: results.filter((r) => r.to === "ACTIVE").length,
    awaitingPayment: results.filter((r) => r.to === "AWAITING_PAYMENT").length,
    rejected: results.filter((r) => r.to === "REJECTED").length,
    results,
  });
}
