import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseProspect } from "@/lib/prospect-capture";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let payload;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request.");
    if (body.website) return NextResponse.json({ ok: true }); // honeypot
    payload = parseProspect(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Check your contact details." }, { status: 400 });
  }
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHmac("sha256", key).update(ip).digest("hex");
    const { data, error } = await client.rpc("capture_text2sale_prospect", { payload, ip_hash: ipHash });
    if (error) throw error;
    if (data === false) return NextResponse.json({ error: "Too many requests. Please try again in 15 minutes." }, { status: 429 });
    // Do not expose contact IDs, saved records or whether an email already exists.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "We couldn't save your request. Please try again." }, { status: 503 });
  }
}
