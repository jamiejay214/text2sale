import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCalendarEvent } from "@/lib/google-calendar";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// "Schedule Follow-up" endpoint — drops a follow-up event into the rep's
// connected Google Calendar straight from a conversation. Lighter-weight
// than the full appointments/booking flow: no conflict check, no
// appointments-table row, just an event on the rep's primary calendar with
// the contact baked into the title and description.

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const { contactId, date, time, title, duration } = await req.json();

    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: date, time" },
        { status: 400 }
      );
    }

    // Resolve contact for the event title/description. The contact is
    // optional — a rep can schedule a follow-up for a conversation where the
    // contact record was deleted — but we need *something* to label the
    // event, so fall back to a phone-only summary if no contact.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let contactName = "";
    let contactPhone = "";
    if (contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("user_id, first_name, last_name, phone")
        .eq("id", contactId)
        .maybeSingle();

      if (!contact || contact.user_id !== userId) {
        // Don't leak info about other users' contacts — if the id doesn't
        // belong to this caller, pretend it wasn't found.
        return NextResponse.json(
          { success: false, error: "Contact not found" },
          { status: 404 }
        );
      }

      contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Lead";
      contactPhone = contact.phone || "";
    }

    try {
      const eventId = await createCalendarEvent(userId, {
        date,
        time,
        title: title || `Follow-up${contactName ? ` — ${contactName}` : ""}`,
        contactName,
        contactPhone,
        duration: Number(duration) || 30,
      });

      return NextResponse.json({ success: true, eventId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      // Surface the "not connected" case as a 409 so the client can prompt
      // the user to connect their calendar instead of showing a scary error.
      if (msg.includes("not connected")) {
        return NextResponse.json(
          { success: false, error: "Google Calendar not connected", code: "not_connected" },
          { status: 409 }
        );
      }
      console.error("[google-calendar/create-event]", msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
