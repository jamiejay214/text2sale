import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.VONAGE_API_KEY!;
const apiSecret = process.env.VONAGE_API_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, areaCode } = await req.json();

    let msisdn: string;

    if (phoneNumber) {
      // User selected a specific number — extract msisdn (digits only with country code)
      msisdn = phoneNumber.replace(/\D/g, "");
      if (!msisdn.startsWith("1")) msisdn = `1${msisdn}`;
    } else {
      // Search for first available
      const searchParams = new URLSearchParams({
        api_key: apiKey,
        api_secret: apiSecret,
        country: "US",
        features: "SMS",
        size: "1",
      });
      if (areaCode) {
        searchParams.set("pattern", `1${areaCode}`);
        searchParams.set("search_pattern", "1");
      }

      const searchRes = await fetch(`https://rest.nexmo.com/number/search?${searchParams}`);
      const searchData = await searchRes.json();

      if (!searchData.numbers || searchData.numbers.length === 0) {
        return NextResponse.json(
          { success: false, error: "No numbers available. Try a different area code." },
          { status: 404 }
        );
      }

      msisdn = searchData.numbers[0].msisdn;
    }

    // Buy the number via Vonage
    const buyRes = await fetch("https://rest.nexmo.com/number/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        country: "US",
        msisdn,
      }),
    });

    const buyData = await buyRes.json();

    if (buyData["error-code"] && buyData["error-code"] !== "200") {
      return NextResponse.json(
        { success: false, error: buyData["error-code-label"] || "Failed to buy number" },
        { status: 500 }
      );
    }

    // Set up the webhook for incoming SMS
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com"}/api/incoming-sms`;
    await fetch("https://rest.nexmo.com/number/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        country: "US",
        msisdn,
        moHttpUrl: webhookUrl,
        moSmppSysType: "inbound",
      }),
    });

    // Format for display
    const digits = msisdn.startsWith("1") ? msisdn.slice(1) : msisdn;
    const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

    return NextResponse.json({
      success: true,
      number: display,
      raw: `+${msisdn}`,
      sid: msisdn,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Vonage buy number error:", errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
