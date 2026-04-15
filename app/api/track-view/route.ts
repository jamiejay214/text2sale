import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY || "";
const ALERT_EMAIL = "johnsonhealthquotes@gmail.com";

// Rate limit: track last alert time in memory (resets on cold start, which is fine)
let lastAlertSentAt = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts

async function sendVisitorAlert(city: string, region: string, country: string, path: string, referrer: string) {
  const now = Date.now();
  if (now - lastAlertSentAt < ALERT_COOLDOWN_MS) return; // Rate limited

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin has visitor alerts enabled
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("visitor_alerts")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (adminProfile?.visitor_alerts === false) return;

    // Build alert content
    const location = [city, region, country].filter(Boolean).join(", ") || "Unknown location";
    const page = path || "/";
    const source = referrer || "Direct";
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

    // Send email via Resend API
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set — skipping visitor alert email");
      return;
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Text2Sale Alerts <onboarding@resend.dev>",
        to: [ALERT_EMAIL],
        subject: `🔔 New Visitor — ${location}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #18181b; color: #fff; border-radius: 16px;">
            <h2 style="margin: 0 0 16px; color: #a78bfa;">🔔 New Visitor on Text2Sale</h2>
            <div style="background: #27272a; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
              <table style="width: 100%; border-collapse: collapse; color: #d4d4d8; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #71717a;">📍 Location</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #fff;">${location}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #71717a;">📄 Page</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #fff;">${page}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #71717a;">🔗 Source</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #fff;">${source}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #71717a;">🕐 Time</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #fff;">${time} ET — ${date}</td>
                </tr>
              </table>
            </div>
            <p style="margin: 0; font-size: 12px; color: #52525b;">Alerts are rate-limited to 1 every 5 minutes. Toggle in Admin Portal.</p>
          </div>
        `,
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

    // Send email alert to admin (rate limited)
    sendVisitorAlert(decodedCity, region, country, path, referrer);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
