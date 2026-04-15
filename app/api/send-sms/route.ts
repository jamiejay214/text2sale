import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

export async function POST(req: NextRequest) {
  try {
    const { to, body, from } = await req.json();

    if (!to || !body || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, from" },
        { status: 400 }
      );
    }

    // Normalize to E.164 format (+1XXXXXXXXXX)
    const toDigits = to.replace(/\D/g, "");
    const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

    const fromDigits = from.replace(/\D/g, "");
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Build Telnyx payload — include messaging_profile_id when available
    // so messages route through the correct 10DLC campaign.
    const telnyxPayload: Record<string, string> = {
      from: fromE164,
      to: toE164,
      text: body,
      type: "SMS",
    };
    if (messagingProfileId) {
      telnyxPayload.messaging_profile_id = messagingProfileId;
    }

    // Send via Telnyx Messaging API
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(telnyxPayload),
    });

    const data = await res.json();

    if (data.errors) {
      const errMsg = data.errors[0]?.detail || "Failed to send";
      console.error("Telnyx send error:", JSON.stringify(data.errors));
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    console.log("Telnyx send OK:", data.data?.id, "from:", fromE164, "to:", toE164);

    return NextResponse.json({
      success: true,
      sid: data.data?.id || "",
      status: "sent",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx send error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
