import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { advanceUser, createServiceClient, PROFILE_COLUMNS, type ProfileRow, type Registration } from "@/lib/messaging-driver";
import { isMessagingStatus } from "@/lib/messaging-status";

// ── Admin: nudge a stuck activation ────────────────────────────────────────
//
// The driver retries on its own, so this is for the cases where a human has
// fixed something (topped up the Telnyx balance, set the Vercel keys, spoken
// to the customer) and wants the account to go again now rather than at its
// next scheduled retry — or where a rejected account should be put back in
// the queue.
//
//   retry         clear the alert, reset the retry budget, take a turn now
//   clear_alert   acknowledge an operator alert without retrying
//   restart       put a REJECTED account back in the queue:
//                   from "campaign": reuse the approved business, file a new campaign
//                   from "business": start over with a new business submission
//
// Restarting spends money on our Telnyx account (a new campaign or brand
// fee), so it is admin-only; the driver still refuses to go further for an
// account that isn't subscribed.

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const adminFail = await requireAdmin(auth.user);
  if (adminFail) return adminFail;

  const body = (await req.json().catch(() => ({}))) as { userId?: string; action?: string; from?: string };
  const { userId, action } = body;
  if (!userId || !action) {
    return NextResponse.json({ success: false, error: "userId and action required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data } = await db.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).single();
  if (!data) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  const profile = data as unknown as ProfileRow;
  const reg = (profile.a2p_registration || {}) as Registration;
  const status = isMessagingStatus(profile.messaging_status) ? profile.messaging_status : "NOT_STARTED";
  const now = new Date().toISOString();

  if (action === "clear_alert") {
    await db.from("profiles").update({ a2p_registration: { ...reg, adminAlert: null } }).eq("id", userId);
    return NextResponse.json({ success: true });
  }

  if (action === "retry") {
    if (status === "NOT_STARTED" || status === "ACTIVE") {
      return NextResponse.json({ success: false, error: `Nothing to retry — account is ${status}.` }, { status: 400 });
    }
    if (status === "REJECTED") {
      return NextResponse.json(
        { success: false, error: "This account was rejected. Use Restart to put it back in the queue." },
        { status: 400 }
      );
    }
    await db
      .from("profiles")
      .update({
        messaging_attempts: 0,
        messaging_next_attempt_at: now,
        a2p_registration: { ...reg, adminAlert: null },
      })
      .eq("id", userId);
    const result = await advanceUser(db, userId, { force: true });
    return NextResponse.json({ success: true, result });
  }

  if (action === "restart") {
    if (status !== "REJECTED") {
      return NextResponse.json({ success: false, error: "Only rejected accounts can be restarted." }, { status: 400 });
    }
    const from = body.from === "campaign" ? "campaign" : "business";
    if (from === "campaign" && !reg.brandRegistrationSid) {
      return NextResponse.json(
        { success: false, error: "There is no approved business to reuse — restart from the business step." },
        { status: 400 }
      );
    }

    const nextReg: Registration = {
      ...reg,
      campaignSid: null,
      campaignStatus: null,
      errors: [],
      adminAlert: null,
      awaiting: null,
      updatedAt: now,
      ...(from === "business"
        ? { brandRegistrationSid: null, brandStatus: null, brandIdentityStatus: null, siteLiveAt: null }
        : {}),
    };
    await db
      .from("profiles")
      .update({
        messaging_status: from === "campaign" ? "BRAND_APPROVED" : "BUSINESS_SUBMITTED",
        messaging_status_at: now,
        messaging_error: null,
        messaging_attempts: 0,
        messaging_next_attempt_at: now,
        a2p_registration: nextReg,
      })
      .eq("id", userId);
    const result = await advanceUser(db, userId, { force: true });
    return NextResponse.json({ success: true, result });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
