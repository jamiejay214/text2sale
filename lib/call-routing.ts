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

type ForwardingEntry = { number?: string | null; forwardEnabled?: boolean | null; forwardTo?: string | null };

/**
 * The forwarding number for a call to `businessNumber`, or null when
 * forwarding is off or unusable. Forwarding lives on the number's entry in
 * profiles.owned_numbers (no extra columns needed).
 */
export function forwardingTarget(ownedNumbers: unknown, businessNumber: string): string | null {
  const business = toE164(businessNumber);
  const entries = Array.isArray(ownedNumbers) ? (ownedNumbers as ForwardingEntry[]) : [];
  const entry = entries.find((n) => n && toE164(n.number) === business);
  if (!entry?.forwardEnabled) return null;
  const target = toE164(entry.forwardTo);
  // Forwarding to any of the account's own numbers would loop the call back.
  if (!target || entries.some((n) => n && toE164(n.number) === target)) return null;
  return target;
}

/** Every way a caller's number may have been saved on a contact. */
export function phoneVariants(raw: unknown): string[] {
  const e164 = toE164(raw);
  if (!e164) return raw ? [String(raw)] : [];
  const d = e164.slice(2);
  return Array.from(new Set([
    e164, d, `1${d}`, `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`,
    `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`, `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`, String(raw),
  ]));
}

/**
 * Which account an inbound call belongs to.
 *
 * A number can be shared by several accounts (owned_phone_numbers is unique
 * per (user_id, digits), not per number), and older numbers only exist on
 * profiles.owned_numbers. The previous single-row lookup errored on a shared
 * number and found nothing for a legacy one, and either way the call was
 * REJECTED before it rang. Like inbound SMS: the account that has the caller
 * as a contact wins, then one with the AI receptionist on, then the first.
 */
export async function findCallOwner(
  db: Db,
  businessNumber: unknown,
  callerNumber: unknown
): Promise<{ userId: string; contactId: string | null } | null> {
  const business = toE164(businessNumber);
  if (!business) return null;
  const digits = business.slice(2);

  const { data: rows } = await db.from("owned_phone_numbers").select("user_id").eq("digits", digits);
  let owners: string[] = Array.from(new Set(((rows || []) as Array<{ user_id: string }>).map((r) => r.user_id).filter(Boolean)));
  if (!owners.length) {
    const { data: profiles } = await db.from("profiles").select("id, owned_numbers").not("owned_numbers", "is", null);
    owners = ((profiles || []) as Array<{ id: string; owned_numbers: unknown }>)
      .filter((p) => Array.isArray(p.owned_numbers) && (p.owned_numbers as Array<{ number?: string }>).some((n) => toE164(n?.number) === business))
      .map((p) => p.id);
  }
  if (!owners.length) return null;

  const variants = phoneVariants(callerNumber);
  const { data: contacts } = variants.length
    ? await db
        .from("contacts")
        .select("id, user_id")
        .in("user_id", owners)
        .in("phone", variants)
        .order("created_at", { ascending: false })
        .limit(owners.length * 2)
    : { data: [] };
  const contact = ((contacts || []) as Array<{ id: string; user_id: string }>)[0];
  if (contact) return { userId: contact.user_id, contactId: contact.id };
  if (owners.length === 1) return { userId: owners[0], contactId: null };

  const { data: aiOwner } = await db
    .from("profiles")
    .select("id")
    .in("id", owners)
    .eq("ai_call_enabled", true)
    .limit(1)
    .maybeSingle();
  return { userId: aiOwner?.id || owners[0], contactId: null };
}

async function loadRoutingProfile(db: Db, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("telnyx_credential_id, wallet_balance, paused, subscription_status, free_subscription, owned_numbers")
    .eq("id", userId)
    .maybeSingle();
  return data;
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
  const forward = forwardingTarget(profile.owned_numbers, call.businessNumber);
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
