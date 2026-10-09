import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSameUser } from "@/lib/auth-guard";
import { ensureVoiceRouting } from "@/lib/telnyx-voice";
import { assignNumberToCampaign } from "@/lib/telnyx-10dlc";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { phoneNumber, areaCode, userId: bodyUserId } = await req.json();
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    // Phone numbers have no activation charge. The customer is billed
    // $1.50/month by the recurring billing job after the number is connected.
    const walletClient = createClient(supabaseUrl, serviceKey);

    const fail = (message: string, status = 500) =>
      NextResponse.json({ success: false, error: message }, { status });

    let numberToBuy: string;

    if (phoneNumber) {
      // User selected a specific number
      numberToBuy = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber.replace(/\D/g, "")}`;
    } else {
      // Require both SMS and voice for the texting and browser-calling workspace.
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

      // Check returned capabilities as well as the supplier search filter.
      type ApiFeature = string | { name?: string };
      type ApiNumber = { phone_number: string; features?: ApiFeature[] };
      const candidates = ((searchData?.data as ApiNumber[] | undefined) || []).filter((n) => {
        const feats = (n.features || []).map((f: ApiFeature) =>
          (typeof f === "string" ? f : f?.name || "").toLowerCase()
        );
        return feats.includes("sms") && feats.includes("voice");
      });

      if (candidates.length === 0) {
        return fail(
          "No SMS numbers available. Try a different area code.",
          404
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

    const orderData = await orderRes.json().catch(() => ({}));

    // Treat ANY of these as a failed order:
    //   - HTTP non-2xx
    //   - explicit top-level `errors` array (standard Telnyx error shape)
    //   - top-level `error` field (occasional non-standard shape, seen on
    //     some billing errors like "Not enough credit for the order")
    //   - an order document whose status is not "pending" / "success"
    //
    // The prior version only checked `orderData.errors`, so some provider
    // billing failures could slip past the guard and appear successful.
    const orderErrors = Array.isArray(orderData?.errors) ? orderData.errors as Array<{ detail?: string; title?: string }> : [];
    const topLevelError = typeof orderData?.error === "string" ? orderData.error : null;
    const orderStatus = (orderData?.data as { status?: string } | undefined)?.status;
    const orderFailed =
      !orderRes.ok ||
      orderErrors.length > 0 ||
      !!topLevelError ||
      (orderStatus && !["pending", "success", "complete", "completed"].includes(orderStatus));

    if (orderFailed) {
      const errMsg =
        orderErrors.map((e) => e.detail || e.title).filter(Boolean).join(", ") ||
        topLevelError ||
        `Telnyx order failed (HTTP ${orderRes.status}${orderStatus ? `, status: ${orderStatus}` : ""})`;
      console.error("[buy-number] order failed:", errMsg, JSON.stringify(orderData).slice(0, 500));
      return fail(errMsg);
    }

    // Format for display
    const digits = numberToBuy.replace(/\D/g, "").slice(1); // remove + and country code
    const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

    const voice = await ensureVoiceRouting(numberToBuy);
    const voiceConfigStatus = voice.ok ? "ok" : "failed";
    const voiceConfigDetail = voice.ok ? null : voice.error;

    // Register the number in owned_phone_numbers so inbound SMS routing
    // (and anything else that needs a fast "who owns this?" lookup) finds it
    // immediately, without scanning every user's profile.
    //
    // NOTE: we deliberately do NOT use .upsert({onConflict:"digits"}) here.
    // There is no unique constraint on `digits` (a number can be shared by
    // more than one owner, so uniqueness is on the (user_id, digits) PAIR),
    // and Postgres rejects an ON CONFLICT that doesn't match a constraint
    // with 42P10 — which made the previous upsert silently fail on every
    // purchase. Instead we check for the (user_id, digits) row and insert
    // only if it's missing.
    if (userId) {
      try {
        const { data: existing } = await walletClient
          .from("owned_phone_numbers")
          .select("id")
          .eq("user_id", userId)
          .eq("digits", digits)
          .maybeSingle();
        if (!existing) {
          await walletClient
            .from("owned_phone_numbers")
            .insert({ user_id: userId, digits, formatted: display });
        }
      } catch (err) {
        // Non-fatal — the fallback path in the webhook still works until
        // the record catches up.
        console.error("[buy-number] owned_phone_numbers insert failed:", err);
      }
    }

    // Append to profiles.owned_numbers + usage_history server-side. These
    // columns are blocked by the RLS trigger from self-updates, so the
    // dashboard's previous client-side write was silently rejected — the
    // user got charged and had a working number on the Telnyx side, but
    // the Numbers tab on their dashboard stayed empty (which is exactly
    // what happened to David Brazell). Doing it here with the service
    // role bypasses the trigger and keeps the display in sync.
    if (userId) {
      try {
        const { data: current } = await walletClient
          .from("profiles")
          .select("owned_numbers")
          .eq("id", userId)
          .single();
        const currentOwned = Array.isArray(current?.owned_numbers) ? (current!.owned_numbers as Array<Record<string, unknown>>) : [];
        const alreadyListed = currentOwned.some((n) => {
          const num = typeof n.number === "string" ? n.number.replace(/\D/g, "") : "";
          return num === digits;
        });
        if (!alreadyListed) {
          const newEntry = {
            id: orderData.data?.id || `num_${digits}`,
            number: display,
            alias: `Sales Line ${currentOwned.length + 1}`,
          };
          await walletClient
            .from("profiles")
.update({
              owned_numbers: [...currentOwned, newEntry],
            })
            .eq("id", userId);
        }
      } catch (err) {
        console.error("[buy-number] profiles.owned_numbers update failed:", err);
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
      voiceConfigStatus,
      voiceConfigDetail,
      charged: 0,
      monthlyFee: 1.5,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Telnyx buy number error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
