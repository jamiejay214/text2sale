import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
}

// POST - Schedule a message (save to DB for later sending)
export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      contactId,
      body,
      fromNumber,
      scheduledAt,
      messagingServiceSid,
    } = await req.json();

    if (!userId || !contactId || !body || !fromNumber || !scheduledAt) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert({
        user_id: userId,
        contact_id: contactId,
        body,
        from_number: fromNumber,
        scheduled_at: scheduledAt,
        messaging_service_sid: messagingServiceSid || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, scheduledMessage: data });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Schedule message error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

// GET - Process due scheduled messages (called by cron or client)
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = twilio(accountSid, authToken);

    // Fetch all pending messages whose scheduled time has passed
    const { data: pendingMessages, error: fetchErr } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchErr) {
      return NextResponse.json(
        { success: false, error: fetchErr.message },
        { status: 500 }
      );
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      try {
        // Look up the contact phone number
        const { data: contact } = await supabase
          .from("contacts")
          .select("id, phone")
          .eq("id", msg.contact_id)
          .single();

        if (!contact || !contact.phone) {
          throw new Error("Contact not found or missing phone");
        }

        const toE164 = normalizePhone(contact.phone);

        // Send via Twilio
        if (msg.messaging_service_sid) {
          await client.messages.create({
            to: toE164,
            body: msg.body,
            messagingServiceSid: msg.messaging_service_sid,
          });
        } else {
          const fromE164 = normalizePhone(msg.from_number);
          await client.messages.create({
            to: toE164,
            body: msg.body,
            from: fromE164,
          });
        }

        // Mark as sent
        await supabase
          .from("scheduled_messages")
          .update({ status: "sent" })
          .eq("id", msg.id);

        // Create or update conversation and insert message record
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("contact_id", msg.contact_id)
          .eq("user_id", msg.user_id)
          .single();

        if (!existingConv) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              user_id: msg.user_id,
              contact_id: msg.contact_id,
              preview: msg.body.slice(0, 100),
              unread: 0,
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (newConv) {
            await supabase.from("messages").insert({
              conversation_id: newConv.id,
              direction: "outbound",
              body: msg.body,
              status: "sent",
            });
          }
        } else {
          await supabase
            .from("conversations")
            .update({
              preview: msg.body.slice(0, 100),
              last_message_at: new Date().toISOString(),
            })
            .eq("id", existingConv.id);

          await supabase.from("messages").insert({
            conversation_id: existingConv.id,
            direction: "outbound",
            body: msg.body,
            status: "sent",
          });
        }

        sent++;
      } catch (err: unknown) {
        failed++;
        const errMsg = err instanceof Error ? err.message : "Send failed";
        console.error(`Scheduled send failed for message ${msg.id}:`, errMsg);

        // Mark as failed
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingMessages.length,
      sent,
      failed,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Process scheduled messages error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
