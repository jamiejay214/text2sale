import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Admin API not configured (missing service role key)." },
        { status: 500 }
      );
    }

    const { targetUserId, accessToken } = await req.json();

    if (!targetUserId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing targetUserId or accessToken." },
        { status: 400 }
      );
    }

    // Identify the caller using their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { success: false, error: "Invalid session." },
        { status: 401 }
      );
    }

    const callerId = userData.user.id;

    // Service-role client for privileged operations
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (callerProfile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    // Prevent admins from deleting themselves or other admins
    if (callerId === targetUserId) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .single();

    if (targetProfile?.role === "admin") {
      return NextResponse.json(
        { success: false, error: "Admin accounts cannot be deleted from this screen." },
        { status: 400 }
      );
    }

    // Clean up user-owned rows first (FK constraints in Supabase may or may not cascade)
    // These best-effort deletes — errors here don't block the main auth delete.
    const tablesToClear = [
      "messages",
      "conversations",
      "contacts",
      "campaigns",
      "message_templates",
      "scheduled_messages",
      "support_messages",
    ];

    for (const table of tablesToClear) {
      await admin.from(table).delete().eq("user_id", targetUserId);
    }

    await admin.from("profiles").delete().eq("id", targetUserId);

    // Finally, delete the auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteErr) {
      return NextResponse.json(
        { success: false, error: deleteErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
