import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { toE164 } from "@/lib/browser-calls";
import { CALL_RATE_FORWARD_PER_MIN } from "@/lib/call-pricing";
import type { OwnedNumber } from "@/lib/types";

// ─── /api/call-forwarding ─────────────────────────────────────────────────
// GET   → { available, enabled, number, ratePerMinute }
// PATCH → { enabled?, number? }
// When on, inbound calls the AI receptionist isn't taking ring this cell
// instead of the browser (lib/call-routing.ts). The setting is stored on
// each of the account's numbers in profiles.owned_numbers, so it needs no
// database migration. Scoped to the signed-in user.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function current(numbers: OwnedNumber[]) {
  const withSetting = numbers.find((n) => n.forwardTo) || numbers[0];
  return { enabled: numbers.some((n) => n.forwardEnabled), number: withSetting?.forwardTo || "" };
}

async function load(userId: string) {
  const db = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await db.from("profiles").select("owned_numbers").eq("id", userId).maybeSingle();
  const numbers = (Array.isArray(data?.owned_numbers) ? data.owned_numbers : []) as OwnedNumber[];
  return { db, numbers, error };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { numbers, error } = await load(auth.user.id);
  if (error) return NextResponse.json({ available: false, error: "Could not load call forwarding." }, { status: 503 });
  if (!numbers.length) {
    return NextResponse.json({ available: false, error: "Connect a business number to use call forwarding." });
  }
  return NextResponse.json({ available: true, ...current(numbers), ratePerMinute: CALL_RATE_FORWARD_PER_MIN });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { db, numbers, error } = await load(auth.user.id);
  if (error) return NextResponse.json({ error: "Could not load call forwarding." }, { status: 503 });
  if (!numbers.length) return NextResponse.json({ error: "Connect a business number to use call forwarding." }, { status: 409 });

  const now = current(numbers);
  let number: string | null = now.number || null;
  let enabled = now.enabled;
  if ("number" in body) {
    const raw = String(body.number || "").trim();
    if (!raw) {
      number = null;
    } else {
      const e164 = toE164(raw);
      if (!e164) return NextResponse.json({ error: "Enter a 10-digit US phone number." }, { status: 400 });
      if (numbers.some((n) => toE164(n.number) === e164)) {
        return NextResponse.json({ error: "Forward to your cell, not to your Text2Sale number — that would loop the call." }, { status: 400 });
      }
      number = e164;
    }
  }
  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid setting value." }, { status: 400 });
    enabled = body.enabled;
  }
  if (!number) enabled = false;
  if ("enabled" in body && body.enabled && !number) {
    return NextResponse.json({ error: "Add the number to forward calls to first." }, { status: 400 });
  }

  // Apply to every business number on the account.
  const updated = numbers.map((n) => ({ ...n, forwardEnabled: enabled, forwardTo: number }));
  const { error: saveError } = await db.from("profiles").update({ owned_numbers: updated }).eq("id", auth.user.id);
  if (saveError) return NextResponse.json({ error: "Could not save call forwarding." }, { status: 500 });
  return NextResponse.json({ enabled, number: number || "", ratePerMinute: CALL_RATE_FORWARD_PER_MIN });
}
