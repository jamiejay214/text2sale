import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { assignNumberToCampaign } from "@/app/api/buy-number/route";

// ─── Admin: backfill 10DLC campaign assignment for a user's numbers ───────
// Until now /api/buy-number was POSTing to Telnyx's legacy 10DLC
// endpoint with camelCase fields, which TCR-migrated accounts silently
// ignore. So everyone who bought numbers before the fix has numbers
// that exist in Telnyx + on the dashboard but are NOT linked to their
// approved 10DLC campaign. Without that link, carriers rate-limit or
// outright block outbound SMS and messaging deliverability tanks.
//
// This endpoint takes { userId } and re-runs the (now-corrected)
// assignment against every number in profiles.owned_numbers, using the
// user's a2p_registration.campaignSid. It's idempotent — Telnyx treats
// an "already assigned" as a no-op and we catch it as success.
//
// Response: { success, total, linked, skipped, failures: [{ number, error }] }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const adminFail = await requireAdmin(auth.user);
    if (adminFail) return adminFail;

    const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await svc
      .from("profiles")
      .select("owned_numbers, a2p_registration")
      .eq("id", userId)
      .single();
    if (profErr || !profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const reg = (profile.a2p_registration as Record<string, unknown> | null) || null;
    const campaignId = reg && typeof reg.campaignSid === "string" ? reg.campaignSid : null;
    const status = reg && typeof reg.status === "string" ? reg.status : null;
    const approved = status === "completed" || status === "campaign_approved";
    if (!campaignId || !approved) {
      return NextResponse.json({
        success: false,
        error: "User's 10DLC campaign is not approved yet — nothing to link to.",
      });
    }

    const owned = Array.isArray(profile.owned_numbers)
      ? (profile.owned_numbers as Array<{ number?: string }>)
      : [];
    if (owned.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        linked: 0,
        skipped: 0,
        failures: [],
      });
    }

    let linked = 0;
    let skipped = 0;
    const failures: Array<{ number: string; error: string }> = [];

    // Process serially so we don't hammer Telnyx with 6 concurrent
    // requests and trip their rate-limit (results in transient 429s
    // that would show up as false failures in this report).
    for (const entry of owned) {
      const displayed = entry.number || "";
      const digits = displayed.replace(/\D/g, "");
      if (!digits) {
        skipped++;
        continue;
      }
      const e164 = `+${digits.startsWith("1") ? digits : `1${digits}`}`;
      try {
        const r = await assignNumberToCampaign(e164, campaignId);
        if (r.assigned) linked++;
        else failures.push({ number: displayed, error: r.error || "unknown" });
      } catch (e) {
        failures.push({
          number: displayed,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaignId,
      total: owned.length,
      linked,
      skipped,
      failures,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
