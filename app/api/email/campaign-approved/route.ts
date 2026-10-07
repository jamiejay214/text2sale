import { NextRequest, NextResponse } from "next/server";
import { teamDatabase } from "@/lib/workspace-auth";
import { campaignApprovalEmail } from "@/lib/campaign-approval-email";
import { mapCampaignStatus } from "@/lib/messaging-status";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ configured: false, sent: 0 });
  const db = teamDatabase();
  const { data: jobs, error } = await db.rpc("claim_campaign_approval_emails");
  if (error) return NextResponse.json({ error: "Unable to claim approval emails." }, { status: 503 });
  let sent = 0;
  for (const job of jobs || []) {
    // Fence writes from a stale worker after its lease expires.
    const update = (values: Record<string, unknown>) => db.from("campaign_approval_email_jobs")
      .update(values).eq("id", job.id).eq("lease_id", job.lease_id);
    const retry = (reason: string) => update({ status: "pending", next_attempt_at: new Date(Date.now() + 3600000).toISOString(), last_error: reason });
    // Keep all uncertain retries inside Resend's 24-hour idempotency window.
    if (job.first_attempt_at && Date.now() - Date.parse(job.first_attempt_at) >= 23 * 3600000) {
      await update({ status: "failed", last_error: "Delivery requires review before retrying." });
      continue;
    }
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("first_name,a2p_registration").eq("id", job.user_id).single();
    if (profileError || !profile) { await retry("Account lookup temporarily unavailable."); continue; }
    const reg = profile.a2p_registration || {};
    const outcome = mapCampaignStatus(reg.campaignStatus, reg.submissionStatus);
    if (reg.campaignSid !== job.campaign_id || outcome === "failed") {
      await update({ status: "cancelled", last_error: "Campaign replaced or approval withdrawn." });
      continue;
    }
    if (outcome !== "approved") { await retry("Waiting for carrier approval."); continue; }
    const { data: auth, error: authError } = await db.auth.admin.getUserById(job.user_id);
    if (authError || !auth?.user?.email_confirmed_at || !auth.user.email) {
      await retry("Waiting for a verified account email.");
      continue;
    }
    const attempts = job.attempts + 1;
    // Persist the exact payload before sending, so retries cannot change recipients or content.
    const payload = job.payload || {
      from: process.env.RESEND_FROM_ADDRESS || "Text2Sale <support@text2sale.com>",
      to: [auth.user.email], reply_to: "support@text2sale.com",
      ...campaignApprovalEmail(profile.first_name || "there"),
    };
    if (job.payload && (job.payload.to?.length !== 1 || job.payload.to[0] !== auth.user.email)) {
      await update({ status: "failed", last_error: "Recipient changed; delivery requires review." });
      continue;
    }
    const { data: reserved, error: reserveError } = await update({ payload, attempts, first_attempt_at: job.first_attempt_at || new Date().toISOString() }).select("id");
    if (reserveError || !reserved?.length) continue;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `campaign-approved-${job.id}` },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(`Email provider returned ${response.status}`);
      const { error: saveError } = await update({ status: "sent", sent_at: new Date().toISOString(), provider_id: result.id, last_error: null });
      if (!saveError) sent++;
    } catch (e) {
      await update({ status: attempts >= 5 ? "failed" : "pending",
        next_attempt_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** attempts)).toISOString(),
        last_error: e instanceof Error ? e.message : "Email delivery could not be confirmed." });
    }
  }
  return NextResponse.json({ configured: true, sent });
}
