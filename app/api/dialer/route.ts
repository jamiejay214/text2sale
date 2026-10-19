import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWorkspaceUserId } from "@/lib/workspace-auth";
import { callingAccess, type CallingAccess } from "@/lib/calling-access";
import { isEntitled } from "@/lib/messaging-status";
import { toE164 } from "@/lib/browser-calls";
import { CALL_RATE_OUTBOUND_PER_MIN } from "@/lib/call-pricing";
import { abandonRate, ABANDON_CAP } from "@/lib/dialer-pacing";
import { dialNext, linesFor, loadDialerStats } from "@/lib/dialer";
import { phonesFromCsv } from "@/lib/csv-phones";

// ─── /api/dialer ─────────────────────────────────────────────────────────
// The predictive dialer's controls (see lib/dialer.ts). GET is the Calling
// page's poll: session, live stats and the lead on the line; it also tells
// the server the agent's browser is still there. POST takes an action:
// start, ready, pause, next (save the disposition, then ready), stop.
// An agent with a calling sponsor dials their own leads from the sponsor's
// numbers, billed to the sponsor's wallet (lib/calling-access.ts).

export const maxDuration = 60;

const DISPOSITIONS = ["interested", "callback", "not_interested", "wrong_number", "dnc", "no_answer"] as const;
const MIN_WALLET = CALL_RATE_OUTBOUND_PER_MIN * 10;
const REDIAL_GAP_MS = 24 * 60 * 60 * 1000;

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function authorize(req: NextRequest) {
  const userId = await getWorkspaceUserId(req);
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const supabase = db();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, paused, telnyx_credential_id")
    .eq("id", userId)
    .maybeSingle();
  const access = profile ? await callingAccess(supabase, { id: userId, email: profile.email }) : null;
  if (!profile || !access) {
    return { error: NextResponse.json({ error: "The dialer isn't available on this account." }, { status: 403 }) };
  }
  return { userId, supabase, profile, payer: access.payer };
}

/** The caller ID numbers calls go out from (the payer's business numbers). */
async function callerIds(supabase: ReturnType<typeof db>, payerId: string): Promise<string[]> {
  const { data } = await supabase.from("owned_phone_numbers").select("digits").eq("user_id", payerId);
  return (data || []).map((row: { digits: string }) => `+1${row.digits}`);
}

async function openSession(supabase: ReturnType<typeof db>, userId: string) {
  const { data } = await supabase
    .from("dialer_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  return data;
}

/** Lead lists: the "campaign" each contact was imported under, with counts. */
async function leadLists(supabase: ReturnType<typeof db>, userId: string) {
  const counts = new Map<string, number>();
  let total = 0;
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data } = await supabase
      .from("contacts")
      .select("campaign")
      .eq("user_id", userId)
      .eq("dnc", false)
      .order("id")
      .range(offset, offset + 999);
    for (const row of data || []) {
      total++;
      const name = String(row.campaign || "").trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }
  // Uploaded CSV files: dial exactly the leads in one file.
  const { data: uploads } = await supabase
    .from("csv_uploads")
    .select("id, file_name, uploaded_at, success")
    .eq("user_id", userId)
    .not("file_content", "is", null)
    .order("uploaded_at", { ascending: false })
    .limit(30);
  return {
    total,
    lists: Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    uploads: uploads || [],
  };
}

async function snapshot(supabase: ReturnType<typeof db>, session: Record<string, unknown> | null) {
  if (!session) return { session: null };
  const stats = await loadDialerStats(supabase, String(session.id));
  let lead = null;
  if (session.active_item) {
    const { data: item } = await supabase
      .from("dialer_queue")
      .select("id, phone, result, contact_id, human_at")
      .eq("id", session.active_item)
      .maybeSingle();
    const { data: contact } = item?.contact_id
      ? await supabase
          .from("contacts")
          .select("id, first_name, last_name, phone, email, city, state, zip, notes, campaign, age, household_size, quote, lead_source")
          .eq("id", item.contact_id)
          .maybeSingle()
      : { data: null };
    lead = item ? { ...item, contact } : null;
  }
  return {
    session,
    stats,
    lead,
    pacing: {
      lines: linesFor(session as { max_lines: number }, stats),
      abandonRate30d: abandonRate(stats.abandoned_30d, stats.connected_30d),
      cap: ABANDON_CAP,
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;
  const { supabase, userId, payer } = auth;
  let session = await openSession(supabase, userId);
  if (session) {
    // The poll is the agent's heartbeat: no poll, no new dials.
    const { data } = await supabase
      .from("dialer_sessions")
      .update({ agent_seen_at: new Date().toISOString() })
      .eq("id", session.id)
      .select("*")
      .maybeSingle();
    session = data || session;
  }
  const body = await snapshot(supabase, session);
  if (!session && req.nextUrl.searchParams.get("lists") === "1") {
    return NextResponse.json({ ...body, ...(await leadLists(supabase, userId)), callerIds: await callerIds(supabase, payer.id) });
  }
  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return auth.error;
  const { supabase, userId, profile, payer } = auth;
  const input = await req.json().catch(() => ({}));
  const action = String(input?.action || "");
  const now = new Date();

  if (action === "start") return start(supabase, userId, profile, payer, input);

  const session = await openSession(supabase, userId);
  if (!session) return NextResponse.json({ error: "No dialer session is running." }, { status: 404 });

  if (action === "ready" || action === "next") {
    if (session.active_item && (session.agent_state === "on_call" || session.agent_state === "connecting")) {
      // A call whose hangup never arrived must not lock the agent out.
      const { data: active } = await supabase.from("dialer_queue").select("status").eq("id", session.active_item).maybeSingle();
      if (active && active.status !== "done") {
        return NextResponse.json({ error: "Finish the current call first." }, { status: 409 });
      }
    }
    if (action === "next" && session.active_item) {
      const disposition = DISPOSITIONS.includes(input.disposition) ? input.disposition : null;
      const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 2000) : "";
      const { data: item } = await supabase
        .from("dialer_queue")
        .update({ disposition })
        .eq("id", session.active_item)
        .select("contact_id, call_row_id")
        .maybeSingle();
      if (item?.call_row_id && (disposition || notes)) {
        await supabase
          .from("calls")
          .update({ notes: [disposition ? `Dialer: ${disposition.replace(/_/g, " ")}` : "Dialer", notes].filter(Boolean).join(" — ") })
          .eq("id", item.call_row_id);
      }
      if (item?.contact_id && disposition === "dnc") {
        await supabase.from("contacts").update({ dnc: true }).eq("id", item.contact_id).eq("user_id", userId);
      }
    }
    if ((Number(payer.wallet_balance) || 0) < MIN_WALLET) {
      return NextResponse.json({ error: `Add funds to keep dialing. Calls are $${CALL_RATE_OUTBOUND_PER_MIN.toFixed(3)} per minute.` }, { status: 402 });
    }
    const { data: updated } = await supabase
      .from("dialer_sessions")
      .update({ status: "active", agent_state: "ready", active_item: null, agent_seen_at: now.toISOString(), pause_reason: null })
      .eq("id", session.id)
      .select("*")
      .maybeSingle();
    await dialNext(supabase, session.id, now);
    const { data: fresh } = await supabase.from("dialer_sessions").select("*").eq("id", session.id).maybeSingle();
    return NextResponse.json(await snapshot(supabase, fresh || updated));
  }

  if (action === "pause") {
    // No new dials. Leads already ringing can still reach the agent, who
    // stays "ready" for them; the session just stops filling lines.
    const { data } = await supabase
      .from("dialer_sessions")
      .update({ status: "paused", pause_reason: null })
      .eq("id", session.id)
      .select("*")
      .maybeSingle();
    return NextResponse.json(await snapshot(supabase, data));
  }

  if (action === "stop") {
    const { data } = await supabase
      .from("dialer_sessions")
      .update({ status: "stopped", agent_state: "away", ended_at: now.toISOString() })
      .eq("id", session.id)
      .select("*")
      .maybeSingle();
    return NextResponse.json(await snapshot(supabase, data));
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function start(supabase: ReturnType<typeof db>, userId: string, profile: any, payer: CallingAccess["payer"], input: any) {
  if (profile.paused || payer.paused || !isEntitled(payer)) {
    return NextResponse.json({ error: "An active account and subscription are required to call." }, { status: 403 });
  }
  if ((Number(payer.wallet_balance) || 0) < MIN_WALLET) {
    return NextResponse.json({ error: `Add funds before dialing. Calls are $${CALL_RATE_OUTBOUND_PER_MIN.toFixed(3)} per minute.` }, { status: 402 });
  }
  if (await openSession(supabase, userId)) {
    return NextResponse.json({ error: "A dialer session is already running. Stop it first." }, { status: 409 });
  }
  const businessName = String(input?.businessName || "").trim().slice(0, 60);
  const agentName = String(input?.agentName || "").trim().slice(0, 40);
  if (!businessName || !agentName) {
    return NextResponse.json({ error: "Enter your name and business name. Leads who can't be connected hear them." }, { status: 400 });
  }
  const maxLines = Math.min(3, Math.max(1, Math.floor(Number(input?.maxLines) || 1)));
  const list = typeof input?.list === "string" ? input.list.trim() : "";
  const uploadId = typeof input?.upload === "string" && /^[0-9a-f-]{36}$/i.test(input.upload) ? input.upload : "";
  // A chosen CSV file limits the call list to the phone numbers in it.
  let filePhones: Set<string> | null = null;
  let fileName = "";
  if (uploadId) {
    const { data: upload } = await supabase
      .from("csv_uploads")
      .select("file_name, file_content")
      .eq("id", uploadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!upload?.file_content) {
      return NextResponse.json({ error: "That CSV file isn't available anymore. Choose another list." }, { status: 404 });
    }
    filePhones = phonesFromCsv(upload.file_content);
    fileName = String(upload.file_name || "CSV file");
    if (!filePhones.size) {
      return NextResponse.json({ error: "Couldn't find phone numbers in that CSV file." }, { status: 400 });
    }
  }

  const requested = (Array.isArray(input?.fromNumbers) ? input.fromNumbers : []).map(toE164).filter(Boolean) as string[];
  const ownedE164 = await callerIds(supabase, payer.id);
  const fromNumbers = requested.length ? requested : ownedE164;
  if (!fromNumbers.length || fromNumbers.some((n) => !ownedE164.includes(n))) {
    return NextResponse.json({ error: "Choose caller ID numbers from your own business numbers." }, { status: 400 });
  }

  // The browser phone's SIP address, where live answers are put through.
  if (!profile.telnyx_credential_id) {
    return NextResponse.json({ error: "Wait for the browser phone to say Phone ready, then start again." }, { status: 409 });
  }
  const credential = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(profile.telnyx_credential_id)}`, {
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY || ""}` },
    signal: AbortSignal.timeout(8000),
  })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  const sipUsername = String(credential?.data?.sip_username || "");
  if (!sipUsername) {
    return NextResponse.json({ error: "Could not reach your browser phone's line. Refresh the page and try again." }, { status: 503 });
  }

  // Leads: not DNC, valid number, not dialed by the dialer in the last day,
  // one entry per phone. Newest first: fresh leads answer most.
  const since = new Date(Date.now() - REDIAL_GAP_MS).toISOString();
  const recent = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data } = await supabase.from("dialer_queue").select("phone").eq("user_id", userId).gte("dialed_at", since).range(offset, offset + 999);
    for (const row of data || []) recent.add(String(row.phone));
    if (!data || data.length < 1000) break;
  }
  const leads: Array<{ contact_id: string; phone: string }> = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 50_000; offset += 1000) {
    let query = supabase
      .from("contacts")
      .select("id, phone")
      .eq("user_id", userId)
      .eq("dnc", false)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999);
    if (list && !filePhones) query = query.eq("campaign", list);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load your leads. Please retry." }, { status: 503 });
    for (const row of data || []) {
      const phone = toE164(row.phone);
      if (!phone || seen.has(phone) || recent.has(phone) || (filePhones && !filePhones.has(phone))) continue;
      seen.add(phone);
      leads.push({ contact_id: row.id, phone });
    }
    if (!data || data.length < 1000) break;
  }
  if (!leads.length) {
    return NextResponse.json({ error: "No leads to dial in that list (leads called in the last 24 hours are skipped)." }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from("dialer_sessions")
    .insert({
      user_id: userId,
      status: "paused",
      max_lines: maxLines,
      lines: 1,
      from_numbers: fromNumbers,
      agent_state: "away",
      sip_username: sipUsername,
      business_name: businessName,
      agent_name: agentName,
      audience: fileName || list || null,
    })
    .select("*")
    .single();
  if (error || !session) {
    return NextResponse.json({ error: "Could not start the dialer. Please retry." }, { status: 500 });
  }
  for (let i = 0; i < leads.length; i += 1000) {
    const rows = leads.slice(i, i + 1000).map((lead, j) => ({ session_id: session.id, user_id: userId, ...lead, position: i + j }));
    const { error: insertError } = await supabase.from("dialer_queue").insert(rows);
    if (insertError) {
      await supabase.from("dialer_sessions").update({ status: "stopped", ended_at: new Date().toISOString() }).eq("id", session.id);
      return NextResponse.json({ error: "Could not load the call list. Please retry." }, { status: 500 });
    }
  }
  return NextResponse.json(await snapshot(supabase, session));
}
