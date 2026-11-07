import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAdminAlertSMS } from "@/lib/admin-alert";
import { ABANDON_MARKER, DONE_MARKER, abandonedMessage, type ProspectRow } from "@/lib/abandoned-signup";

// Cron (every 5 min): text the owner about website signups that saved their
// contact step but never became an account. Gated by CRON_SECRET like the
// other crons. Each prospect is alerted once — the row's notes are stamped
// before the text is sent, so overlapping runs can't double-text.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const GRACE_MS = 15 * 60 * 1000; // give them 15 min to finish before alerting
const LOOKBACK_MS = 6 * 60 * 60 * 1000; // don't re-scan the whole table
const MAX_PER_RUN = 10;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  if (secret && (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // The owner can turn these off with the same switch as visitor pings.
  const { data: admin } = await db.from("profiles").select("visitor_alerts").eq("role", "admin").limit(1).maybeSingle();
  if (admin?.visitor_alerts === false) return NextResponse.json({ ok: true, skipped: "alerts off" });

  const now = Date.now();
  const { data: rows } = await db
    .from("text2sale_prospects")
    .select("id, name, email, phone, industry, source, path, created_at, notes")
    .eq("kind", "signup")
    .eq("status", "new")
    .gte("created_at", new Date(now - LOOKBACK_MS).toISOString())
    .lte("created_at", new Date(now - GRACE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(60);

  const pending = ((rows || []) as ProspectRow[]).filter(
    (r) => !(r.notes || "").includes(ABANDON_MARKER) && !(r.notes || "").includes(DONE_MARKER),
  );
  if (!pending.length) return NextResponse.json({ ok: true, alerted: 0 });

  // Which of these emails already finished (a real account exists)?
  const emails = pending.map((r) => (r.email || "").toLowerCase()).filter(Boolean);
  const finished = new Set<string>();
  if (emails.length) {
    const { data: profiles } = await db.from("profiles").select("email").in("email", emails);
    for (const p of profiles || []) if (p.email) finished.add(String(p.email).toLowerCase());
  }

  let alerted = 0;
  for (const p of pending) {
    if (alerted >= MAX_PER_RUN) break;
    const email = (p.email || "").toLowerCase();
    const didFinish = email !== "" && finished.has(email);

    // Claim the row first so overlapping runs never double-handle it: stamp
    // the right marker only if no marker is there yet.
    const marker = didFinish ? DONE_MARKER : ABANDON_MARKER;
    const { data: claimed } = await db
      .from("text2sale_prospects")
      .update({ notes: `${marker} ${(p.notes || "").trim()}`.trim().slice(0, 5000) })
      .eq("id", p.id)
      .not("notes", "ilike", `%${ABANDON_MARKER}%`)
      .not("notes", "ilike", `%${DONE_MARKER}%`)
      .select("id")
      .maybeSingle();
    if (!claimed || didFinish) continue;

    const when =
      new Date(p.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET";
    await sendAdminAlertSMS(abandonedMessage(p, when)).catch(() => {});
    alerted += 1;
  }

  return NextResponse.json({ ok: true, alerted, scanned: pending.length });
}
