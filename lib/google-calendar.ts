import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface AppointmentInput {
  date: string;       // "2026-04-17"
  time: string;       // "14:00:00" or "14:00"
  title: string;
  contactName: string;
  contactPhone: string;
  duration: number;   // minutes, defaults to 30
}

/**
 * Creates an OAuth2-style headers object with the current access token.
 */
function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Returns valid tokens, refreshing if the current access_token is expired or
 * about to expire (within 5 minutes). Persists new tokens to Supabase when
 * refreshed.
 */
export async function refreshTokensIfNeeded(
  userId: string,
  tokens: GoogleTokens
): Promise<GoogleTokens> {
  const BUFFER_MS = 5 * 60 * 1000; // 5 minutes

  if (tokens.expiry_date > Date.now() + BUFFER_MS) {
    return tokens; // still valid
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[google-calendar] Token refresh failed:", errText);
    throw new Error(`Google token refresh failed: ${res.status}`);
  }

  const data = await res.json();

  const refreshed: GoogleTokens = {
    access_token: data.access_token,
    // Google doesn't always return a new refresh_token; keep the existing one
    refresh_token: data.refresh_token || tokens.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  };

  // Persist refreshed tokens
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase
    .from("profiles")
    .update({ google_calendar_tokens: refreshed })
    .eq("id", userId);

  if (error) {
    console.error("[google-calendar] Failed to save refreshed tokens:", error);
    // Don't throw — the tokens are still usable for this request
  }

  return refreshed;
}

/**
 * Convenience wrapper: fetches the user's tokens from Supabase, refreshes if
 * needed, and returns a valid access token. Throws if the user has no tokens.
 */
export async function getGoogleClient(tokens: GoogleTokens) {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date,
  };
}

/**
 * Creates a Google Calendar event for an appointment and returns the event ID.
 */
export async function createCalendarEvent(
  userId: string,
  appointment: AppointmentInput
): Promise<string> {
  // Load tokens from profile
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("google_calendar_tokens")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.google_calendar_tokens) {
    throw new Error("Google Calendar not connected");
  }

  // Refresh tokens if needed
  const tokens = await refreshTokensIfNeeded(
    userId,
    profile.google_calendar_tokens as GoogleTokens
  );

  // Build start/end datetimes
  const duration = appointment.duration || 30;
  // Normalize time to HH:MM:SS
  const timeParts = appointment.time.split(":");
  const normalizedTime =
    timeParts.length === 2
      ? `${timeParts[0]}:${timeParts[1]}:00`
      : appointment.time;

  const startDateTime = `${appointment.date}T${normalizedTime}`;

  // Calculate end time
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  const endDateTime = endDate.toISOString();

  const event = {
    summary: appointment.title,
    description: `Contact: ${appointment.contactName}\nPhone: ${appointment.contactPhone}\n\nBooked via Textalot`,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "UTC",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 15 },
      ],
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: authHeaders(tokens.access_token),
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("[google-calendar] Create event failed:", res.status, errText);
    // Parse Google's error envelope so the real reason ("Calendar API
    // has not been enabled", "insufficient scope", etc.) bubbles up to
    // the UI instead of a useless status code.
    let googleMessage = "";
    let googleReason = "";
    try {
      const parsed = JSON.parse(errText) as {
        error?: {
          message?: string;
          errors?: Array<{ reason?: string; message?: string }>;
        };
      };
      googleMessage = parsed?.error?.message || "";
      googleReason = parsed?.error?.errors?.[0]?.reason || "";
    } catch {
      // non-JSON response — keep defaults
    }

    // Map the two most common 403 cases to human-readable guidance.
    if (res.status === 403) {
      if (
        /api has not been used|has not been enabled|accessNotConfigured/i.test(
          googleMessage + googleReason
        )
      ) {
        throw new Error(
          "Google Calendar API is not enabled on your Google Cloud project. Open https://console.cloud.google.com/apis/library/calendar-json.googleapis.com, click Enable, wait ~1 minute, then try again."
        );
      }
      if (/insufficient.*scope|insufficientPermissions/i.test(googleMessage + googleReason)) {
        throw new Error(
          "Google Calendar scope wasn't granted. Disconnect and reconnect Google Calendar in Settings, and approve calendar access on the consent screen."
        );
      }
    }

    throw new Error(
      googleMessage
        ? `Google Calendar error (${res.status}): ${googleMessage}`
        : `Failed to create Google Calendar event: ${res.status}`
    );
  }

  const created = await res.json();
  return created.id as string;
}

/**
 * Deletes a Google Calendar event by its event ID.
 */
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("google_calendar_tokens")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.google_calendar_tokens) {
    throw new Error("Google Calendar not connected");
  }

  const tokens = await refreshTokensIfNeeded(
    userId,
    profile.google_calendar_tokens as GoogleTokens
  );

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: authHeaders(tokens.access_token),
    }
  );

  // 204 = success, 410 = already deleted (treat as success)
  if (!res.ok && res.status !== 204 && res.status !== 410) {
    const errText = await res.text();
    console.error("[google-calendar] Delete event failed:", errText);
    throw new Error(`Failed to delete Google Calendar event: ${res.status}`);
  }
}
