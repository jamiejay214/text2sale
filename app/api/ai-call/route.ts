import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import { DEFAULT_VOICE, settingsFromProfile } from "@/lib/ai-call";
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
  "ai_call_enabled, ai_call_greeting, ai_call_instructions, ai_call_voice, " +
  "ai_call_transfer_number, ai_call_after_hours_only, ai_call_max_minutes";

// Telnyx voices we expose in the UI. Kept short on purpose — a long list
// invites people to pick something that reads numbers badly over a phone.
export const VOICES = [
  { id: "Telnyx.KokoroTTS.af", label: "Ava — warm, neutral American" },
  { id: "Telnyx.KokoroTTS.am", label: "Adam — calm, neutral American" },
  { id: "AWS.Polly.Joanna-Neural", label: "Joanna — polished American" },
  { id: "AWS.Polly.Matthew-Neural", label: "Matthew — polished American" },
];

/** Normalize a US number to E.164, or null if it isn't one. */
function toE164(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
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
        "id, from_number, to_number, state, outcome, summary, collected, " +
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
          "Run supabase/migrations/011_ai_call_assistant.sql to enable the AI call assistant.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    available: true,
    settings: settingsFromProfile(profileRes.data),
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
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

  const supabase = createClient(supabaseUrl, supabaseKey);
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

  return NextResponse.json({ settings: settingsFromProfile(data) });
}
