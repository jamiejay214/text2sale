import { telnyxRequest } from "./telnyx-10dlc";

/** Where Telnyx must send call events for billing and the AI receptionist. */
export const CALL_WEBHOOK_URL = "https://text2sale.com/api/call-webhook";

/** Name of the Voice API application inbound calls run through. */
export const CALL_APP_NAME = "Text2Sale inbound calls";

const isProduction = () => process.env.VERCEL_ENV === "production";

/**
 * Telnyx site that carries the call audio. Left on "Latency", Telnyx picks
 * the site with the fastest ping to the app's webhook host, but that host
 * is Vercel's worldwide edge, which answers nearby from every site, so the
 * pick is effectively arbitrary: US callers' audio could cross an ocean
 * and break up mid-word. Pinned to the US East site; override per
 * deployment with TELNYX_ANCHORSITE.
 */
const anchorsite = () => process.env.TELNYX_ANCHORSITE || "Ashburn, VA";
const credentialConnectionId = () => process.env.TELNYX_CREDENTIAL_CONNECTION_ID || "";

/* eslint-disable @typescript-eslint/no-explicit-any */
type CallApp = { id: string; webhook_event_url?: string | null; webhook_api_version?: string | number | null; active?: boolean; anchorsite_override?: string | null; outbound?: Record<string, any> | null };

const APP_CACHE_MS = 5 * 60 * 1000;
let appCache: { id: string; at: number } | null = null;

async function outboundVoiceProfileId(): Promise<string> {
  const id = credentialConnectionId();
  if (!id) return "";
  const res = await telnyxRequest(`/v2/credential_connections/${encodeURIComponent(id)}`);
  return res.ok ? String(res.json?.data?.outbound?.outbound_voice_profile_id || "") : "";
}

/**
 * The Voice API (Call Control) application that inbound calls run through.
 *
 * Telnyx only accepts call commands (answer, transfer, speak) for numbers on
 * a Voice API application. Numbers used to sit on the browser-calling SIP
 * connection, where every answer or transfer was refused, so inbound calls
 * reached nobody: no AI receptionist, no forwarding, no browser ring.
 * Outbound browser calls still go through the SIP connection and can present
 * any number on the account, wherever that number is assigned.
 *
 * Uses TELNYX_VOICE_APP_ID when it points at an app that sends events here,
 * else the app named CALL_APP_NAME, creating it in production if missing.
 * Production also keeps its webhook, API version, audio site (anchorsite)
 * and outbound voice profile (needed to forward calls to a cell) correct.
 */
export async function ensureCallControlApp(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (appCache && Date.now() - appCache.at < APP_CACHE_MS) return { ok: true, id: appCache.id };
  const failed = { ok: false as const, error: "Could not reach Telnyx to set up inbound calls. Please retry." };

  let app: CallApp | null = null;
  const configured = process.env.TELNYX_VOICE_APP_ID || process.env.TELNYX_CALL_CONTROL_APP_ID || "";
  if (configured) {
    const res = await telnyxRequest(`/v2/call_control_applications/${encodeURIComponent(configured)}`);
    if (res.ok && res.json?.data?.id) app = res.json.data;
    else if (res.status !== 404) return failed;
    const url = String(app?.webhook_event_url || "");
    if (app && url && url !== CALL_WEBHOOK_URL && !isStaleAppWebhook(url)) {
      // Another system's app: moving numbers onto it would send their calls elsewhere.
      console.warn(`[telnyx-voice] TELNYX_VOICE_APP_ID sends events to ${url}; using "${CALL_APP_NAME}" instead`);
      app = null;
    }
  }
  if (!app) {
    const list = await telnyxRequest(`/v2/call_control_applications?page[size]=250`);
    if (!list.ok) return failed;
    app = ((list.json?.data || []) as Array<CallApp & { application_name?: string }>).find((a) => a.application_name === CALL_APP_NAME) || null;
  }

  if (!app) {
    if (!isProduction()) return { ok: false, error: "Inbound calling is set up by the live site; it isn't ready yet." };
    const profileId = await outboundVoiceProfileId();
    const created = await telnyxRequest(`/v2/call_control_applications`, {
      method: "POST",
      body: JSON.stringify({
        application_name: CALL_APP_NAME,
        webhook_event_url: CALL_WEBHOOK_URL,
        webhook_api_version: "2",
        active: true,
        anchorsite_override: anchorsite(),
        ...(profileId ? { outbound: { outbound_voice_profile_id: profileId } } : {}),
      }),
    });
    if (!created.ok || !created.json?.data?.id) {
      console.error(`[telnyx-voice] could not create the inbound calling app (${created.status})`);
      return failed;
    }
    app = created.json.data as CallApp;
  } else if (isProduction()) {
    const patch: Record<string, unknown> = {};
    const url = String(app.webhook_event_url || "");
    if (url !== CALL_WEBHOOK_URL) patch.webhook_event_url = CALL_WEBHOOK_URL;
    if (String(app.webhook_api_version) !== "2") patch.webhook_api_version = "2";
    if (app.active === false) patch.active = true;
    if (app.anchorsite_override !== anchorsite()) patch.anchorsite_override = anchorsite();
    if (!app.outbound?.outbound_voice_profile_id) {
      const profileId = await outboundVoiceProfileId();
      if (profileId) patch.outbound = { ...(app.outbound || {}), outbound_voice_profile_id: profileId };
    }
    if (Object.keys(patch).length) {
      const updated = await telnyxRequest(`/v2/call_control_applications/${encodeURIComponent(app.id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!updated.ok) console.error(`[telnyx-voice] could not update the inbound calling app (${updated.status})`);
    }
  }

  appCache = { id: String(app.id), at: Date.now() };
  return { ok: true, id: appCache.id };
}

/**
 * Put an already-owned number on the inbound calling app; never purchases a
 * number. `inbound` says whether inbound calls can now reach the app.
 *
 * If the app can't be resolved right now, a number already on a connection
 * is left where it is (a Telnyx hiccup must not undo working routing), and
 * an unassigned one goes on the browser-calling connection so outbound
 * calling still works.
 */
export async function ensureVoiceRouting(e164: string): Promise<{ ok: boolean; error?: string; inbound?: boolean }> {
  if (!/^\+1\d{10}$/.test(e164)) return { ok: false, error: "Invalid business number." };
  const app = await ensureCallControlApp().catch(() => ({ ok: false as const, error: "" }));
  const lookup = await telnyxRequest(`/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`);
  const number = lookup.json?.data?.find((row: { phone_number?: string }) => row.phone_number === e164);
  if (!lookup.ok || !number?.id) return { ok: false, error: "Business number is still provisioning. Please retry." };

  const target = app.ok ? app.id : number.connection_id ? "" : credentialConnectionId();
  if (!app.ok && !target) {
    return number.connection_id
      ? { ok: true, inbound: false, error: app.error || "Inbound calling is not set up yet." }
      : { ok: false, error: "Calling is not configured." };
  }
  if (number.connection_id === target) return { ok: true, inbound: app.ok };
  const result = await telnyxRequest(`/v2/phone_numbers/${number.id}`, {
    method: "PATCH",
    body: JSON.stringify({ connection_id: target }),
  });
  return result.ok && result.json?.data?.connection_id === target
    ? { ok: true, inbound: app.ok }
    : { ok: false, error: "Could not connect business number for calling. Please retry." };
}

/**
 * An older address of this same app (www, http, a vercel.app deployment
 * URL). Telnyx doesn't follow redirects, so events sent there never reach
 * the handler: inbound calls rang into nothing and the AI never picked up.
 * Anything else is somebody's deliberate setting and is left alone.
 */
export function isStaleAppWebhook(url: string): boolean {
  if (url === CALL_WEBHOOK_URL) return false;
  try {
    const parsed = new URL(url);
    const appHost = /(^|\.)text2sale\.com$/i.test(parsed.hostname) || /\.vercel\.app$/i.test(parsed.hostname);
    return appHost && /\/api\/call-webhook\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Keep the browser-calling connection set up the way the app needs it.
 *
 * - Encrypted media (SRTP) off. Browser calls are WebRTC, which Telnyx already
 *   encrypts; with SRTP also required, Telnyx rejects every browser call with
 *   "488 Media Encryption Required" (Telnyx: WebRTC clients must not use it).
 * - Call events on. Without a webhook URL Telnyx never reports when a call
 *   connects or ends, so browser calls can't be billed and the AI receptionist
 *   never hears about inbound calls. Production only fills in an EMPTY URL —
 *   it never overwrites one somebody set — and preview deployments never
 *   touch it, so a preview can't redirect production's call events.
 */
export async function ensureWebrtcMedia() {
  const connectionId = process.env.TELNYX_CREDENTIAL_CONNECTION_ID || "";
  if (!connectionId) return { ok: false, error: "Browser calling connection is not configured." };
  const id = encodeURIComponent(connectionId);
  const current = await telnyxRequest(`/v2/credential_connections/${id}`);
  if (!current.ok) return { ok: false, error: "Could not check the calling connection. Please retry." };
  const connection = current.json?.data || {};

  const patch: Record<string, unknown> = {};
  if (connection.encrypted_media) patch.encrypted_media = null;
  // Inbound calls ring the browser by transferring to its SIP address
  // (sip:<user>@sip.telnyx.com), which the connection refuses while SIP URI
  // calling is disabled. "internal" accepts only calls from this account.
  if (!connection.sip_uri_calling_preference || connection.sip_uri_calling_preference === "disabled") {
    patch.sip_uri_calling_preference = "internal";
  }
  if (process.env.VERCEL_ENV === "production") {
    const url = String(connection.webhook_event_url || "");
    if (!url || isStaleAppWebhook(url)) {
      patch.webhook_event_url = CALL_WEBHOOK_URL;
      patch.webhook_api_version = "2";
    } else if (url === CALL_WEBHOOK_URL && String(connection.webhook_api_version) !== "2") {
      patch.webhook_api_version = "2";
    } else if (url !== CALL_WEBHOOK_URL) {
      console.warn(`[telnyx-voice] calling connection sends call events to ${url}, not ${CALL_WEBHOOK_URL}; browser calls won't be billed`);
    }
  }
  if (!Object.keys(patch).length) return { ok: true };

  const result = await telnyxRequest(`/v2/credential_connections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if ("encrypted_media" in patch && !(result.ok && !result.json?.data?.encrypted_media)) {
    return { ok: false, error: "Calling connection requires encrypted media, which browser calls can't use. Turn off SRTP on the Telnyx SIP connection." };
  }
  if (!result.ok) console.error("[telnyx-voice] could not update the calling connection's webhook settings");
  return { ok: true };
}

export type VoiceSetupCheck = {
  /** Inbound call events reach /api/call-webhook (null = not checked here). */
  webhook: boolean | null;
  error?: string;
  numbers: Array<{ number: string; ok: boolean; error?: string }>;
};

/**
 * Repair, then report, everything an inbound call needs before the app ever
 * hears about it: the inbound calling app, its webhook, the browser
 * connection's SIP settings, and each number's routing.
 */
export async function ensureInboundVoice(numbers: string[]): Promise<VoiceSetupCheck> {
  await ensureWebrtcMedia().catch(() => null);
  const app = await ensureCallControlApp().catch(() => ({ ok: false as const, error: "Could not reach Telnyx." }));
  let webhook: boolean | null = null;
  if (!app.ok) {
    webhook = false;
  } else if (isProduction()) {
    const current = await telnyxRequest(`/v2/call_control_applications/${encodeURIComponent(app.id)}`).catch(() => null);
    webhook = current?.ok ? current.json?.data?.webhook_event_url === CALL_WEBHOOK_URL : null;
  }
  const results: VoiceSetupCheck["numbers"] = [];
  for (const raw of numbers) {
    const digits = String(raw || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "";
    if (!e164 || results.some((r) => r.number === e164)) continue;
    const routed = await ensureVoiceRouting(e164).catch(() => ({ ok: false, error: "Could not reach Telnyx.", inbound: false }));
    results.push(routed.ok && routed.inbound ? { number: e164, ok: true } : { number: e164, ok: false, error: routed.error || "Not connected for inbound calls yet." });
  }
  return { webhook, error: app.ok ? undefined : app.error, numbers: results };
}
