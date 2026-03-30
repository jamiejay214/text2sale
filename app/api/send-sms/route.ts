import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { to, body, from } = await req.json();

    if (!to || !body || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, from" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Normalize phone number to E.164
    const toDigits = to.replace(/\D/g, "");
    const toE164 = toDigits.startsWith("1") ? `+${toDigits}` : `+1${toDigits}`;

    const fromDigits = from.replace(/\D/g, "");
    const fromE164 = fromDigits.startsWith("1") ? `+${fromDigits}` : `+1${fromDigits}`;

    const message = await client.messages.create({
      to: toE164,
      from: fromE164,
      body,
    });

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
