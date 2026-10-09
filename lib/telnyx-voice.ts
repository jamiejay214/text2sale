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

/**
 * Browser calls are WebRTC, which Telnyx already encrypts end to end. If the
 * credential connection also has "encrypted media" (SRTP) switched on, Telnyx
 * rejects every browser call with "488 Media Encryption Required" — Telnyx's
 * docs say WebRTC clients must not use that setting. Switch it off when found.
 */
export async function ensureWebrtcMedia() {
  const connectionId = process.env.TELNYX_CREDENTIAL_CONNECTION_ID || "";
  if (!connectionId) return { ok: false, error: "Browser calling connection is not configured." };
  const id = encodeURIComponent(connectionId);
  const current = await telnyxRequest(`/v2/credential_connections/${id}`);
  if (!current.ok) return { ok: false, error: "Could not check the calling connection. Please retry." };
  if (!current.json?.data?.encrypted_media) return { ok: true };
  const result = await telnyxRequest(`/v2/credential_connections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ encrypted_media: null }),
  });
  return result.ok && !result.json?.data?.encrypted_media
    ? { ok: true }
    : { ok: false, error: "Calling connection requires encrypted media, which browser calls can't use. Turn off SRTP on the Telnyx SIP connection." };
}
