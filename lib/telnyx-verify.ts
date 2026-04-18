import { createPublicKey, verify } from "crypto";

// Telnyx signs every webhook with Ed25519. The public key is published in the
// Telnyx portal (Messaging → Messaging Profile → Inbound) as a base64-encoded
// 32-byte key. Node's `crypto.verify` wants an SPKI-format key, so we wrap
// the raw 32 bytes with the standard Ed25519 SPKI prefix.
//
// Message format (per Telnyx docs): `${timestamp}|${body}` as UTF-8.
// Signature header value is base64.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export async function verifyTelnyxSignature(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  const pubKey =
    process.env.TELNYX_PUBLIC_KEY || process.env.TELNYX_WEBHOOK_PUBLIC_KEY;
  if (!pubKey) return false; // fail closed — callers decide whether to bypass in dev

  // Replay protection — reject requests with a timestamp more than 5 minutes
  // off from now. Telnyx sends seconds-since-epoch as a string.
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  if (!signature) return false;

  try {
    const keyDer = Buffer.concat([
      ED25519_SPKI_PREFIX,
      Buffer.from(pubKey, "base64"),
    ]);
    const publicKey = createPublicKey({
      key: keyDer,
      format: "der",
      type: "spki",
    });
    const msg = Buffer.from(`${timestamp}|${body}`, "utf8");
    return verify(null, msg, publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

// Helper — returns true if we should allow the request through despite
// verification failing. In production we ALWAYS fail closed; in dev/preview
// we let it through (with a loud warning) so local testing isn't broken by
// a missing env var.
export function allowUnverifiedInDev(context: string): boolean {
  const hasKey =
    !!process.env.TELNYX_PUBLIC_KEY || !!process.env.TELNYX_WEBHOOK_PUBLIC_KEY;
  if (hasKey) return false;
  if (process.env.NODE_ENV === "production") return false;
  console.warn(
    `[${context}] TELNYX_PUBLIC_KEY not set — allowing unverified webhook in non-production env. DO NOT run like this in production.`
  );
  return true;
}
