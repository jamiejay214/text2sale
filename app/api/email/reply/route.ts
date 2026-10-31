import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db, emailAccount, unsubscribeUrl } from "@/lib/email-campaigns";
import { buildEmail, emailCost, normalizeEmail } from "@/lib/email-content";
import { emailConfigured, sendEmail } from "@/lib/telnyx-email";
import { replySubject } from "@/lib/email-inbox";

// Reply by email from a conversation. Charged as one email (pay first,
// refunded if it fails), threaded under the contact's last email, and stored
// in the conversation next to the texts.

const MAX_BODY = 5000;

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending isn't switched on yet." }, { status: 503 });
  const userId = auth.user.id;
  const input = await req.json().catch(() => ({}));
  const conversationId = String(input.conversationId || "");
  const body = typeof input.body === "string" ? input.body.trim().slice(0, MAX_BODY) : "";
  if (!conversationId || !body) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  const database = db();

  const { data: conversation } = await database.from("conversations").select("id, contact_id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const { data: contact } = await database.from("contacts").select("id, first_name, last_name, city, state, email").eq("id", conversation.contact_id).maybeSingle();
  const to = normalizeEmail(contact?.email);
  if (!to) return NextResponse.json({ error: "This contact has no email address." }, { status: 400 });
  const { data: blocked } = await database.from("email_suppressions").select("reason").eq("user_id", userId).eq("email", to).maybeSingle();
  if (blocked) return NextResponse.json({ error: blocked.reason === "unsubscribe" ? "This contact unsubscribed from your emails." : "Emails to this address bounced, so it's blocked." }, { status: 409 });

  const account = await emailAccount(database, userId);
  if (!account.ok) return NextResponse.json({ error: account.error }, { status: 412 });
  const { data: sender } = await database.from("email_senders").select("*").eq("user_id", userId).maybeSingle();
  if (!sender || sender.status !== "verified") return NextResponse.json({ error: "Verify your sending domain under Campaigns → Email first." }, { status: 412 });

  // Thread under the last email in this conversation, if there is one.
  const { data: last } = await database
    .from("messages")
    .select("email_subject, email_message_id")
    .eq("conversation_id", conversationId)
    .eq("channel", "email")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const subject = replySubject(last?.email_subject, `Message from ${account.businessName}`);

  const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: emailCost(1) });
  if (bal === null || bal === undefined) return NextResponse.json({ error: "Add funds to your wallet to send email.", outOfFunds: true }, { status: 402 });

  try {
    const footer = { businessName: account.businessName, address: account.address, unsubscribeUrl: unsubscribeUrl(userId, to) };
    const msg = buildEmail({ subject, previewText: "", body, contact: contact || {}, footer });
    const id = await sendEmail({
      from: `${sender.from_local}@${sender.domain}`,
      fromName: String(sender.from_name || "").replace(/[\r\n]/g, " ").trim() || null,
      replyTo: sender.inbox_address || sender.reply_to,
      to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      unsubscribeUrl: footer.unsubscribeUrl,
      inReplyTo: last?.email_message_id || null,
      tag: "conversation-reply",
    });
    const now = new Date().toISOString();
    const { data: message } = await database
      .from("messages")
      .insert({ conversation_id: conversationId, direction: "outbound", body, status: "sent", channel: "email", email_subject: msg.subject, email_address: to, telnyx_message_id: id || null })
      .select("*")
      .single();
    await database.from("conversations").update({ preview: `Email: ${body}`.slice(0, 100), last_message_at: now, unread: 0 }).eq("id", conversationId);
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    console.error("[email/reply]", e);
    await database.rpc("credit_wallet", { p_user_id: userId, p_amount: emailCost(1), p_idempotency_key: `email_reply_refund_${conversationId}_${Date.now()}`, p_description: "Refund — email reply not sent" });
    return NextResponse.json({ error: "The email couldn't be sent. You weren't charged." }, { status: 502 });
  }
}
