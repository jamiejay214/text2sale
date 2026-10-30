import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db, emailAccount, unsubscribeUrl } from "@/lib/email-campaigns";
import { buildEmail, emailCost, normalizeEmail } from "@/lib/email-content";
import { emailConfigured, sendEmail } from "@/lib/telnyx-email";

// Send one wave of an email campaign. The dashboard calls this repeatedly
// with the returned `nextOffset` until `done`, so each call stays well
// inside the function time limit.
//
// Pay first: each wave's full cost is taken from the wallet BEFORE anything
// is handed to Telnyx; emails that fail to send are refunded. Unsubscribed,
// bounced and complained addresses, DNC contacts and anyone this campaign
// already reached are skipped and never charged.
//
// mode "test" sends the campaign once to the account's own reply-to
// address (charged as one email) without touching the campaign's status.

export const maxDuration = 300;

const WAVE = 300;
const PER_SECOND = Math.max(1, Number(process.env.TELNYX_EMAIL_MAX_PER_SECOND) || 10);

type Contact = { id: string; first_name: string | null; last_name: string | null; city: string | null; state: string | null; email: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending isn't switched on yet." }, { status: 503 });
  const userId = auth.user.id;
  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaignId || "");
  const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
  const test = body.mode === "test";
  const database = db();

  const account = await emailAccount(database, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: 412 });
  const { data: sender } = await database.from("email_senders").select("*").eq("user_id", userId).maybeSingle();
  if (!sender || sender.status !== "verified") {
    return NextResponse.json({ error: "Verify your sending domain before sending." }, { status: 412 });
  }
  const { data: campaign } = await database.from("email_campaigns").select("*").eq("id", campaignId).eq("user_id", userId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const from = `${sender.from_local}@${sender.domain}`;
  const fromName = String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null;
  const footerFor = (email: string) => ({ businessName: account.businessName, address: account.address, unsubscribeUrl: unsubscribeUrl(userId, email) });

  // ── Test send ────────────────────────────────────────────────────────────
  if (test) {
    const to = normalizeEmail(sender.reply_to || account.replyTo);
    if (!to) return NextResponse.json({ error: "Add a reply-to address to receive test emails." }, { status: 400 });
    const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(1) });
    if (bal === null || bal === undefined) return NextResponse.json({ error: "Add funds to your wallet to send.", outOfFunds: true }, { status: 402 });
    try {
      const msg = buildEmail({ subject: `[Test] ${campaign.subject}`, previewText: campaign.preview_text, body: campaign.body, design: campaign.design, contact: { first_name: "Alex" }, footer: footerFor(to) });
      await sendEmail({ from, fromName, replyTo: sender.reply_to, to, subject: msg.subject, html: msg.html, text: msg.text, unsubscribeUrl: footerFor(to).unsubscribeUrl });
      return NextResponse.json({ ok: true, to });
    } catch (e) {
      console.error("[email/send test]", e);
      await database.rpc("credit_wallet", { p_user_id: userId, p_amount: emailCost(1), p_idempotency_key: `email_test_refund_${campaignId}_${Date.now()}`, p_description: "Refund — test email not sent" });
      return NextResponse.json({ error: "The test email couldn't be sent." }, { status: 502 });
    }
  }

  // ── Lock on the first wave so a double click can't send twice ───────────
  if (offset === 0) {
    const { data: locked } = await database
      .from("email_campaigns")
      .update({ status: "Sending", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("user_id", userId)
      .in("status", ["Draft", "Paused"])
      .select("id")
      .maybeSingle();
    if (!locked) return NextResponse.json({ error: `This campaign is already ${campaign.status}.`, alreadySending: true }, { status: 409 });
  } else if (campaign.status !== "Sending") {
    return NextResponse.json({ error: "This campaign isn't sending.", alreadySending: true }, { status: 409 });
  }

  // ── Load this wave ───────────────────────────────────────────────────────
  let q = database
    .from("contacts")
    .select("id, first_name, last_name, city, state, email")
    .eq("user_id", userId)
    .eq("dnc", false)
    .like("email", "%@%")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + WAVE - 1);
  if (campaign.audience_campaign) q = q.eq("campaign", campaign.audience_campaign);
  const { data: rows, error: loadError } = await q;
  if (loadError) return NextResponse.json({ error: "Couldn't load contacts." }, { status: 500 });
  const wave = (rows || []) as Contact[];

  const seen = new Set<string>();
  const candidates: { contact: Contact; email: string }[] = [];
  for (const contact of wave) {
    const email = normalizeEmail(contact.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    candidates.push({ contact, email });
  }
  const emails = candidates.map((c) => c.email);
  const [{ data: suppressed }, { data: already }] = await Promise.all([
    emails.length ? database.from("email_suppressions").select("email").eq("user_id", userId).in("email", emails) : Promise.resolve({ data: [] }),
    emails.length ? database.from("email_sends").select("email").eq("campaign_id", campaignId).in("email", emails) : Promise.resolve({ data: [] }),
  ]);
  const skip = new Set([...(suppressed || []), ...(already || [])].map((r: { email: string }) => r.email));
  const toSend = candidates.filter((c) => !skip.has(c.email));
  const skipped = wave.length - toSend.length;

  // ── Pay first ────────────────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  let outOfFunds = false;
  if (toSend.length) {
    const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(toSend.length) });
    if (bal === null || bal === undefined) {
      outOfFunds = true;
    } else {
      const results: { contact_id: string; email: string; provider_message_id: string | null; status: "sent" | "failed"; error: string | null }[] = [];
      for (let i = 0; i < toSend.length; i += PER_SECOND) {
        const started = Date.now();
        const batch = toSend.slice(i, i + PER_SECOND);
        const out = await Promise.all(
          batch.map(async ({ contact, email }) => {
            try {
              const footer = footerFor(email);
              const msg = buildEmail({ subject: campaign.subject, previewText: campaign.preview_text, body: campaign.body, design: campaign.design, contact, footer });
              const id = await sendEmail({ from, fromName, replyTo: sender.reply_to, to: email, tag: `campaign:${campaignId}`, subject: msg.subject, html: msg.html, text: msg.text, unsubscribeUrl: footer.unsubscribeUrl });
              return { contact_id: contact.id, email, provider_message_id: id || null, status: "sent" as const, error: null };
            } catch (e) {
              return { contact_id: contact.id, email, provider_message_id: null, status: "failed" as const, error: (e instanceof Error ? e.message : "send failed").slice(0, 300) };
            }
          }),
        );
        results.push(...out);
        const wait = 1000 - (Date.now() - started);
        if (wait > 0 && i + PER_SECOND < toSend.length) await sleep(wait);
      }
      sent = results.filter((r) => r.status === "sent").length;
      failed = results.length - sent;
      await database.from("email_sends").upsert(results.map((r) => ({ ...r, user_id: userId, campaign_id: campaignId })), { onConflict: "campaign_id,email", ignoreDuplicates: true });
      if (failed > 0) {
        await database.rpc("credit_wallet", {
          p_user_id: userId,
          p_amount: emailCost(failed),
          p_idempotency_key: `email_refund_${campaignId}_${offset}`,
          p_description: `Refund — ${failed} email(s) not sent`,
        });
      }
    }
  }

  const done = !outOfFunds && wave.length < WAVE;
  const nextOffset = outOfFunds ? offset : offset + wave.length;
  await database
    .from("email_campaigns")
    .update({
      recipients: campaign.recipients + sent + failed,
      sent: campaign.sent + sent,
      failed: campaign.failed + failed,
      skipped: campaign.skipped + skipped,
      cost: Number((Number(campaign.cost) + emailCost(sent)).toFixed(4)),
      status: outOfFunds ? "Paused" : done ? "Sent" : "Sending",
      sent_at: done ? new Date().toISOString() : campaign.sent_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("user_id", userId);

  return NextResponse.json({ sent, failed, skipped, nextOffset, done, outOfFunds });
}
