import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.startsWith("1") ? digits.slice(1) : digits;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

function mapTwilioStatus(
  status: string
): "sent" | "delivered" | "failed" | string {
  switch (status) {
    case "delivered":
      return "delivered";
    case "undelivered":
    case "failed":
      return "failed";
    case "sent":
      return "sent";
    case "queued":
      return "queued";
    default:
      return status;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string;
    const to = formData.get("To") as string;
    const errorCode = formData.get("ErrorCode") as string | null;

    if (!messageStatus || !to) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Normalize the To number (recipient of the outbound SMS) for contact lookup
    const toDigits = to.replace(/\D/g, "");
    const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;
    const toFormatted = normalizePhone(to);

    // Find the contact by phone number (check multiple formats)
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .or(
        `phone.eq.${toFormatted},phone.eq.${to},phone.eq.${toDigits},phone.eq.+1${toNormalized}`
      );

    if (!contacts || contacts.length === 0) {
      console.warn(`SMS status callback: no contact found for ${to}`);
      return NextResponse.json({ success: true, skipped: true });
    }

    const contact = contacts[0];

    // Find the conversation for this contact
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .single();

    if (!conversation) {
      console.warn(
        `SMS status callback: no conversation for contact ${contact.id}`
      );
      return NextResponse.json({ success: true, skipped: true });
    }

    // Find the most recent outbound message in this conversation
    const { data: message } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!message) {
      console.warn(
        `SMS status callback: no outbound message for conversation ${conversation.id}`
      );
      return NextResponse.json({ success: true, skipped: true });
    }

    // Update the message status
    const mappedStatus = mapTwilioStatus(messageStatus);
    const updateData: Record<string, unknown> = { status: mappedStatus };

    if (errorCode) {
      updateData.error_code = errorCode;
    }

    await supabase.from("messages").update(updateData).eq("id", message.id);

    console.log(
      `SMS status updated: message ${message.id} -> ${mappedStatus}${messageSid ? ` (SID: ${messageSid})` : ""}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SMS status webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
