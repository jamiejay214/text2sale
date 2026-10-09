import { getWorkspaceUserId as getAuthedUserId } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CALL_RATE_OUTBOUND_PER_MIN } from "@/lib/call-pricing";
import { toE164 } from "@/lib/browser-calls";
import { isEntitled } from "@/lib/messaging-status";

// ─── POST /api/calls/log ─────────────────────────────────────────────────────
// Called by the browser BEFORE it dials. Creates the `calls` row that the
// call-webhook binds the Telnyx leg to and bills at hangup (see
// lib/browser-calls.ts). Refuses the call up front when the caller-ID number
// isn't this account's, the subscription isn't active, or the wallet can't
// cover the first minute — the browser only dials after this succeeds.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const to = toE164(body?.to);
    const from = toE164(body?.from);
    const contactId = typeof body?.contactId === "string" && body.contactId ? body.contactId : null;
    if (!to || !from) {
      return NextResponse.json({ error: "Enter a complete US phone number." }, { status: 400 });
    }

    const [{ data: owned }, { data: profile }] = await Promise.all([
      adminSupabase
        .from("owned_phone_numbers")
        .select("user_id")
        .eq("digits", from.slice(2))
        .eq("user_id", userId)
        .limit(1),
      adminSupabase
        .from("profiles")
        .select("wallet_balance, paused, subscription_status, free_subscription")
        .eq("id", userId)
        .maybeSingle(),
    ]);
    if (!owned?.length) {
      return NextResponse.json({ error: "You can only call from your own business number." }, { status: 403 });
    }
    if (!profile || profile.paused || !isEntitled(profile)) {
      return NextResponse.json({ error: "An active account and subscription are required to call." }, { status: 403 });
    }
    if ((Number(profile.wallet_balance) || 0) < CALL_RATE_OUTBOUND_PER_MIN) {
      return NextResponse.json(
        { error: `Add funds to call. Calls are $${CALL_RATE_OUTBOUND_PER_MIN.toFixed(3)} per minute.`, insufficientFunds: true },
        { status: 402 }
      );
    }

    const { data: callRow, error } = await adminSupabase
      .from("calls")
      .insert({
        user_id: userId,
        contact_id: contactId,
        direction: "outbound",
        from_number: from,
        to_number: to,
        status: "initiating",
        cost_per_min: CALL_RATE_OUTBOUND_PER_MIN,
      })
      .select("id")
      .single();

    if (error || !callRow) {
      return NextResponse.json({ error: "Could not start the call. Please retry." }, { status: 500 });
    }

    return NextResponse.json({ callId: callRow.id });
  } catch (err) {
    console.error("[calls/log] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
