import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { DEFAULT_VOICE, VOICES, settingsFromProfile } from "@/lib/ai-call";
import { hasAiAccess } from "@/lib/messaging-status";
import { ensureInboundVoice, type VoiceSetupCheck } from "@/lib/telnyx-voice";
import {
  AI_CALL_MIN_RESERVE,
  AI_CALL_RATE_PER_MIN,
} from "@/lib/call-pricing";

// ── AI call assistant settings + history ─────────────────────────────────
// GET  → current settings, pricing, and the most recent handled calls
// PATCH → update settings
//
// Everything here is scoped to the authenticated user; there is no userId
// parameter to spoof.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PROFILE_COLUMNS =
  "ai_plan, free_ai_plan, subscription_status, free_subscription, paused, wallet_balance, owned_numbers, ai_call_enabled, ai_call_greeting, ai_call_instructions, ai_call_voice, " +
  "ai_call_transfer_number, ai_call_after_hours_only, ai_call_max_minutes";



/** Normalize a US number to E.164, or null if it isn't one. */
function toE164(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** The account's business numbers (owned_phone_numbers plus legacy profile list). */
async function businessNumbers(db: Db, userId: string, ownedNumbers: unknown): Promise<string[]> {
  const { data } = await db.from("owned_phone_numbers").select("digits").eq("user_id", userId);
  const list = ((data || []) as Array<{ digits: string }>).map((row) => row.digits);
  if (Array.isArray(ownedNumbers)) {
    for (const entry of ownedNumbers as Array<{ number?: string }>) if (entry?.number) list.push(entry.number);
  }
  return list;
}

type ReadinessItem = { id: string; ok: boolean; label: string; detail?: string };

/** Everything an inbound call needs before the assistant can pick it up. */
function readinessOf(profile: Record<string, unknown>, voice: VoiceSetupCheck): ReadinessItem[] {
  const balance = Number(profile.wallet_balance) || 0;
  const items: ReadinessItem[] = [
    { id: "plan", ok: hasAiAccess(profile), label: "Active subscription", detail: "AI calling is included with the $39.99/month plan." },
    { id: "enabled", ok: !!profile.ai_call_enabled, label: "Assistant switched on", detail: "Turn on the switch at the top of this page." },
    { id: "paused", ok: !profile.paused, label: "Account active", detail: "This account is paused, so calls are not answered." },
    {
      id: "wallet",
      ok: balance >= AI_CALL_MIN_RESERVE,
      label: `Wallet holds at least $${AI_CALL_MIN_RESERVE.toFixed(2)}`,
      detail: `Each AI call holds $${AI_CALL_MIN_RESERVE.toFixed(2)} (2 minutes) up front and returns what isn't used. Balance: $${balance.toFixed(2)}.`,
    },
    {
      id: "numbers",
      ok: voice.numbers.length > 0 && voice.numbers.every((n) => n.ok),
      label: voice.numbers.length ? `Business number${voice.numbers.length > 1 ? "s" : ""} connected for calls` : "Business number",
      detail: voice.numbers.length
        ? voice.numbers.filter((n) => !n.ok).map((n) => `${n.number}: ${n.error || "not connected"}`).join(" ") || "Calls to your numbers reach the assistant."
        : "Buy a number first — the assistant answers calls to your business numbers.",
    },
  ];
  if (voice.webhook !== null) {
    items.push({ id: "webhook", ok: voice.webhook, label: "Inbound calls reach Text2Sale", detail: voice.webhook ? undefined : voice.error || "Telnyx is not sending call events to Text2Sale. Contact support." });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = auth.user.id;

  const [profileRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
    supabase
      .from("ai_call_sessions")
      .select(
        "id, from_number, to_number, state, outcome, summary, collected, turns, " +
          "turn_count, charged_amount, appointment_id, started_at, ended_at"
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(25),
  ]);

  // The feature ships behind a migration. Report that honestly instead of
  // showing the UI as "off" when the columns simply aren't there yet.
  if (profileRes.error && /ai_call_enabled/.test(profileRes.error.message || "")) {
    return NextResponse.json(
      {
        available: false,
        reason: "migration_not_applied",
        message:
          "AI calling is still being set up for this workspace. Contact support for availability.",
      },
      { status: 200 }
    );
  }

  if (profileRes.error || sessionsRes.error || !profileRes.data) {
    return NextResponse.json({error:"Could not load your AI calling settings. Please try again."},{status:503});
  }
  const profile = profileRes.data as unknown as Record<string, unknown> & {
    ai_plan?: boolean;
    free_ai_plan?: boolean;
  };
  if (!hasAiAccess(profile)) {
    return NextResponse.json({
      available: false,
      reason: "plan_required",
      message: "AI calling is included with an active Text2Sale subscription ($39.99/month). Subscribe to train and activate your receptionist.",
    });
  }
  if (!process.env.TELNYX_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({available:false,message:"AI calling is still being connected. Contact support for availability."});
  }
  // Check (and repair) number routing on every visit, so a number that
  // never got connected for calls is fixed just by opening this page.
  const voice = await ensureInboundVoice(await businessNumbers(supabase, userId, profile.owned_numbers)).catch(
    (): VoiceSetupCheck => ({ webhook: null, numbers: [] })
  );
  return NextResponse.json({
    available: true,
    readiness: readinessOf(profile, voice),
    settings: settingsFromProfile(profile),
    voices: VOICES,
    pricing: {
      perMinute: AI_CALL_RATE_PER_MIN,
      upfrontReserve: AI_CALL_MIN_RESERVE,
    },
    sessions: sessionsRes.data || [],
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: entitlement, error: entitlementError } = await supabase
    .from("profiles")
    .select("ai_plan, free_ai_plan, subscription_status, free_subscription, owned_numbers")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (entitlementError || !entitlement) {
    return NextResponse.json({ error: "Could not verify AI plan access." }, { status: 503 });
  }
  if (!hasAiAccess(entitlement)) {
    return NextResponse.json(
      { error: "AI calling requires an active Text2Sale subscription ($39.99/month)." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.enabled === true && (!process.env.TELNYX_API_KEY || !process.env.ANTHROPIC_API_KEY)) {
    return NextResponse.json({error:"AI calling is not connected yet."},{status:503});
  }
  for (const key of ["enabled","afterHoursOnly"]) {
    if (key in body && typeof body[key] !== "boolean") return NextResponse.json({error:"Invalid setting value."},{status:400});
  }
  const update: Record<string, unknown> = {};

  if ("enabled" in body) update.ai_call_enabled = !!body.enabled;
  if ("afterHoursOnly" in body) update.ai_call_after_hours_only = !!body.afterHoursOnly;

  if ("greeting" in body) {
    const g = String(body.greeting || "").trim();
    // A spoken greeting much longer than this is a monologue the caller
    // has to sit through before they can say anything.
    if (g.length > 320) {
      return NextResponse.json(
        { error: "Greeting is too long — keep it under 320 characters." },
        { status: 400 }
      );
    }
    update.ai_call_greeting = g || null;
  }

  if ("instructions" in body) {
    const i = String(body.instructions || "").trim();
    if (i.length > 4000) {
      return NextResponse.json(
        { error: "Instructions are too long — keep them under 4000 characters." },
        { status: 400 }
      );
    }
    update.ai_call_instructions = i || null;
  }

  if ("voice" in body) {
    const v = String(body.voice || "");
    if (v && !VOICES.some((o) => o.id === v)) {
      return NextResponse.json({ error: "Unknown voice." }, { status: 400 });
    }
    update.ai_call_voice = v || DEFAULT_VOICE;
  }

  if ("transferNumber" in body) {
    const raw = String(body.transferNumber || "").trim();
    if (!raw) {
      update.ai_call_transfer_number = null;
    } else {
      const e164 = toE164(raw);
      if (!e164) {
        return NextResponse.json(
          { error: "Transfer number must be a 10-digit US phone number." },
          { status: 400 }
        );
      }
      update.ai_call_transfer_number = e164;
    }
  }

  if ("maxMinutes" in body) {
    const m = Math.round(Number(body.maxMinutes));
    if (!Number.isFinite(m) || m < 2 || m > 30) {
      return NextResponse.json(
        { error: "Call limit must be between 2 and 30 minutes." },
        { status: 400 }
      );
    }
    update.ai_call_max_minutes = m;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", auth.user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    if (/ai_call_enabled/.test(error.message || "")) {
      return NextResponse.json(
        {
          error:
            "The AI call assistant migration hasn't been applied yet (supabase/migrations/011_ai_call_assistant.sql).",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Switching the assistant on connects the account's numbers for calls.
  let readiness: ReadinessItem[] | undefined;
  if (data && body.enabled === true) {
    const voice = await ensureInboundVoice(await businessNumbers(supabase, auth.user.id, entitlement.owned_numbers)).catch(
      (): VoiceSetupCheck => ({ webhook: null, numbers: [] })
    );
    readiness = readinessOf(data as unknown as Record<string, unknown>, voice);
  }
  return NextResponse.json({ settings: settingsFromProfile(data), readiness });
}
