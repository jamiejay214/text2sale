import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header instead of accessToken in body

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Admin API not configured (missing service role key)." },
        { status: 500 }
      );
    }

    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const notAdmin = await requireAdmin(auth.user);
    if (notAdmin) return notAdmin;

    const { targetUserId } = await req.json();
    const callerId = auth.user.id;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Missing targetUserId." },
        { status: 400 }
      );
    }

    // Service-role client for privileged operations
    const admin = createClient(supabaseUrl, serviceRoleKey);

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
