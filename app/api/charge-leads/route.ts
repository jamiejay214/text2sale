import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── POST /api/charge-leads ───────────────────────────────────────────────
// Charges the per-lead import fee SERVER-SIDE. Previously the CSV importer
// debited the wallet from the browser: the amount was client-computed (so the
// rate could be tampered) and the RPC error was swallowed (so a failed debit
// still recorded the upload as "charged"). Here the rate comes from the user's
// real plan on the server, the debit is atomic, and a failure is surfaced so
// the client only records a charge the server actually took.
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const { userId: bodyUserId, count } = await req.json();
  const forbid = requireSameUser(auth.user.id, bodyUserId);
  if (forbid) return forbid;
  const userId = auth.user.id;

  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 0) return NextResponse.json({ success: true, charged: 0 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  const messageCost = Number(
    (profile?.plan as { messageCost?: number } | null)?.messageCost ?? 0.012
  );
  const amount = Number((n * messageCost).toFixed(4));

  const { data: newBalance, error } = await supabase.rpc("decrement_wallet", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error("[charge-leads] decrement_wallet failed:", error.message);
    return NextResponse.json(
      { success: false, error: error.message, charged: 0 },
      { status: 500 }
    );
  }
  if (newBalance === null) {
    return NextResponse.json(
      { success: false, error: "Insufficient funds", charged: 0, insufficient: true },
      { status: 402 }
    );
  }

  return NextResponse.json({
    success: true,
    charged: amount,
    walletBalance: Number(newBalance),
  });
}
