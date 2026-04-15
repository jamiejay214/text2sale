import { NextRequest, NextResponse } from "next/server";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_ADDRESS || "Text2Sale <hello@text2sale.com>";

export async function POST(req: NextRequest) {
  try {
    // Gracefully no-op if Resend isn't configured
    if (!resendApiKey) {
      return NextResponse.json({ success: false, skipped: true, reason: "RESEND_API_KEY not set" });
    }

    const { email, firstName } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 });
    }

    const name = (firstName || "there").trim();
    const subject = "Welcome to Text2Sale 👋";

    const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b0b0f; color: #ffffff; margin: 0; padding: 32px;">
    <div style="max-width: 560px; margin: 0 auto; background: #17171f; border: 1px solid #2a2a36; border-radius: 16px; padding: 32px;">
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 8px 0;">Welcome to Text2Sale, ${name} 🎉</h1>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Thanks for signing up. Your account is ready — here's how to get up and running in the next 10 minutes:
      </p>
      <ol style="color: #d4d4d8; font-size: 14px; line-height: 1.7; padding-left: 20px;">
        <li><strong>Subscribe</strong> to the $39.99/mo plan to unlock messaging, number purchasing, and campaigns.</li>
        <li><strong>Register 10DLC.</strong> Carriers require every business to be approved before sending A2P SMS. Takes 1–3 business days.</li>
        <li><strong>Buy a local number</strong> ($1.50 one-time + $1/mo).</li>
        <li><strong>Import your contacts</strong> from a CSV — or add them one at a time.</li>
        <li><strong>Launch your first campaign.</strong></li>
      </ol>
      <div style="margin: 28px 0;">
        <a href="https://text2sale.com/dashboard" style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
      </div>
      <p style="color: #71717a; font-size: 13px; margin-top: 28px;">
        Need help? Just reply to this email or shoot a note to <a href="mailto:support@text2sale.com" style="color: #a78bfa;">support@text2sale.com</a>.
      </p>
    </div>
    <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 16px;">
      Text2Sale · Mass Texting CRM for Sales Teams
    </p>
  </body>
</html>
    `.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ success: false, error: body }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
