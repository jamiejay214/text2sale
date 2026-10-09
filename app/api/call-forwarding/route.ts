import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { toE164 } from "@/lib/browser-calls";
import { CALL_RATE_FORWARD_PER_MIN } from "@/lib/call-pricing";

// ─── /api/call-forwarding ─────────────────────────────────────────────────
// GET   → { enabled, number, ratePerMinute }
// PATCH → { enabled?, number? }
// When on, inbound calls the AI receptionist isn't taking ring this cell
// instead of the browser (lib/call-routing.ts). Scoped to the signed-in user.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NOT_READY = "Call forwarding is still being set up for this workspace. Please try again shortly.";
const missingColumn = (message?: string) => /call_forward/.test(message || "");

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const db = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await db
    .from("profiles")
    .select("call_forward_enabled, call_forward_number")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ available: false, error: missingColumn(error.message) ? NOT_READY : "Could not load call forwarding." }, { status: missingColumn(error.message) ? 200 : 503 });
  }
  return NextResponse.json({
    available: true,
    enabled: !!data?.call_forward_enabled,
    number: data?.call_forward_number || "",
    ratePerMinute: CALL_RATE_FORWARD_PER_MIN,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = createClient(supabaseUrl, supabaseKey);
  const { data: current, error: loadError } = await db
    .from("profiles")
    .select("call_forward_enabled, call_forward_number, owned_numbers")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (loadError) {
    return NextResponse.json({ error: missingColumn(loadError.message) ? NOT_READY : "Could not load call forwarding." }, { status: 503 });
  }

  const update: Record<string, unknown> = {};
  if ("number" in body) {
    const raw = String(body.number || "").trim();
    if (!raw) {
      update.call_forward_number = null;
    } else {
      const e164 = toE164(raw);
      if (!e164) return NextResponse.json({ error: "Enter a 10-digit US phone number." }, { status: 400 });
      const own = (Array.isArray(current?.owned_numbers) ? current.owned_numbers : []).map((n: { number?: string }) => toE164(n?.number));
      if (own.includes(e164)) {
        return NextResponse.json({ error: "Forward to your cell, not to your Text2Sale number — that would loop the call." }, { status: 400 });
      }
      update.call_forward_number = e164;
    }
  }
  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid setting value." }, { status: 400 });
    update.call_forward_enabled = body.enabled;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const number = "call_forward_number" in update ? update.call_forward_number : current?.call_forward_number;
  const enabled = "call_forward_enabled" in update ? update.call_forward_enabled : current?.call_forward_enabled;
  if (enabled && !number) {
    return NextResponse.json({ error: "Add the number to forward calls to first." }, { status: 400 });
  }

  const { data, error } = await db
    .from("profiles")
    .update(update)
    .eq("id", auth.user.id)
    .select("call_forward_enabled, call_forward_number")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save call forwarding." }, { status: 500 });
  return NextResponse.json({ enabled: !!data?.call_forward_enabled, number: data?.call_forward_number || "", ratePerMinute: CALL_RATE_FORWARD_PER_MIN });
}
