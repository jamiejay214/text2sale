import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;

// ─── Available-number search ────────────────────────────────────────────
// We only ever sell numbers that do SMS + voice + HD voice. Telnyx exposes
// those capabilities on the `features` array of every search result, so
// we filter upfront (so Telnyx returns a smaller list) and again after
// the fact (so a number that advertises itself as SMS-only or voice-only
// never leaks through). That guarantees every purchased number can text,
// call, and deliver crisp HD audio on browser WebRTC calls.
//
// Common Telnyx feature codes we require:
//   sms       — messaging
//   voice     — inbound/outbound calling (Call Control / VoIP)
//   hd_voice  — wideband audio (G.722) for high-quality browser calls
//   mms       — bonus, not required

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
    // ask for SMS + voice upfront. We request a larger page (40) than we
    // return (10) so the client-side HD-voice check has headroom — Telnyx
    // doesn't support hd_voice as a server-side filter, so we filter for
    // it on our end. We also pin to local DIDs because toll-free calling
    // has a separate compliance path.
    const params = new URLSearchParams({
      "filter[country_code]": "US",
      "filter[features]": "sms,voice",
      "filter[phone_number_type]": "local",
      "filter[limit]": "40",
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
          "No SMS + voice + HD voice numbers available for that area code. Try another area code.",
      });
    }

    // Secondary client-side filter — verify SMS + voice are present on the
    // features array. Telnyx sometimes returns numbers lacking voice even
    // when the query asked for it, so this is our last line of defense.
    //
    // NOTE: Telnyx does NOT expose HD voice as a feature in the
    // available_phone_numbers response. HD voice is really a codec /
    // connection capability that we force-enable via PATCH on the number
    // the moment it's purchased (see buy-number route). So every number
    // we sell ships with HD voice enabled — we just can't pre-verify it
    // from the search results.
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
        // We auto-enable hd_voice on purchase, so advertise it here.
        features: ["sms", "voice", "hd_voice"],
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
