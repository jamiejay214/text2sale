import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailConfigured, verifyEmailDomain } from "@/lib/telnyx-email";

// ─── GET /api/email/verify-pending ─────────────────────────────────────────
// Every-few-minutes cron. When a customer activates email sending on a
// Text2Sale-managed domain we publish their DNS records automatically
// (dns_managed = true), but Telnyx still has to see those records propagate
// before the domain can send. This re-checks each managed, still-pending
// sender and flips it to "verified" on its own — so the customer clicks
// "Activate" once and never has to come back to press "Check verification".
//
// Bring-your-own-domain senders (dns_managed = false) are left alone: those
// depend on the customer publishing records themselves, and they verify
// through the manual "refresh" action in the dashboard.

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });

  const db = createClient(supabaseUrl, supabaseKey);

  // Only the ones we set up for the customer and are still waiting on.
  const { data: pending, error } = await db
    .from("email_senders")
    .select("user_id, provider_domain_id")
    .eq("status", "pending")
    .eq("dns_managed", true)
    .not("provider_domain_id", "is", null)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let verified = 0;
  let stillPending = 0;
  let failed = 0;

  for (const sender of pending || []) {
    if (!sender.provider_domain_id) continue;
    try {
      const status = await verifyEmailDomain(sender.provider_domain_id);
      if (status.verified) {
        await db
          .from("email_senders")
          .update({
            status: "verified",
            verified_at: new Date().toISOString(),
            dns_records: status.records,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", sender.user_id);
        verified += 1;
      } else {
        // Keep the latest record state so the dashboard shows current status.
        await db
          .from("email_senders")
          .update({ dns_records: status.records, updated_at: new Date().toISOString() })
          .eq("user_id", sender.user_id);
        stillPending += 1;
      }
    } catch (e) {
      failed += 1;
      console.error("[email/verify-pending] verify failed for", sender.user_id, e);
    }
  }

  return NextResponse.json({ checked: (pending || []).length, verified, stillPending, failed });
}
