import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { buildOverview, type Overview } from "@/lib/command-center";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM = `You are NEXUS, the voice co-pilot for the owner's business command center.
You answer questions about THREE businesses: Text2Sale (SMS CRM SaaS), AI Business
Growth (lead-gen site), and Trusted Quotes (insurance lead-gen site).

Rules:
- Answer ONLY from the JSON snapshot provided. Never invent numbers.
- Your reply is spoken aloud, so be conversational and BRIEF: 1-3 sentences.
- Lead with the number that answers the question, then one sentence of insight.
- Format money like $1,234 and round visitor/lead counts naturally.
- If the data isn't in the snapshot, say so in one sentence and suggest what is available.
- Never output markdown, bullet points, code, or tables — plain spoken sentences only.`;

function fmtMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// Deterministic answers when no ANTHROPIC_API_KEY is configured (offline mode).
function offlineAnswer(question: string, o: Overview): string {
  const q = question.toLowerCase();
  const c = o.combined;
  const top = (b: keyof Overview["combined"]) =>
    [...o.businesses].sort((x, y) => (y.kpis as Record<string, number>)[b as string] - (x.kpis as Record<string, number>)[b as string])[0];

  if (/revenue|money|sales|earn|made/.test(q)) {
    if (/today/.test(q)) return `You've collected ${fmtMoney(c.revenueToday)} so far today across all three businesses.`;
    return `Total revenue across all businesses is ${fmtMoney(c.revenue)}, with ${fmtMoney(c.revenueToday)} collected today.`;
  }
  if (/visitor|traffic|visit/.test(q)) {
    const b = top("visitors");
    if (/today/.test(q)) return `You've had ${c.visitorsToday.toLocaleString()} visitors today across all sites.`;
    return `Total of ${c.visitors.toLocaleString()} visitors, ${c.visitorsWeek.toLocaleString()} in the last week. ${b.name} is your busiest at ${b.kpis.visitors.toLocaleString()} visits.`;
  }
  if (/lead/.test(q)) {
    const b = top("leads");
    return `You have ${c.leads.toLocaleString()} leads in total. ${b.name} is generating the most with ${b.kpis.leads.toLocaleString()}.`;
  }
  if (/customer|subscriber|active/.test(q)) {
    return `You have ${c.customers.toLocaleString()} active customers across all businesses.`;
  }
  if (/page|popular|most visited|website/.test(q)) {
    const p = c.topPages[0];
    return p ? `Your most visited page is ${p.label} with ${p.value.toLocaleString()} views.` : `No page data yet.`;
  }
  if (/message|text|sms/.test(q)) return `Text2Sale has sent ${c.messages.toLocaleString()} messages and logged ${c.calls.toLocaleString()} calls.`;
  if (/best|winning|top|which business/.test(q)) {
    const b = top("revenue");
    return `${b.name} is leading on revenue with ${fmtMoney(b.kpis.revenue)} and ${b.kpis.visitors.toLocaleString()} visitors.`;
  }
  return `Across your three businesses: ${fmtMoney(c.revenue)} revenue, ${c.visitors.toLocaleString()} visitors, ${c.leads.toLocaleString()} leads, and ${c.customers.toLocaleString()} active customers. Ask me about revenue, visitors, leads, or top pages.`;
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  let body: { question?: string; snapshot?: Overview } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const question = (body.question || "").trim();
  if (!question) return NextResponse.json({ error: "No question" }, { status: 400 });

  // Use the snapshot the dashboard already has; rebuild if it wasn't sent.
  const overview = body.snapshot && body.snapshot.businesses ? body.snapshot : await buildOverview();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ answer: offlineAnswer(question, overview), mode: "offline" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Here is the current live snapshot of all three businesses as JSON:\n\n${JSON.stringify(overview)}\n\nMy question: ${question}`,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ answer: offlineAnswer(question, overview), mode: "offline" });
    }
    const answer =
      (data?.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join(" ").trim() ||
      offlineAnswer(question, overview);
    return NextResponse.json({ answer, mode: "ai" });
  } catch {
    return NextResponse.json({ answer: offlineAnswer(question, overview), mode: "offline" });
  }
}
