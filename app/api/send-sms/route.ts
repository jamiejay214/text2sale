import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.VONAGE_API_KEY!;
const apiSecret = process.env.VONAGE_API_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { to, body, from } = await req.json();

    if (!to || !body || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, from" },
        { status: 400 }
      );
    }

    // Normalize phone numbers — Vonage wants digits only, no + prefix, with country code
    const toDigits = to.replace(/\D/g, "");
    const toE164 = toDigits.startsWith("1") ? toDigits : `1${toDigits}`;

    const fromDigits = from.replace(/\D/g, "");
    const fromE164 = fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`;

    // Send via Vonage SMS API
    const res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        to: toE164,
        from: fromE164,
        text: body,
      }),
    });

    const data = await res.json();

    if (data.messages?.[0]?.status !== "0") {
      const errMsg = data.messages?.[0]?.["error-text"] || "Failed to send";
      console.error("Vonage send error:", errMsg);
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sid: data.messages[0]["message-id"],
      status: "sent",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Vonage send error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
