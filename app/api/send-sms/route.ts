import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { to, body, from, messagingServiceSid } = await req.json();

    if (!to || !body || (!from && !messagingServiceSid)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, and from or messagingServiceSid" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Normalize phone number to E.164
    const toDigits = to.replace(/\D/g, "");
    const toE164 = toDigits.startsWith("1") ? `+${toDigits}` : `+1${toDigits}`;

    // Status callback URL for delivery tracking
    const statusCallback = `${process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com"}/api/sms-status`;

    // Use Messaging Service if available (10DLC compliant), otherwise use direct from number
    let message;
    if (messagingServiceSid) {
      message = await client.messages.create({ to: toE164, body, messagingServiceSid, statusCallback });
    } else {
      const fromDigits = from.replace(/\D/g, "");
      const fromE164 = fromDigits.startsWith("1") ? `+${fromDigits}` : `+1${fromDigits}`;
      message = await client.messages.create({ to: toE164, body, from: fromE164, statusCallback });
    }

    return NextResponse.json({
      success: true,
      sid: message.sid,
      status: message.status,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Twilio send error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
