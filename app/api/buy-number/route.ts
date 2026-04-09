import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID!;

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Order the number via Telnyx
    const orderRes = await fetch("https://api.telnyx.com/v2/number_orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone_numbers: [{ phone_number: phoneNumber }],
        messaging_profile_id: messagingProfileId,
      }),
    });

    const orderData = await orderRes.json();

    if (orderData.errors) {
      return NextResponse.json(
        { success: false, error: orderData.errors[0]?.detail || "Failed to buy number" },
        { status: 500 }
      );
    }

    // Format for display
    const digits = phoneNumber.replace(/\D/g, "");
    const local = digits.startsWith("1") ? digits.slice(1) : digits;
    const display = `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;

    return NextResponse.json({
      success: true,
      number: display,
      raw: phoneNumber,
      sid: orderData.data?.id || phoneNumber,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx buy number error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
