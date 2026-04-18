// ────────────────────────────────────────────────────────────────────────────
// Sentiment — rule-based analyzer for inbound SMS replies. Zero-cost, zero-
// latency; runs entirely client-side on data already loaded. No API calls.
//
// Classifies an inbound message into one of:
//   • ready    — clear buying signal ("how much", "send quote", "yes sign me up")
//   • positive — interested / warm ("sounds good", "tell me more", 👍)
//   • objection — price / timing / trust concerns ("too expensive", "not now")
//   • negative — angry / dismissive ("stop", "f off", "leave me alone")
//   • neutral  — everything else
//
// Also returns a confidence 0-1 and the matched keywords so we can show the
// user WHY a reply was scored the way it was.
// ────────────────────────────────────────────────────────────────────────────

export type SentimentTier =
  | "ready"
  | "positive"
  | "objection"
  | "negative"
  | "neutral";

export type Sentiment = {
  tier: SentimentTier;
  score: number;           // -1 (very negative) to +1 (very positive / ready)
  confidence: number;      // 0 - 1
  label: string;           // "Ready to buy", "Interested", "Objection", ...
  emoji: string;
  bgClass: string;         // bubble background
  borderClass: string;
  ringClass: string;
  dotClass: string;        // small indicator dot in the list
  matched: string[];       // keywords that matched, for tooltip
};

const TIER_META: Record<SentimentTier, Omit<Sentiment, "score" | "confidence" | "matched" | "tier">> = {
  ready: {
    label: "Ready to buy",
    emoji: "💰",
    bgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/40",
    ringClass: "ring-emerald-400/30",
    dotClass: "bg-emerald-400",
  },
  positive: {
    label: "Interested",
    emoji: "😊",
    bgClass: "bg-sky-500/12",
    borderClass: "border-sky-500/35",
    ringClass: "ring-sky-400/25",
    dotClass: "bg-sky-400",
  },
  objection: {
    label: "Objection",
    emoji: "🤔",
    bgClass: "bg-amber-500/12",
    borderClass: "border-amber-500/35",
    ringClass: "ring-amber-400/25",
    dotClass: "bg-amber-400",
  },
  negative: {
    label: "Negative",
    emoji: "😡",
    bgClass: "bg-rose-500/15",
    borderClass: "border-rose-500/40",
    ringClass: "ring-rose-400/30",
    dotClass: "bg-rose-400",
  },
  neutral: {
    label: "Neutral",
    emoji: "💬",
    bgClass: "bg-zinc-800/70",
    borderClass: "border-zinc-700",
    ringClass: "ring-zinc-600/20",
    dotClass: "bg-zinc-500",
  },
};

// Buying intent — high weight
const READY_PATTERNS: [RegExp, number][] = [
  [/\b(how\s+much|what.{0,10}(cost|price|rate|premium))\b/i, 3],
  [/\b(send|email|text|give\s+me)\s+(the\s+)?(quote|info|details|application)\b/i, 3],
  [/\b(sign\s+me\s+up|let.s\s+(do\s+it|go)|ready\s+to\s+(buy|start|go)|i.ll\s+take\s+it)\b/i, 4],
  [/\b(yes\s+(please|sir|absolutely)|sounds\s+great|i.m\s+in|count\s+me\s+in)\b/i, 2.5],
  [/\b(apply|application|enroll|enrollment|bind\s+it|start\s+coverage)\b/i, 2.5],
  [/\b(call\s+me|give\s+me\s+a\s+call|can\s+you\s+call|let.s\s+talk)\b/i, 2],
  [/\b(when\s+can\s+(we|you)|what.s\s+next\s+step|what\s+do\s+(i|we)\s+need)\b/i, 2],
];

// Positive / interested — moderate weight
const POSITIVE_PATTERNS: [RegExp, number][] = [
  [/\b(interested|tell\s+me\s+more|more\s+info|learn\s+more)\b/i, 2],
  [/\b(sounds\s+(good|great|nice)|awesome|great|perfect|excellent|amazing)\b/i, 1.5],
  [/\b(thanks|thank\s+you|appreciate|thx|ty)\b/i, 1],
  [/\b(yes|yeah|yep|yup|sure|ok(ay)?|alright)\b/i, 1],
  [/\b(maybe|possibly|probably|i\s+might|could\s+be)\b/i, 0.5],
  [/(😊|😀|😁|😃|👍|🙂|❤️|♥|🙏|✅)/u, 1.5],
];

// Objections — price, timing, trust
const OBJECTION_PATTERNS: [RegExp, number][] = [
  [/\b(too\s+(expensive|high|much|pricey)|can.t\s+afford|out\s+of\s+(my\s+)?budget)\b/i, 3],
  [/\b(not\s+(right\s+now|now|interested\s+right\s+now)|bad\s+time|busy|later)\b/i, 2],
  [/\b(already\s+have|got\s+(one|coverage|a\s+plan)|covered\s+already)\b/i, 2.5],
  [/\b(think\s+about|need\s+to\s+think|let\s+me\s+think|consider)\b/i, 1.5],
  [/\b(who\s+(is\s+)?this|how\s+did\s+you\s+get|where\s+did\s+you\s+get|is\s+this\s+(a\s+)?scam|legit\??)\b/i, 2],
  [/\b(spam|scam|fake|suspicious)\b/i, 3],
  [/\b(expensive|costly|pricey)\b/i, 1.5],
];

// Negative / angry — high penalty
const NEGATIVE_PATTERNS: [RegExp, number][] = [
  [/\b(stop|unsubscribe|remove\s+me|take\s+me\s+off|do\s+not\s+(text|call|contact))\b/i, 4],
  [/\b(leave\s+me\s+alone|never\s+(text|contact)\s+me|f\*?ck\s+off|go\s+away)\b/i, 5],
  [/\b(no|nope|nah)\b/i, 0.8],
  [/\b(not\s+interested|don.t\s+care|don.t\s+want)\b/i, 3],
  [/\b(hate|annoying|annoyed|harass|harassment)\b/i, 3],
  [/(😡|🤬|👎|🖕)/u, 3],
  [/\b(shit|damn|f\*?ck|fuck|wtf|stfu)\b/i, 2],
];

function scoreAgainst(text: string, patterns: [RegExp, number][]): { score: number; matched: string[] } {
  let total = 0;
  const matched: string[] = [];
  for (const [re, w] of patterns) {
    const m = text.match(re);
    if (m) {
      total += w;
      matched.push(m[0].toLowerCase());
    }
  }
  return { score: total, matched };
}

export function analyzeSentiment(body: string | undefined | null): Sentiment {
  const text = (body || "").trim();
  if (!text) {
    return {
      tier: "neutral",
      score: 0,
      confidence: 0,
      matched: [],
      ...TIER_META.neutral,
    };
  }

  const ready = scoreAgainst(text, READY_PATTERNS);
  const positive = scoreAgainst(text, POSITIVE_PATTERNS);
  const objection = scoreAgainst(text, OBJECTION_PATTERNS);
  const negative = scoreAgainst(text, NEGATIVE_PATTERNS);

  // Decide the winner. Order matters — "ready" beats "positive", "negative"
  // beats "objection" if both heavy.
  let tier: SentimentTier = "neutral";
  let winnerScore = 0;
  let matched: string[] = [];

  const contenders: [SentimentTier, number, string[]][] = [
    ["ready", ready.score, ready.matched],
    ["positive", positive.score, positive.matched],
    ["objection", objection.score, objection.matched],
    ["negative", negative.score, negative.matched],
  ];

  for (const [t, s, m] of contenders) {
    if (s > winnerScore) {
      tier = t;
      winnerScore = s;
      matched = m;
    }
  }

  // Threshold: require at least 1 pt to leave neutral
  if (winnerScore < 1) {
    return {
      tier: "neutral",
      score: 0,
      confidence: 0.15,
      matched: [],
      ...TIER_META.neutral,
    };
  }

  // Combine into a -1..+1 score
  const netScore =
    (ready.score * 1.0 + positive.score * 0.6 - objection.score * 0.7 - negative.score * 1.0) /
    Math.max(5, ready.score + positive.score + objection.score + negative.score);
  const clamped = Math.max(-1, Math.min(1, netScore));

  const confidence = Math.min(1, winnerScore / 6);

  return {
    tier,
    score: clamped,
    confidence,
    matched,
    ...TIER_META[tier],
  };
}

// Suggest 3 quick-reply candidates based on the sentiment of the last inbound
// message. Pure string array — the UI picks from these.
export function suggestReplies(s: Sentiment | null, firstName?: string): string[] {
  const name = firstName ? firstName : "there";
  if (!s || s.tier === "neutral") {
    return [
      `Hey ${name}! Just checking in — any questions I can answer?`,
      `Thanks for getting back to me. Want me to send over a quick quote?`,
      `Happy to help — what's the best way to reach you?`,
    ];
  }
  if (s.tier === "ready") {
    return [
      `Awesome ${name}! I'll send over a quote right now — what's your date of birth?`,
      `Great, let's get you set up. Can I grab your ZIP to pull accurate pricing?`,
      `Perfect — I can lock in coverage today. Want me to call in 5 minutes?`,
    ];
  }
  if (s.tier === "positive") {
    return [
      `Thanks ${name}! Want me to run a quick no-commitment quote for you?`,
      `Glad to hear it — a few quick questions and I can send over options.`,
      `Love it. What matters most to you — price, coverage, or both?`,
    ];
  }
  if (s.tier === "objection") {
    return [
      `Totally fair ${name} — would it help if I sent a few lower-priced options?`,
      `I hear you — no pressure. Want me to check back next month?`,
      `Good question — I'm a licensed agent at text2sale. Happy to email you the license # if helpful.`,
    ];
  }
  // negative
  return [
    `Got it ${name}, I'll remove you from my list right away. Take care.`,
    `No problem — sorry for the bother. You won't hear from me again.`,
    `Understood. Marking you as Do-Not-Contact. Have a good one.`,
  ];
}
