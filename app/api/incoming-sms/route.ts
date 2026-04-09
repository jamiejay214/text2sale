import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Vonage can send inbound SMS as GET or POST
export async function GET(req: NextRequest) {
  return handleInbound(req);
}

export async function POST(req: NextRequest) {
  return handleInbound(req);
}

async function handleInbound(req: NextRequest) {
  try {
    // Vonage sends params as query string (GET) or JSON/form body (POST)
    let from: string, to: string, body: string;

    const contentType = req.headers.get("content-type") || "";

    if (req.method === "GET") {
      const params = req.nextUrl.searchParams;
      from = params.get("msisdn") || "";
      to = params.get("to") || "";
      body = params.get("text") || "";
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      from = json.msisdn || json.from || "";
      to = json.to || "";
      body = json.text || json.body || "";
    } else {
      const formData = await req.formData();
      from = (formData.get("msisdn") || formData.get("from") || "") as string;
      to = (formData.get("to") || "") as string;
      body = (formData.get("text") || formData.get("body") || "") as string;
    }

    if (!from || !body) {
      return NextResponse.json({ status: "ok" });
    }

    // Normalize the incoming number for lookup
    const fromDigits = from.replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1") ? fromDigits.slice(1) : fromDigits;
    const fromFormatted = `(${fromNormalized.slice(0, 3)}) ${fromNormalized.slice(3, 6)}-${fromNormalized.slice(6)}`;

    // Find the contact by phone number
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, phone")
      .or(`phone.eq.${fromFormatted},phone.eq.+1${fromNormalized},phone.eq.${fromDigits},phone.eq.${from}`);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const contact = contacts[0];
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
      // Vonage doesn't use TwiML — auto-reply by sending an SMS back
      if (optSettings.confirmOptOut) {
        let replyMsg = optSettings.autoReplyMessage || "You have been unsubscribed.";
        if (optSettings.includeCompanyName && optSettings.companyName) {
          replyMsg += ` — ${optSettings.companyName}`;
        }
        await sendVonageReply(to, from, replyMsg);
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
        await sendVonageReply(to, from, replyMsg);
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

// Helper to send reply via Vonage
async function sendVonageReply(from: string, to: string, text: string) {
  const apiKey = process.env.VONAGE_API_KEY!;
  const apiSecret = process.env.VONAGE_API_SECRET!;

  await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret, from, to, text }),
  });
}
