import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/email-campaigns";
import { trackingBase, trackingSecret, verifyTracking } from "@/lib/email-tracking";

// Click tracking for campaign emails (lib/email-tracking.ts): record the
// first click, then send the reader on. Only signed links redirect, so this
// can't be used to bounce people to someone else's site.

export async function GET(req: NextRequest) {
  const sendId = req.nextUrl.searchParams.get("s") || "";
  const url = req.nextUrl.searchParams.get("u") || "";
  const sig = req.nextUrl.searchParams.get("k") || "";
  if (!/^https?:\/\//i.test(url) || !verifyTracking(sendId, url, sig, trackingSecret())) {
    return NextResponse.redirect(trackingBase(), 302);
  }
  const at = new Date().toISOString();
  await Promise.all([
    db().from("email_sends").update({ clicked_at: at }).eq("id", sendId).is("clicked_at", null),
    // A click means it was opened, even when images were blocked.
    db().from("email_sends").update({ opened_at: at }).eq("id", sendId).is("opened_at", null),
  ]).catch(() => undefined);
  return NextResponse.redirect(url, 302);
}
