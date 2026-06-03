import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { sendAdminAlertSMS } from "@/lib/admin-alert";
import { buildOverview } from "@/lib/command-center";
import { getAllLeads } from "@/lib/leads-intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Daily Command Center digest → SMS to the owner's cell.
// Runs via Vercel cron (Authorization: Bearer CRON_SECRET) OR can be triggered
// manually by an admin from the dashboard ("Text me a digest now").
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // If not the cron caller, require an admin session (dashboard button).
  if (!isCron) {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const forbidden = await requireAdmin(auth.user);
    if (forbidden) return forbidden;
  }

  try {
    const [overview, leadsData] = await Promise.all([buildOverview(), getAllLeads(200)]);
    const c = overview.combined;
    const top = [...overview.businesses].sort((a, b) => b.kpis.visitors - a.kpis.visitors)[0];
    const t2s = overview.businesses.find((b) => b.id === "text2sale");
    const mrr = Number(t2s?.extra.mrr || 0);
    const recoverable = leadsData.counts.recoverable;

    const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });

    const lines = [
      `📊 Command Center — ${date}`,
      `💵 Revenue ${money(c.revenue)} (${money(c.revenueToday)} today)${mrr ? ` · MRR ${money(mrr)}` : ""}`,
      `👀 ${c.visitorsToday.toLocaleString()} visitors today / ${c.visitorsWeek.toLocaleString()} this week`,
      `🎯 ${c.leads.toLocaleString()} total leads · ${c.customers} paying`,
    ];
    if (recoverable > 0) lines.push(`🔥 ${recoverable} abandoned quotes worth recovering (Trusted Quotes)`);
    if (top) lines.push(`🏆 ${top.name} leads traffic (${top.kpis.visitors.toLocaleString()})`);
    lines.push(`→ text2sale.com/command`);

    let body = lines.join("\n");

    // Optional: one-line AI insight appended (best-effort, never blocks send).
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 120,
            system: "You are a sharp business advisor. Given a JSON snapshot of 3 businesses, reply with ONE punchy sentence (max 18 words) naming the single most important action to take today. No preamble, no markdown.",
            messages: [{ role: "user", content: JSON.stringify({ combined: c, businesses: overview.businesses.map((b) => ({ name: b.name, kpis: b.kpis })), recoverable }) }],
          }),
        });
        const data = await res.json();
        const tip = (data?.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join(" ").trim();
        if (tip) body += `\n\n💡 ${tip}`;
      } catch { /* skip insight */ }
    }

    await sendAdminAlertSMS(body);

    return NextResponse.json({ sent: true, preview: body, recoverable });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Digest failed" }, { status: 500 });
  }
}
