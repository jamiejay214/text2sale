import type { OptOutSettings } from "./types";

export const MANDATORY_OPT_OUT_KEYWORDS = [
  "STOP",
  "END",
  "QUIT",
  "CANCEL",
  "UNSUBSCRIBE",
] as const;

export const DEFAULT_FIRST_MESSAGE_OPT_OUT = "N";

export const DEFAULT_OPT_OUT_SETTINGS: OptOutSettings = {
  keywords: [...MANDATORY_OPT_OUT_KEYWORDS, DEFAULT_FIRST_MESSAGE_OPT_OUT],
  optInKeywords: ["START", "SUBSCRIBE", "UNSTOP", "YES"],
  autoReplyMessage:
    "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.",
  optInReplyMessage: "You have been re-subscribed. Reply STOP to unsubscribe.",
  includeCompanyName: true,
  companyName: "",
  confirmOptOut: true,
  autoMarkDnc: true,
  firstMessageText: DEFAULT_FIRST_MESSAGE_OPT_OUT,
};

export function normalizeOptOutKeyword(value: unknown): string {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function normalizeOptOutTrigger(value: unknown): string {
  const normalized = normalizeOptOutKeyword(value).slice(0, 20);
  if (!normalized) return "";
  const words = normalized.split(/\s+/);
  if (words.length > 3) return "";
  if (/\b(REPLY|TEXT|SEND)\b/.test(normalized) || /\bOPT\s+OUT\b/.test(normalized)) return "";
  return normalized;
}

export function normalizeOptOutKeywords(value: unknown): string[] {
  const configured = Array.isArray(value) ? value.map(normalizeOptOutKeyword) : [];
  return Array.from(
    new Set([...MANDATORY_OPT_OUT_KEYWORDS, ...configured].filter(Boolean)),
  );
}

export function normalizeOptOutSettings(value: unknown): OptOutSettings {
  const current = value && typeof value === "object"
    ? (value as Partial<OptOutSettings>)
    : {};
  const configuredKeywords = normalizeOptOutKeywords(current.keywords);
  const customKeyword = configuredKeywords.find(
    (keyword) => !MANDATORY_OPT_OUT_KEYWORDS.includes(keyword as (typeof MANDATORY_OPT_OUT_KEYWORDS)[number]),
  );
  const trigger = normalizeOptOutTrigger(current.firstMessageText) ||
    normalizeOptOutTrigger(customKeyword) ||
    DEFAULT_FIRST_MESSAGE_OPT_OUT;
  return {
    ...DEFAULT_OPT_OUT_SETTINGS,
    ...current,
    keywords: normalizeOptOutKeywords([...configuredKeywords, trigger]),
    optInKeywords: Array.isArray(current.optInKeywords)
      ? current.optInKeywords.map(normalizeOptOutKeyword).filter(Boolean)
      : [...DEFAULT_OPT_OUT_SETTINGS.optInKeywords],
    firstMessageText: trigger,
  };
}

function normalizeForMatch(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasOptOutInstruction(
  message: string,
  keywords: readonly string[] = MANDATORY_OPT_OUT_KEYWORDS,
): boolean {
  const normalized = normalizeForMatch(message);
  if (!normalized) return false;
  const padded = ` ${normalized} `;
  const normalizedKeywords = normalizeOptOutKeywords(keywords).map(normalizeForMatch);
  const hasKeyword = normalizedKeywords.some((keyword) => padded.includes(` ${keyword} `));
  const endsWithTrigger = normalizedKeywords.some(
    (keyword) => normalized === keyword || normalized.endsWith(` ${keyword}`),
  );
  const givesDirection = /\b(REPLY|TEXT|SEND)\b/.test(normalized);
  const statesPurpose = /\bOPT\s+OUT\b|\bUNSUBSCRIBE\b/.test(normalized);
  return endsWithTrigger || (hasKeyword && (givesDirection || statesPurpose));
}

export function withFirstMessageOptOut(
  body: string,
  settingsValue: unknown,
): string {
  const settings = normalizeOptOutSettings(settingsValue);
  const message = body.trim();
  const trigger = normalizeOptOutTrigger(settings.firstMessageText) || DEFAULT_FIRST_MESSAGE_OPT_OUT;
  const normalizedMessage = normalizeForMatch(message);
  const normalizedTrigger = normalizeForMatch(trigger);
  if (normalizedMessage === normalizedTrigger || normalizedMessage.endsWith(` ${normalizedTrigger}`)) return message;
  return `${message}${message ? " " : ""}${trigger}`;
}
