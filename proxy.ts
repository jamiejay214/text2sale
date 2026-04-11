import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect /admin route at the edge level.
// This is an optimistic check — it only verifies that a Supabase auth cookie
// exists, NOT that the user is an admin. The actual role check happens
// client-side after loading the profile from Supabase.
//
// Why this matters:
// - Unauthenticated users hitting /admin get instantly redirected (no JS needed)
// - Even if someone bypasses this, Supabase RLS blocks all data access for non-admins
// - The client-side admin page also checks role === "admin" before rendering
//
// Note: /dashboard is NOT protected here because Supabase JS client stores the
// session in localStorage first — the auth cookie may not be set yet when the
// user is redirected after login. The dashboard has its own client-side auth
// check via supabase.auth.getSession().

export function proxy(request: NextRequest) {
  // Check for Supabase auth cookies (sb-*-auth-token pattern)
  const hasAuthCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.includes("-auth-token")
  );

  // Block unauthenticated users from /admin
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
