import { NextRequest } from "next/server";
import { db } from "@/lib/email-campaigns";
import { trackingSecret, verifyTracking } from "@/lib/email-tracking";

// Open pixel for campaign emails (lib/email-tracking.ts). Always answers with
// the image, so a bad or old link never shows a broken picture.

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest) {
  const sendId = req.nextUrl.searchParams.get("s") || "";
  const sig = req.nextUrl.searchParams.get("k") || "";
  if (verifyTracking(sendId, "open", sig, trackingSecret())) {
    await db().from("email_sends").update({ opened_at: new Date().toISOString() }).eq("id", sendId).is("opened_at", null).then(() => undefined, () => undefined);
  }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
