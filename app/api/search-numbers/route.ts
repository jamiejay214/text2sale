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
      limit: 10,
    });

    if (available.length === 0) {
      return NextResponse.json({
        success: true,
        numbers: [],
        message: "No numbers available for that area code.",
      });
    }

    const numbers = available.map((n) => {
      const digits = n.phoneNumber.replace(/\D/g, "");
      const display = digits.length === 11
        ? `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
        : n.phoneNumber;
      return {
        raw: n.phoneNumber,
        display,
        locality: n.locality || "",
        region: n.region || "",
      };
    });

    return NextResponse.json({ success: true, numbers });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Twilio search error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
