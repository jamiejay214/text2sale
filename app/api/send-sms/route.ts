import { NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

export async function POST(req: Request) {
  try {
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Missing Twilio credentials in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, message } = body as { to?: string; message?: string };

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    const payload: Record<string, string> = {
      to,
      body: message,
    };

    if (messagingServiceSid) {
      payload.messagingServiceSid = messagingServiceSid;
    } else if (twilioPhoneNumber) {
      payload.from = twilioPhoneNumber;
    } else {
      return NextResponse.json(
        { error: "Missing TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID" },
        { status: 500 }
      );
    }

    const result = await client.messages.create(payload);

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to send SMS",
        code: error?.code || null,
        moreInfo: error?.moreInfo || null,
      },
      { status: 500 }
    );
  }
}