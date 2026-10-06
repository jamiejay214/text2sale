import { smsConsentText } from "@/lib/sms-consent";
import { getIndustry } from "@/lib/industries";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { usPhoneDigits } from "@/lib/business-details";
import { countSegments, hasNonGsmChars, sanitizeForSms } from "@/lib/sms-text";
import type { Db } from "@/lib/business-site";

// ── SMS opt-in from a customer's website ───────────────────────────────────
//
// Public by necessity — the person signing up is not a Text2Sale user — which
// makes it a target. This used to accept anything: no phone validation, no
// limit on how often one visitor could submit, no proof of what they agreed
// to, and no way to tell a real sign-up from someone typing a stranger's
// number into the form. It also replied "success" to the page whatever
// happened here, so a sign-up that failed to save looked like it had worked.
//
// What it does now:
//   - validates the number and the consent flag, and rejects bots (honeypot,
//     cross-site posts, per-visitor and per-number rate limits);
//   - records the consent with the exact wording shown, when, and from where —
//     the evidence a carrier or the person themselves can ask for;
//   - never changes a do-not-contact flag: someone who texted STOP stays
//     stopped until they reply START themselves;
//   - sends the registered confirmation text when the business can send one,
//     which both proves the number belongs to the person and is the "opt-in
//     message" the campaign was registered with. It is charged to the
//     business's balance BEFORE it is sent, and skipped if the balance is
//     short — a sign-up never costs the platform money.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const telnyxKey = process.env.TELNYX_API_KEY || "";
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

// Per-instance limiters. They blunt scripts and fat-fingered double submits;
// the contact/consent dedupe below is the durable protection.
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();
function tooMany(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // bound memory on a long-lived instance
  return recent.length > max;
}

const display = (d: string) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;

type Owner = {
  id: string;
  messaging_status: string | null;
  owned_numbers: Array<{ number: string }> | null;
  a2p_registration: { businessName?: string; optInMessage?: string } | null;
  plan: { messageCost?: number } | null;
  first_name: string | null;
  last_name: string | null;
};

/** Charge first, then send. Returns true only if the text actually went out. */
async function sendConfirmation(db: Db, owner: Owner, toDigits: string): Promise<boolean> {
  if (!telnyxKey || owner.messaging_status !== "ACTIVE") return false;
  const fromRaw = owner.owned_numbers?.find((n) => n?.number)?.number;
  if (!fromRaw) return false;
  const fromDigits = fromRaw.replace(/\D/g, "").replace(/^1/, "");
  if (fromDigits.length !== 10) return false;

  const business =
    owner.a2p_registration?.businessName || `${owner.first_name || ""} ${owner.last_name || ""}`.trim() || "us";
  const fallback = `${business}: You're subscribed to text updates. Msg frequency varies. Msg&data rates may apply. Reply HELP for help, STOP to cancel.`;
  const registered = sanitizeForSms(owner.a2p_registration?.optInMessage || "");
  const text = registered && !hasNonGsmChars(registered) && registered.length <= 320 ? registered : fallback;

  const perSegment = Number(owner.plan?.messageCost ?? 0.012);
  const cost = Number((perSegment * Math.max(1, countSegments(text))).toFixed(4));

  // Pay first: the owner's balance covers the text before it is sent.
  const { data: balance, error: debitErr } = await db.rpc("decrement_wallet", {
    p_user_id: owner.id,
    p_amount: cost,
  });
  if (debitErr || balance === null) return false;

  const refund = async () => {
    try {
      await db.rpc("credit_wallet", {
        p_user_id: owner.id,
        p_amount: cost,
        p_idempotency_key: null,
        p_description: "Refund — opt-in confirmation text failed",
      });
    } catch (e) {
      console.error("[opt-in] refund failed — needs reconciliation:", owner.id, e);
    }
  };

  try {
    const payload: Record<string, string> = {
      from: `+1${fromDigits}`,
      to: `+1${toDigits}`,
      text,
      type: "SMS",
    };
    if (messagingProfileId) payload.messaging_profile_id = messagingProfileId;
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${telnyxKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.errors) {
      await refund();
      return false;
    }
    return true;
  } catch {
    await refund();
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    // Same-site posts only. Browsers attach Origin to cross-site POSTs.
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
      }
    }

    // Bots fill the hidden field; answer as if it worked and store nothing.
    if (typeof body.hp === "string" && body.hp.trim()) {
      return NextResponse.json({ success: true, confirmationSent: false });
    }

    const slug = typeof body.slug === "string" ? body.slug.slice(0, 80) : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 60) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 60) : "";
    const digits = usPhoneDigits(body.phone);

    if (!slug || !firstName) {
      return NextResponse.json({ success: false, error: "Please enter your first name." }, { status: 400 });
    }
    if (!digits) {
      return NextResponse.json({ success: false, error: "Please enter a valid 10-digit US mobile number." }, { status: 400 });
    }
    const optedIn = body.consent === true;
    if (typeof body.elapsedMs === "number" && body.elapsedMs < 800) {
      return NextResponse.json({ success: false, error: "Please try again." }, { status: 400 });
    }

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (tooMany(`ip:${ip}:${slug}`, 8) || tooMany(`phone:${digits}:${slug}`, 3)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: ownerRow } = await admin
      .from("profiles")
      .select("id, industry, messaging_status, owned_numbers, a2p_registration, plan, first_name, last_name, compliance_log")
      .eq("business_slug", slug)
      .maybeSingle();
    if (!ownerRow?.id) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }
    const owner = ownerRow as unknown as Owner & { compliance_log: unknown };

    const shown = display(digits);
    const now = new Date().toISOString();
    const businessName = owner.a2p_registration?.businessName || `${owner.first_name || ""} ${owner.last_name || ""}`.trim();
    const consentText = optedIn ? smsConsentText(businessName, getIndustry(ownerRow.industry).messageTypes) : "";
    const page = typeof body.page === "string" ? body.page.slice(0, 300) : "";
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

    // Existing contact? (Numbers are stored in more than one format.)
    const { data: existing } = await admin
      .from("contacts")
      .select("id, dnc")
      .eq("user_id", owner.id)
      .in("phone", [shown, `+1${digits}`, digits])
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await admin.from("contacts").insert({
        user_id: owner.id,
        first_name: firstName,
        last_name: lastName,
        phone: shown,
        email: "",
        lead_source: optedIn ? "opt_in_form" : "web_inquiry",
        tags: optedIn ? ["opt-in"] : ["no-sms-consent"],
        notes: optedIn ? `Consent captured via opt-in page at ${now} (IP ${ip})` : `Web inquiry at ${now}; no SMS consent provided.`,
        dnc: true, // Release a new subscriber only after durable consent is recorded.
      });
      if (insertErr) {
        console.error("[opt-in] contact insert failed:", insertErr.message);
        return NextResponse.json({ success: false, error: "We couldn't save your sign-up. Please try again." }, { status: 500 });
      }
    }

    // Don't text someone who has opted out, and don't text the same number
    // twice in a day because a form was resubmitted.
    const log = Array.isArray(owner.compliance_log) ? (owner.compliance_log as Array<Record<string, unknown>>) : [];
    const recentlyConfirmed = log.some(
      (e) =>
        e.type === "opt_in" &&
        e.contactPhone === shown &&
        e.confirmationSent === true &&
        Date.now() - new Date(String(e.timestamp)).getTime() < 24 * 3_600_000
    );
    let confirmationSent = false;

    // The consent record: what they agreed to, when, from where.
    const event = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: optedIn ? "opt_in" : "web_inquiry",
      contactPhone: shown,
      contactName: `${firstName} ${lastName}`.trim(),
      method: "web_form",
      timestamp: now,
      userId: owner.id,
      consentText,
      page,
      ip,
      userAgent,
      confirmationSent,
      existingContact: !!existing,
      doNotContactUnchanged: !!existing?.dnc,
    };
    const { error: logError } = await admin
      .from("profiles")
      .update({ compliance_log: [event, ...log].slice(0, 500) })
      .eq("id", owner.id);
    if (logError) {
      return NextResponse.json({ success: false, error: "We couldn't record your request. Please try again." }, { status: 500 });
    }
    if (optedIn && !existing) {
      const { error: releaseError } = await admin.from("contacts")
        .update({ dnc: false }).eq("user_id", owner.id).eq("phone", shown);
      if (releaseError) {
        return NextResponse.json({ success: false, error: "We couldn't complete your SMS signup. Please try again." }, { status: 500 });
      }
    }
    // Consent must be persisted before any confirmation is sent.
    confirmationSent = optedIn && !existing?.dnc && !recentlyConfirmed
      ? await sendConfirmation(admin, owner, digits) : false;

    if (confirmationSent) {
      event.confirmationSent = true;
      await admin.from("profiles").update({ compliance_log: [event, ...log].slice(0, 500) }).eq("id", owner.id);
    }
    return NextResponse.json({ success: true, confirmationSent, subscribed: optedIn });
  } catch (err) {
    console.error("[opt-in] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
