import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";

// ─── POST /api/charge-leads ───────────────────────────────────────────────
// Importing leads is free: texts are charged per segment when they send, so
// a list that never gets texted costs nothing. This route used to debit a
// per-lead import fee; it is kept so an open dashboard tab from before the
// change gets a harmless answer instead of an error, and never charges.
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ success: true, charged: 0 });
}
