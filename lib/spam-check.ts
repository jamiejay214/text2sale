// Spam grade for campaign text. Scores a message on the words and patterns
// carrier spam filters are known to flag (Telnyx error 40002, "blocked as
// spam"): pressure and money wording, prize and scam phrases, restricted
// (SHAFT) topics, link shorteners, shouting and stacked punctuation. It is
// tuned for health insurance texting: Medicare benefit-card wording, "$0
// premium" and eligibility claims, and enrollment-deadline pressure are the
// phrases carriers filter hardest in this industry. It only looks at the
// words in the message; it doesn't require any particular sentence, name or
// footer.

export type SpamIssue = { id: string; severity: "high" | "medium" | "low"; text: string; tip?: string };
export type SpamCheck = { score: number; level: "low" | "medium" | "high"; issues: SpamIssue[] };

type WordGroup = { id: string; severity: SpamIssue["severity"]; label: string; tip: string; words: string[] };

const WORD_GROUPS: WordGroup[] = [
  {
    id: "scam",
    severity: "high",
    label: "Prize or scam wording",
    tip: "Remove prize and account-warning language entirely.",
    words: [
      "you've won", "you have won", "you won", "winner", "claim your", "claim now", "prize", "congratulations",
      "you've been selected", "you have been selected", "gift card", "free gift", "verify your account",
      "account suspended", "account locked", "unusual activity", "final notice", "last warning",
    ],
  },
  {
    id: "restricted",
    severity: "high",
    label: "Restricted topics carriers block",
    tip: "Carriers block these topics on standard 10DLC campaigns.",
    words: [
      "cannabis", "marijuana", "cbd", "thc", "weed", "vape", "tobacco", "cigarette", "firearm", "firearms", "guns",
      "casino", "gambling", "betting", "sweepstakes", "payday loan", "debt relief", "credit repair", "debt forgiveness",
      "crypto", "bitcoin", "forex", "work from home", "make money fast", "get rich", "earn cash", "viagra", "weight loss",
    ],
  },
  {
    id: "medicare",
    severity: "high",
    label: "Medicare benefit-card wording",
    tip: "Carriers block most Medicare card and giveback texts because of scams. Ask a plain question instead, like \"Are you looking at Medicare plans this year?\"",
    words: [
      "flex card", "giveback", "give back benefit", "grocery card", "grocery allowance", "food card", "otc card",
      "spending card", "benefits card", "benefit card", "medicare card", "new medicare card", "stimulus",
      "government benefit", "government benefits", "government program", "social security benefit", "free medicare",
      "unclaimed benefits", "benefits you're missing", "benefits you are missing",
    ],
  },
  {
    id: "health",
    severity: "medium",
    label: "Health plan claims carriers flag",
    tip: "Don't promise $0 or eligibility in a first text. Ask if they'd like a quote, then share details once they reply.",
    words: [
      "$0 premium", "$0 premiums", "zero premium", "$0 plan", "$0 plans", "$0 health", "$0 coverage",
      "free health insurance", "free insurance", "free coverage", "cheap health insurance", "cheap insurance",
      "obamacare", "you qualify", "you may qualify", "you're eligible", "you are eligible", "pre-qualified",
      "prequalified", "subsidy", "subsidies", "tax credit", "lower your premium", "cut your premium",
      "slash your premium", "save hundreds", "save thousands",
    ],
  },
  {
    id: "urgency",
    severity: "medium",
    label: "Pressure wording",
    tip: "Drop the deadline. \"Would you like a quote?\" works better and filters ignore it.",
    words: [
      "act now", "act fast", "urgent", "urgently", "hurry", "last chance", "limited time", "expires today", "expires soon",
      "today only", "don't miss", "dont miss", "don't wait", "dont wait", "before it's too late", "before its too late",
      "while supplies last", "ends soon", "ends tonight", "only hours left", "final reminder", "time is running out",
      "rates go up", "rates are going up", "rates going up", "rate increase", "premiums are going up", "premiums going up",
      "premiums are rising", "open enrollment ends", "enrollment ends", "enrollment deadline", "deadline to enroll",
      "last day to enroll", "before you lose coverage", "lose your coverage",
    ],
  },
  {
    id: "money",
    severity: "medium",
    label: "Money or \"free\" wording",
    tip: "Say \"quote\" or \"options\" instead of free, guaranteed or lowest.",
    words: [
      "free", "100% free", "guaranteed", "guarantee", "risk free", "risk-free", "no cost", "no obligation", "cash",
      "cash bonus", "lowest rate", "lowest price", "best price", "cheap", "save big", "huge savings", "extra income",
      "double your", "pre-approved", "preapproved", "no credit check", "$$", "100%",
    ],
  },
  {
    id: "pushy",
    severity: "low",
    label: "Pushy call-to-action",
    tip: "Ask a question they can answer by replying instead.",
    words: ["click here", "click now", "click the link", "call now", "buy now", "order now", "apply now", "sign up now", "subscribe now", "tap here"],
  },
];

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc|rb\.gy)\b/i;

// Short all-caps words that are normal in texts and shouldn't count as shouting.
const CAPS_OK = new Set(["STOP", "HELP", "PPO", "HMO", "EPO", "POS", "HSA", "ACA", "AEP", "OEP", "SEP", "USA", "LLC", "EIN", "FAQ", "HVAC", "ASAP"]);

const WEIGHT = { high: 30, medium: 15, low: 5 } as const;

function wordsFound(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower);
  });
}

/** Grades one message on words and patterns that spam filters flag. */
export function checkSpam(message: string): SpamCheck {
  // Personalization tokens like {firstName} are filled in per contact, and
  // "feel free" is everyday wording, not a "free" offer.
  const text = message.replace(/\{[^}]*\}/g, " ").replace(/\bfeel free\b/gi, " ").trim();
  const issues: SpamIssue[] = [];
  if (!text) return { score: 0, level: "low", issues };

  if (SHORTENERS.test(text)) {
    issues.push({ id: "shortener", severity: "high", text: "Link shortener (bit.ly, tinyurl…): carriers block these. Use a link on your own website." });
  }

  for (const group of WORD_GROUPS) {
    const found = wordsFound(text, group.words);
    if (found.length) issues.push({ id: group.id, severity: group.severity, text: `${group.label}: "${found.join("\", \"")}"`, tip: group.tip });
  }

  const links = text.match(/https?:\/\/\S+|www\.\S+/gi) || [];
  if (links.length > 1) issues.push({ id: "links", severity: "low", text: "More than one link. Keep it to one." });

  const shouting = (text.match(/\b[A-Z]{4,}\b/g) || []).filter((word) => !CAPS_OK.has(word));
  if (shouting.length >= 2) issues.push({ id: "caps", severity: "low", text: `ALL-CAPS words: ${shouting.slice(0, 4).join(", ")}` });

  if (/!{2,}|\?{2,}/.test(text) || (text.match(/!/g) || []).length >= 3) {
    issues.push({ id: "punctuation", severity: "low", text: "Too many exclamation or question marks." });
  }

  const emoji = text.match(/\p{Extended_Pictographic}/gu) || [];
  if (emoji.length >= 3) issues.push({ id: "emoji", severity: "low", text: "Lots of emojis. One is plenty." });

  if (/\$\s?\d/.test(text) && wordsFound(text, ["off", "save", "discount", "deal"]).length) {
    issues.push({ id: "price", severity: "low", text: "Dollar-off offer. Fine occasionally, but filters watch for it." });
  }

  const score = Math.min(100, issues.reduce((sum, issue) => sum + WEIGHT[issue.severity], 0));
  const level = score >= 30 ? "high" : score >= 15 ? "medium" : "low";
  return { score, level, issues };
}
