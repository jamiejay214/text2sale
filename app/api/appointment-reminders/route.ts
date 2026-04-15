import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const telnyxKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

// Called by Vercel Cron — checks for appointments happening in ~24 hours and
// sends a reminder text to the customer if the user has reminders enabled.
// Add to vercel.json: { "crons": [{ "path": "/api/appointment-reminders", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest) {
  // Optionally protect with a cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find appointments happening in approximately 24 hours (± 30 min window)
  // so the hourly cron catches them once.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  const startDate = windowStart.toISOString().split("T")[0];
  const endDate = windowEnd.toISOString().split("T")[0];

  // Get all confirmed appointments in date range that haven't been reminded yet
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, user_id, contact_id, date, time, title, reminder_sent, contacts(first_name, last_name, phone)")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("date", startDate)
    .lte("date", endDate);

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const apt of appointments) {
    try {
      // Verify this appointment is actually in the 24-hour window
      const aptDateTime = new Date(`${apt.date}T${apt.time}`);
      if (aptDateTime < windowStart || aptDateTime > windowEnd) continue;

      // Get user's reminder settings and from number
      const { data: profile } = await supabase
        .from("profiles")
        .select("appointment_reminders, owned_numbers, wallet_balance, usage_history")
        .eq("id", apt.user_id)
        .single();

      if (!profile) continue;

      const reminders = profile.appointment_reminders || { enabled: true, hoursBefore: 24, message: "" };
      if (!reminders.enabled) continue;

      const contact = apt.contacts as unknown as { first_name: string; last_name: string; phone: string } | null;
      if (!contact?.phone) continue;

      // Check wallet
      const balance = Number(profile.wallet_balance) || 0;
      if (balance < 0.012) continue;

      // Get from number
      const ownedNumbers = profile.owned_numbers || [];
      if (ownedNumbers.length === 0) continue;

      const fromDigits = ownedNumbers[0].number.replace(/\D/g, "");
      const fromE164 = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;

      const toDigits = contact.phone.replace(/\D/g, "");
      const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

      // Format time for display
      const [h, m] = apt.time.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      const timeDisplay = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

      // Build reminder message
      let msg = reminders.message || "Hi {firstName}! Just a reminder about our appointment tomorrow at {time}. Looking forward to speaking with you!";
      msg = msg
        .replace(/\{firstName\}/gi, contact.first_name || "there")
        .replace(/\{lastName\}/gi, contact.last_name || "")
        .replace(/\{time\}/gi, timeDisplay)
        .replace(/\{title\}/gi, apt.title || "Appointment");

      // Send via Telnyx
      const res = await fetch("https://api.telnyx.com/v2/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telnyxKey}`,
        },
        body: JSON.stringify({
          from: fromE164, to: toE164, text: msg, type: "SMS",
          ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
        }),
      });

      const data = await res.json();
      if (!data.errors) {
        // Mark as reminded and charge
        await supabase.from("appointments").update({ reminder_sent: true }).eq("id", apt.id);

        const newBalance = Number((balance - 0.012).toFixed(2));
        const entry = {
          id: `reminder_${Date.now()}_${apt.id.slice(0, 8)}`,
          type: "charge",
          amount: 0.012,
          description: `Appointment reminder — ${contact.first_name || "Unknown"}`,
          createdAt: new Date().toISOString(),
          status: "succeeded",
        };
        await supabase
          .from("profiles")
          .update({
            wallet_balance: newBalance,
            usage_history: [entry, ...(profile.usage_history || [])],
          })
          .eq("id", apt.user_id);

        sent++;
      }
    } catch (err) {
      console.error("Reminder error for appointment", apt.id, err);
    }
  }

  return NextResponse.json({ sent, checked: appointments.length });
}
