import { NextRequest, NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

// Daily Vercel cron: submit sitemap URLs whose lastmod falls in the last two
// days, so new and updated blog posts and landing pages reach Bing and the
// other IndexNow engines without anyone running scripts/indexnow.mjs by hand.
// Lastmod dates are day-granular, so a two-day window guarantees every change
// is picked up by at least one run, at the cost of at most one repeat.
const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  // Vercel sends CRON_SECRET as a bearer token when it is configured. Without
  // it, fall back to Vercel's cron user agent so the endpoint is not an open
  // trigger: repeated submissions of the same URLs can get a host throttled.
  const cronSecret = process.env.CRON_SECRET;
  const authorized = cronSecret
    ? req.headers.get("authorization") === `Bearer ${cronSecret}`
    : (req.headers.get("user-agent") || "").startsWith("vercel-cron/");
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = Date.now() - WINDOW_MS;
  const urls = sitemap()
    .filter((entry) => entry.lastModified && new Date(entry.lastModified).getTime() >= since)
    .map((entry) => entry.url);

  if (urls.length === 0) {
    return NextResponse.json({ submitted: 0 });
  }

  const result = await submitToIndexNow(urls);
  if (result.status >= 400) {
    console.error("IndexNow submission failed", result.status, result.body);
    return NextResponse.json({ submitted: 0, status: result.status, error: result.body }, { status: 502 });
  }
  return NextResponse.json({ submitted: urls.length, status: result.status });
}
