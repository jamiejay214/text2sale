import { NextRequest, NextResponse } from "next/server";
import { db, unsubscribeSecret } from "@/lib/email-campaigns";
import { verifyUnsubscribe } from "@/lib/email-content";

// Unsubscribe from a customer's email campaigns. No login: the link carries
// a signed token (lib/email-content.ts). GET shows a confirm button so link
// scanners can't unsubscribe people by prefetching; POST does it, and is
// also what mail apps call for one-click unsubscribe (RFC 8058).

function page(title: string, message: string, form?: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f4f4f5;color:#18181b"><main style="max-width:480px;margin:64px auto;padding:32px;background:#fff;border-radius:16px">
<h1 style="margin:0 0 12px;font-size:24px">${title}</h1><p style="margin:0 0 20px;line-height:1.5">${message}</p>${form || ""}</main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") || "";
  if (!verifyUnsubscribe(token, unsubscribeSecret())) return page("Link not valid", "This unsubscribe link isn't valid. Reply to the email and ask to be removed.");
  const action = `/api/email/unsubscribe?t=${encodeURIComponent(token)}`;
  return page(
    "Unsubscribe",
    "Click below and you won't receive these emails again.",
    `<form method="post" action="${action}"><button type="submit" style="border:0;background:#18181b;color:#fff;font-size:16px;padding:12px 20px;border-radius:10px;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(req: NextRequest) {
  const parsed = verifyUnsubscribe(req.nextUrl.searchParams.get("t") || "", unsubscribeSecret());
  if (!parsed) return page("Link not valid", "This unsubscribe link isn't valid. Reply to the email and ask to be removed.");
  const { error } = await db()
    .from("email_suppressions")
    .upsert({ user_id: parsed.userId, email: parsed.email, reason: "unsubscribe" }, { onConflict: "user_id,email", ignoreDuplicates: true });
  if (error) return page("Something went wrong", "We couldn't process that just now. Please try again in a minute.");
  return page("You're unsubscribed", "You won't receive these emails again.");
}
