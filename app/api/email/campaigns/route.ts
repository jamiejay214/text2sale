import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db } from "@/lib/email-campaigns";
import { EMAIL_RATE, MAX_EMAIL_BODY } from "@/lib/email-content";
import { normalizeDesign } from "@/lib/email-design";

// List email campaigns, count an audience, and save a draft (or update the
// draft being edited, by id; only drafts can change).

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const database = db();
  const audience = req.nextUrl.searchParams.get("audience");
  if (audience !== null) {
    let q = database.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("dnc", false).like("email", "%@%");
    if (audience) q = q.eq("campaign", audience);
    const [{ count }, { count: suppressed }] = await Promise.all([
      q,
      database.from("email_suppressions").select("email", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return NextResponse.json({ contacts: count || 0, suppressed: suppressed || 0, rate: EMAIL_RATE });
  }
  const { data } = await database
    .from("email_campaigns")
    .select("id, name, subject, status, recipients, sent, failed, skipped, cost, audience_campaign, sent_at, created_at")
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
    audience_campaign: text(body.audienceCampaign, 200) || null,
    design: body.design && typeof body.design === "object" ? normalizeDesign(body.design) : null,
  };
  if (!row.name || !row.subject || (!row.body && !row.design?.headline)) {
    return NextResponse.json({ error: "Add a campaign name, subject and message (or a designed email headline)." }, { status: 400 });
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
