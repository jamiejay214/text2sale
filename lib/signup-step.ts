// ── How far a Text2Sale account got ───────────────────────────────────────
// A profile row exists as soon as someone signs up, but that is not the same
// as being a customer: checkout (card + 7-day trial) comes after. The command
// center shows this step on every account so a signup is never mistaken for
// someone who finished.
//
//   1  Account created      no payment page opened yet
//   2  Opened checkout      a payment customer exists but no subscription
//                           (stopped before entering a card)
//   3  Free trial           card on file, first charge not taken yet
//   4  Paying               subscription active (or comped / canceling)
//
// Past-due and cancelled accounts are step 4 with their own label.

export type StepTone = "todo" | "warn" | "trial" | "good" | "bad";

export type SignupStep = {
  n: 1 | 2 | 3 | 4;
  key: "account" | "checkout" | "trial" | "trial_canceling" | "paying" | "canceling" | "past_due" | "cancelled" | "comped";
  label: string;
  tone: StepTone;
  finished: boolean; // card on file or paying (or comped)
};

type Hist = { id?: unknown };

export type StepProfile = {
  subscription_status?: string | null;
  free_subscription?: boolean | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  usage_history?: Hist[] | null;
  plan?: { trialEndsAt?: string | null; trialCancels?: boolean } | null;
};

const dateLabel = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "";
};

/** A subscription payment was ever logged (stable id "sub_<invoice>"). */
const everPaid = (history: Hist[] | null | undefined) =>
  Array.isArray(history) && history.some((h) => typeof h?.id === "string" && h.id.startsWith("sub_"));

export function signupStep(p: StepProfile): SignupStep {
  const status = String(p.subscription_status || "inactive");
  if (p.free_subscription) return { n: 4, key: "comped", label: "Comped by admin", tone: "good", finished: true };
  if (status === "active") return { n: 4, key: "paying", label: "Paying subscriber", tone: "good", finished: true };
  if (status === "canceling") return { n: 4, key: "canceling", label: "Paying · cancels at period end", tone: "warn", finished: true };
  if (status === "past_due") return { n: 4, key: "past_due", label: "Payment failed", tone: "bad", finished: true };
  if (status === "trialing") {
    const on = dateLabel(p.plan?.trialEndsAt);
    if (p.plan?.trialCancels) return { n: 3, key: "trial_canceling", label: `Free trial · cancelling, no charge${on ? ` (ends ${on})` : ""}`, tone: "warn", finished: true };
    return { n: 3, key: "trial", label: `Free trial running · card on file${on ? ` · first charge ${on}` : ""}`, tone: "trial", finished: true };
  }
  // inactive: never finished checkout, or a former customer
  if (everPaid(p.usage_history)) return { n: 4, key: "cancelled", label: "Cancelled · was a paying subscriber", tone: "bad", finished: false };
  if (p.stripe_customer_id) return { n: 2, key: "checkout", label: "Opened checkout · no card entered, trial not started", tone: "warn", finished: false };
  return { n: 1, key: "account", label: "Account created · never opened checkout", tone: "todo", finished: false };
}
