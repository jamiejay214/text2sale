// ─────────────────────────────────────────────────────────────────────────
// Unified Leads & Recovery inbox across all three businesses.
//
// Pulls REAL contact records (with email/phone) so the owner can act:
//   • text2sale        — profiles (signups)
//   • aibusinessgrowth — website_leads
//   • trustedquotes    — leads (completed) + partial_leads (abandoned funnel,
//                        the highest-value recoverable segment)
//
// Returns lightweight rows with click-to-act fields. Service-role reads only.
// ─────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function mainClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function tqClient(): SupabaseClient | null {
  const url = process.env.TRUSTEDQUOTES_SUPABASE_URL;
  const key = process.env.TRUSTEDQUOTES_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
// AI Business Growth's own project (falls back to the main project's legacy
// website_* tables until ABG_* env is configured).
function abgClient(): SupabaseClient {
  const url = process.env.ABG_SUPABASE_URL;
  const key = process.env.ABG_SERVICE_ROLE_KEY;
  if (url && key) return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return mainClient();
}

export type LeadRow = {
  id?: string;
  notes?: string;
  followup?: string;
  campaign?: string | null;
  business: "text2sale" | "aibusinessgrowth" | "trustedquotes";
  kind: "signup" | "lead" | "partial";
  name: string;
  email: string | null;
  phone: string | null;
  detail: string; // coverage / company / plan etc
  location: string | null;
  source: string | null;
  status: string | null; // funnel step for partials, sub status for signups
  hot: boolean; // worth contacting now (e.g. abandoned with contact info)
  at: string;
};

export type LeadsResult = {
  generatedAt: string;
  counts: { text2sale: number; aibusinessgrowth: number; trustedquotes: number; recoverable: number };
  leads: LeadRow[];
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const nz = (v: unknown) => {
  const t = s(v).trim();
  return t ? t : null;
};

export async function getAllLeads(limitPer = 40): Promise<LeadsResult> {
  const main = mainClient();
  const tq = tqClient();
  const leads: LeadRow[] = [];

  // ── text2sale signups ──────────────────────────────────────────────────
  try {
    const { data } = await main
      .from("profiles")
      .select("first_name, last_name, email, phone, subscription_status, role, free_subscription, created_at")
      .order("created_at", { ascending: false })
      .limit(limitPer);
    for (const r of data || []) {
      if (s(r.role) === "admin") continue; // skip the owner account
      leads.push({
        business: "text2sale",
        kind: "signup",
        name: `${s(r.first_name)} ${s(r.last_name)}`.trim() || s(r.email) || "User",
        email: nz(r.email),
        phone: nz(r.phone),
        detail: r.free_subscription ? "Comped account" : s(r.subscription_status) === "active" ? "Paying subscriber" : "Signup",
        location: null,
        source: null,
        status: nz(r.subscription_status),
        hot: false,
        at: s(r.created_at),
      });
    }
  } catch { /* skip */ }

  // Contact-first signup attempts and website inquiries. Match account
  // creation server-side so callers cannot mark someone else as converted.
  const { data: prospects, error: prospectError } = await main.from("text2sale_prospects")
    .select("id,name,email,phone,kind,industry,message,source,campaign,path,status,notes,created_at,consent_at")
    .order("created_at", { ascending: false }).limit(limitPer);
  if (prospectError) throw new Error("Text2Sale prospects are temporarily unavailable. Please retry.");
  const emails = (prospects || []).map(r => r.email);
  const { data: matched, error: matchError } = emails.length ? await main.from("profiles")
    .select("first_name,last_name,email,phone,subscription_status,role,free_subscription,created_at").in("email", emails) : { data: [], error: null };
  if (matchError) throw new Error("Signup status could not be loaded. Please retry.");
  for (const r of prospects || []) {
    const profile = (matched || []).find(p => s(p.email).toLowerCase() === s(r.email).toLowerCase());
    if (profile?.role === "admin") continue;
    const existing = leads.find(l => l.business === "text2sale" && l.email?.toLowerCase() === s(r.email).toLowerCase());
    const closed = ["won", "not_interested", "do_not_contact"].includes(r.status);
    const attributes = { id: s(r.id), notes: s(r.notes), followup: s(r.status), campaign: nz(r.campaign), source: nz(r.source) };
    if (existing) { Object.assign(existing, attributes); continue; }
    leads.push({
      ...attributes,
      business: "text2sale",
      kind: profile ? "signup" : r.kind === "signup" ? "partial" : "lead",
      name: profile ? `${s(profile.first_name)} ${s(profile.last_name)}`.trim() || s(r.name) : s(r.name),
      email: nz(r.email), phone: nz(profile?.phone) || nz(r.phone),
      detail: profile ? (profile.free_subscription ? "Comped account" : ["active", "canceling"].includes(s(profile.subscription_status)) ? "Paying subscriber" : "Account created · payment/setup pending")
        : r.kind === "signup" ? "Contact details saved · account not created" : [nz(r.industry), nz(r.message)].filter(Boolean).join(" · ") || "Website inquiry",
      location: null,
      status: profile ? nz(profile.subscription_status) : nz(r.status),
      hot: !profile && !closed,
      at: s(r.created_at),
    });
  }

  // ── aibusinessgrowth website_leads (own project, or legacy fallback) ──────
  try {
    const { data } = await abgClient()
      .from("website_leads")
      .select("name, email, phone, company, industry, struggling_with, source, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limitPer);
    for (const r of data || []) {
      leads.push({
        business: "aibusinessgrowth",
        kind: "lead",
        name: s(r.name) || s(r.company) || "Lead",
        email: nz(r.email),
        phone: nz(r.phone),
        detail: [nz(r.company), nz(r.industry)].filter(Boolean).join(" · ") || s(r.struggling_with) || "Inquiry",
        location: null,
        source: nz(r.source),
        status: nz(r.status),
        hot: !!(nz(r.email) || nz(r.phone)),
        at: s(r.created_at),
      });
    }
  } catch { /* skip */ }

  // ── trustedquotes completed leads ────────────────────────────────────────
  if (tq) {
    try {
      const { data } = await tq
        .from("leads")
        .select("first_name, last_name, email, phone, coverage_type, current_status, zip, source, created_at")
        .order("created_at", { ascending: false })
        .limit(limitPer);
      for (const r of data || []) {
        leads.push({
          business: "trustedquotes",
          kind: "lead",
          name: `${s(r.first_name)} ${s(r.last_name)}`.trim() || "Lead",
          email: nz(r.email),
          phone: nz(r.phone),
          detail: [nz(r.coverage_type), nz(r.current_status)].filter(Boolean).join(" · ") || "Quote request",
          location: nz(r.zip),
          source: nz(r.source),
          status: nz(r.current_status),
          hot: !!(nz(r.email) || nz(r.phone)),
          at: s(r.created_at),
        });
      }
    } catch { /* skip */ }

    // ── trustedquotes ABANDONED partials (the recoverable gold) ─────────────
    try {
      const { data } = await tq
        .from("partial_leads")
        .select("first_name, last_name, email, phone, coverage_type, city, state, highest_step, reached_step, completed, ref_source, utm_source, created_at")
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(limitPer);
      for (const r of data || []) {
        const hasContact = !!(nz(r.email) || nz(r.phone));
        leads.push({
          business: "trustedquotes",
          kind: "partial",
          name: `${s(r.first_name)} ${s(r.last_name)}`.trim() || "Abandoned quote",
          email: nz(r.email),
          phone: nz(r.phone),
          detail: nz(r.coverage_type) ? `${s(r.coverage_type)} · stopped at step ${s(r.highest_step) || s(r.reached_step) || "?"}` : `Abandoned at step ${s(r.highest_step) || s(r.reached_step) || "?"}`,
          location: [nz(r.city), nz(r.state)].filter(Boolean).join(", ") || null,
          source: nz(r.utm_source) || nz(r.ref_source),
          status: "abandoned",
          hot: hasContact, // abandoned + we have a way to reach them = recover now
          at: s(r.created_at),
        });
      }
    } catch { /* skip */ }
  }

  const counts = {
    text2sale: leads.filter((l) => l.business === "text2sale").length,
    aibusinessgrowth: leads.filter((l) => l.business === "aibusinessgrowth").length,
    trustedquotes: leads.filter((l) => l.business === "trustedquotes").length,
    recoverable: leads.filter((l) => l.kind === "partial" && l.hot).length,
  };

  leads.sort((a, b) => b.at.localeCompare(a.at));

  return { generatedAt: new Date().toISOString(), counts, leads };
}
