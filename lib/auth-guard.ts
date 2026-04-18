// Shared server-side auth helper for API routes.
//
// Every protected API route should start with `const user = await requireUser(req)`
// — if the caller isn't authenticated, this returns a 401 NextResponse that the
// route can just `return` directly. If authenticated, it returns the user.
//
// This replaces the ad-hoc `const token = req.headers.get("authorization")...`
// blocks that were scattered across routes (and missing from most of them).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AuthResult =
  | { ok: true; user: User; token: string }
  | { ok: false; response: NextResponse };

/**
 * Extract and verify the Supabase access token from the Authorization header.
 * Returns the authenticated user on success, or a 401 response on failure.
 *
 * Usage in a route:
 *   const auth = await authenticate(req);
 *   if (!auth.ok) return auth.response;
 *   const user = auth.user;
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Validate the token against Supabase auth. We always use the anon key for
  // token verification — never the service role — so a stolen/forged service
  // role can never be used to pass this check.
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, user: data.user, token };
}

/**
 * Verify the request is authenticated AND that the authenticated user matches
 * the `userId` supplied in the request (body or query). Prevents the common
 * "trust userId from the body" mistake where any authenticated user can act
 * on any other user's data just by substituting the id.
 */
export function requireSameUser(
  authedUserId: string,
  requestedUserId: string | null | undefined
): NextResponse | null {
  if (!requestedUserId || authedUserId !== requestedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Admin-only guard. Returns null if the authenticated user has role='admin',
 * otherwise returns a 403 response.
 */
export async function requireAdmin(user: User): Promise<NextResponse | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const svc = createClient(supabaseUrl, serviceKey);
  const { data } = await svc
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!data || data.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
