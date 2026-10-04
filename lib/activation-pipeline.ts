// ── Activation pipeline ────────────────────────────────────────────────────
//
// One function that turns a customer's profile row into "how far along are
// they, who is waiting on whom, and does anything need a human". The admin
// dashboard renders it per customer and rolls it up into a funnel.
//
// It is derived entirely from columns that already exist (subscription,
// messaging_status and friends, the registration blob, owned_numbers), so
// there is nothing to migrate and nothing that can drift out of date: the
// driver changes the row and this reads it.
//
// Pure and dependency-free (types only) so it runs in the browser, on the
// server and in the test script.

import { MAX_ATTEMPTS, isEntitled, isMessagingStatus, type MessagingStatus } from "./messaging-status";
import type { A2PRegistration } from "./types";

export type StepKey =
  | "signup"
  | "subscription"
  | "business"
  | "website"
  | "brand"
  | "campaign"
  | "number"
  | "active";

/**
 * done     finished
 * current  being worked on right now by our systems
 * waiting  blocked on someone else (the customer, or the carriers)
 * pending  not reached yet
 * failed   stopped with an error
 */
export type StepState = "done" | "current" | "waiting" | "pending" | "failed";

export type PipelineStep = {
  key: StepKey;
  label: string;
  state: StepState;
  detail: string;
};

export type Alert = { level: "error" | "warn" | "info"; code: string; message: string };

export type Owner = "customer" | "us" | "carriers" | "none";

export type Health = "complete" | "on_track" | "waiting_customer" | "attention" | "not_started";

export type Pipeline = {
  steps: PipelineStep[];
  /** Index of the first step that isn't done; steps.length when finished. */
  currentIndex: number;
  percent: number;
  health: Health;
  owner: Owner;
  /** Short line for lists, e.g. "Campaign in carrier review". */
  headline: string;
  alerts: Alert[];
  status: MessagingStatus;
};

export type PipelineInput = {
  created_at?: string | null;
  subscription_status?: string | null;
  free_subscription?: boolean | null;
  messaging_status?: string | null;
  messaging_status_at?: string | null;
  messaging_error?: string | null;
  messaging_attempts?: number | null;
  a2p_registration?: Partial<A2PRegistration> | null;
  owned_numbers?: unknown[] | null;
  custom_domain?: string | null;
  business_slug?: string | null;
};

/** How long a stage can sit before it is worth a look, in hours. */
export const STALE_HOURS = {
  business: 48, // site not live / brand not submitted
  brand: 24, // usually minutes
  campaign: 96, // carrier review is the slow part
  payment: 72, // customer hasn't added funds
};

const LABELS: Record<StepKey, string> = {
  signup: "Signed up",
  subscription: "Subscribed",
  business: "Business details",
  website: "Website",
  brand: "Business verified",
  campaign: "Messaging approved",
  number: "Phone number",
  active: "Texting live",
};

function hoursSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, (now - t) / 3_600_000) : 0;
}

function ago(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

// Progress, as the ordinal position within the messaging flow. Anything past
// BRAND_APPROVED implies the brand step finished, and so on.
const RANK: Record<MessagingStatus, number> = {
  NOT_STARTED: 0,
  BUSINESS_SUBMITTED: 1,
  BRAND_PENDING: 2,
  BRAND_APPROVED: 3,
  CAMPAIGN_PENDING: 4,
  CAMPAIGN_APPROVED: 5,
  AWAITING_PAYMENT: 5, // refined below by `awaiting`
  NUMBER_ASSIGNED: 6,
  ACTIVE: 7,
  REJECTED: -1, // refined below
};

export function computePipeline(p: PipelineInput, nowMs: number = Date.now()): Pipeline {
  const status: MessagingStatus = isMessagingStatus(p.messaging_status) ? p.messaging_status : "NOT_STARTED";
  const reg = (p.a2p_registration || {}) as Partial<A2PRegistration>;
  const entitled = isEntitled(p);
  const attempts = p.messaging_attempts ?? 0;
  const hours = hoursSince(p.messaging_status_at, nowMs);
  const numbers = Array.isArray(p.owned_numbers) ? p.owned_numbers.length : 0;
  const awaiting = reg.awaiting ?? null;
  const hasBusiness = !!(reg.ein && reg.businessName) || status !== "NOT_STARTED";

  // Where a REJECTED account stopped. Rejected before a campaign existed means
  // the brand (or the website it needs); after, the campaign.
  const rejectedAt: "brand" | "campaign" | null =
    status === "REJECTED" ? (reg.campaignSid ? "campaign" : "brand") : null;

  // How far the account got, treating REJECTED as "stopped at" its stage.
  let rank = RANK[status];
  if (status === "REJECTED") rank = rejectedAt === "campaign" ? 4 : 1;
  if (status === "AWAITING_PAYMENT" && (awaiting === "domain" || awaiting === "brand")) rank = 1;
  if (status === "AWAITING_PAYMENT" && awaiting === "campaign") rank = 3;
  if (status === "AWAITING_PAYMENT" && awaiting === "number") rank = 5;

  const alerts: Alert[] = [];
  const steps: PipelineStep[] = [];

  // ── Signup / subscription ────────────────────────────────────────────────
  steps.push({ key: "signup", label: LABELS.signup, state: "done", detail: "Account created" });

  const subStatus = p.subscription_status || "inactive";
  if (entitled) {
    steps.push({
      key: "subscription",
      label: LABELS.subscription,
      state: "done",
      detail: p.free_subscription ? "Comped by admin" : subStatus === "canceling" ? "Active (cancels at period end)" : "Paying",
    });
  } else if (subStatus === "past_due") {
    steps.push({ key: "subscription", label: LABELS.subscription, state: "waiting", detail: "Payment failed" });
    alerts.push({ level: "warn", code: "past_due", message: "Subscription payment failed — setup is paused until it clears." });
  } else {
    steps.push({ key: "subscription", label: LABELS.subscription, state: "pending", detail: "Hasn't subscribed yet" });
  }

  // ── Business details ─────────────────────────────────────────────────────
  steps.push(
    hasBusiness
      ? { key: "business", label: LABELS.business, state: "done", detail: reg.businessName || "Submitted" }
      : { key: "business", label: LABELS.business, state: "pending", detail: "Not entered yet" }
  );

  // ── Website ──────────────────────────────────────────────────────────────
  // Implied done once the brand has been submitted: the driver does not
  // submit until the site answers, and accounts from before the driver
  // existed were registered against a working site by hand.
  const brandSubmitted = rank >= 2 || (status === "REJECTED" && !!reg.brandRegistrationSid);
  const siteLive = !!reg.siteLiveAt || brandSubmitted;
  const siteHost = p.custom_domain || (reg.website ? reg.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "");
  if (siteLive) {
    steps.push({
      key: "website",
      label: LABELS.website,
      state: "done",
      detail: reg.websiteMode === "own" ? `Own site: ${siteHost || "provided"}` : siteHost || "Live",
    });
  } else if (!hasBusiness) {
    steps.push({ key: "website", label: LABELS.website, state: "pending", detail: "Needs business details first" });
  } else if (status === "AWAITING_PAYMENT" && awaiting === "domain") {
    steps.push({
      key: "website",
      label: LABELS.website,
      state: "waiting",
      detail: `Waiting for funds to register ${reg.domainRequest?.domain || "domain"}`,
    });
  } else if (reg.websiteMode === "hosted" && !p.custom_domain && !reg.domainRequest) {
    steps.push({ key: "website", label: LABELS.website, state: "waiting", detail: "Customer hasn't chosen a domain" });
  } else if (!entitled) {
    steps.push({ key: "website", label: LABELS.website, state: "pending", detail: "Waiting on subscription" });
  } else {
    steps.push({
      key: "website",
      label: LABELS.website,
      state: "current",
      detail: siteHost ? `Waiting for ${siteHost} to go live` : "Being set up",
    });
  }

  // ── Brand ────────────────────────────────────────────────────────────────
  if (rank >= 3) {
    steps.push({
      key: "brand",
      label: LABELS.brand,
      state: "done",
      detail: reg.brandIdentityStatus ? `Approved (${reg.brandIdentityStatus.toLowerCase()})` : "Approved",
    });
  } else if (rejectedAt === "brand") {
    steps.push({ key: "brand", label: LABELS.brand, state: "failed", detail: p.messaging_error || "Rejected" });
  } else if (status === "AWAITING_PAYMENT" && awaiting === "brand") {
    steps.push({ key: "brand", label: LABELS.brand, state: "waiting", detail: "Waiting for $4.50 carrier registration fee" });
  } else if (status === "BRAND_PENDING") {
    steps.push({ key: "brand", label: LABELS.brand, state: "waiting", detail: `In review for ${ago(hours)}` });
  } else if (siteLive && entitled && status === "BUSINESS_SUBMITTED") {
    steps.push({ key: "brand", label: LABELS.brand, state: "current", detail: "Submitting to Telnyx" });
  } else {
    steps.push({ key: "brand", label: LABELS.brand, state: "pending", detail: "Not submitted" });
  }

  // ── Campaign ─────────────────────────────────────────────────────────────
  if (rank >= 5) {
    steps.push({ key: "campaign", label: LABELS.campaign, state: "done", detail: reg.campaignStatus || "Approved" });
  } else if (rejectedAt === "campaign") {
    steps.push({ key: "campaign", label: LABELS.campaign, state: "failed", detail: p.messaging_error || "Rejected" });
  } else if (status === "AWAITING_PAYMENT" && awaiting === "campaign") {
    steps.push({ key: "campaign", label: LABELS.campaign, state: "waiting", detail: "Waiting for $15 carrier review fee" });
  } else if (status === "CAMPAIGN_PENDING") {
    steps.push({
      key: "campaign",
      label: LABELS.campaign,
      state: "waiting",
      detail: `${reg.campaignStatus || "In review"} for ${ago(hours)}`,
    });
  } else if (status === "BRAND_APPROVED") {
    steps.push({ key: "campaign", label: LABELS.campaign, state: "current", detail: "Submitting to carriers" });
  } else {
    steps.push({ key: "campaign", label: LABELS.campaign, state: "pending", detail: "Not submitted" });
  }

  // ── Number ───────────────────────────────────────────────────────────────
  if (rank >= 6) {
    steps.push({ key: "number", label: LABELS.number, state: "done", detail: `${numbers || 1} number${numbers === 1 ? "" : "s"} attached` });
  } else if (status === "AWAITING_PAYMENT" && awaiting === "number") {
    steps.push({ key: "number", label: LABELS.number, state: "waiting", detail: "Waiting to connect a phone number" });
  } else if (status === "CAMPAIGN_APPROVED") {
    steps.push({ key: "number", label: LABELS.number, state: "current", detail: numbers ? "Attaching your number" : "Buying a number" });
  } else {
    steps.push({ key: "number", label: LABELS.number, state: "pending", detail: "Not started" });
  }

  // ── Live ─────────────────────────────────────────────────────────────────
  steps.push(
    status === "ACTIVE"
      ? { key: "active", label: LABELS.active, state: "done", detail: "Customer can send" }
      : { key: "active", label: LABELS.active, state: "pending", detail: "Not yet" }
  );

  // ── Alerts ───────────────────────────────────────────────────────────────
  if (status === "REJECTED") {
    alerts.push({
      level: "error",
      code: "rejected",
      message: `${rejectedAt === "campaign" ? "Messaging" : "Business"} registration rejected${p.messaging_error ? `: ${p.messaging_error}` : ""}`,
    });
  }
  if (reg.adminAlert) {
    alerts.push({ level: "error", code: reg.adminAlert.code, message: reg.adminAlert.message });
  }
  const pendingStatus = status !== "NOT_STARTED" && status !== "ACTIVE" && status !== "REJECTED";
  if (pendingStatus && attempts >= MAX_ATTEMPTS) {
    alerts.push({
      level: "error",
      code: "stalled",
      message: `Automatic retries exhausted after ${attempts} attempts — retry it manually.`,
    });
  }
  if (!entitled && hasBusiness && pendingStatus && subStatus !== "past_due") {
    alerts.push({ level: "warn", code: "unpaid", message: "Business submitted but there is no active subscription — nothing will be bought until they pay." });
  }
  if (status === "BUSINESS_SUBMITTED" && hours > STALE_HOURS.business && entitled) {
    alerts.push({ level: "warn", code: "site_slow", message: `Still waiting on the website or brand submission after ${ago(hours)}.` });
  }
  if (status === "BRAND_PENDING" && hours > STALE_HOURS.brand) {
    alerts.push({ level: "warn", code: "brand_slow", message: `Brand has been in review for ${ago(hours)} (usually minutes).` });
  }
  if (status === "CAMPAIGN_PENDING" && hours > STALE_HOURS.campaign) {
    alerts.push({ level: "warn", code: "campaign_slow", message: `Campaign has been in carrier review for ${ago(hours)}.` });
  }
  if (status === "AWAITING_PAYMENT" && hours > STALE_HOURS.payment) {
    alerts.push({ level: "warn", code: "payment_slow", message: `Customer hasn't added funds in ${ago(hours)}.` });
  }
  if (status === "CAMPAIGN_APPROVED" && p.messaging_error) {
    // The driver parks here with a reason: auto-purchase switched off, no
    // numbers in their area code, an attach that keeps failing.
    alerts.push({ level: "warn", code: "number_blocked", message: p.messaging_error });
  }

  // ── Roll up ──────────────────────────────────────────────────────────────
  const currentIndex = steps.findIndex((s) => s.state !== "done");
  const done = steps.filter((s) => s.state === "done").length;
  const percent = Math.round((done / steps.length) * 100);
  const first = currentIndex === -1 ? null : steps[currentIndex];

  let owner: Owner = "none";
  let headline = "Texting is live";
  if (first) {
    if (first.state === "failed") {
      owner = reg.adminAlert ? "us" : "customer";
      headline = `${first.label} failed`;
    } else if (first.state === "waiting") {
      owner = first.key === "brand" || first.key === "campaign" ? "carriers" : "customer";
      headline = first.key === "brand" ? "Business in Telnyx review" : first.key === "campaign" ? "Campaign in carrier review" : first.detail;
    } else if (first.state === "current") {
      owner = "us";
      headline = first.detail;
    } else {
      owner = first.key === "subscription" || first.key === "business" ? "customer" : "us";
      headline =
        first.key === "subscription"
          ? "Not subscribed"
          : first.key === "business"
            ? "Hasn't entered business details"
            : first.detail;
    }
  }
  if (reg.adminAlert) owner = "us";
  if (pendingStatus && attempts >= MAX_ATTEMPTS) owner = "us";

  let health: Health;
  if (status === "ACTIVE") health = "complete";
  else if (alerts.some((a) => a.level === "error")) health = "attention";
  else if (!hasBusiness || (!entitled && !hasBusiness)) health = "not_started";
  else if (owner === "customer") health = "waiting_customer";
  else health = "on_track";

  // An account that hasn't even entered business details is "not started",
  // not "waiting on the customer" — keep them out of the follow-up list.
  if (!hasBusiness && health !== "attention") health = "not_started";

  return { steps, currentIndex: currentIndex === -1 ? steps.length : currentIndex, percent, health, owner, headline, alerts, status };
}
