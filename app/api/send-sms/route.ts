import { NextRequest, NextResponse } from "next/server";
import { inferTimezone, isQuietHours, getNextSendWindow } from "@/lib/quiet-hours";

const apiKey = process.env.TELNYX_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { to, body, from, contactState, skipQuietHours } = await req.json();

    if (!to || !body || !from) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, body, from" },
        { status: 400 }
      );
    }

    // Quiet hours check
    if (!skipQuietHours) {
      const tz = inferTimezone(contactState);
      if (isQuietHours(tz)) {
        return NextResponse.json({
          success: false,
          error: "quiet_hours",
          message: "Cannot send during quiet hours (9 PM - 8 AM in contact's timezone)",
          nextSendTime: getNextSendWindow(tz),
          timezone: tz,
        });
      }
    }

    // Normalize to E.164 format (+1XXXXXXXXXX)
    const toDigits = to.replace(/\D/g, "");
    const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

    const fromDigits = from.replace(/\D/g, "");
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Send via Telnyx Messaging API
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromE164,
        to: toE164,
        text: body,
        type: "SMS",
      }),
    });

    const data = await res.json();

    if (data.errors) {
      const errMsg = data.errors[0]?.detail || "Failed to send";
      console.error("Telnyx send error:", errMsg);
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

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
