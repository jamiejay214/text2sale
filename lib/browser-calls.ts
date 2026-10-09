// ── Browser (WebRTC) outbound calls ───────────────────────────────────────
// The browser places the call straight through Telnyx, so the server only
// learns about it from Call Control webhooks. /api/calls/log records the
// call (after checking the number, subscription and wallet) BEFORE the
// browser dials; when Telnyx reports the new outgoing leg we bind that leg
// to the row by its from/to numbers, which Telnyx signs and the browser
// can't forge. The answered and hangup webhooks then find the row by its
// call_control_id, and hangup bills the connected minutes.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/** US number to +1XXXXXXXXXX, or null. */
export function toE164(raw: unknown): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** How long a logged call waits for Telnyx to report its leg. */
export const BIND_WINDOW_MS = 5 * 60 * 1000;

/**
 * Attach a new outgoing Telnyx leg to the call row the browser logged just
 * before dialing. Returns the row id, or null when no logged call matches.
 */
export async function bindBrowserCall(
  db: Db,
  leg: { ccid: string; from: unknown; to: unknown; sessionId?: string | null; legId?: string | null },
  now: Date = new Date()
): Promise<string | null> {
  const from = toE164(leg.from);
  const to = toE164(leg.to);
  if (!leg.ccid || !from || !to) return null;

  const { data: row } = await db
    .from("calls")
    .select("id")
    .eq("direction", "outbound")
    .eq("status", "initiating")
    .is("call_control_id", null)
    .eq("from_number", from)
    .eq("to_number", to)
    .gte("started_at", new Date(now.getTime() - BIND_WINDOW_MS).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row?.id) return null;

  // Conditional on call_control_id still being empty, so a retried webhook
  // or a second leg can't rebind a row that already has its call.
  const { data: bound } = await db
    .from("calls")
    .update({
      call_control_id: leg.ccid,
      call_session_id: leg.sessionId || null,
      call_leg_id: leg.legId || null,
      status: "ringing",
    })
    .eq("id", row.id)
    .is("call_control_id", null)
    .select("id")
    .maybeSingle();
  return bound?.id || null;
}
