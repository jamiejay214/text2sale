import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.TELNYX_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { areaCode } = await req.json();

    const params = new URLSearchParams({
      "filter[country_code]": "US",
      "filter[features]": "sms",
      "filter[limit]": "10",
    });

    if (areaCode) {
      params.set("filter[national_destination_code]", areaCode);
    }

    const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ success: true, numbers: [], message: "No numbers available for that area code." });
    }

    const numbers = data.data.map((n: { phone_number: string; locality?: string; administrative_area?: string }) => {
      const digits = n.phone_number.replace(/\D/g, "");
      const local = digits.startsWith("1") ? digits.slice(1) : digits;
      return {
        raw: n.phone_number,
        display: `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`,
        locality: n.locality || "",
        region: n.administrative_area || "",
      };
    });

    return NextResponse.json({ success: true, numbers });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx search error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
