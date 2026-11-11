import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/email-campaigns";
import { applyEvent } from "@/lib/email-events";
import { allowUnverifiedInDev, verifyTelnyxSignature } from "@/lib/telnyx-verify";
import type { EmailEvent } from "@/lib/telnyx-email";

// Telnyx email delivery events (delivered, bounced, complained, unsubscribed,
// opened, clicked) for every sending domain. Signed with Ed25519 like the SMS
// webhooks; events only match emails by Telnyx message id (lib/email-events.ts).

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const verified = await verifyTelnyxSignature(raw, req.headers.get("telnyx-signature-ed25519") || "", req.headers.get("telnyx-timestamp") || "");
  if (!verified && !allowUnverifiedInDev("email-events")) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let body: { data?: EmailEvent & { payload?: EmailEvent["payload"] } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.data) return NextResponse.json({ ok: true });
  try {
    await applyEvent(db(), body.data);
  } catch (e) {
    console.error("[email/events]", e);
    return NextResponse.json({ error: "Could not record the event" }, { status: 500 }); // Telnyx retries
  }
  return NextResponse.json({ ok: true });
}
