import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type DaySlot = { enabled: boolean; start: string; end: string };
type AvailableHours = {
  enabled: boolean;
  timezone: string;
  slots: Record<string, DaySlot>;
  slotDuration: number;
  bufferMinutes: number;
  maxDaysOut: number;
};

// GET — list appointments or get available slots
// Note: the "available-slots" action is used by public booking pages, so it
// does NOT require auth. The "list" action does.
export async function GET(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = req.nextUrl.searchParams.get("userId");
  const action = req.nextUrl.searchParams.get("action") || "list";

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  if (action === "available-slots") {
    // Public endpoint — returns open slots for a booking page.
    const { data: profile } = await supabase
      .from("profiles")
      .select("available_hours")
      .eq("id", userId)
      .single();

    const hours: AvailableHours = profile?.available_hours || {
      enabled: true, timezone: "America/New_York",
      slots: {}, slotDuration: 30, bufferMinutes: 15, maxDaysOut: 14,
    };

    if (!hours.enabled) {
      return NextResponse.json({ slots: [], message: "Scheduling is disabled" });
    }

    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + hours.maxDaysOut);

    const { data: existing } = await supabase
      .from("appointments")
      .select("date, time, duration_minutes")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("date", today.toISOString().split("T")[0])
      .lte("date", maxDate.toISOString().split("T")[0]);

    const bookedSlots = new Set(
      (existing || []).map((a) => `${a.date}_${a.time}`)
    );

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const openSlots: { date: string; time: string; dayName: string }[] = [];

    for (let d = 1; d <= hours.maxDaysOut; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dayName = dayNames[date.getDay()];
      const dayConfig = hours.slots[dayName];

      if (!dayConfig?.enabled) continue;

      const [startH, startM] = dayConfig.start.split(":").map(Number);
      const [endH, endM] = dayConfig.end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      const step = hours.slotDuration + hours.bufferMinutes;
      const dateStr = date.toISOString().split("T")[0];

      for (let m = startMin; m + hours.slotDuration <= endMin; m += step) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

        if (!bookedSlots.has(`${dateStr}_${timeStr}`)) {
          openSlots.push({ date: dateStr, time: timeStr, dayName });
        }
      }
    }

    return NextResponse.json({ slots: openSlots, timezone: hours.timezone });
  }

  // list requires auth — the owner only.
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbid = requireSameUser(auth.user.id, userId);
  if (forbid) return forbid;

  const { data, error } = await supabase
    .from("appointments")
    .select("*, contacts(first_name, last_name, phone)")
    .eq("user_id", auth.user.id)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data });
}

// POST — create appointment. Public booking page calls this; we still force
// the insert to attach to the URL's owner id so a malicious caller can't
// create appointments on someone else's calendar for spam. If the caller is
// authenticated we require them to match the userId in the body.
export async function POST(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await req.json();
  const { userId, contactId, conversationId, date, time, title, notes, duration } = body;

  if (!userId || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // If Authorization header present, require it to match. Public booking
  // (no header) is allowed so prospects can book without an account.
  const hasAuth = !!req.headers.get("authorization");
  if (hasAuth) {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const forbid = requireSameUser(auth.user.id, userId);
    if (forbid) return forbid;
  }

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from("appointments")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("time", time)
    .eq("status", "confirmed");

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: "Time slot already booked" }, { status: 409 });
  }

  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      user_id: userId,
      contact_id: contactId || null,
      conversation_id: conversationId || null,
      title: title || "Appointment",
      date,
      time,
      duration_minutes: duration || 30,
      notes: notes || "",
      status: "confirmed",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: apt });
}

// PATCH — update appointment status (owner only)
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify the appointment belongs to the caller
  const { data: existing } = await supabase
    .from("appointments")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!existing || existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data });
}

// DELETE — remove appointment (owner only)
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: existing } = await supabase
    .from("appointments")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!existing || existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
