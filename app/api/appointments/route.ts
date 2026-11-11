import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSameUser } from "@/lib/auth-guard";
import { overlapsBusy } from "@/lib/availability";
import { checkCalendarConflict, createCalendarEvent, deleteCalendarEvent, getCalendarBusy } from "@/lib/google-calendar";

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
    // Times already taken on the owner's Google Calendar aren't offered.
    const busy = await getCalendarBusy(userId, today, new Date(maxDate.getTime() + 86_400_000));

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

        if (
          !bookedSlots.has(`${dateStr}_${timeStr}`) &&
          !overlapsBusy(dateStr, timeStr, hours.slotDuration, hours.timezone || "America/New_York", busy)
        ) {
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

  const appointments=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabase.from("appointments").select("*, contacts(first_name, last_name, phone)").eq("user_id",auth.user.id).order("date",{ascending:true}).order("time",{ascending:true}).order("id").range(offset,offset+999);
    if(error)return NextResponse.json({error:error.message},{status:500});
    appointments.push(...(data || []));
    if(!data || data.length<1000)break;
  }
  return NextResponse.json({appointments});
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

  // The owner's Google Calendar counts too: it holds everything booked
  // outside Text2Sale.
  const { data: owner } = await supabase
    .from("profiles")
    .select("available_hours")
    .eq("id", userId)
    .single();
  const timeZone = (owner?.available_hours as { timezone?: string } | null)?.timezone || "America/New_York";
  const minutes = Number(duration) || 30;
  if (await checkCalendarConflict(userId, date, time, minutes, timeZone)) {
    return NextResponse.json({ error: "That time is already taken on your Google Calendar" }, { status: 409 });
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

  // Put it on the owner's Google Calendar. A Google problem doesn't undo the
  // booking; it just stays Text2Sale-only.
  let contactName = "";
  let contactPhone = "";
  if (contactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("first_name, last_name, phone")
      .eq("id", contactId)
      .eq("user_id", userId)
      .maybeSingle();
    contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ");
    contactPhone = contact?.phone || "";
  }
  try {
    const googleEventId = await createCalendarEvent(userId, {
      date,
      time,
      title: apt.title,
      contactName: contactName || "Lead",
      contactPhone,
      duration: minutes,
      timeZone,
    });
    await supabase.from("appointments").update({ google_event_id: googleEventId }).eq("id", apt.id);
    apt.google_event_id = googleEventId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    apt.calendar_sync_error = "Saved in Text2Sale. Google Calendar sync failed; reconnect or retry.";
    await supabase.from("appointments").update({calendar_sync_error:apt.calendar_sync_error}).eq("id",apt.id);
    if (!message.includes("not connected")) console.error("[appointments] Google Calendar sync failed:", message);
  }

  return NextResponse.json({ appointment: apt });
}

// Takes a cancelled or deleted appointment off Google Calendar too.
async function removeFromGoogle(userId: string, googleEventId: string | null | undefined) {
  if (!googleEventId) return;
  try {
    await deleteCalendarEvent(userId, googleEventId);
  } catch (err) {
    console.error("[appointments] Google Calendar delete failed:", err instanceof Error ? err.message : err);
  }
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
    .select("*")
    .eq("id", id)
    .single();
  if (!existing || existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if(status && !["confirmed","completed","no_show","cancelled"].includes(status))return NextResponse.json({error:"Invalid appointment status."},{status:400});
  if (status) updates.status = status;
  if(body.date!==undefined || body.time!==undefined){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body.date || "") || !/^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(body.time || ""))return NextResponse.json({error:"Choose a valid date and time."},{status:400});
    const {data:owner}=await supabase.from("profiles").select("available_hours").eq("id",auth.user.id).single();
    const zone=owner?.available_hours?.timezone || "America/New_York";
    const duration=existing.duration_minutes || 30;
    const {data:other,error:otherError}=await supabase.from("appointments").select("time,duration_minutes").eq("user_id",auth.user.id).eq("date",body.date).eq("status","confirmed").neq("id",id);
    if(otherError)return NextResponse.json({error:"Could not verify availability."},{status:503});
    const minute=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
    const start=minute(body.time);
    if((other||[]).some(a=>minute(a.time)<start+duration && start<minute(a.time)+(a.duration_minutes||30)))return NextResponse.json({error:"That time overlaps another appointment."},{status:409});
    try{if(await checkCalendarConflict(auth.user.id,body.date,body.time,duration,zone,existing.google_event_id))return NextResponse.json({error:"That time is busy in Google Calendar."},{status:409});}catch{return NextResponse.json({error:"Could not check your calendar. Retry before rescheduling."},{status:503});}
    updates.date=body.date;updates.time=body.time;updates.status="confirmed";updates.reminder_sent=false;
  }
  if(typeof body.title==="string" && body.title.trim())updates.title=body.title.trim();
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if(data.status==="cancelled"){
    try{if(existing.google_event_id)await deleteCalendarEvent(auth.user.id,existing.google_event_id);data.google_event_id=null;data.calendar_sync_error=null;}
    catch{data.calendar_sync_error="Cancelled in Text2Sale. Google Calendar removal failed; retry sync.";}
    await supabase.from("appointments").update({google_event_id:data.google_event_id,calendar_sync_error:data.calendar_sync_error}).eq("id",id);
  }else if(body.date || body.retrySync){
    const {data:owner}=await supabase.from("profiles").select("available_hours").eq("id",auth.user.id).single();
    try{
      const eventId=await createCalendarEvent(auth.user.id,{date:data.date,time:data.time,title:data.title,contactName:"Text2Sale contact",contactPhone:"",duration:data.duration_minutes||30,timeZone:owner?.available_hours?.timezone || "America/New_York"},existing.google_event_id || undefined);
      data.google_event_id=eventId;data.calendar_sync_error=null;
    }catch{data.calendar_sync_error="Saved in Text2Sale. Google Calendar sync failed; reconnect or retry.";}
    await supabase.from("appointments").update({google_event_id:data.google_event_id,calendar_sync_error:data.calendar_sync_error}).eq("id",id);
  }
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
    .select("user_id, google_event_id")
    .eq("id", id)
    .single();
  if (!existing || existing.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await removeFromGoogle(auth.user.id, existing.google_event_id);
  return NextResponse.json({ success: true });
}
