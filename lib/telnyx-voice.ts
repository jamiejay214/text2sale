import { telnyxRequest } from "./telnyx-10dlc";

/** Repair routing for an already-owned number; never purchases a number. */
export async function ensureVoiceRouting(e164: string) {
  const connectionId = process.env.TELNYX_CREDENTIAL_CONNECTION_ID || "";
  if (!connectionId) return { ok: false, error: "Browser calling connection is not configured." };
  if (!/^\+1\d{10}$/.test(e164)) return { ok: false, error: "Invalid business number." };
  const lookup = await telnyxRequest(`/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`);
  const number = lookup.json?.data?.find((row: { phone_number?: string }) => row.phone_number === e164);
  if (!lookup.ok || !number?.id) return { ok: false, error: "Business number is still provisioning. Please retry." };
  if (number.connection_id === connectionId) return { ok: true };
  const result = await telnyxRequest(`/v2/phone_numbers/${number.id}`, {
    method: "PATCH",
    body: JSON.stringify({ connection_id: connectionId }),
  });
  return result.ok && result.json?.data?.connection_id === connectionId
    ? { ok: true }
    : { ok: false, error: "Could not connect business number for calling. Please retry." };
}

/** Where Telnyx must send call events for billing and the AI receptionist. */
export const CALL_WEBHOOK_URL = "https://text2sale.com/api/call-webhook";

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
  if (process.env.VERCEL_ENV === "production") {
    const url = String(connection.webhook_event_url || "");
    if (!url) {
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
