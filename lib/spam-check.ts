// Spam check for campaign text. Carriers filter first-contact texts that
// don't say who is sending, don't say how to opt out, push urgency or money
// language, or hide links behind shorteners (Telnyx error 40002, "blocked
// as spam"). This scores a message for those signals before it goes out.

export type SpamIssue = { id: string; severity: "high" | "medium" | "low"; text: string };
export type SpamCheck = { score: number; level: "low" | "medium" | "high"; issues: SpamIssue[] };

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc|rb\.gy)\b/i;

const URGENCY = [
  "before rates go up", "rates are going up", "act now", "act fast", "limited time", "expires", "expiring",
  "urgent", "last chance", "don't miss", "dont miss", "hurry", "today only", "final notice",
  "final reminder", "while supplies last", "ends soon", "before it's too late", "before its too late",
];

const MONEY = [
  "free", "guaranteed", "guarantee", "100%", "cash", "winner", "congratulations", "pre-approved",
  "preapproved", "no cost", "lowest rate", "save big", "risk free", "risk-free", "$$",
];

const OPT_OUT = /\b(reply|text|send)\s+stop\b|\bstop\s+to\s+(opt\s*out|unsubscribe|end|cancel|quit)\b|\bopt[\s-]?out\b|\bunsubscribe\b/i;

// Short all-caps words that are normal in texts and shouldn't count as shouting.
const CAPS_OK = new Set(["STOP", "HELP", "PPO", "HMO", "ACA", "USA", "LLC", "EIN", "FAQ"]);

const WEIGHT = { high: 25, medium: 15, low: 5 } as const;

function phrasesIn(text: string, phrases: string[]): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(lower);
  });
}

/**
 * Scores one message. `firstMessage` turns on the first-contact rules
 * (who you are, how to opt out). `businessName` is checked for when known.
 */
export function checkSpam(
  message: string,
  options: { firstMessage?: boolean; businessName?: string } = {},
): SpamCheck {
  const text = message.trim();
  const issues: SpamIssue[] = [];
  if (!text) return { score: 0, level: "low", issues };

  if (SHORTENERS.test(text)) {
    issues.push({ id: "shortener", severity: "high", text: "Link shorteners (bit.ly, tinyurl…) are blocked by carriers. Use your own domain." });
  }

  if (options.firstMessage) {
    if (!OPT_OUT.test(text)) {
      issues.push({
        id: "opt_out",
        severity: "high",
        text: /\s[a-z]$/i.test(text)
          ? "Say how to opt out, e.g. \"Reply STOP to opt out\". A single letter at the end isn't recognized as opt-out wording."
          : "Say how to opt out, e.g. \"Reply STOP to opt out\".",
      });
    }
    const business = (options.businessName || "").trim();
    if (business) {
      if (!text.toLowerCase().includes(business.toLowerCase())) {
        issues.push({ id: "identity", severity: "high", text: `Say who's texting: include "${business}" (e.g. "it's Jamie with ${business}").` });
      }
    } else if (!/\b(this is|it's|its|i'm|im)\s+\w+/i.test(text) && !/\b(with|from)\s+[A-Z][\w&'-]*/.test(text)) {
      issues.push({ id: "identity", severity: "medium", text: "Say who's texting and your business name. Texts from an unnamed sender get filtered." });
    }
    if (!/\{\s*first_?name\s*\}/i.test(text)) {
      issues.push({ id: "personal", severity: "low", text: "Personalize with {firstName}. Identical texts to everyone look like a blast." });
    }
  }

  const urgent = phrasesIn(text, URGENCY);
  if (urgent.length) {
    issues.push({ id: "urgency", severity: "medium", text: `Pressure wording carriers flag: "${urgent.join("\", \"")}". Drop it.` });
  }

  const money = phrasesIn(text, MONEY);
  if (money.length) {
    issues.push({ id: "money", severity: "medium", text: `Money or "free" wording carriers flag: "${money.join("\", \"")}".` });
  }

  const shouting = (text.replace(/\{[^}]*\}/g, "").match(/\b[A-Z]{4,}\b/g) || []).filter((word) => !CAPS_OK.has(word));
  if (shouting.length >= 2) {
    issues.push({ id: "caps", severity: "low", text: "Avoid ALL-CAPS words." });
  }

  if (/!{2,}|\?{2,}/.test(text) || (text.match(/!/g) || []).length >= 3) {
    issues.push({ id: "punctuation", severity: "low", text: "Ease off the exclamation marks." });
  }

  if (text.length > 306) {
    issues.push({ id: "length", severity: "low", text: "Long first texts (3+ segments) read like ads and cost more. Keep it under 160 characters." });
  }

  const score = Math.min(100, issues.reduce((sum, issue) => sum + WEIGHT[issue.severity], 0));
  const level = score >= 40 ? "high" : score >= 20 ? "medium" : "low";
  return { score, level, issues };
}
