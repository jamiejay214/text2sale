import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header for admin GET

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, userEmail, category, text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing suggestion text" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("suggestions").insert({
      user_id: userId || null,
      user_name: userName || "Anonymous",
      user_email: userEmail || "",
      category: category || "other",
      text,
      status: "new",
    });

    if (error) {
      console.error("Suggestion insert error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Suggestion error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Admin GET — fetch all suggestions
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const notAdmin = await requireAdmin(auth.user);
    if (notAdmin) return notAdmin;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ suggestions: data || [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
