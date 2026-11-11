// ── Who may call, and on whose account ─────────────────────────────────────
// Calling is limited to the owner's account (lib/owner.ts). An agent the
// operator lists in calling_sponsors may also call: on their own leads, from
// the sponsor's business numbers, billed to the sponsor's wallet
// (payerFor in lib/call-metering.ts reads the same table).

import { canCall } from "./entitlements";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

const PAYER_COLUMNS = "id, email, plan, wallet_balance, paused, subscription_status, free_subscription, owned_numbers, ai_call_transfer_number";

export type CallingAccess = {
  /** The account placing calls (its leads, dialer session, call history). */
  userId: string;
  /** The account whose numbers and wallet the calls use. */
  payer: { id: string; email: string | null; plan?: Record<string, unknown> | null; ai_call_transfer_number?: string | null; wallet_balance: number | string | null; paused: boolean | null; subscription_status: string | null; free_subscription: boolean | null; owned_numbers: unknown };
  sponsored: boolean;
};

/** Calling access for a user, or null when they can't place calls. */
export async function callingAccess(db: Db, user: { id: string; email?: string | null }): Promise<CallingAccess | null> {
  // On a plan with calling (Dialer or Complete), the account calls on its own.
  const { data: own } = await db.from("profiles").select(PAYER_COLUMNS).eq("id", user.id).maybeSingle();
  if (own && canCall(own)) return { userId: user.id, payer: own, sponsored: false };
  const { data: link } = await db.from("calling_sponsors").select("sponsor_id").eq("agent_id", user.id).maybeSingle();
  if (!link?.sponsor_id) return null;
  const { data: payer } = await db.from("profiles").select(PAYER_COLUMNS).eq("id", link.sponsor_id).maybeSingle();
  // Only a calling account can sponsor others.
  if (!payer || !canCall(payer)) return null;
  return { userId: user.id, payer, sponsored: true };
}
