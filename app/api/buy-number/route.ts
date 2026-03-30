import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { areaCode } = await req.json();

    const client = twilio(accountSid, authToken);

    // Search for available numbers
    const available = await client.availablePhoneNumbers("US").local.list({
      areaCode: areaCode ? Number(areaCode) : undefined,
      smsEnabled: true,
      limit: 1,
    });

    if (available.length === 0) {
      return NextResponse.json(
        { success: false, error: "No numbers available for that area code. Try another." },
        { status: 404 }
      );
    }

    // Purchase the number
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com"}/api/incoming-sms`,
      smsMethod: "POST",
    });

    // Format for display
    const digits = purchased.phoneNumber.replace(/\D/g, "");
    const display = digits.length === 11
      ? `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
      : purchased.phoneNumber;

    return NextResponse.json({
      success: true,
      number: display,
      raw: purchased.phoneNumber,
      sid: purchased.sid,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Twilio buy number error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
