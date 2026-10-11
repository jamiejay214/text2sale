// ── Queueing a campaign sequence ─────────────────────────────────────────
// enqueue_campaign_sequence (migration 013) checks ownership, eligibility
// and "already running" and inserts every message in one statement. With a
// large list (2,000 leads × several steps) that one call can outrun the
// database's statement timeout on a small instance, and the whole launch
// failed with a generic "not ready". The first batch still goes through the
// function (all of its checks, and the run id); the rest are appended under
// the same run in batches. If any batch fails, the run is removed again so
// nothing half-queued is left behind.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export const FIRST_BATCH = 1000;
const APPEND_BATCH = 1000;

export type QueuedMessage = {
  contact_id: unknown;
  body: string;
  from_number: string;
  scheduled_at: string;
  step_index: number;
  delay_minutes: number;
};

type DbError = { code?: string; message?: string } | null | undefined;

/** Plain-English reason a launch failed. P0001 is the function's own message. */
export function explainEnqueueError(error: DbError, messageCount: number): { message: string; status: number } {
  const code = error?.code || "";
  const detail = error?.message || "unknown error";
  if (code === "P0001") return { message: detail, status: 409 };
  if (code === "57014") {
    return {
      message: `Queueing ${messageCount.toLocaleString()} texts took too long and the database cancelled it. No texts were queued. Try again, or split the list into smaller files.`,
      status: 503,
    };
  }
  if (code === "PGRST202" || code === "42883") {
    return { message: "Campaign scheduling isn't installed in the database (enqueue_campaign_sequence is missing). No texts were queued.", status: 503 };
  }
  if (code === "42703" || code === "42P01") {
    return { message: `The database is missing something campaign scheduling needs (${detail}). No texts were queued.`, status: 503 };
  }
  return { message: `Campaign scheduling failed (${code || "error"}: ${detail}). No texts were queued.`, status: 503 };
}

export async function enqueueSequence(
  db: Db,
  args: { userId: string; campaignId: string; rows: QueuedMessage[]; startsAt: string; resume: boolean; audience: number; previousStatus: string | null }
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string; status: number }> {
  const first = args.rows.slice(0, FIRST_BATCH);
  const { data, error } = await db.rpc("enqueue_campaign_sequence", {
    p_user_id: args.userId,
    p_campaign_id: args.campaignId,
    p_messages: first,
    p_starts_at: args.startsAt,
    p_resume: args.resume,
  });
  if (error) {
    console.error("[campaign enrollment] enqueue failed", error.code, error.message);
    return { ok: false, ...explainEnqueueError(error, args.rows.length) };
  }
  if (data?.resumed || args.rows.length <= FIRST_BATCH) return { ok: true, data };

  const { data: run } = await db
    .from("scheduled_messages")
    .select("campaign_run_id")
    .eq("campaign_id", args.campaignId)
    .eq("status", "pending")
    .not("campaign_run_id", "is", null)
    .limit(1)
    .maybeSingle();
  const runId = run?.campaign_run_id;

  const rollback = async () => {
    if (runId) await db.from("scheduled_messages").delete().eq("campaign_run_id", runId).eq("status", "pending");
    await db.from("campaigns").update({ status: args.previousStatus || "Draft" }).eq("id", args.campaignId);
  };
  if (!runId) {
    await rollback();
    return { ok: false, message: "Could not find the queued campaign run to add the rest of the list. No texts were queued.", status: 503 };
  }

  for (let index = FIRST_BATCH; index < args.rows.length; index += APPEND_BATCH) {
    const batch = args.rows.slice(index, index + APPEND_BATCH).map((row) => ({
      user_id: args.userId,
      contact_id: row.contact_id,
      body: row.body,
      from_number: row.from_number,
      scheduled_at: row.scheduled_at,
      status: "pending",
      campaign_id: args.campaignId,
      cancel_on_reply: true,
      campaign_run_id: runId,
      campaign_step_index: row.step_index,
      campaign_delay_minutes: row.delay_minutes,
    }));
    const { error: insertError } = await db.from("scheduled_messages").insert(batch);
    if (insertError) {
      console.error("[campaign enrollment] append failed", insertError.code, insertError.message);
      await rollback();
      return { ok: false, ...explainEnqueueError(insertError, args.rows.length) };
    }
  }
  await db.from("campaigns").update({ audience: args.audience }).eq("id", args.campaignId);
  return { ok: true, data: { ...data, queued: args.rows.length, audience: args.audience } };
}
