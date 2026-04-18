// ────────────────────────────────────────────────────────────────────────────
// Lead Temperature — assigns every contact a heat score 0-100 based on
// engagement signals. Pure function — no DB, no network, no React. Pass in a
// conversation's messages + the contact's last_contacted_at and it returns
// { score, tier, label, color, emoji } ready to drop in the UI.
//
// Scoring (0-100):
//   • +5 per inbound message in the last 30 days (cap 35)
//   • +25 if any inbound in the last 24h
//   • +15 if any inbound in the last 7d (capped with the 24h bonus)
//   • +20 if first-reply was faster than 30m  — "ready to buy"
//   • +10 if they have ≥2 inbound messages (back-and-forth)
//   • +10 recent outbound activity (we've touched them recently)
//   • -15 if the last outbound was more than 30 days ago and nothing back
//   • 0 if DNC — forced cold.
//
// Tiers:
//   0-20  → cold       (gray)
//   21-45 → warm       (amber)
//   46-75 → hot        (orange)
//   76+   → blazing    (red)
// ────────────────────────────────────────────────────────────────────────────

export type LeadTemperatureTier = "dnc" | "cold" | "warm" | "hot" | "blazing";

export type LeadTemperature = {
  score: number;
  tier: LeadTemperatureTier;
  label: string;
  emoji: string;
  // Tailwind classes chosen so both the chip and the flame icon animate in
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
};

type Msg = {
  direction: "inbound" | "outbound";
  createdAt?: string;
  created_at?: string;
};

const TIER_STYLES: Record<LeadTemperatureTier, Omit<LeadTemperature, "score" | "tier">> = {
  dnc: {
    label: "DNC",
    emoji: "🚫",
    bgClass: "bg-zinc-800/60",
    textClass: "text-zinc-500",
    borderClass: "border-zinc-700",
    glowClass: "",
  },
  cold: {
    label: "Cold",
    emoji: "❄️",
    bgClass: "bg-zinc-800/60",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-700",
    glowClass: "",
  },
  warm: {
    label: "Warm",
    emoji: "🌤️",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-300",
    borderClass: "border-amber-500/30",
    glowClass: "",
  },
  hot: {
    label: "Hot",
    emoji: "🔥",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-300",
    borderClass: "border-orange-500/40",
    glowClass: "shadow-[0_0_16px_rgba(251,146,60,0.25)]",
  },
  blazing: {
    label: "Blazing",
    emoji: "🔥",
    bgClass: "bg-red-500/15",
    textClass: "text-red-300",
    borderClass: "border-red-500/40",
    glowClass: "shadow-[0_0_24px_rgba(239,68,68,0.4)]",
  },
};

const ts = (m: Msg): number => {
  const s = m.createdAt || m.created_at;
  return s ? new Date(s).getTime() || 0 : 0;
};

export function computeTemperature(
  messages: Msg[] | undefined | null,
  isDnc = false
): LeadTemperature {
  if (isDnc) {
    return { score: 0, tier: "dnc", ...TIER_STYLES.dnc };
  }

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const msgs = (messages || []).filter((m) => ts(m) > 0);

  if (msgs.length === 0) {
    return { score: 0, tier: "cold", ...TIER_STYLES.cold };
  }

  // Split by direction
  const inbound = msgs.filter((m) => m.direction === "inbound");
  const outbound = msgs.filter((m) => m.direction === "outbound");

  // Sort ascending so [0] is oldest, [-1] is newest
  const byTime = (a: Msg, b: Msg) => ts(a) - ts(b);
  inbound.sort(byTime);
  outbound.sort(byTime);

  let score = 0;

  // Inbound volume in last 30d
  const recentInbound = inbound.filter((m) => now - ts(m) < 30 * DAY);
  score += Math.min(35, recentInbound.length * 5);

  // Very recent reply bonuses
  const lastInboundTs = inbound[inbound.length - 1] ? ts(inbound[inbound.length - 1]) : 0;
  if (lastInboundTs && now - lastInboundTs < 1 * DAY) {
    score += 25;
  } else if (lastInboundTs && now - lastInboundTs < 7 * DAY) {
    score += 15;
  }

  // First-reply speed bonus — only if we have at least one outbound before
  // the first inbound.
  if (outbound.length > 0 && inbound.length > 0) {
    const firstOut = ts(outbound[0]);
    const firstIn = inbound.find((m) => ts(m) > firstOut);
    if (firstIn) {
      const gapMin = (ts(firstIn) - firstOut) / 60000;
      if (gapMin < 30) score += 20;
      else if (gapMin < 120) score += 10;
    }
  }

  // Back-and-forth bonus
  if (inbound.length >= 2) score += 10;

  // Recent outbound — we're working the lead
  const lastOutboundTs = outbound[outbound.length - 1] ? ts(outbound[outbound.length - 1]) : 0;
  if (lastOutboundTs && now - lastOutboundTs < 7 * DAY) {
    score += 10;
  }

  // Stale penalty — long-dormant threads fall back to cold
  if (lastOutboundTs && now - lastOutboundTs > 30 * DAY && !lastInboundTs) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let tier: LeadTemperatureTier = "cold";
  if (score >= 76) tier = "blazing";
  else if (score >= 46) tier = "hot";
  else if (score >= 21) tier = "warm";

  return { score, tier, ...TIER_STYLES[tier] };
}
