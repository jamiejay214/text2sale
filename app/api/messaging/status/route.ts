import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import {
  MessagingStatus,
  isMessagingStatus,
  statusCopy,
} from "@/lib/messaging-status";
import { NUMBER_PURCHASE_COST } from "@/lib/telnyx-10dlc";

// What the activation screen polls. Returns progress in plain language — the
// customer never sees brand, campaign, TCR or MNO anywhere in this payload.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const db = createClient(supabaseUrl, serviceKey);
  const { data, error } = await db
    .from("profiles")
    .select("messaging_status, messaging_status_at, messaging_error, wallet_balance, owned_numbers")
    .eq("id", auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  }

  const raw = data.messaging_status;
  const status: MessagingStatus = isMessagingStatus(raw) ? raw : "NOT_STARTED";
  const copy = statusCopy(status);

  const numbers = Array.isArray(data.owned_numbers) ? data.owned_numbers : [];
  const balance = typeof data.wallet_balance === "number" ? data.wallet_balance : 0;

  return NextResponse.json({
    success: true,
    status,
    headline: copy.headline,
    detail: copy.detail,
    progress: copy.progress,
    needsCustomerAction: copy.needsCustomerAction,
    updatedAt: data.messaging_status_at,
    // Only surface the underlying error when the customer can act on it.
    // Mid-flight retry noise ("attach pending") would just alarm them.
    error: copy.needsCustomerAction ? data.messaging_error : null,
    activeNumber: numbers[0]?.number ?? null,
    // Lets the UI render an exact "add $X" prompt rather than a vague nudge.
    amountNeeded:
      status === "AWAITING_PAYMENT" ? Math.max(NUMBER_PURCHASE_COST - balance, 0) : 0,
  });
}
