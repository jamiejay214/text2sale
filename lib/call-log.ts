// ── AI call log ───────────────────────────────────────────────────────────
// One plain-text report per AI call, for diagnosing a call the operator
// says went wrong: what the assistant's session recorded (state, transcript,
// speech heard but not answered, audio quality) and, from Telnyx's call
// events API, every command we sent and every event Telnyx reported, in
// order, with failures marked. The operator copies it from the AI
// receptionist page; nothing here is shown to callers.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CallLogInput = {
  session: {
    id: string;
    state?: string | null;
    outcome?: string | null;
    turns?: Array<{ role: string; content: unknown }> | null;
    pending_transcript?: string | null;
    collected?: Record<string, any> | null;
    started_at?: string | null;
    ended_at?: string | null;
  };
  call?: { status?: string | null; hangup_cause?: string | null; duration_seconds?: number | null } | null;
  events: Array<{ name?: string; type?: string; event_timestamp?: string; metadata?: unknown }>;
  telnyxError?: string | null;
};

// Long opaque identifiers and headers say nothing about what went wrong.
const NOISE = new Set([
  "client_state", "call_control_id", "call_leg_id", "call_session_id", "connection_id",
  "sip_headers", "custom_headers", "record_type", "id", "occurred_at", "event_timestamp",
]);

function compact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 5).map((item) => compact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (NOISE.has(key) || item === null || item === undefined || item === "") continue;
    out[key] = compact(item, depth + 1);
  }
  return out;
}

/** First value found under `key` anywhere in the object. */
function find(value: unknown, key: string, depth = 0): unknown {
  if (depth > 5 || !value || typeof value !== "object") return undefined;
  if (!Array.isArray(value) && key in (value as Record<string, unknown>)) return (value as Record<string, unknown>)[key];
  for (const item of Object.values(value as Record<string, unknown>)) {
    const hit = find(item, key, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function describe(event: CallLogInput["events"][number]): string {
  const meta = event.metadata;
  const bits: string[] = [];
  const transcript = find(meta, "transcript");
  if (typeof transcript === "string") bits.push(`heard "${transcript}"${find(meta, "is_final") === false ? " (partial)" : ""}`);
  for (const key of ["status", "hangup_cause", "sip_hangup_cause", "hangup_source"]) {
    const v = find(meta, key);
    if (typeof v === "string" || typeof v === "number") bits.push(`${key}=${v}`);
  }
  const errors = find(meta, "errors") ?? find(meta, "error");
  if (errors) bits.push(`ERROR ${JSON.stringify(compact(errors)).slice(0, 300)}`);
  const raw = JSON.stringify(compact(meta)) || "";
  if (raw && raw !== "{}") bits.push(raw.length > 400 ? `${raw.slice(0, 400)}…` : raw);
  return bits.join(" · ");
}

export function formatCallLog(input: CallLogInput): string {
  const { session, call, telnyxError } = input;
  const lines: string[] = [];
  lines.push(`AI call ${session.id}`);
  lines.push(
    `started ${session.started_at || "?"} · ended ${session.ended_at || "-"} · state ${session.state || "?"} · outcome ${session.outcome || "-"}` +
      (call ? ` · call ${call.status || "?"} ${call.duration_seconds ?? "?"}s ${call.hangup_cause || ""}`.trimEnd() : "")
  );
  const quality = session.collected?.call_quality;
  if (quality) lines.push(`audio: ${JSON.stringify(quality)}`);
  if (session.collected?.stt_engine) {
    lines.push(`listening with: ${session.collected.stt_engine}${session.collected.stt_fallback ? ` (switched to ${session.collected.stt_fallback} after hearing nothing)` : ""}`);
  }

  lines.push("", "Transcript:");
  const turns = (session.turns || []).filter((t) => typeof t.content === "string");
  if (!turns.length) lines.push("  (none)");
  for (const turn of turns) lines.push(`  ${turn.role === "assistant" ? "Assistant" : "Caller"}: ${String(turn.content)}`);
  if (session.pending_transcript?.trim()) lines.push(`  Heard but not answered: ${session.pending_transcript}`);

  lines.push("", "Telnyx events:");
  if (telnyxError) lines.push(`  ${telnyxError}`);
  const when = (event: CallLogInput["events"][number]) =>
    String(event.event_timestamp || (event as any).occurred_at || find(event.metadata, "occurred_at") || "");
  const events = [...input.events].sort((a, b) => when(a).localeCompare(when(b)));
  const start = events.length ? Date.parse(when(events[0])) : 0;
  if (!events.length && !telnyxError) lines.push("  (none returned)");
  for (const event of events) {
    const at = Date.parse(when(event));
    const offset = Number.isFinite(at) && start ? `+${((at - start) / 1000).toFixed(1)}s` : "?";
    lines.push(`  ${offset} ${event.type || "?"} ${event.name || "?"} ${describe(event)}`.trimEnd());
  }
  return lines.join("\n");
}
