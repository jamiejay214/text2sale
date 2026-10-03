import type { OptOutSettings } from "./types";

export const MANDATORY_OPT_OUT_KEYWORDS = [
  "STOP",
  "END",
  "QUIT",
  "CANCEL",
  "UNSUBSCRIBE",
] as const;

export const DEFAULT_FIRST_MESSAGE_OPT_OUT = "Reply STOP to opt out.";

export const DEFAULT_OPT_OUT_SETTINGS: OptOutSettings = {
  keywords: [...MANDATORY_OPT_OUT_KEYWORDS],
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
  return {
    ...DEFAULT_OPT_OUT_SETTINGS,
    ...current,
    keywords: normalizeOptOutKeywords(current.keywords),
    optInKeywords: Array.isArray(current.optInKeywords)
      ? current.optInKeywords.map(normalizeOptOutKeyword).filter(Boolean)
      : [...DEFAULT_OPT_OUT_SETTINGS.optInKeywords],
    firstMessageText:
      typeof current.firstMessageText === "string"
        ? current.firstMessageText.trim()
        : DEFAULT_FIRST_MESSAGE_OPT_OUT,
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
  const hasKeyword = normalizeOptOutKeywords(keywords).some((keyword) =>
    padded.includes(` ${normalizeForMatch(keyword)} `),
  );
  const givesDirection = /\b(REPLY|TEXT|SEND)\b/.test(normalized);
  const statesPurpose = /\bOPT\s+OUT\b|\bUNSUBSCRIBE\b/.test(normalized);
  return hasKeyword && (givesDirection || statesPurpose);
}

export function withFirstMessageOptOut(
  body: string,
  settingsValue: unknown,
): string {
  const settings = normalizeOptOutSettings(settingsValue);
  const message = body.trim();
  if (hasOptOutInstruction(message, settings.keywords)) return message;
  const optOut = settings.firstMessageText?.trim() || "";
  if (!hasOptOutInstruction(optOut, settings.keywords)) {
    throw new Error(
      "Set a clear first-message opt-out such as ‘Reply STOP to opt out.’ before sending.",
    );
  }
  return `${message}\n${optOut}`;
}
