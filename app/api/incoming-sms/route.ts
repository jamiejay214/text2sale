import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-level client for webhook (no user auth context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const from = formData.get("From") as string; // E.164 format
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;

    if (!from || !body) {
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Normalize the incoming number for lookup
    const fromDigits = from.replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1") ? fromDigits.slice(1) : fromDigits;
    const fromFormatted = `(${fromNormalized.slice(0, 3)}) ${fromNormalized.slice(3, 6)}-${fromNormalized.slice(6)}`;

    // Find the contact by phone number
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, phone")
      .or(`phone.eq.${fromFormatted},phone.eq.${from},phone.eq.${fromDigits},phone.eq.+1${fromNormalized}`);

    if (!contacts || contacts.length === 0) {
      // Unknown sender — just acknowledge
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const contact = contacts[0];

    // Find or create conversation for this contact
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
      // Update existing conversation
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
      // Insert the inbound message
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        direction: "inbound",
        body,
        status: "received",
      });

      // Update campaign reply count if applicable
      const { data: campaignContacts } = await supabase
        .from("contacts")
        .select("campaign")
        .eq("id", contact.id)
        .single();

      if (campaignContacts?.campaign) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("id, replies")
          .eq("name", campaignContacts.campaign)
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

    // Return empty TwiML response
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Incoming SMS webhook error:", error);
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
