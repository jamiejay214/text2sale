import { NextRequest, NextResponse } from "next/server";
import { authenticateWorkspace } from "@/lib/workspace-auth";
import { db, emailAccount } from "@/lib/email-campaigns";
import { AI_REPLY_FEE } from "@/lib/sms-pricing";
import { normalizeDesign } from "@/lib/email-design";

// "Write it for me": Claude drafts a full designed email campaign (subject,
// preview, short note and the designed card) from the customer's goal and
// business. Charged like an AI text reply, from the wallet before calling
// the model, and refunded if the draft fails.

const SYSTEM = `You are a senior direct-response email marketer for small businesses (insurance agencies, real estate, mortgage, roofing, solar and similar).
Write one email campaign that gets replies and bookings. Rules:
- Specific and benefit-led. Plain words, short sentences, no hype, no ALL CAPS, no exclamation spam, no emoji.
- Never invent facts, prices, statistics, guarantees, testimonials or legal/insurance claims. Use [BRACKETS] for anything the business must fill in.
- Use {firstName} for personalization where natural.
- One clear call to action.
Return ONLY a JSON object with exactly these keys:
{"subjects": [string, string, string], "previewText": string, "note": string,
 "design": {"eyebrow": string, "headline": string, "bullets": [string, string, string], "problemTitle": string, "problem": string,
 "solutionTitle": string, "solution": string, "offerLabel": string, "offerTitle": string, "offerSubtitle": string, "offerValue": string, "ctaText": string},
 "strategy": string}
Limits: subjects under 60 characters; headline under 60; bullets under 60 each; note one or two sentences; strategy two sentences on why this campaign works and when to send it.`;

export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const body = await req.json().catch(() => ({}));
  const goal = String(body.goal || "").trim().slice(0, 600);
  if (goal.length < 5) return NextResponse.json({ error: "Describe what this email should achieve." }, { status: 400 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI writing isn't available right now." }, { status: 503 });

  const database = db();
  const account = await emailAccount(database, userId);
  const { data: profile } = await database.from("profiles").select("industry, business_description").eq("id", userId).maybeSingle();

  const { data: bal } = await database.rpc("decrement_wallet", { p_user_id: userId, p_amount: AI_REPLY_FEE });
  if (bal === null || bal === undefined) return NextResponse.json({ error: "Add funds to your wallet to use AI writing.", outOfFunds: true }, { status: 402 });

  const refund = () =>
    database.rpc("credit_wallet", { p_user_id: userId, p_amount: AI_REPLY_FEE, p_idempotency_key: `email_ai_refund_${userId}_${Date.now()}`, p_description: "Refund — AI email draft failed" });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Business: ${account.businessName || "a small business"}\nIndustry: ${profile?.industry || "other"}\nAbout the business: ${String(profile?.business_description || "").slice(0, 600)}\nCampaign goal: ${goal}`,
          },
        ],
      }),
    });
    const out = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = out.content?.find((c) => c.type === "text")?.text || "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const subjects = Array.isArray(json.subjects) ? json.subjects.map((s: unknown) => String(s).slice(0, 120)).slice(0, 3) : [];
    if (!subjects.length || !json.design) throw new Error("incomplete draft");
    const design = normalizeDesign(json.design);
    return NextResponse.json({
      subjects,
      previewText: String(json.previewText || "").slice(0, 200),
      note: String(json.note || "").slice(0, 600),
      strategy: String(json.strategy || "").slice(0, 400),
      design: { ...design, theme: undefined, brandColor: undefined, logoUrl: undefined, ctaUrl: undefined },
    });
  } catch (e) {
    console.error("[email/ai-write]", e);
    await refund();
    return NextResponse.json({ error: "The AI draft didn't come through. You weren't charged. Try again." }, { status: 502 });
  }
}
