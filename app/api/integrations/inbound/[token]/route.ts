import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const telnyxKey = process.env.TELNYX_API_KEY || "";

// ─────────────────────────────────────────────────────────────
// Normalize incoming lead payloads from various CRMs into our
// Contact schema. Different platforms use wildly different field
// names — this tries to pull the right value out of any of them.
// ─────────────────────────────────────────────────────────────
function normalize(body: Record<string, unknown>) {
  const str = (keys: string[]): string => {
    for (const k of keys) {
      const v = body[k];
      if (v && typeof v === "string") return v.trim();
    }
    return "";
  };

  return {
    first_name: str(["first_name", "firstName", "First_Name", "FirstName", "fname", "first"]),
    last_name:  str(["last_name",  "lastName",  "Last_Name",  "LastName",  "lname", "last"]),
    phone:      str(["phone", "phone_number", "phoneNumber", "Phone", "mobile", "cell"]),
    email:      str(["email", "Email", "email_address", "emailAddress"]),
    city:       str(["city",  "City"]),
    state:      str(["state", "State", "st"]),
    address:    str(["address", "Address", "street"]),
    zip:        str(["zip", "Zip", "zip_code", "zipCode", "postal_code"]),
    notes:      str(["notes", "Notes", "comment", "comments", "description"]),
    lead_source:str(["lead_source", "leadSource", "source", "Source", "vendor", "Vendor"]),
  };
}

// Strip all non-digits from a phone number
function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

// POST /api/integrations/inbound/[token]
// Called by external lead vendors posting new leads to the user's webhook.
// when a new lead is created. No auth header needed — the token in
// the URL is the credential. Returns 200 so the caller doesn't retry.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── 1. Resolve integration by token ──────────────────────────
  const { data: integration, error: intErr } = await supabase
    .from("integrations")
    .select("id, user_id, campaign_id, auto_sms")
    .eq("token", token)
    .single();

  if (intErr || !integration) {
    // Return 200 anyway so the sender doesn't keep retrying
    console.warn("[integrations/inbound] Unknown token:", token);
    return NextResponse.json({ received: true });
  }

  // ── 2. Parse + normalize the lead payload ────────────────────
  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = await req.json();
  } catch {
    const text = await req.text().catch(() => "");
    // Try form-encoded fallback
    try {
      rawBody = Object.fromEntries(new URLSearchParams(text));
    } catch {
      rawBody = {};
    }
  }

  const lead = normalize(rawBody);
  const phone = cleanPhone(lead.phone);

  if (!phone) {
    console.warn("[integrations/inbound] Lead missing phone:", rawBody);
    return NextResponse.json({ received: true, warning: "No phone number found" });
  }

  // ── 3. Upsert contact (dedupe by user_id + phone) ────────────
  const contactPayload = {
    user_id:     integration.user_id,
    first_name:  lead.first_name || "Unknown",
    last_name:   lead.last_name  || "",
    phone,
    email:       lead.email,
    city:        lead.city,
    state:       lead.state,
    address:     lead.address,
    zip:         lead.zip,
    notes:       lead.notes,
    lead_source: lead.lead_source || "Integration",
    tags:        [] as string[],
    dnc:         false,
  };

  const { data: contact, error: contactErr } = await supabase
    .from("contacts")
    .upsert(contactPayload, {
      onConflict: "user_id,phone",
      ignoreDuplicates: false,
    })
    .select("id, first_name, phone")
    .single();

  if (contactErr || !contact) {
    console.error("[integrations/inbound] Contact upsert failed:", contactErr);
    return NextResponse.json({ received: true, error: "Failed to save contact" });
  }

  // ── 4. Auto-SMS: fire an intro message if enabled ────────────
  if (integration.auto_sms && appUrl) {
    // Pull the user's profile to find their first owned number and
    // the intro message from their AI settings.
    const { data: profile } = await supabase
      .from("profiles")
      .select("owned_numbers, ai_instructions, industry, first_name, last_name")
      .eq("id", integration.user_id)
      .single();

    const ownedNumbers: Array<{ number: string }> = Array.isArray(profile?.owned_numbers)
      ? (profile.owned_numbers as Array<{ number: string }>)
      : [];

    const fromNumber = ownedNumbers[0]?.number;

    if (fromNumber && telnyxKey) {
      const agentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Agent";
      const instructions = ((profile?.ai_instructions as string) || "").trim();
      const industry = ((profile?.industry as string) || "other").replace(/_/g, " ");

      // First-touch intro. Honor the agent's AI instructions + industry via the
      // model when available; fall back to a NEUTRAL (not insurance-specific)
      // default so non-insurance accounts don't send wrong copy.
      let introMsg = `Hey ${contact.first_name}, this is ${agentName}! Thanks for reaching out — happy to help. What are you looking for?`;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        try {
          const sys = `You are ${agentName}, a real person texting a brand-new lead who just submitted their info${industry && industry !== "other" ? ` about ${industry}` : ""}. Write ONLY the first SMS to send them — 1-2 short, warm, casual sentences like a real text, ending with a question. Output just the message text, nothing else.${instructions ? `\n\nFOLLOW THESE INSTRUCTIONS FROM ${agentName.toUpperCase()} — they are your highest priority and override the guidance above:\n${instructions}` : ""}`;
          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 200,
              system: sys,
              messages: [{ role: "user", content: `Write the first text to ${contact.first_name || "this lead"}.` }],
            }),
          });
          const aiData = await aiRes.json();
          const text = (aiData?.content?.[0]?.text || "").trim();
          if (text) introMsg = text;
        } catch (e) {
          console.error("[integrations/inbound] AI intro generation failed, using default:", e);
        }
      }

      await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telnyxKey}`,
        },
        body: JSON.stringify({
          from: fromNumber,
          to: phone,
          text: introMsg,
        }),
      }).catch((err) => console.error("[integrations/inbound] Auto-SMS failed:", err));
    }
  }

  // ── 5. Campaign enrollment (future) ──────────────────────────
  // integration.campaign_id is stored and ready; campaign step
  // scheduling would go here once the drip engine supports
  // contact-level enrollment by ID.

  console.log(`[integrations/inbound] Lead received: ${phone} → user ${integration.user_id}`);
  return NextResponse.json({ received: true, contact_id: contact.id });
}
