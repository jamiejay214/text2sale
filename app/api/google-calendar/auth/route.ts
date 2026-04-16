import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`;
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Redirect back to the dashboard with a friendly error reason instead of
// returning raw JSON. Raw JSON on a blank page looks like the button is
// broken; a redirect lets the dashboard surface a readable message.
function errorRedirect(reason: string): NextResponse {
  const base = APP_URL || "/dashboard";
  return NextResponse.redirect(
    `${base}/dashboard?tab=settings&subtab=ai&gcal=error&reason=${encodeURIComponent(reason)}`
  );
}

export async function GET(req: NextRequest) {
  try {
    // If server env vars aren't set we can't even start the OAuth flow.
    // Bounce back to the dashboard with a clear reason instead of a JSON
    // error page so the user sees a real message.
    if (!GOOGLE_CLIENT_ID || !APP_URL) {
      return errorRedirect("not_configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the auth cookie / token
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader?.replace("Bearer ", "") ||
      req.cookies.get("sb-access-token")?.value ||
      req.nextUrl.searchParams.get("token");

    if (!token) {
      return errorRedirect("auth_missing");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return errorRedirect("auth_invalid");
    }

    // Build Google OAuth URL
    const state = encodeURIComponent(
      JSON.stringify({ userId: user.id, token })
    );

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (err) {
    console.error("[google-calendar/auth] Error:", err);
    return errorRedirect("unknown");
  }
}
