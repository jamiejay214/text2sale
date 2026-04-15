import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizePhone(raw: string) {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    const r = d.slice(1);
    return `(${r.slice(0, 3)}) ${r.slice(3, 6)}-${r.slice(6)}`;
  }
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const { slug, firstName, lastName, phone, consent } = await req.json();

    if (!slug || !firstName || !phone || !consent) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Find the business owner by slug
    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .eq("business_slug", slug)
      .single();

    if (!owner?.id) {
      return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    }

    const normalizedPhone = normalizePhone(phone);

    // Create contact under the business owner
    await admin.from("contacts").insert({
      user_id: owner.id,
      first_name: firstName,
      last_name: lastName || "",
      phone: normalizedPhone,
      email: "",
      lead_source: "opt_in_form",
      tags: ["opt-in"],
      notes: `Consent captured via opt-in page at ${new Date().toISOString()}`,
      dnc: false,
    });

    // Log compliance event
    const { data: profile } = await admin
      .from("profiles")
      .select("compliance_log")
      .eq("id", owner.id)
      .single();

    const existing = Array.isArray(profile?.compliance_log) ? profile.compliance_log : [];
    const event = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "opt_in",
      contactPhone: normalizedPhone,
      contactName: `${firstName} ${lastName || ""}`.trim(),
      method: "web_form",
      timestamp: new Date().toISOString(),
      userId: owner.id,
    };

    await admin
      .from("profiles")
      .update({ compliance_log: [event, ...existing].slice(0, 500) })
      .eq("id", owner.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
