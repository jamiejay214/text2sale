import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID!;
const voiceAppId =
  process.env.TELNYX_VOICE_APP_ID ||
  process.env.TELNYX_CALL_CONTROL_APP_ID ||
  "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Configure new number for voice + HD voice ───────────────────────────
// Telnyx provisions numbers in a couple of seconds. Once the number is
// live, we PATCH its voice settings to:
//   (a) assign it to our Voice API app (so outbound browser calls can use
//       it as the caller-ID), and
//   (b) enable HD voice so G.722 codec kicks in for browser WebRTC.
// This is idempotent and best-effort — any failure here just means the
// user can still text from the number; they'd need to manually assign it
// later to call.
async function configureVoiceOnNumber(e164: string) {
  if (!voiceAppId) return { ok: false, reason: "no-voice-app-id" as const };

  // Find the phone number id (Telnyx needs the UUID, not the E.164).
  // Retry briefly — Telnyx may not have indexed the order yet.
  let phoneNumberId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
    const listRes = await fetch(
      `https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const listData = await listRes.json().catch(() => ({}));
    const id = listData?.data?.[0]?.id as string | undefined;
    if (id) {
      phoneNumberId = id;
      break;
    }
  }
  if (!phoneNumberId) return { ok: false, reason: "number-not-found" as const };

  // Assign connection + enable HD voice via the voice-settings endpoint.
  // Telnyx allows both fields on the same PATCH.
  const voiceRes = await fetch(
    `https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}/voice`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        connection_id: voiceAppId,
        tech_prefix_enabled: false,
      }),
    }
  );
  const voiceBody = await voiceRes.json().catch(() => ({}));
  if (!voiceRes.ok || voiceBody?.errors) {
    return {
      ok: false,
      reason: "voice-patch-failed" as const,
      detail: Array.isArray(voiceBody?.errors)
        ? voiceBody.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join(", ")
        : `HTTP ${voiceRes.status}`,
    };
  }

  // HD voice lives on the number resource (not /voice) — best-effort.
  try {
    await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ hd_voice_enabled: true }),
    });
  } catch {
    // non-fatal — HD voice will still work via the connection's G.722 codec
  }

  return { ok: true as const };
}

async function assignNumberToCampaign(e164: string, campaignId: string) {
  // Telnyx phone_number_campaigns — associate a number with an approved 10DLC campaign.
  // Retry a few times because Telnyx may not register the new order for a few seconds.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch("https://api.telnyx.com/v2/10dlc/phone_number_campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phoneNumber: e164, campaignId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && !data?.errors) {
      return { assigned: true as const };
    }
    // Only retry on "number not found" / provisioning errors; other errors fail fast.
    const detail = Array.isArray(data?.errors)
      ? data.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title || "").join(", ")
      : "";
    const transient = /not found|provisioning|does not exist/i.test(detail);
    if (!transient) {
      return { assigned: false as const, error: detail || `HTTP ${res.status}` };
    }
  }
  return { assigned: false as const, error: "Timed out waiting for number to be provisioned" };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { phoneNumber, areaCode, userId: bodyUserId } = await req.json();
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    let numberToBuy: string;

    if (phoneNumber) {
      // User selected a specific number
      numberToBuy = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber.replace(/\D/g, "")}`;
    } else {
      // Search for first available — require SMS + voice server-side, then
      // client-filter for HD voice so every number we sell can text, call,
      // and stream crisp wideband audio over browser WebRTC.
      const params = new URLSearchParams({
        "filter[country_code]": "US",
        "filter[features]": "sms,voice",
        "filter[phone_number_type]": "local",
        "filter[limit]": "40",
      });
      if (areaCode) {
        params.set("filter[national_destination_code]", areaCode);
      }

      const searchRes = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const searchData = await searchRes.json();

      // HD voice isn't a server-side filter on Telnyx — we enable it via
      // PATCH right after purchase. Here we only need sms + voice.
      type ApiFeature = string | { name?: string };
      type ApiNumber = { phone_number: string; features?: ApiFeature[] };
      const candidates = ((searchData?.data as ApiNumber[] | undefined) || []).filter((n) => {
        const feats = (n.features || []).map((f: ApiFeature) =>
          (typeof f === "string" ? f : f?.name || "").toLowerCase()
        );
        return feats.includes("sms") && feats.includes("voice");
      });

      if (candidates.length === 0) {
        return NextResponse.json(
          { success: false, error: "No SMS + voice numbers available. Try a different area code." },
          { status: 404 }
        );
      }

      numberToBuy = candidates[0].phone_number;
    }

    // Order the number via Telnyx
    const orderRes = await fetch("https://api.telnyx.com/v2/number_orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone_numbers: [{ phone_number: numberToBuy }],
        messaging_profile_id: messagingProfileId,
      }),
    });

    const orderData = await orderRes.json();

    if (orderData.errors) {
      const errMsg = orderData.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join(", ");
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    // Format for display
    const digits = numberToBuy.replace(/\D/g, "").slice(1); // remove + and country code
    const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

    // Assign the new number to our Voice API app + enable HD voice. Fire
    // and forget-ish — we log failures but still return success for the
    // SMS-only path (user can manually reassign in Telnyx portal later).
    configureVoiceOnNumber(numberToBuy)
      .then((r) => {
        if (!r.ok) {
          console.warn(
            `[buy-number] voice config failed for ${numberToBuy}: ${r.reason}${
              "detail" in r && r.detail ? ` — ${r.detail}` : ""
            }`
          );
        }
      })
      .catch((err) => {
        console.warn(`[buy-number] voice config threw for ${numberToBuy}:`, err);
      });

    // Register the number in owned_phone_numbers so inbound SMS routing
    // (and anything else that needs a fast "who owns this?" lookup) finds it
    // immediately, without scanning every user's profile.
    if (userId) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        await admin
          .from("owned_phone_numbers")
          .upsert(
            { user_id: userId, digits, formatted: display },
            { onConflict: "digits" }
          );
      } catch (err) {
        // Non-fatal — the fallback path in the webhook still works until
        // the record catches up.
        console.error("[buy-number] owned_phone_numbers upsert failed:", err);
      }
    }

    // Auto-assign the new number to the user's 10DLC campaign, if they have an approved one.
    let assignment: { assigned: boolean; error?: string; campaignId?: string } = { assigned: false };
    if (userId) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: profile } = await admin
          .from("profiles")
          .select("a2p_registration")
          .eq("id", userId)
          .single();
        const reg = (profile?.a2p_registration as Record<string, unknown> | null) || null;
        const campaignId = reg && typeof reg.campaignSid === "string" ? reg.campaignSid : null;
        const status = reg && typeof reg.status === "string" ? reg.status : null;
        const approved = status === "completed" || status === "campaign_approved";

        if (campaignId && approved) {
          const result = await assignNumberToCampaign(numberToBuy, campaignId);
          assignment = { ...result, campaignId };
        }
      } catch (err) {
        assignment = {
          assigned: false,
          error: err instanceof Error ? err.message : "Could not auto-assign to campaign",
        };
      }
    }

    return NextResponse.json({
      success: true,
      number: display,
      raw: numberToBuy,
      sid: orderData.data?.id || numberToBuy,
      campaignAssigned: assignment.assigned,
      campaignAssignmentError: assignment.error || null,
      campaignId: assignment.campaignId || null,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx buy number error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
