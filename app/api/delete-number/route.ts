import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const apiKey = process.env.TELNYX_API_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { numberId, phoneNumber } = await req.json();

    if (!numberId) {
      return NextResponse.json(
        { success: false, error: "Number ID is required" },
        { status: 400 }
      );
    }

    // Verify the phoneNumber belongs to the authenticated caller before
    // releasing it on Telnyx. Otherwise any signed-in user could release
    // any other user's number just by knowing its Telnyx id.
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "phoneNumber is required for ownership verification" },
        { status: 400 }
      );
    }
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    const normalizedDigits = digitsOnly.startsWith("1") ? digitsOnly.slice(1) : digitsOnly;
    const ownershipClient = createClient(supabaseUrl, serviceKey);
    const { data: owned } = await ownershipClient
      .from("owned_phone_numbers")
      .select("user_id")
      .eq("digits", normalizedDigits)
      .maybeSingle();
    if (!owned || owned.user_id !== auth.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you do not own this number" },
        { status: 403 }
      );
    }

    // Telnyx has two different IDs in play and we need the right one:
    //   - Number Order ID — returned by POST /number_orders (what we saved
    //     as `numberId` at purchase time)
    //   - Phone Number ID — the UUID of the live phone_numbers resource
    //     (what DELETE /v2/phone_numbers/{id} expects)
    // The stored id might be either, so we always resolve the *current*
    // phone_number UUID by E.164 first. Falls back to the stored id for
    // legacy rows that happened to store the right value.
    const e164 = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${digitsOnly.startsWith("1") ? digitsOnly : `1${digitsOnly}`}`;

    let phoneNumberUuid: string | null = null;
    try {
      const lookup = await fetch(
        `https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const lookupBody = await lookup.json().catch(() => ({}));
      phoneNumberUuid = lookupBody?.data?.[0]?.id ?? null;
    } catch (err) {
      console.error("[delete-number] lookup failed:", err);
    }

    // Use the resolved UUID; fall back to whatever the client sent only if
    // lookup truly returned nothing (new purchases stored the order ID,
    // which Telnyx DELETE doesn't accept — hence the 404 on release).
    const targetId = phoneNumberUuid || numberId;

    // Delete/release the number on Telnyx
    const res = await fetch(`https://api.telnyx.com/v2/phone_numbers/${targetId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data?.errors?.[0]?.detail
        || (res.status === 404
          ? "Telnyx can't find this number — it may already be released. Refresh the page."
          : `Failed to release number (${res.status})`);
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
