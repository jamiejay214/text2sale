import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const userId = req.nextUrl.searchParams.get("userId");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if requester is admin
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

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
