import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.TELNYX_API_KEY!;

// Telnyx sends inbound SMS as POST webhook
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload.data;

    if (!event) {
      return NextResponse.json({ status: "ok" });
    }

    // Handle delivery receipts (message.finalized)
    if (event.event_type === "message.finalized") {
      return handleDeliveryReceipt(event.payload);
    }

    // Only process inbound SMS
    if (event.event_type !== "message.received") {
      return NextResponse.json({ status: "ok" });
    }

    const eventPayload = event.payload;
    const from = eventPayload?.from?.phone_number || "";
    const to = eventPayload?.to?.[0]?.phone_number || "";
    const body = eventPayload?.text || "";

    if (!from || !body) {
      return NextResponse.json({ status: "ok" });
    }

    // Normalize the incoming number for lookup
    const fromDigits = from.replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1") ? fromDigits.slice(1) : fromDigits;
    const fromFormatted = `(${fromNormalized.slice(0, 3)}) ${fromNormalized.slice(3, 6)}-${fromNormalized.slice(6)}`;

    // Normalize the `to` number (the user's 10DLC number that received the message)
    const toDigitsRaw = to.replace(/\D/g, "");
    const toNormalized = toDigitsRaw.startsWith("1") ? toDigitsRaw.slice(1) : toDigitsRaw;
    const toFormattedIn = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    // Step 1: Identify which user owns the receiving number.
    // Do this FIRST so we can route the message even when the sender isn't a saved contact.
    let owningUserId: string | null = null;
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, owned_numbers")
      .not("owned_numbers", "is", null);

    if (owners) {
      for (const p of owners) {
        const nums = (p.owned_numbers as Array<{ number?: string }> | null) || [];
        const match = nums.some((n) => {
          const d = (n.number || "").replace(/\D/g, "");
          const norm = d.startsWith("1") ? d.slice(1) : d;
          return norm && norm === toNormalized;
        });
        if (match) {
          owningUserId = p.id;
          break;
        }
      }
    }

    // Step 2: Find an existing contact for the sender, scoped to the owning user when known.
    let contactQuery = supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, phone")
      .or(`phone.eq.${fromFormatted},phone.eq.+1${fromNormalized},phone.eq.${fromDigits},phone.eq.${from}`);
    if (owningUserId) contactQuery = contactQuery.eq("user_id", owningUserId);
    const { data: contacts } = await contactQuery.limit(1);

    let contact: { id: string; user_id: string; first_name?: string; last_name?: string; phone?: string } | null =
      contacts && contacts.length > 0 ? contacts[0] : null;

    // Step 3: If no contact exists but we know the owning user, auto-create one so the reply is captured.
    if (!contact && owningUserId) {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          user_id: owningUserId,
          first_name: "",
          last_name: "",
          phone: fromFormatted,
          email: "",
          lead_source: "inbound_sms",
          tags: ["inbound"],
          notes: `Auto-created from inbound SMS to ${toFormattedIn} on ${new Date().toISOString()}`,
          dnc: false,
        })
        .select("id, user_id, first_name, last_name, phone")
        .single();
      if (newContact) contact = newContact;
    }

    if (!contact) {
      // No owning user found and no matching contact — nothing we can route this to.
      console.warn("Inbound SMS dropped: no owning user for", to, "and no matching contact for", from);
      return NextResponse.json({ status: "ok" });
    }

    const bodyUpper = body.trim().toUpperCase();

    // Fetch user's opt-out settings
    const { data: profile } = await supabase
      .from("profiles")
      .select("opt_out_settings")
      .eq("id", contact.user_id)
      .single();

    const optSettings = profile?.opt_out_settings || {
      keywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
      optInKeywords: ["START", "SUBSCRIBE", "UNSTOP", "YES"],
      autoReplyMessage: "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.",
      optInReplyMessage: "You have been re-subscribed. Reply STOP to unsubscribe.",
      confirmOptOut: true,
      autoMarkDnc: true,
      includeCompanyName: true,
      companyName: "",
    };

    // Check for opt-out keyword
    const isOptOut = (optSettings.keywords || []).some(
      (kw: string) => bodyUpper === kw.toUpperCase()
    );

    // Check for opt-in keyword
    const isOptIn = (optSettings.optInKeywords || []).some(
      (kw: string) => bodyUpper === kw.toUpperCase()
    );

    if (isOptOut) {
      if (optSettings.autoMarkDnc) {
        await supabase.from("contacts").update({ dnc: true }).eq("id", contact.id);
      }
      if (optSettings.confirmOptOut) {
        let replyMsg = optSettings.autoReplyMessage || "You have been unsubscribed.";
        if (optSettings.includeCompanyName && optSettings.companyName) {
          replyMsg += ` — ${optSettings.companyName}`;
        }
        await sendTelnyxReply(to, from, replyMsg);
      }
      return NextResponse.json({ status: "ok" });
    }

    if (isOptIn) {
      await supabase.from("contacts").update({ dnc: false }).eq("id", contact.id);
      if (optSettings.confirmOptOut) {
        let replyMsg = optSettings.optInReplyMessage || "You have been re-subscribed.";
        if (optSettings.includeCompanyName && optSettings.companyName) {
          replyMsg += ` — ${optSettings.companyName}`;
        }
        await sendTelnyxReply(to, from, replyMsg);
      }
      return NextResponse.json({ status: "ok" });
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          user_id: contact.user_id,
          contact_id: contact.id,
          preview: body.slice(0, 100),
          unread: 1,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      conversation = newConv;
    } else {
      await supabase
        .from("conversations")
        .update({
          preview: body.slice(0, 100),
          unread: 1,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);
    }

    if (conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        direction: "inbound",
        body,
        status: "received",
      });

      // Update campaign reply count
      const { data: campaignContact } = await supabase
        .from("contacts")
        .select("campaign")
        .eq("id", contact.id)
        .single();

      if (campaignContact?.campaign) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("id, replies")
          .eq("name", campaignContact.campaign)
          .eq("user_id", contact.user_id)
          .single();

        if (campaign) {
          await supabase
            .from("campaigns")
            .update({ replies: (campaign.replies || 0) + 1 })
            .eq("id", campaign.id);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Incoming SMS webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

// Helper to send reply via Telnyx
async function sendTelnyxReply(from: string, to: string, text: string) {
  await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, text, type: "SMS" }),
  });
}

// Handle Telnyx delivery receipts (message.finalized)
async function handleDeliveryReceipt(eventPayload: Record<string, unknown>) {
  try {
    const toArr = eventPayload?.to as Array<{ phone_number?: string; status?: string }> | undefined;
    const to = toArr?.[0]?.phone_number || "";
    const telnyxStatus = toArr?.[0]?.status || "";

    if (!to || !telnyxStatus) {
      return NextResponse.json({ status: "ok" });
    }

    // Map Telnyx status: delivered, sent, sending_failed, delivery_failed, delivery_unconfirmed
    const mappedStatus = telnyxStatus === "delivered" ? "delivered"
      : (telnyxStatus === "sending_failed" || telnyxStatus === "delivery_failed") ? "failed"
      : "sent";

    const toDigits = to.replace(/\D/g, "");
    const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;
    const toFormatted = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .or(`phone.eq.${toFormatted},phone.eq.+1${toNormalized},phone.eq.${toDigits},phone.eq.${to}`);

    if (!contacts || contacts.length === 0) return NextResponse.json({ status: "ok" });

    const { data: conversation } = await supabase
      .from("conversations").select("id").eq("contact_id", contacts[0].id).single();

    if (!conversation) return NextResponse.json({ status: "ok" });

    const { data: message } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (message) {
      const errors = (eventPayload?.errors as Array<{ code?: string }>) || [];
      const updateData: Record<string, unknown> = { status: mappedStatus };
      if (errors.length > 0) updateData.error_code = errors[0]?.code || "";
      await supabase.from("messages").update(updateData).eq("id", message.id);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Delivery receipt error:", error);
    return NextResponse.json({ status: "ok" });
  }
}
