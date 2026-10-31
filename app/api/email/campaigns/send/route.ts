import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db, emailAccount, unsubscribeUrl } from "@/lib/email-campaigns";
import { buildEmail, emailCost, normalizeEmail } from "@/lib/email-content";
import { footerFor } from "@/lib/email-design";
import { emailConfigured, sendEmail } from "@/lib/telnyx-email";
import { processCampaign, queueCampaign } from "@/lib/email-queue";

// Campaign actions:
//   test      send it once to the account's reply-to address (charged as one email)
//   schedule  queue every recipient for a time (now, a fixed time, or a local
//             time in each contact's time zone); the cron sends them in hourly
//             batches (lib/email-queue.ts), and anything due now starts at once
//   resume    restart a campaign paused for funds or a sending-domain issue
//   cancel    stop a scheduled or sending campaign; unsent emails are dropped

export const maxDuration = 300;

const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending isn't switched on yet." }, { status: 503 });
  const userId = auth.user.id;
  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaignId || "");
  const action = String(body.mode || body.action || "");
  const database = db();

  const { data: campaign } = await database.from("email_campaigns").select("*").eq("id", campaignId).eq("user_id", userId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  if (action === "cancel") {
    const { data: stopped } = await database
      .from("email_campaigns")
      .update({ status: "Cancelled", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .in("status", ["Scheduled", "Sending", "Paused"])
      .select("id")
      .maybeSingle();
    if (!stopped) return NextResponse.json({ error: `This campaign is already ${campaign.status}.` }, { status: 409 });
    await database.from("email_sends").delete().eq("campaign_id", campaignId).eq("status", "queued");
    return NextResponse.json({ ok: true });
  }

  const account = await emailAccount(database, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: 412 });
  const { data: sender } = await database.from("email_senders").select("*").eq("user_id", userId).maybeSingle();
  if (!sender || sender.status !== "verified") {
    return NextResponse.json({ error: "Verify your sending domain before sending." }, { status: 412 });
  }

  if (action === "test") {
    const to = normalizeEmail(sender.reply_to || account.replyTo);
    if (!to) return NextResponse.json({ error: "Add a reply-to address to receive test emails." }, { status: 400 });
    const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(1) });
    if (bal === null || bal === undefined) return NextResponse.json({ error: "Add funds to your wallet to send.", outOfFunds: true }, { status: 402 });
    try {
      const footer = footerFor(account, campaign.design, unsubscribeUrl(userId, to));
      const agentName = String(campaign.design?.signature || sender.from_name || "").split("\n")[0].trim();
      const msg = buildEmail({ subject: `[Test] ${campaign.subject}`, previewText: campaign.preview_text, body: campaign.body, design: campaign.design, contact: { first_name: "Alex", state: "FL", agent_name: agentName }, footer });
      const fromName = String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null;
      await sendEmail({ from: `${sender.from_local}@${sender.domain}`, fromName, replyTo: sender.inbox_address || sender.reply_to, to, subject: msg.subject, html: msg.html, text: msg.text, unsubscribeUrl: footer.unsubscribeUrl });
      return NextResponse.json({ ok: true, to });
    } catch (e) {
      console.error("[email/send test]", e);
      await database.rpc("credit_wallet", { p_user_id: userId, p_amount: emailCost(1), p_idempotency_key: `email_test_refund_${campaignId}_${Date.now()}`, p_description: "Refund — test email not sent" });
      return NextResponse.json({ error: "The test email couldn't be sent." }, { status: 502 });
    }
  }

  if (action === "resume") {
    const { data: resumed } = await database
      .from("email_campaigns")
      .update({
        status: "Sending",
        locked_until: null,
        pause_reason: null,
        // Resuming a campaign that paused itself for bounces or complaints is the owner's call.
        ...(String(campaign.pause_reason || "").startsWith("Paused automatically") ? { health_override: true } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .eq("status", "Paused")
      .select("id")
      .maybeSingle();
    if (!resumed) return NextResponse.json({ error: `This campaign is ${campaign.status}.` }, { status: 409 });
    const result = await processCampaign(database, campaignId);
    return NextResponse.json({ ok: true, ...result });
  }

  if (action !== "schedule") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  // ── Schedule (or send now) ───────────────────────────────────────────────
  const localTime = typeof body.localTime === "string" && LOCAL_TIME.test(body.localTime) ? body.localTime : null;
  const sendAt = !localTime && typeof body.sendAt === "string" && Number.isFinite(Date.parse(body.sendAt)) ? new Date(body.sendAt).toISOString() : null;
  const hourlyLimit = Math.min(5000, Math.max(50, Math.floor(Number(body.hourlyLimit) || 500)));

  // Lock the draft first so a double click can't queue it twice.
  const { data: locked } = await database
    .from("email_campaigns")
    .update({ status: "Scheduled", local_time: localTime, scheduled_at: sendAt || new Date().toISOString(), hourly_limit: hourlyLimit, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .eq("status", "Draft")
    .select("*")
    .maybeSingle();
  if (!locked) return NextResponse.json({ error: `This campaign is already ${campaign.status}.`, alreadySending: true }, { status: 409 });

  try {
    const queued = await queueCampaign(database, userId, locked);
    if (!queued.queued) {
      await database.from("email_campaigns").update({ status: "Draft", scheduled_at: null, local_time: null }).eq("id", campaignId);
      return NextResponse.json({ error: "No one in this audience can be emailed (no email address, or unsubscribed or bounced)." }, { status: 400 });
    }
    await database.from("email_campaigns").update({ scheduled_at: queued.firstSendAt, skipped: queued.skipped }).eq("id", campaignId);
    // Anything already due starts now; the cron keeps going from here.
    const first = Date.parse(queued.firstSendAt) <= Date.now() ? await processCampaign(database, campaignId).catch(() => null) : null;
    return NextResponse.json({ ok: true, queued: queued.queued, skipped: queued.skipped, firstSendAt: queued.firstSendAt, first });
  } catch (e) {
    console.error("[email/schedule]", e);
    await database.from("email_sends").delete().eq("campaign_id", campaignId).eq("status", "queued");
    await database.from("email_campaigns").update({ status: "Draft", scheduled_at: null, local_time: null }).eq("id", campaignId);
    return NextResponse.json({ error: "Couldn't schedule the campaign. Please try again." }, { status: 500 });
  }
}
