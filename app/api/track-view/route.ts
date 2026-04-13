import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const telnyxApiKey = process.env.TELNYX_API_KEY!;

// Rate limit: track last alert time in memory (resets on cold start, which is fine)
let lastAlertSentAt = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts

async function sendVisitorAlert(city: string, region: string, country: string, path: string, referrer: string) {
  const now = Date.now();
  if (now - lastAlertSentAt < ALERT_COOLDOWN_MS) return; // Rate limited

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find admin profile to get their phone number and a "from" number
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("phone, owned_numbers, visitor_alerts")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminProfile?.phone) return;

    // Check if admin has visitor alerts enabled (default: true)
    if (adminProfile.visitor_alerts === false) return;

    const adminPhone = adminProfile.phone.replace(/\D/g, "");
    const adminE164 = `+${adminPhone.startsWith("1") ? adminPhone : `1${adminPhone}`}`;

    // Use admin's first owned number as the "from" number
    const ownedNumbers = adminProfile.owned_numbers || [];
    if (ownedNumbers.length === 0) return; // No number to send from

    const fromNumber = ownedNumbers[0].number || ownedNumbers[0].phoneNumber;
    if (!fromNumber) return;

    const fromDigits = fromNumber.replace(/\D/g, "");
    const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

    // Build the alert message
    const location = [city, region, country].filter(Boolean).join(", ") || "Unknown location";
    const page = path || "/";
    const source = referrer ? `\nFrom: ${referrer}` : "";
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

    const alertBody = `🔔 New Visitor on Text2Sale!\n📍 ${location}\n📄 Page: ${page}${source}\n🕐 ${time} ET`;

    await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxApiKey}`,
      },
      body: JSON.stringify({
        from: fromE164,
        to: adminE164,
        text: alertBody,
        type: "SMS",
      }),
    });

    lastAlertSentAt = now;
  } catch (e) {
    console.error("Visitor alert error:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json();

    // Hash the IP for privacy (don't store raw IPs)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "text2sale-salt").digest("hex").slice(0, 16);

    const userAgent = req.headers.get("user-agent") || "";

    // Capture geo data from Vercel headers
    const region = req.headers.get("x-vercel-ip-country-region") || "";
    const country = req.headers.get("x-vercel-ip-country") || "";
    const city = req.headers.get("x-vercel-ip-city") || "";
    const decodedCity = city ? decodeURIComponent(city) : "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("page_views").insert({
      path: path || "/",
      referrer: referrer || "",
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
      region: region || null,
      country: country || null,
      city: decodedCity || null,
    });

    // Send text alert to admin (rate limited)
    sendVisitorAlert(decodedCity, region, country, path, referrer);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
