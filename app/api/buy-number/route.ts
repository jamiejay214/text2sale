import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      // Search for first available
      const params = new URLSearchParams({
        "filter[country_code]": "US",
        "filter[features]": "sms",
        "filter[limit]": "1",
      });
      if (areaCode) {
        params.set("filter[national_destination_code]", areaCode);
      }

      const searchRes = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const searchData = await searchRes.json();

      if (!searchData.data || searchData.data.length === 0) {
        return NextResponse.json(
          { success: false, error: "No numbers available. Try a different area code." },
          { status: 404 }
        );
      }

      numberToBuy = searchData.data[0].phone_number;
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
