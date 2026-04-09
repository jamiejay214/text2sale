import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { numberId } = await req.json();

    if (!numberId) {
      return NextResponse.json(
        { success: false, error: "Number ID is required" },
        { status: 400 }
      );
    }

    // Delete/release the number on Telnyx
    const res = await fetch(`https://api.telnyx.com/v2/phone_numbers/${numberId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data?.errors?.[0]?.detail || `Failed to release number (${res.status})`;
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx delete number error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
