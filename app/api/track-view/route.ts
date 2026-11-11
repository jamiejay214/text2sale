import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendAdminAlertSMS } from "@/lib/admin-alert";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    // New visits are recorded in the Command Center; the optional owner ping is SMS only.
    lastAlertSentAt = now;
    await sendAdminAlertSMS(
      `🔔 Text2Sale visitor\n📍 ${location}\n📄 ${page}\n🔗 ${source}\n🕐 ${time} ET`
    );
  } catch (e) {
    console.error("Visitor alert error:", e);
  }
}

// Server-side channel classification from referrer + UTM
function classifyChannel(referrer: string, utm: { source?: string; medium?: string }): { channel: string; referrer_domain: string } {
  let referrer_domain = "";
  try {
    if (referrer) referrer_domain = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {}

  const med = (utm.medium || "").toLowerCase();
  const src = (utm.source || "").toLowerCase();

  if (["cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-search", "display", "retargeting"].includes(med)) return { channel: "paid", referrer_domain };
  if (med === "email" || src === "email" || src === "newsletter") return { channel: "email", referrer_domain };
  if (med === "social" || /facebook|instagram|twitter|x\.com|linkedin|tiktok|pinterest|reddit|youtube|t\.co|fb\.com|lnkd\.in/i.test(referrer_domain + " " + src)) return { channel: "social", referrer_domain };
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\.|brave\.com/i.test(referrer_domain)) return { channel: "organic", referrer_domain };
  if (referrer_domain) return { channel: "referral", referrer_domain };
  return { channel: "direct", referrer_domain: "" };
}

// CORS preflight for cross-site embed (other sites posting in)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

const CORS_HEADERS = { "access-control-allow-origin": "*" };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      site,
      path,
      referrer,
      page_title,
      visitor_id,
      session_id,
      is_entry,
      utm,
      screen,
      viewport,
      device,
      browser,
      os,
      language,
      tz,
    } = body || {};

    // Hash the IP for privacy (don't store raw IPs)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "text2sale-salt").digest("hex").slice(0, 16);

    const userAgent = req.headers.get("user-agent") || "";

    // Vercel geo headers
    const region = req.headers.get("x-vercel-ip-country-region") || "";
    const country = req.headers.get("x-vercel-ip-country") || "";
    const city = req.headers.get("x-vercel-ip-city") || "";
    const decodedCity = city ? decodeURIComponent(city) : "";

    const { channel, referrer_domain } = classifyChannel(referrer || "", utm || {});

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Cross-site routing ────────────────────────────────────────────
    // site = "abg" → AI Business Growth's OWN project (falls back to the
    //               legacy website_visits in text2sale's project until ABG_*
    //               env is configured).
    // site = "tq"  → the separate Trusted Quotes Supabase project.
    // default      → page_views (text2sale).
    if (site === "abg") {
      const abgUrl = process.env.ABG_SUPABASE_URL;
      const abgKey = process.env.ABG_SERVICE_ROLE_KEY;
      const abg = abgUrl && abgKey ? createClient(abgUrl, abgKey, { auth: { persistSession: false } }) : supabase;
      await abg.from("website_visits").insert({
        page: (path || "/").slice(0, 500),
        device_type: device || null,
        source: utm?.source || referrer_domain || null,
        visitor_id: visitor_id || null,
        region: region || null,
        country: country || null,
      });
      return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
    }

    if (site === "tq") {
      const tqUrl = process.env.TRUSTEDQUOTES_SUPABASE_URL;
      const tqKey = process.env.TRUSTEDQUOTES_SERVICE_ROLE_KEY;
      if (tqUrl && tqKey) {
        const tqClient = createClient(tqUrl, tqKey, { auth: { persistSession: false } });
        // Trusted Quotes `visitors` only has limited columns — map cautiously.
        await tqClient.from("visitors").insert({
          page: (path || "/").slice(0, 500),
          state: region || null,
        });
      }
      return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
    }

    if (/bot|crawl|spider|headless|lighthouse|uptime|monitor|curl|wget/i.test(userAgent) || /^\/(api|admin|command|dashboard|biz)(\/|$)/.test(path || "/")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const { error: viewError } = await supabase.from("page_views").insert({
      path: (path || "/").slice(0, 500),
      referrer: (referrer || "").slice(0, 500),
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
      region: region || null,
      country: country || null,
      city: decodedCity || null,
      // — rich fields —
      visitor_id: visitor_id || null,
      session_id: session_id || null,
      page_title: (page_title || "").slice(0, 200),
      utm_source: utm?.source ? String(utm.source).slice(0, 100) : null,
      utm_medium: utm?.medium ? String(utm.medium).slice(0, 100) : null,
      utm_campaign: utm?.campaign ? String(utm.campaign).slice(0, 200) : null,
      utm_content: utm?.content ? String(utm.content).slice(0, 200) : null,
      utm_term: utm?.term ? String(utm.term).slice(0, 200) : null,
      channel,
      referrer_domain: referrer_domain || null,
      landing_page: is_entry ? (path || "/").slice(0, 500) : null,
      screen_w: screen?.w || null,
      screen_h: screen?.h || null,
      viewport_w: viewport?.w || null,
      viewport_h: viewport?.h || null,
      device: device || null,
      browser: browser || null,
      os: os || null,
      language: language ? String(language).slice(0, 20) : null,
      tz: tz ? String(tz).slice(0, 60) : null,
      is_entry: !!is_entry,
    });

    if (viewError) {
      console.error("track-view insert failed:", viewError.code);
      return NextResponse.json({ success: false }, { status: 503 });
    }

    // Notify by SMS if enabled (rate limited)
    sendVisitorAlert(decodedCity, region, country, path || "/", referrer || "");

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("track-view error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
