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
