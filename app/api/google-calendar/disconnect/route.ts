import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

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

    // Optionally revoke the Google token before clearing
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_calendar_tokens")
      .eq("id", user.id)
      .single();

    if (profile?.google_calendar_tokens?.access_token) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${profile.google_calendar_tokens.access_token}`,
          { method: "POST" }
        );
      } catch {
        // Revocation is best-effort; continue even if it fails
      }
    }

    // Clear tokens from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_calendar_tokens: null })
      .eq("id", user.id);

    if (updateError) {
      console.error("[google-calendar/disconnect] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[google-calendar/disconnect] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
