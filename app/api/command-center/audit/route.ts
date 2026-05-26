import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { buildOverview } from "@/lib/command-center";
import {
  getChannelBreakdown,
  getTopReferrers,
  getTopExitDestinations,
  getEngagementMetrics,
} from "@/lib/visitor-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ────────────────────────────────────────────────────────────────────────
// AI optimization audit — Claude reads live metrics + intelligence and
// returns specific, evidence-backed tighten-up suggestions per business.
// Falls back to rule-based findings if ANTHROPIC_API_KEY is missing.
// ────────────────────────────────────────────────────────────────────────

type Finding = {
  severity: "high" | "medium" | "low";
  title: string;
  evidence: string;
  fix: string;
};
type AuditResult = {
  generated_at: string;
  mode: "ai" | "offline";
  businesses: {
    text2sale: { findings: Finding[] };
    abg: { findings: Finding[] };
    tq: { findings: Finding[] };
  };
};

const SYSTEM = `You are a senior growth-marketing & CRO consultant auditing three businesses for the same owner.

Businesses:
- text2sale: SMS-CRM SaaS for insurance & sales teams. Revenue model: paid plans + per-message billing.
- abg: AI Business Growth lead-gen site (services for SMBs wanting to add AI to their business).
- tq: Trusted Quotes — health insurance lead-gen funnel.

Read the JSON snapshot of live metrics + visitor intelligence. For EACH business, produce 3–5 specific, actionable findings ordered by severity. Each finding must:
- Cite evidence from the actual numbers (e.g., "bounce rate 78% on /pricing").
- Give a concrete fix the owner can implement this week.
- Use the severity field honestly (high = clear money on table, medium = optimization, low = nice-to-have).

Return STRICT JSON ONLY (no prose, no markdown), in this shape:
{
  "text2sale": { "findings": [ {"severity":"high|medium|low","title":"...","evidence":"...","fix":"..."}, ... ] },
  "abg":       { "findings": [ ... ] },
  "tq":        { "findings": [ ... ] }
}

If a business has too little data to audit (e.g., abg with very few visits), say so explicitly as ONE low-severity finding suggesting tracking setup or traffic acquisition.`;

function offlineAudit(overview: Awaited<ReturnType<typeof buildOverview>>, engagement: { bounceRatePct: number; avgSessionDepth: number; deepScrollPct: number }, channels: { channel: string; sessions: number; pct: number }[]): AuditResult["businesses"] {
  const findings: Record<"text2sale" | "abg" | "tq", Finding[]> = { text2sale: [], abg: [], tq: [] };
  const bizMap: Record<string, keyof typeof findings> = {
    "Text2Sale": "text2sale",
    "AI Business Growth": "abg",
    "Trusted Quotes": "tq",
  };

  for (const biz of overview.businesses) {
    const key = bizMap[biz.name];
    if (!key) continue;
    const k = biz.kpis;

    if (k.visitors > 0 && k.leads === 0 && k.customers === 0) {
      findings[key].push({
        severity: "high",
        title: "Traffic with zero conversion",
        evidence: `${k.visitors.toLocaleString()} visitors but 0 leads & 0 customers captured.`,
        fix: "Add a sticky CTA on every page (book a call / get a quote). Audit your lead form — is it visible above the fold? Test removing optional fields.",
      });
    }
    if (engagement.bounceRatePct > 65 && key === "text2sale") {
      findings[key].push({
        severity: "high",
        title: `Bounce rate is ${engagement.bounceRatePct}%`,
        evidence: `Avg session depth ${engagement.avgSessionDepth} pages; majority of sessions are one-and-done.`,
        fix: "Compare the top 3 landing pages: are they answering the search intent in the first screen? Add an interactive demo or video above the fold to keep visitors past the first paint.",
      });
    }
    if (engagement.deepScrollPct < 25 && k.visitors > 50) {
      findings[key].push({
        severity: "medium",
        title: "Few visitors reach the bottom of pages",
        evidence: `${engagement.deepScrollPct}% scroll past 90%.`,
        fix: "Move your primary CTA higher up. If long pages are by-design, add an anchor nav / table-of-contents so visitors can jump.",
      });
    }
    const direct = channels.find((c) => c.channel === "direct");
    if (direct && direct.pct > 60 && key === "text2sale") {
      findings[key].push({
        severity: "medium",
        title: "Channel mix dominated by Direct",
        evidence: `${direct.pct}% of sessions are Direct (no referrer or UTM).`,
        fix: "You're likely missing UTM tags on your outbound links (emails, SMS, social bios). Add utm_source/medium/campaign to every link you control so you can measure what's actually working.",
      });
    }
    if (k.visitors < 50 && key === "abg") {
      findings[key].push({
        severity: "low",
        title: "Not enough data to audit yet",
        evidence: `Only ${k.visitors} visits recorded.`,
        fix: "Install the tracker snippet (see /command → Install Tracker) and run a small awareness test on 1-2 channels (cold LinkedIn outreach + 1 niche newsletter sponsorship).",
      });
    }
  }
  // Make sure each business has at least one finding
  for (const k of Object.keys(findings) as Array<keyof typeof findings>) {
    if (findings[k].length === 0) {
      findings[k].push({
        severity: "low",
        title: "Healthy — no major issues detected",
        evidence: "Numbers are within expected ranges for this stage.",
        fix: "Keep shipping. Re-run this audit weekly to catch regressions.",
      });
    }
  }
  return {
    text2sale: { findings: findings.text2sale },
    abg: { findings: findings.abg },
    tq: { findings: findings.tq },
  };
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const [overview, engagement, channels, referrers, exits] = await Promise.all([
      buildOverview(),
      getEngagementMetrics(14),
      getChannelBreakdown(14),
      getTopReferrers(14, 8),
      getTopExitDestinations(14, 6),
    ]);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      const findings = offlineAudit(overview, engagement, channels);
      return NextResponse.json({
        generated_at: new Date().toISOString(),
        mode: "offline",
        businesses: findings,
      } satisfies AuditResult);
    }

    const snapshot = {
      overview: {
        combined: overview.combined,
        businesses: overview.businesses.map((b) => ({
          name: b.name,
          online: b.online,
          kpis: b.kpis,
          topPages: b.topPages?.slice(0, 6),
          sources: b.sources?.slice(0, 6),
        })),
      },
      intelligence: { channels, referrers, exits, engagement },
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2200,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Live snapshot:\n\n${JSON.stringify(snapshot)}\n\nReturn the strict JSON now.`,
          },
        ],
      }),
    });
    const data = await res.json();
    const text = (data?.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n").trim();

    // Try to parse JSON from Claude's response (strip code fences if present)
    let parsed: AuditResult["businesses"] | null = null;
    try {
      const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(clean) as AuditResult["businesses"];
    } catch {
      parsed = null;
    }
    if (!parsed || !parsed.text2sale) {
      const findings = offlineAudit(overview, engagement, channels);
      return NextResponse.json({
        generated_at: new Date().toISOString(),
        mode: "offline",
        businesses: findings,
      } satisfies AuditResult);
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      mode: "ai",
      businesses: parsed,
    } satisfies AuditResult);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Audit failed" },
      { status: 500 }
    );
  }
}
