import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWifiSnapshot, type WifiSnapshot } from "@/components/wifi/wifi-data";

// Returns the latest live snapshot from the home collector, or the built-in
// sample snapshot when no live data has been ingested yet (or Supabase isn't
// configured). `live` tells the UI which it got so it can badge "SAMPLE".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consider live data stale after 10 minutes with no update from the collector.
const STALE_MS = 10 * 60 * 1000;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    try {
      const supabase = createClient(url, serviceKey);
      const { data } = await supabase
        .from("wifi_live")
        .select("snapshot, updated_at")
        .eq("household", "home")
        .maybeSingle();
      if (data?.snapshot) {
        const fresh = Date.now() - new Date(data.updated_at as string).getTime() < STALE_MS;
        return NextResponse.json({ live: true, stale: !fresh, snapshot: data.snapshot as WifiSnapshot });
      }
    } catch {
      // fall through to sample
    }
  }

  return NextResponse.json({ live: false, stale: false, snapshot: getWifiSnapshot() });
}
