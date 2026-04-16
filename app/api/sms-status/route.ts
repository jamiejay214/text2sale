import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Telnyx sends delivery receipts as POST webhooks
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload.data;

    if (!event || event.event_type !== "message.finalized") {
      return NextResponse.json({ success: true });
    }

    const eventPayload = event.payload;
    const to = eventPayload?.to?.[0]?.phone_number || "";
    const telnyxStatus = eventPayload?.to?.[0]?.status || "";

    if (!to || !telnyxStatus) {
      return NextResponse.json({ success: true });
    }

    // Map Telnyx status to our status
    // Telnyx: queued, sending, sent, delivered, sending_failed, delivery_failed, delivery_unconfirmed
    const mappedStatus = telnyxStatus === "delivered" ? "delivered"
      : (telnyxStatus === "sending_failed" || telnyxStatus === "delivery_failed") ? "failed"
      : (telnyxStatus === "sent" || telnyxStatus === "delivery_unconfirmed") ? "sent"
      : "sent";

    // Normalize phone for lookup. Contacts in this DB are usually stored as
    // unformatted 10 digits (e.g. "5613445416"), but legacy rows may be in
    // "(561) 344-5416" or "+15613445416" shape — check every reasonable form.
    const toDigits = to.replace(/\D/g, "");
    const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;
    const toFormatted = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;
    const toDashed = `${toNormalized.slice(0, 3)}-${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    // Search by exact match across all likely formats. We use .in() because
    // .or() with parens in values gets mis-parsed by PostgREST.
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .in("phone", [toNormalized, toFormatted, toDashed, `+1${toNormalized}`, `1${toNormalized}`, to]);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ success: true });
    }

    const contact = contacts[0];

    const { data: conversation } = await supabase
      .from("conversations").select("id").eq("contact_id", contact.id).single();

    if (!conversation) return NextResponse.json({ success: true });

    const { data: message } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!message) return NextResponse.json({ success: true });

    const updateData: Record<string, unknown> = { status: mappedStatus };
    const errors = eventPayload?.errors || [];
    if (errors.length > 0) updateData.error_code = errors[0]?.code || "";

    await supabase.from("messages").update(updateData).eq("id", message.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SMS status webhook error:", error);
    return NextResponse.json({ success: true });
  }
}
