import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`;

export async function GET(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { searchParams } = req.nextUrl;

  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Handle user denial or errors from Google
  if (errorParam) {
    console.error("[google-calendar/callback] Google error:", errorParam);
    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=missing_params`
    );
  }

  let state: { userId: string; token: string };
  try {
    state = JSON.parse(decodeURIComponent(stateRaw));
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=invalid_state`
    );
  }

  // Verify user identity
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(state.token);

  if (authError || !user || user.id !== state.userId) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=auth_failed`
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("[google-calendar/callback] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=token_exchange`
      );
    }

    const tokens = await tokenResponse.json();

    const googleCalendarTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: Date.now() + tokens.expires_in * 1000,
    };

    // Store tokens on the user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_calendar_tokens: googleCalendarTokens })
      .eq("id", user.id);

    if (updateError) {
      console.error("[google-calendar/callback] Profile update error:", updateError);
      return NextResponse.redirect(
        `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=save_failed`
      );
    }

    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=success`
    );
  } catch (err) {
    console.error("[google-calendar/callback] Error:", err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard?tab=settings&subtab=ai&gcal=error&reason=unknown`
    );
  }
}
