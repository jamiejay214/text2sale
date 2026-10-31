import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db } from "@/lib/email-campaigns";
import { EMAIL_RATE, MAX_EMAIL_BODY } from "@/lib/email-content";
import { normalizeDesign } from "@/lib/email-design";
import { audienceSummary, normalizeAudience } from "@/lib/email-queue";

// List email campaigns, describe an audience, list the lead lists and tags to
// pick from, and save a draft (or update the draft being edited, by id; only
// drafts can change).

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const database = db();
  const params = req.nextUrl.searchParams;
  const audience = params.get("audience");
  if (audience !== null) {
    let parsed: unknown = null;
    try {
      parsed = audience ? JSON.parse(audience) : null;
    } catch {
      return NextResponse.json({ error: "Invalid audience." }, { status: 400 });
    }
    const summary = await audienceSummary(database, userId, normalizeAudience(parsed));
    return NextResponse.json({ willReceive: summary.receive.length, unsubscribed: summary.unsubscribed, bounced: summary.bounced, rate: EMAIL_RATE });
  }
  if (params.get("groups") !== null) {
    // Lead lists and tags among contacts that have an email address.
    const lists = new Map<string, number>();
    const tags = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data } = await database.from("contacts").select("campaign, tags").eq("user_id", userId).like("email", "%@%").range(from, from + 999);
      for (const c of data || []) {
        if (c.campaign) lists.set(c.campaign, (lists.get(c.campaign) || 0) + 1);
        for (const t of Array.isArray(c.tags) ? c.tags : []) if (typeof t === "string" && t) tags.set(t, (tags.get(t) || 0) + 1);
      }
      if (!data || data.length < 1000) break;
    }
    const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(([name, count]) => ({ name, count }));
    return NextResponse.json({ lists: sorted(lists), tags: sorted(tags) });
  }
  const { data } = await database
    .from("email_campaigns")
    .select("id, name, subject, preview_text, body, design, audience, status, recipients, sent, failed, skipped, cost, scheduled_at, local_time, hourly_limit, sent_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ campaigns: data || [], rate: EMAIL_RATE });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const row = {
    user_id: auth.user.id,
    name: text(body.name, 120),
    subject: text(body.subject, 200),
    preview_text: text(body.previewText, 200),
    body: text(body.body, MAX_EMAIL_BODY),
    audience: normalizeAudience(body.audience),
    design: body.design && typeof body.design === "object" ? normalizeDesign(body.design) : null,
  };
  if (!row.name || !row.subject || (!row.body && !row.design?.headline)) {
    return NextResponse.json({ error: "Add a campaign name, subject and message." }, { status: 400 });
  }
  const id = text(body.id, 64);
  const { data, error } = id
    ? await db()
        .from("email_campaigns")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .eq("status", "Draft")
        .select("*")
        .single()
    : await db().from("email_campaigns").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn't save the campaign." }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
