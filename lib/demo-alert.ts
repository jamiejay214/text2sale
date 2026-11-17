// Emails the owner the moment someone requests a demo, so a hot lead is not
// sitting unseen in the admin prospect list. Uses the same Resend account and
// sender as the other owner alerts. Failure is swallowed: the request is
// already saved, and the visitor must not see an error because an alert
// could not be sent.

import { ALERT_EMAIL_FROM, SUPPORT_EMAIL } from "@/lib/email-sender";
import { OWNER_EMAIL } from "@/lib/owner";

export type DemoRequest = {
  name: string;
  email: string;
  phone: string | null;
  industry: string | null;
  message: string | null;
  source: string;
  campaign: string | null;
};

export async function sendDemoAlert(request: DemoRequest): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const lines = [
    "New demo request on text2sale.com",
    "",
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Phone: ${request.phone || "not given"}`,
    `Sells: ${request.industry || "not given"}`,
    `Details: ${request.message || "none"}`,
    `Source: ${request.source}${request.campaign ? ` / ${request.campaign}` : ""}`,
    "",
    "It is also saved in your admin prospect list.",
  ];
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        // Replying to the alert goes straight to the person who asked.
        reply_to: request.email || SUPPORT_EMAIL,
        to: [OWNER_EMAIL],
        subject: `Demo request: ${request.name}`,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
