// ── Inbound calls the AI receptionist isn't taking ───────────────────────
// 1. Call forwarding on → ring the owner's cell (Telnyx transfer).
// 2. Otherwise ring the owner's browser phone, which is registered as a SIP
//    user while the Calling page is open.
// 3. If neither can take it (no forwarding, browser not registered, or the
//    wallet can't cover the first minute) the call rings out as missed.
//
// Transfers carry client_state so every later webhook finds the call row:
// the caller's leg gets {callRowId, route}, the new leg also gets
// leg:"target". When the target leg ends without ever connecting, the
// webhook hangs up the caller's leg so they aren't left ringing.

import { CALL_RATE_FORWARD_PER_MIN, CALL_RATE_INBOUND_PER_MIN } from "./call-pricing";
import { isEntitled } from "./messaging-status";
import { toE164 } from "./browser-calls";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type InboundRoute = "forward" | "browser";

const encode = (state: Record<string, unknown>) => Buffer.from(JSON.stringify(state)).toString("base64");

async function telnyx(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const res = await fetch(`https://api.telnyx.com/v2${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TELNYX_API_KEY || ""}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** The forwarding number to use, or null when forwarding is off or unusable. */
export function forwardingTarget(
  settings: { call_forward_enabled?: boolean | null; call_forward_number?: string | null },
  businessNumber: string
): string | null {
  if (!settings.call_forward_enabled) return null;
  const target = toE164(settings.call_forward_number);
  // Forwarding a number to itself would loop the call straight back here.
  if (!target || target === toE164(businessNumber)) return null;
  return target;
}

async function loadRoutingProfile(db: Db, userId: string) {
  const base = "telnyx_credential_id, wallet_balance, paused, subscription_status, free_subscription";
  const full = await db.from("profiles").select(`${base}, call_forward_enabled, call_forward_number`).eq("id", userId).maybeSingle();
  if (!full.error) return full.data;
  // Before the forwarding migration is applied the columns don't exist;
  // route to the browser rather than dropping the call.
  const fallback = await db.from("profiles").select(base).eq("id", userId).maybeSingle();
  return fallback.data;
}

/**
 * Send an inbound call the AI isn't taking to the owner's cell or browser.
 * Returns the route used, or null when the call should ring out.
 */
export async function routeInboundCall(
  db: Db,
  call: { ccid: string; rowId: string; userId: string; callerNumber: string; businessNumber: string }
): Promise<InboundRoute | null> {
  const profile = await loadRoutingProfile(db, call.userId);
  if (!profile || profile.paused || !isEntitled(profile)) return null;
  const balance = Number(profile.wallet_balance) || 0;

  let route: InboundRoute | null = null;
  let to = "";
  const forward = forwardingTarget(profile, call.businessNumber);
  if (forward && balance >= CALL_RATE_FORWARD_PER_MIN) {
    route = "forward";
    to = forward;
  } else if (!forward && profile.telnyx_credential_id && balance >= CALL_RATE_INBOUND_PER_MIN) {
    const credential = await telnyx(`/telephony_credentials/${encodeURIComponent(profile.telnyx_credential_id)}`, "GET");
    const username = credential.ok ? String(credential.json?.data?.sip_username || "") : "";
    if (username) {
      route = "browser";
      to = `sip:${username}@sip.telnyx.com`;
    }
  }
  if (!route) return null;

  const callerId = toE164(call.callerNumber);
  const transfer = {
    to,
    timeout_secs: route === "forward" ? 30 : 25,
    client_state: encode({ v: 1, callRowId: call.rowId, route }),
    target_leg_client_state: encode({ v: 1, callRowId: call.rowId, route, leg: "target" }),
  };
  // Show the caller's number on the cell / browser. If Telnyx won't present
  // it, retry with the default caller ID (the business number).
  let result = await telnyx(`/calls/${call.ccid}/actions/transfer`, "POST", callerId ? { ...transfer, from: callerId } : transfer);
  if (!result.ok && callerId) result = await telnyx(`/calls/${call.ccid}/actions/transfer`, "POST", transfer);
  if (!result.ok) {
    // Some legs must be answered before they can be transferred.
    const answered = await telnyx(`/calls/${call.ccid}/actions/answer`, "POST", { client_state: transfer.client_state });
    if (answered.ok) result = await telnyx(`/calls/${call.ccid}/actions/transfer`, "POST", transfer);
  }
  if (!result.ok) {
    console.error(`[call-routing] ${route} transfer failed ${result.status}: ${JSON.stringify(result.json).slice(0, 300)}`);
    return null;
  }

  await db
    .from("calls")
    .update({
      cost_per_min: route === "forward" ? CALL_RATE_FORWARD_PER_MIN : CALL_RATE_INBOUND_PER_MIN,
      outcome: route === "forward" ? "forwarded" : null,
    })
    .eq("id", call.rowId);
  return route;
}

/** Hang up a call leg; "already ended" counts as success. */
export async function hangupLeg(ccid: string): Promise<boolean> {
  const result = await telnyx(`/calls/${ccid}/actions/hangup`, "POST", {});
  return result.ok || result.status === 404 || result.status === 422;
}

/** True while Telnyx still reports the leg as live. Unknown → true. */
export async function legIsAlive(ccid: string): Promise<boolean> {
  const result = await telnyx(`/calls/${ccid}`, "GET");
  if (result.status === 404) return false;
  if (!result.ok) return true;
  return result.json?.data?.is_alive !== false;
}
