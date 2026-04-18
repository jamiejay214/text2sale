import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── GET /api/telnyx/webrtc-token ─────────────────────────────────────────
// Returns a short-lived JWT the browser TelnyxRTC client can use to
// register as a SIP endpoint and place outbound WebRTC calls.
//
// Flow:
//  1. Verify the session token.
//  2. Check if the user already has a Telnyx telephony credential (stored
//     as `telnyx_credential_id` on their profile row).
//  3. If not, create one via the Telnyx API and save the id.
//  4. Exchange the credential id for a short-lived JWT.
//  5. Return the JWT to the browser.

const TELNYX_API_KEY = process.env.TELNYX_API_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAuthedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load existing credential id from profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("telnyx_credential_id")
      .eq("id", userId)
      .single();

    let credentialId = profile?.telnyx_credential_id as string | null;

    // Create a credential if the user doesn't have one yet
    if (!credentialId) {
      const res = await fetch("https://api.telnyx.com/v2/telephony_credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TELNYX_API_KEY}`,
        },
        body: JSON.stringify({
          name: `text2sale-${userId.slice(0, 8)}`,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        console.error("[webrtc-token] create credential error:", body);
        return NextResponse.json(
          { error: "Failed to create WebRTC credential" },
          { status: 500 }
        );
      }
      credentialId = body.data.id as string;
      await adminSupabase
        .from("profiles")
        .update({ telnyx_credential_id: credentialId })
        .eq("id", userId);
    }

    // Exchange credential id for a short-lived JWT
    const tokenRes = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TELNYX_API_KEY}` },
      }
    );
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[webrtc-token] token exchange error:", errBody);
      return NextResponse.json(
        { error: "Failed to generate WebRTC token" },
        { status: 500 }
      );
    }

    // Telnyx returns the raw JWT string (not JSON)
    const token = await tokenRes.text();
    return NextResponse.json({ token: token.replace(/^"|"$/g, "") });
  } catch (err) {
    console.error("[webrtc-token] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
