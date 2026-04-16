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

export async function GET(req: NextRequest) {
  try {
    // Fail loudly (but clearly) if server env vars aren't set — this used to
    // bounce the user out to Google with client_id="" which gave a useless
    // error screen.
    if (!GOOGLE_CLIENT_ID || !APP_URL) {
      return NextResponse.json(
        {
          error: "Google Calendar is not configured",
          detail:
            "GOOGLE_CLIENT_ID and NEXT_PUBLIC_APP_URL must be set in the server environment.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the auth cookie / token
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader?.replace("Bearer ", "") ||
      req.cookies.get("sb-access-token")?.value ||
      req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
