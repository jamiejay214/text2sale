import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Vonage sends delivery receipts as GET or POST
export async function GET(req: NextRequest) {
  return handleDLR(req);
}

export async function POST(req: NextRequest) {
  return handleDLR(req);
}

async function handleDLR(req: NextRequest) {
  try {
    // Vonage DLR params: msisdn (recipient), to (sender number), status, err-code, messageId
    let to: string, status: string, errCode: string;

    if (req.method === "GET") {
      const params = req.nextUrl.searchParams;
      to = params.get("msisdn") || "";
      status = params.get("status") || "";
      errCode = params.get("err-code") || "";
    } else {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await req.json();
        to = json.msisdn || "";
        status = json.status || "";
        errCode = json["err-code"] || "";
      } else {
        const formData = await req.formData();
        to = (formData.get("msisdn") || "") as string;
        status = (formData.get("status") || "") as string;
        errCode = (formData.get("err-code") || "") as string;
      }
    }

    if (!to || !status) {
      return NextResponse.json({ success: true });
    }

    // Map Vonage status to our status
    // Vonage: delivered, expired, failed, rejected, accepted, buffered, unknown
    const mappedStatus = status === "delivered" ? "delivered"
      : (status === "failed" || status === "rejected" || status === "expired") ? "failed"
      : status === "accepted" ? "sent"
      : "sent";

    // Normalize phone for lookup
    const toDigits = to.replace(/\D/g, "");
    const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;
    const toFormatted = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .or(`phone.eq.${toFormatted},phone.eq.+1${toNormalized},phone.eq.${toDigits},phone.eq.${to}`);

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
    if (errCode && errCode !== "0") updateData.error_code = errCode;

    await supabase.from("messages").update(updateData).eq("id", message.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SMS status webhook error:", error);
    return NextResponse.json({ success: true });
  }
}
