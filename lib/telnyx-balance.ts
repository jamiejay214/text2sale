// ── Platform (master) Telnyx balance guard ──────────────────────────────────
// When the Text2Sale Telnyx account runs out of funds, EVERY customer's
// texting, calling and AI goes dark at once — the whole platform. This reads
// the master account balance so the owner is warned well before that happens.
//
// The alert that matters here is email, not SMS: an SMS warning would be sent
// through the very account that is failing. The cron sends email first and
// adds an SMS only as a bonus.

export const BALANCE_LOW = Number(process.env.PLATFORM_BALANCE_LOW) || 50;
export const BALANCE_CRITICAL = Number(process.env.PLATFORM_BALANCE_CRITICAL) || 20;

export type BalanceLevel = "ok" | "low" | "critical";

export type TelnyxBalance = {
  balance: number;
  creditLimit: number;
  available: number; // balance + available credit — what can actually be spent
  currency: string;
};

/** Read the master Telnyx account balance (GET /v2/balance). */
export async function getTelnyxBalance(): Promise<TelnyxBalance> {
  const res = await fetch("https://api.telnyx.com/v2/balance", {
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY || ""}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Telnyx balance HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  const d = (json?.data || {}) as Record<string, unknown>;
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const balance = num(d.balance);
  const available = d.available_credit !== undefined ? num(d.available_credit) : balance;
  return { balance, creditLimit: num(d.credit_limit), available, currency: String(d.currency || "USD") };
}

/** Which band a spendable balance falls into. */
export function balanceLevel(available: number, low = BALANCE_LOW, critical = BALANCE_CRITICAL): BalanceLevel {
  if (available <= critical) return "critical";
  if (available <= low) return "low";
  return "ok";
}

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

/**
 * Decide whether to alert, given the level now and what was last recorded.
 * Alerts when the level gets worse, when it recovers to ok, and re-alerts a
 * standing critical every `reAlertHours`. No change at the same ok/low level
 * stays quiet so the owner isn't nagged.
 */
export function shouldAlert(
  prev: { level: BalanceLevel | null; alertedAt: string | null },
  level: BalanceLevel,
  now: number,
  reAlertHours = 6,
): boolean {
  const order: Record<BalanceLevel, number> = { ok: 0, low: 1, critical: 2 };
  const prevLevel = prev.level;
  if (prevLevel === null) return level !== "ok"; // first ever reading: only speak up if not ok
  if (order[level] > order[prevLevel]) return true; // got worse
  if (level === "ok" && prevLevel !== "ok") return true; // recovered
  if (level === "critical" && prevLevel === "critical") {
    if (!prev.alertedAt) return true;
    return now - Date.parse(prev.alertedAt) >= reAlertHours * 3_600_000;
  }
  return false;
}

/** Email subject + body for the owner. */
export function balanceAlert(level: BalanceLevel, b: TelnyxBalance): { subject: string; text: string } {
  const bal = money(b.available, b.currency);
  if (level === "ok") {
    return {
      subject: "Text2Sale: Telnyx balance is healthy again",
      text: `The Text2Sale Telnyx account balance is back up to ${bal}. Texting, calling and AI are running normally.`,
    };
  }
  const head =
    level === "critical"
      ? `⛔ URGENT: the Text2Sale Telnyx balance is ${bal}.`
      : `⚠️ Heads up: the Text2Sale Telnyx balance is low at ${bal}.`;
  return {
    subject:
      level === "critical"
        ? "⛔ URGENT — Text2Sale is about to stop sending (Telnyx funds)"
        : "⚠️ Text2Sale Telnyx balance is low",
    text:
      `${head}\n\n` +
      `This is the master account every customer's texting, calling and AI runs on. ` +
      `If it hits zero, all of that stops for everyone at once.\n\n` +
      `Add funds in the Telnyx portal → Billing. To make this automatic, turn on ` +
      `Telnyx's own Auto Recharge (Billing → Auto Recharge) with a card on file — ` +
      `this monitor is the safety net under that, not a replacement for it.\n\n` +
      `Thresholds: low ≤ ${money(BALANCE_LOW, b.currency)}, critical ≤ ${money(BALANCE_CRITICAL, b.currency)}.`,
  };
}
