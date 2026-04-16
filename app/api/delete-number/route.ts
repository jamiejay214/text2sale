import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.TELNYX_API_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { numberId, phoneNumber } = await req.json();

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

    // Best-effort: keep the denormalized phone→user index in sync so the
    // inbound-SMS webhook stops routing messages to a number we no longer own.
    if (phoneNumber) {
      try {
        const digits = phoneNumber.replace(/\D/g, "");
        const normalized = digits.startsWith("1") ? digits.slice(1) : digits;
        if (normalized) {
          const admin = createClient(supabaseUrl, serviceKey);
          await admin.from("owned_phone_numbers").delete().eq("digits", normalized);
        }
      } catch (err) {
        console.error("[delete-number] owned_phone_numbers cleanup failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx delete number error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
