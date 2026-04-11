import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect /admin and /dashboard routes at the edge level.
// This is an optimistic check — it only verifies that a Supabase auth cookie
// exists, NOT that the user is an admin. The actual role check happens
// client-side after loading the profile from Supabase.
//
// Why this matters:
// - Unauthenticated users hitting /admin get instantly redirected (no JS needed)
// - Even if someone bypasses this, Supabase RLS blocks all data access for non-admins
// - The client-side admin page also checks role === "admin" before rendering

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Supabase auth cookies (sb-*-auth-token pattern)
  const hasAuthCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.includes("-auth-token")
  );

  // Block unauthenticated users from /admin and /dashboard
  if ((pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
