import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import {
  getChannelBreakdown,
  getTopReferrers,
  getTopCampaigns,
  getTopExitDestinations,
  getRecentVisitors,
  getEngagementMetrics,
} from "@/lib/visitor-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const [channels, referrers, campaigns, exits, recentVisitors, engagement] = await Promise.all([
      getChannelBreakdown(14),
      getTopReferrers(14, 10),
      getTopCampaigns(30, 10),
      getTopExitDestinations(14, 10),
      getRecentVisitors(30),
      getEngagementMetrics(14),
    ]);
    return NextResponse.json({ channels, referrers, campaigns, exits, recentVisitors, engagement });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Intelligence failed" },
      { status: 500 }
    );
  }
}
