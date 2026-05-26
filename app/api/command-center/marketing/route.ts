import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { buildOverview } from "@/lib/command-center";
import { getChannelBreakdown, getTopReferrers, getEngagementMetrics } from "@/lib/visitor-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ────────────────────────────────────────────────────────────────────────
// AI marketing ideas — Claude generates concrete, channel-specific
// marketing plays per business based on current numbers + niche context.
// ────────────────────────────────────────────────────────────────────────

type Idea = {
  channel: "seo" | "paid" | "social" | "email" | "partnerships" | "content" | "outbound" | "product";
  title: string;
  rationale: string;
  steps: string[];
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
};
type MarketingResult = {
  generated_at: string;
  mode: "ai" | "offline";
  businesses: {
    text2sale: { ideas: Idea[] };
    abg: { ideas: Idea[] };
    tq: { ideas: Idea[] };
  };
};

const SYSTEM = `You are a head-of-growth-marketing consulting on three businesses for the same owner.

Businesses & their unique angles:
- text2sale: SMS-CRM SaaS for insurance & sales teams. Compliance-first (TCPA/10DLC). Sells against GoHighLevel, Twilio, Salesmsg, Textdrip. Owner is a health insurance agent himself — knows the ICP.
- abg: AI Business Growth — helps SMBs adopt AI (chat-bots, automations, content). Brand new, very little traffic yet.
- tq: Trusted Quotes — health insurance lead funnel; gets traffic & captures partial leads. Monetizes by selling/routing leads.

For each business, generate 4–6 concrete marketing IDEAS spanning multiple channels. Each idea must:
- Be specific (not "do more SEO" — "Write a comparison article: Text2Sale vs Salesmsg for ACA agents").
- Cite the data when possible.
- Include 3-5 concrete steps the owner can do this week.
- Estimate effort + expected impact honestly.

Bias toward CHEAP and FAST plays the owner can run himself. Prefer earned media, content, and outbound over big paid spends.

Return STRICT JSON ONLY in this shape:
{
  "text2sale": { "ideas": [ {"channel":"seo|paid|social|email|partnerships|content|outbound|product","title":"...","rationale":"...","steps":["...","..."],"effort":"low|medium|high","impact":"low|medium|high"} ] },
  "abg": { "ideas": [...] },
  "tq": { "ideas": [...] }
}`;

const OFFLINE_IDEAS: MarketingResult["businesses"] = {
  text2sale: {
    ideas: [
      {
        channel: "content",
        title: "Publish vs-competitor comparison pages (you already have the skeletons)",
        rationale: "Your /text2sale-vs-* routes exist but bottom-funnel comparison pages convert at 5-10x homepages.",
        steps: [
          "Rank each /text2sale-vs-X page for 'X alternative' and 'X pricing' intent.",
          "Add a side-by-side feature table, real screenshots, and a single CTA: 'Switch in 10 min — we'll import your contacts free'.",
          "Build 3 backlinks per page from G2 / Capterra / niche directories.",
        ],
        effort: "medium",
        impact: "high",
      },
      {
        channel: "outbound",
        title: "Cold-text 100 health agents/week from your own platform",
        rationale: "You sell SMS — eat your own dog food. TCPA-clean lead lists from health-agent associations.",
        steps: [
          "Buy a 5k list of licensed health agents (NPN.gov directory is free for licensed-agent lookups).",
          "Hand-pick 100/week who follow you on LinkedIn or whose websites look DIY.",
          "Use your own platform: '{first_name}, saw your site — built a tool that does mass texting for health agents with 10DLC compliance baked in. 14-day free trial: text2sale.com/{ref}'",
        ],
        effort: "low",
        impact: "high",
      },
      {
        channel: "partnerships",
        title: "Affiliate deal with health-insurance FMO/IMO uplines",
        rationale: "Your ICP joins a parent agency. Get the agency to recommend Text2Sale to all reps in exchange for revshare.",
        steps: [
          "List 20 IMOs (Integrity, AmeriLife, AssureCare, HealthMarkets etc.).",
          "Pitch a 20% lifetime revshare for any rep they refer, plus a custom landing page (/biz/{slug}).",
          "Offer one IMO an exclusive 90-day pilot with a discounted plan in exchange for a testimonial.",
        ],
        effort: "medium",
        impact: "high",
      },
      {
        channel: "seo",
        title: "Long-tail compliance content: 10DLC + TCPA cluster",
        rationale: "You have one /10dlc-compliant-texting page. Compliance keywords have buyer intent and low competition.",
        steps: [
          "Write 5 supporting articles: 'how to register 10DLC for insurance agents', 'TCPA fines 2026', 'STIR/SHAKEN for SMS', 'opt-out language template', 'EIN-only vs sole-prop campaign'.",
          "Internal-link all 5 back to the pillar page.",
          "Add a free '10DLC checklist' PDF as a lead magnet (gated email capture).",
        ],
        effort: "medium",
        impact: "medium",
      },
      {
        channel: "social",
        title: "1 LinkedIn post/day documenting customer wins",
        rationale: "Your ICP (insurance agents) lives on LinkedIn. Specific dollar-amount case studies travel.",
        steps: [
          "Pick your top 3 paying customers; ask each for one screenshot win.",
          "Post: '{Agent} sent 2,400 texts to her renewal list in 12 minutes and booked 31 calls. Here's exactly how:'",
          "End every post with: 'Free 14-day trial → text2sale.com'. Comment the link in first reply (LinkedIn algorithm).",
        ],
        effort: "low",
        impact: "medium",
      },
    ],
  },
  abg: {
    ideas: [
      {
        channel: "outbound",
        title: "Bootstrap with 10 done-with-you AI installs at $1,500 each",
        rationale: "Brand new site, near-zero traffic. Cash + case studies beat SEO at this stage.",
        steps: [
          "Pick a vertical you understand (e.g., insurance offices or local service businesses).",
          "Offer: 'I'll install a 24/7 lead-qualifying chatbot on your site + a missed-call text-back AI. Done in 2 weeks, $1,500.'",
          "DM 30 owners per week via Instagram/LinkedIn until you have 5 paying installs to case-study.",
        ],
        effort: "medium",
        impact: "high",
      },
      {
        channel: "content",
        title: "Niche down the homepage — pick ONE industry",
        rationale: "Generic 'AI for business' converts poorly. 'AI for insurance offices' or 'AI for plumbers' converts.",
        steps: [
          "Rewrite headline to one industry + one pain point + one outcome.",
          "Show 1-2 specific demos (e.g., 'See it answer a quote request live').",
          "Move the discovery form above the fold.",
        ],
        effort: "low",
        impact: "high",
      },
      {
        channel: "partnerships",
        title: "Bundle with Text2Sale — cross-sell to existing customers",
        rationale: "You already have Text2Sale customers. Offer an AI-bot setup add-on.",
        steps: [
          "Email all Text2Sale paying users: 'I'll install an AI lead-qualifier on your site for $497 + free if you upgrade to Annual.'",
          "Track which Text2Sale users click — that's your ICP for ABG.",
        ],
        effort: "low",
        impact: "high",
      },
      {
        channel: "social",
        title: "Build in public: 1 short video/day of an AI build",
        rationale: "Brand-new businesses need a content engine. Process content (looms / TikTok) builds trust fast.",
        steps: [
          "Record yourself building one AI thing per day (script-bot, lead-router, etc.). 60 sec.",
          "Post to TikTok/Instagram/YouTube Shorts with a single CTA: 'DM me if you want this for your business'.",
          "Repurpose the audio to a Twitter/X thread.",
        ],
        effort: "low",
        impact: "medium",
      },
    ],
  },
  tq: {
    ideas: [
      {
        channel: "product",
        title: "Reactivate the 43 partial-leads with an automated SMS sequence",
        rationale: "Partial leads abandoned mid-funnel — they're warm. A 3-text recovery sequence is the cheapest revenue you'll ever earn.",
        steps: [
          "Sequence text-1 (15 min after abandon): 'Hey {first}, looks like you got pulled away — want me to finish your quote? Reply Y.'",
          "Text-2 (1 day): 'Plans on the marketplace went up 7% this year. Yours is still locked at the rate from when you started — want me to send it over?'",
          "Text-3 (3 days): 'Last check — most folks save $80-200/mo. If you'd like the comparison, reply CHECK and I'll text it.'",
        ],
        effort: "low",
        impact: "high",
      },
      {
        channel: "paid",
        title: "Tight Meta/Google Ads to your highest-converting state (FL)",
        rationale: "All your visitors so far are FL. Concentrate spend where intent already exists.",
        steps: [
          "Run a $500 test on Meta with FL-only geo, 30-65 age, interest in 'health insurance', 'medicare'.",
          "Send to a single-purpose landing page with a 3-question form (zip / household size / DOB).",
          "Optimize for 'partial lead' (form_start), not just submits — gets more data faster.",
        ],
        effort: "medium",
        impact: "high",
      },
      {
        channel: "content",
        title: "Year-round content for ACA Open Enrollment (Nov-Jan)",
        rationale: "Most agents start in November. If you publish from June, you'll out-rank them.",
        steps: [
          "Write 12 articles: 'best plans in FL 2026', '$0 silver plans Florida', 'Medicaid vs marketplace FL', etc.",
          "Schedule them to drip from June to October.",
          "Each ends with the same lead form.",
        ],
        effort: "medium",
        impact: "medium",
      },
      {
        channel: "partnerships",
        title: "Pay tax preparers a referral fee Jan-Apr",
        rationale: "People doing taxes discover their MAGI — perfect moment for an ACA/subsidy conversation.",
        steps: [
          "Print one-page flyers: 'Got a subsidy question after your taxes? Text {your_number} for a free check.'",
          "Hand-deliver to 30 local tax shops; offer them $25/lead that closes.",
        ],
        effort: "low",
        impact: "medium",
      },
    ],
  },
};

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const forbidden = await requireAdmin(auth.user);
  if (forbidden) return forbidden;

  try {
    const [overview, channels, referrers, engagement] = await Promise.all([
      buildOverview(),
      getChannelBreakdown(30),
      getTopReferrers(30, 6),
      getEngagementMetrics(30),
    ]);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({
        generated_at: new Date().toISOString(),
        mode: "offline",
        businesses: OFFLINE_IDEAS,
      } satisfies MarketingResult);
    }

    const snapshot = {
      overview: overview.businesses.map((b) => ({ name: b.name, online: b.online, kpis: b.kpis, topPages: b.topPages?.slice(0, 5) })),
      channels,
      referrers,
      engagement,
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
        max_tokens: 3000,
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

    let parsed: MarketingResult["businesses"] | null = null;
    try {
      const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(clean) as MarketingResult["businesses"];
    } catch {
      parsed = null;
    }
    if (!parsed || !parsed.text2sale) {
      return NextResponse.json({
        generated_at: new Date().toISOString(),
        mode: "offline",
        businesses: OFFLINE_IDEAS,
      } satisfies MarketingResult);
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      mode: "ai",
      businesses: parsed,
    } satisfies MarketingResult);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Marketing ideas failed" },
      { status: 500 }
    );
  }
}
