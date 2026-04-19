import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── GET /api/telnyx/webrtc-token ─────────────────────────────────────────
// Returns a short-lived JWT the browser TelnyxRTC client uses to register
// as a SIP endpoint and place outbound WebRTC calls.
//
// Telnyx resource model (this is easy to get wrong — see docs):
//   • Credential Connection (SIP Connection) — the "phone system" the
//     browser registers against. Has its own Outbound Voice Profile,
//     billing group, and the DIDs the user is allowed to call FROM.
//   • Telephony Credential — a SIP user under a Credential Connection.
//     One per end user. We mint these on demand.
//   • Voice API Application (TELNYX_VOICE_APP_ID) — a DIFFERENT resource
//     used by server-side Call Control. Not usable here.
//
// Setup required in Telnyx portal (one-time, by operator):
//   1. Create a Credential Connection, assign an Outbound Voice Profile,
//      and associate the account's DIDs with it.
//   2. Copy its ID into env as TELNYX_CREDENTIAL_CONNECTION_ID.
//
// Per request:
//   1. Verify the session token.
//   2. Ensure the profile has a `telnyx_credential_id` tied to the above
//      connection. Create one (with connection_id) if missing.
//   3. Exchange that credential id for a short-lived JWT.
//   4. Return the JWT to the browser.

const TELNYX_API_KEY = process.env.TELNYX_API_KEY!;
const CREDENTIAL_CONNECTION_ID =
  process.env.TELNYX_CREDENTIAL_CONNECTION_ID || "";
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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!CREDENTIAL_CONNECTION_ID) {
      // Loud, clear error so the HUD can surface it instead of "ringing…"
      // forever while Telnyx silently refuses to mint calls.
      return NextResponse.json(
        {
          error:
            "Browser calling isn't finished setting up. Ask the operator to create a Telnyx Credential Connection and set TELNYX_CREDENTIAL_CONNECTION_ID.",
        },
        { status: 503 }
      );
    }

    // Load existing credential id from profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("telnyx_credential_id")
      .eq("id", userId)
      .single();

    let credentialId = profile?.telnyx_credential_id as string | null;

    // Create a credential if the user doesn't have one yet. `connection_id`
    // is REQUIRED — without it Telnyx creates an orphan credential that
    // can't place calls.
    if (!credentialId) {
      const res = await fetch("https://api.telnyx.com/v2/telephony_credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TELNYX_API_KEY}`,
        },
        body: JSON.stringify({
          name: `text2sale-${userId.slice(0, 8)}`,
          connection_id: CREDENTIAL_CONNECTION_ID,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[webrtc-token] create credential error:", body);
        return NextResponse.json(
          {
            error:
              "Failed to create WebRTC credential. Check TELNYX_CREDENTIAL_CONNECTION_ID points at a valid Credential Connection.",
            telnyx: body,
          },
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

      // If the credential was created before connection_id was wired up,
      // it's stuck on a bad connection. Drop it so next request re-creates
      // it cleanly against the right connection.
      if (tokenRes.status === 404 || tokenRes.status === 422) {
        await adminSupabase
          .from("profiles")
          .update({ telnyx_credential_id: null })
          .eq("id", userId);
      }
      return NextResponse.json(
        {
          error:
            "Failed to mint WebRTC token. Retry — if it keeps failing, the Credential Connection may need its DIDs reassigned.",
        },
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
