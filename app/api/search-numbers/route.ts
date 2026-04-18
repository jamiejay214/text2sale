import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;

// ─── Available-number search ────────────────────────────────────────────
// We only ever sell numbers that do BOTH SMS and voice. Telnyx exposes
// those capabilities on the `features` array of every search result, so
// we filter upfront (so Telnyx returns a smaller list) and again after
// the fact (so a number that advertises itself as SMS-only or voice-only
// never leaks through). That makes the "call this lead" button on a
// purchased line a guaranteed no-op never-fails.
//
// Common Telnyx feature codes we require:
//   sms   — messaging
//   voice — inbound/outbound calling (Call Control / VoIP)
//   mms   — bonus, not required

type TelnyxFeature = { name?: string };
type TelnyxNumber = {
  phone_number: string;
  locality?: string;
  administrative_area?: string;
  features?: Array<string | TelnyxFeature>;
  record_type?: string;
  phone_number_type?: string;
};

function featureNames(n: TelnyxNumber): string[] {
  const arr = n.features || [];
  return arr.map((f) => (typeof f === "string" ? f : f?.name || ""))
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const { areaCode } = await req.json();

    // `filter[features]` is a comma-separated AND-filter on Telnyx, so we
    // ask for SMS + voice upfront. We also pin to local DIDs because
    // toll-free calling has a separate compliance path.
    const params = new URLSearchParams({
      "filter[country_code]": "US",
      "filter[features]": "sms,voice",
      "filter[phone_number_type]": "local",
      "filter[limit]": "20",
    });

    if (areaCode) {
      params.set("filter[national_destination_code]", areaCode);
    }

    const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        success: true,
        numbers: [],
        message:
          "No SMS + voice numbers available for that area code. Try another area code.",
      });
    }

    // Secondary client-side filter — some regions return numbers whose
    // `features` array doesn't include voice even though the query asked.
    const callAndTextable = (data.data as TelnyxNumber[]).filter((n) => {
      const feats = featureNames(n);
      return feats.includes("sms") && feats.includes("voice");
    });

    const numbers = callAndTextable.slice(0, 10).map((n) => {
      const raw = n.phone_number;
      const digits = raw.replace(/\D/g, "").slice(1);
      return {
        raw,
        display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
        locality: n.locality || "",
        region: n.administrative_area || "",
        features: ["sms", "voice"],
      };
    });

    if (numbers.length === 0) {
      return NextResponse.json({
        success: true,
        numbers: [],
        message:
          "No SMS + voice numbers available for that area code. Try another area code.",
      });
    }

    return NextResponse.json({ success: true, numbers });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx search error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
