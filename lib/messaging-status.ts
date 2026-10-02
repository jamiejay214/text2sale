// ── Messaging activation state machine ─────────────────────────────────────
//
// One place that knows what activation stage an account is in, what the
// customer should be told about it, and what the driver should do next.
//
// The goal of the flow is that a customer never encounters the words TCR,
// brand, campaign or MNO. They submit their business details once and watch a
// progress line. Everything below the surface is this state machine plus
// /api/messaging/advance, which runs server-side so progress continues after
// the customer closes the tab.

export const MESSAGING_STATUSES = [
  "NOT_STARTED",
  "BUSINESS_SUBMITTED",
  "BRAND_PENDING",
  "BRAND_APPROVED",
  "CAMPAIGN_PENDING",
  "CAMPAIGN_APPROVED",
  "NUMBER_ASSIGNED",
  "ACTIVE",
  "AWAITING_PAYMENT",
  "REJECTED",
] as const;

export type MessagingStatus = (typeof MESSAGING_STATUSES)[number];

export function isMessagingStatus(value: unknown): value is MessagingStatus {
  return typeof value === "string" && (MESSAGING_STATUSES as readonly string[]).includes(value);
}

/** Statuses the driver still has work to do on. */
export const PENDING_STATUSES: MessagingStatus[] = [
  "BUSINESS_SUBMITTED",
  "BRAND_PENDING",
  "BRAND_APPROVED",
  "CAMPAIGN_PENDING",
  "CAMPAIGN_APPROVED",
  "NUMBER_ASSIGNED",
  // Retried too, so activation resumes on its own once the customer tops up
  // rather than requiring them to find and re-click a button.
  "AWAITING_PAYMENT",
];

/** Terminal states — the driver leaves these alone. */
export function isTerminal(status: MessagingStatus): boolean {
  return status === "ACTIVE" || status === "REJECTED" || status === "NOT_STARTED";
}

// ── Customer-facing copy ───────────────────────────────────────────────────
// Deliberately free of telecom vocabulary. "Waiting for TCR_ACCEPTED on your
// campaign" means nothing to someone who runs a roofing company.

type StatusCopy = {
  /** Short label for the progress header. */
  headline: string;
  /** One sentence of detail. */
  detail: string;
  /** Rough progress for a bar, 0-100. */
  progress: number;
  /** Whether the customer needs to do something. */
  needsCustomerAction: boolean;
};

const COPY: Record<MessagingStatus, StatusCopy> = {
  NOT_STARTED: {
    headline: "Texting not set up yet",
    detail: "Tell us about your business and we'll get your texting number activated.",
    progress: 0,
    needsCustomerAction: true,
  },
  BUSINESS_SUBMITTED: {
    headline: "Setting up your website and texting…",
    detail:
      "We're getting your website ready and submitting your business for verification. Nothing needed from you.",
    progress: 15,
    needsCustomerAction: false,
  },
  BRAND_PENDING: {
    headline: "Verifying your business…",
    detail: "Your business is being verified. This usually takes a few minutes but can take longer.",
    progress: 30,
    needsCustomerAction: false,
  },
  BRAND_APPROVED: {
    headline: "Business verified — setting up messaging…",
    detail: "Your business checked out. We're now registering what you'll be texting about.",
    progress: 50,
    needsCustomerAction: false,
  },
  CAMPAIGN_PENDING: {
    headline: "Getting your messaging approved…",
    detail: "Carriers are reviewing your messaging. This is the longest step and can take a few hours.",
    progress: 65,
    needsCustomerAction: false,
  },
  CAMPAIGN_APPROVED: {
    headline: "Approved — getting your number…",
    detail: "Your messaging was approved. We're picking out your phone number now.",
    progress: 85,
    needsCustomerAction: false,
  },
  NUMBER_ASSIGNED: {
    headline: "Almost there…",
    detail: "Your number is registered and we're running the final checks.",
    progress: 95,
    needsCustomerAction: false,
  },
  ACTIVE: {
    headline: "Texting is active",
    detail: "You're all set. You can send campaigns and reply to customers.",
    progress: 100,
    needsCustomerAction: false,
  },
  AWAITING_PAYMENT: {
    headline: "Add funds to finish activation",
    detail:
      "Your messaging is approved. Add funds to your balance and we'll buy your number and switch texting on automatically.",
    progress: 85,
    needsCustomerAction: true,
  },
  REJECTED: {
    headline: "We hit a problem",
    detail: "Something in your business details needs fixing before we can activate texting.",
    progress: 0,
    needsCustomerAction: true,
  },
};

/** What an account is waiting on when it parks in AWAITING_PAYMENT. */
export type Awaiting = "domain" | "number";

/**
 * Customer-facing copy for a status. AWAITING_PAYMENT covers two different
 * purchases (the website address before the business is submitted, the phone
 * number after approval), so it takes the reason to say the right thing.
 */
export function statusCopy(status: MessagingStatus, awaiting?: Awaiting | null): StatusCopy {
  if (status === "AWAITING_PAYMENT" && awaiting === "domain") {
    return {
      headline: "Add funds to register your website address",
      detail:
        "Carriers need a website for your business. Add funds to your balance and we'll register your address, build the site and keep going automatically.",
      progress: 10,
      needsCustomerAction: true,
    };
  }
  return COPY[status];
}

// ── Telnyx status mapping ──────────────────────────────────────────────────
// Telnyx reports brand status on one vocabulary and campaign status on
// another. Both funnel into our statuses here so no caller has to remember
// that "OK" means an approved brand while campaigns say "TCR_ACCEPTED".
//
// The campaign values are the complete `campaignStatus` enum from Telnyx's
// OpenAPI spec. The first version of this mapped only four of the twelve and
// let the rest fall through to "pending" — so a suspended, expired or
// carrier-rejected campaign was polled for days instead of being surfaced.

export type BrandOutcome = "approved" | "pending" | "failed";

export function mapBrandStatus(telnyxStatus: string | undefined | null): BrandOutcome {
  const s = (telnyxStatus || "").toUpperCase();
  if (s === "OK" || s === "VERIFIED" || s === "APPROVED") return "approved";
  if (s === "FAILED" || s === "REGISTRATION_FAILED" || s === "EXPIRED") return "failed";
  return "pending";
}

export type CampaignOutcome = "approved" | "pending" | "failed";

const CAMPAIGN_APPROVED = new Set(["TCR_ACCEPTED", "MNO_ACCEPTED", "MNO_PROVISIONED", "ACTIVE"]);
const CAMPAIGN_FAILED = new Set([
  "TCR_FAILED",
  "TCR_SUSPENDED",
  "TCR_EXPIRED",
  "TELNYX_FAILED",
  "MNO_REJECTED",
  "MNO_PROVISIONING_FAILED",
]);

export function mapCampaignStatus(
  campaignStatus: string | undefined | null,
  submissionStatus?: string | undefined | null
): CampaignOutcome {
  const c = (campaignStatus || "").toUpperCase();
  const s = (submissionStatus || "").toUpperCase();
  if (s === "FAILED" || CAMPAIGN_FAILED.has(c)) return "failed";
  if (CAMPAIGN_APPROVED.has(c)) return "approved";
  return "pending";
}

/**
 * Turn Telnyx's `failureReasons` into one readable string.
 *
 * The spec types it as a string for both brands and campaigns, but older
 * responses (and our own earlier assumptions) treated it as an array of
 * `{ description }` objects. Code that indexed it as an array silently lost
 * the brand rejection reason, and `.map` on the string threw for campaigns —
 * which the driver caught and retried, so a rejected campaign looked "pending"
 * for days. Accept every shape and never throw.
 */
export function parseFailureReasons(value: unknown): string {
  const parts: string[] = [];
  const visit = (v: unknown, depth: number) => {
    if (v == null || depth > 3) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return;
      // A JSON-encoded array/object inside the string.
      if ((t.startsWith("[") || t.startsWith("{")) && depth < 3) {
        try {
          visit(JSON.parse(t), depth + 1);
          return;
        } catch {
          /* not JSON — treat as text */
        }
      }
      parts.push(t);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
      return;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      const text = [o.description, o.detail, o.message, o.reason, o.title, o.error].find(
        (x) => typeof x === "string" && x.trim()
      );
      if (typeof text === "string") parts.push(text.trim());
    }
  };
  visit(value, 0);
  return [...new Set(parts)].join("; ");
}

// ── Error classification ───────────────────────────────────────────────────
// Not every failed Telnyx call means the customer did something wrong.
// Production history shows it: of three accounts parked as REJECTED, none
// were bad business details. Two were our own Telnyx balance running short
// ("You do not have enough funds to perform this action") and one was a
// campaign submitted while its brand was still pending. The customer could
// not have fixed any of them, yet each was told their details needed fixing
// and the account was dropped by the driver.
//
//   data      the request itself was refused — the customer can fix it
//   platform  our Telnyx account needs attention (balance, credentials,
//             permissions) — only the operator can fix it
//   transient timing, rate limits, outages — retry later, nobody to blame

export type ErrorKind = "data" | "platform" | "transient";

export type ClassifiedError = { kind: ErrorKind; message: string };

const PLATFORM_PATTERN =
  /enough funds|insufficient (funds|balance|credit)|must have at least \$|balance (is )?(too )?low|payment required|top[- ]?up|account (is )?not (enabled|authori[sz]ed|permitted|verified)|10dlc (is )?not (enabled|available)|invalid (api )?key|authentication (failed|required)|unauthori[sz]ed/i;
const TRANSIENT_PATTERN =
  /timeout|timed out|temporar|try again|rate limit|too many requests|unavailable|brand registration status pending|still pending|not yet (approved|verified|active)|being processed|in progress|econnreset|fetch failed|network/i;

/** Flatten Telnyx's `errors` (array of objects, array of strings, string) to text. */
export function flattenTelnyxErrors(errors: unknown): string {
  return parseFailureReasons(errors);
}

export function classifyTelnyxError(input: {
  status?: number;
  errors?: unknown;
  message?: string;
  /** The request never produced an HTTP response. */
  network?: boolean;
}): ClassifiedError {
  const text = (input.message || flattenTelnyxErrors(input.errors) || "").trim();
  const message = text || (input.status ? `Telnyx returned HTTP ${input.status}` : "Telnyx request failed");

  if (input.network) return { kind: "transient", message };

  // Pattern first: Telnyx reports a short balance as a 4xx whose wording is
  // the only reliable signal, and a "pending" brand as a 4xx too.
  if (PLATFORM_PATTERN.test(text)) return { kind: "platform", message };
  if (TRANSIENT_PATTERN.test(text)) return { kind: "transient", message };

  const status = input.status ?? 0;
  if (status === 401 || status === 402 || status === 403) return { kind: "platform", message };
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return { kind: "transient", message };
  }
  return { kind: "data", message };
}

// ── Entitlement ────────────────────────────────────────────────────────────
// "Collect payment before purchasing anything." Brand and campaign
// registration cost real money on our Telnyx account, so they only proceed
// for an account that is paying (or has been comped by an admin). Checked on
// the server — the dashboard hides the buttons, but a hidden button is not a
// gate: the old onboarding wizard let anyone press "Skip — already
// subscribed" and submit a registration we then paid for.

export function isEntitled(profile: {
  subscription_status?: string | null;
  free_subscription?: boolean | null;
}): boolean {
  if (profile.free_subscription) return true;
  const s = profile.subscription_status;
  return s === "active" || s === "canceling";
}

// ── Retry backoff ──────────────────────────────────────────────────────────
// Brand checks resolve in minutes; campaign review can take hours. Backing
// off avoids hammering Telnyx for an account that is going to sit in review
// all afternoon, while still checking new submissions promptly.

const BACKOFF_MINUTES = [1, 2, 5, 10, 15, 30, 60];

export function nextAttemptDelayMinutes(attempts: number): number {
  const idx = Math.min(Math.max(attempts, 0), BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[idx];
}

/**
 * How long to keep retrying before giving up and asking a human to look.
 * Carrier review genuinely can run long, so this is deliberately generous —
 * parking an account as REJECTED too early is worse than one extra poll.
 */
export const MAX_ATTEMPTS = 200;

// ── Legacy JSONB status mapping ────────────────────────────────────────────
// The dashboard still reads a2p_registration.status. Until that UI is fully
// migrated, every write to messaging_status also refreshes the blob so the
// two can't disagree and show a customer contradictory states.

export function legacyStatusFor(
  status: MessagingStatus,
  stage: "brand" | "campaign",
  awaiting?: Awaiting | null
): string | null {
  // Waiting on the website address happens before anything is submitted, so
  // it must not read as "campaign approved" and unlock sending.
  if (status === "AWAITING_PAYMENT" && awaiting === "domain") return "brand_pending";
  switch (status) {
    case "BUSINESS_SUBMITTED":
    case "BRAND_PENDING":
      return "brand_pending";
    case "BRAND_APPROVED":
      return "brand_approved";
    case "CAMPAIGN_PENDING":
      return "campaign_pending";
    case "CAMPAIGN_APPROVED":
    case "NUMBER_ASSIGNED":
    case "AWAITING_PAYMENT":
    case "ACTIVE":
      return "campaign_approved";
    case "REJECTED":
      return stage === "brand" ? "brand_failed" : "campaign_failed";
    default:
      return null;
  }
}
