import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, internalWebhookAuth, type AuthResult } from "./auth-guard";
import { isOwnerEmail } from "./owner";

export function teamDatabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

// Opt-in for workspace operations only. Billing, credentials and owner routes
// continue to authenticate the real actor; no teammate login token is minted.
export async function authenticateWorkspace(req: NextRequest): Promise<AuthResult> {
  const auth = await authenticate(req, true);
  if (!auth.ok) return auth;
  const targetId = req.headers.get("x-workspace-id");
  if (!targetId || targetId === auth.user.id) return auth;
  if (!/^[0-9a-f-]{36}$/i.test(targetId) || !auth.user.email_confirmed_at) {
    return { ok: false, response: NextResponse.json({ error: "Workspace access denied." }, { status: 403 }) };
  }
  const db = teamDatabase();
  const { data: profiles, error } = await db.from("profiles").select("id,role,manager_id,paused").in("id", [auth.user.id, targetId]);
  const actor = profiles?.find(p => p.id === auth.user.id);
  const target = profiles?.find(p => p.id === targetId);
  const owner = actor?.role === "admin" && isOwnerEmail(auth.user.email);
  const manager = actor?.role === "manager" && target?.manager_id === actor.id && target?.role !== "admin";
  if (error || !actor || !target || actor.paused || target.paused || (!owner && !manager)) {
    return { ok: false, response: NextResponse.json({ error: "Workspace access denied. Team membership may have changed." }, { status: 403 }) };
  }
  const { error: auditError } = await db.from("team_audit_events").insert({ actor_id: actor.id, target_id: targetId, action: "workspace_request", detail: { method: req.method, path: req.nextUrl.pathname } });
  if (auditError) return { ok: false, response: NextResponse.json({ error: "Could not record workspace access." }, { status: 503 }) };
  return { ...auth, user: { ...auth.user, id: targetId } };
}

export async function getWorkspaceUserId(req: NextRequest): Promise<string | null> {
  const auth = await authenticateWorkspace(req);
  return auth.ok ? auth.user.id : null;
}

export async function authenticateWorkspaceOrInternal(req: NextRequest): Promise<AuthResult> {
  return internalWebhookAuth(req) ?? authenticateWorkspace(req);
}
