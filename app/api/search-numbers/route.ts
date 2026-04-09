import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.VONAGE_API_KEY!;
const apiSecret = process.env.VONAGE_API_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { areaCode } = await req.json();

    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      country: "US",
      features: "SMS",
      size: "10",
    });

    if (areaCode) {
      params.set("pattern", `1${areaCode}`);
      params.set("search_pattern", "1");
    }

    const res = await fetch(`https://rest.nexmo.com/number/search?${params}`);
    const data = await res.json();

    if (!data.numbers || data.numbers.length === 0) {
      return NextResponse.json({ success: true, numbers: [], message: "No numbers available for that area code." });
    }

    const numbers = data.numbers.map((n: { msisdn: string; cost: string }) => {
      const digits = n.msisdn.startsWith("1") ? n.msisdn.slice(1) : n.msisdn;
      return {
        raw: `+${n.msisdn}`,
        display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
        locality: "",
        region: "",
      };
    });

    return NextResponse.json({ success: true, numbers });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Vonage search error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
