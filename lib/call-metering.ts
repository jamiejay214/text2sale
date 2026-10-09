// ── Pay-as-you-go call minutes ────────────────────────────────────────────
// Calls bill per started minute ($0.025 outbound, $0.015 inbound, plus the
// forwarding leg for forwarded calls). Billing only at hangup let a call run
// on after the wallet was empty, so each minute is now charged when it
// STARTS: the first at answer, the rest by the /api/calls/meter cron. When
// the wallet can't cover the next minute the caller of these helpers hangs
// the call up. Hangup reconciles the exact total (see settleCallCharge).
//
// AI receptionist calls are not metered here; they hold their own reserve
// (lib/ai-call-turn.ts).

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type MeteredCall = {
  id: string;
  user_id: string;
  answered_at: string | null;
  cost_per_min: number | string | null;
  cost_charged: number | string | null;
};

const round4 = (n: number) => Number(n.toFixed(4));

/** Minutes started so far on a call answered at `answeredAt` (at least 1). */
export function startedMinutes(answeredAt: string, now: Date = new Date()): number {
  const elapsed = (now.getTime() - new Date(answeredAt).getTime()) / 1000;
  return Math.max(1, Math.ceil(elapsed / 60));
}

/**
 * Charge every minute this call has started that isn't paid yet.
 * "ok" — paid up (or nothing owed); "insufficient" — the wallet can't cover
 * the minute in progress, so hang up; "skip" — not a metered call, or another
 * worker is charging it right now.
 */
export async function chargeStartedMinutes(
  db: Db,
  call: MeteredCall,
  now: Date = new Date()
): Promise<"ok" | "insufficient" | "skip"> {
  const rate = Number(call.cost_per_min) || 0;
  if (!rate || !call.answered_at) return "skip";
  const due = round4(startedMinutes(call.answered_at, now) * rate);
  const charged = Number(call.cost_charged) || 0;
  const owed = round4(due - charged);
  if (owed <= 0) return "ok";

  // Claim the charge first, conditional on nobody else having moved it and
  // the call still being live, so overlapping cron runs or a racing hangup
  // can't take the same minute twice.
  let claim = db.from("calls").update({ cost_charged: due }).eq("id", call.id).eq("status", "answered");
  claim = call.cost_charged === null || call.cost_charged === undefined
    ? claim.is("cost_charged", null)
    : claim.eq("cost_charged", call.cost_charged);
  const { data: claimed } = await claim.select("id").maybeSingle();
  if (!claimed) return "skip";

  const { data: balance, error } = await db.rpc("decrement_wallet", {
    p_user_id: call.user_id,
    p_amount: owed,
  });
  if (error || balance === null || balance === undefined) {
    await db.from("calls").update({ cost_charged: charged }).eq("id", call.id).eq("cost_charged", due);
    return "insufficient";
  }
  return "ok";
}

/**
 * Final reconciliation at hangup: bill exactly `finalCharge`, given that
 * `alreadyCharged` was taken minute by minute. Over-collection (a minute
 * charged just before the line dropped) is credited back.
 */
export async function settleCallCharge(
  db: Db,
  call: { id: string; user_id: string },
  finalCharge: number,
  alreadyCharged: number
): Promise<void> {
  const delta = round4(finalCharge - alreadyCharged);
  if (delta > 0) {
    await db.rpc("decrement_wallet", { p_user_id: call.user_id, p_amount: delta });
  } else if (delta < 0) {
    await db.rpc("credit_wallet", {
      p_user_id: call.user_id,
      p_amount: -delta,
      p_idempotency_key: `call_settle_${call.id}`,
      p_description: "Call minutes reconciled at hangup",
    });
  }
  await db.from("calls").update({ cost_charged: round4(finalCharge) }).eq("id", call.id);
}
