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
    headline: "Setting up your texting number…",
    detail: "We're submitting your business details for verification. Nothing needed from you.",
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

export function statusCopy(status: MessagingStatus): StatusCopy {
  return COPY[status];
}

// ── Telnyx status mapping ──────────────────────────────────────────────────
// Telnyx reports brand status on one vocabulary and campaign status on
// another. Both funnel into our statuses here so no caller has to remember
// that "OK" means an approved brand while campaigns say "TCR_ACCEPTED".

export type BrandOutcome = "approved" | "pending" | "failed";

export function mapBrandStatus(telnyxStatus: string | undefined | null): BrandOutcome {
  const s = (telnyxStatus || "").toUpperCase();
  if (s === "OK" || s === "VERIFIED" || s === "APPROVED") return "approved";
  if (s === "FAILED" || s === "REGISTRATION_FAILED" || s === "EXPIRED") return "failed";
  return "pending";
}

export type CampaignOutcome = "approved" | "pending" | "failed";

export function mapCampaignStatus(
  campaignStatus: string | undefined | null,
  submissionStatus?: string | undefined | null
): CampaignOutcome {
  const c = (campaignStatus || "").toUpperCase();
  const s = (submissionStatus || "").toUpperCase();
  if (s === "FAILED" || c === "TCR_FAILED" || c === "MNO_REJECTED") return "failed";
  if (c === "TCR_ACCEPTED" || c === "ACTIVE" || c === "MNO_ACCEPTED") return "approved";
  return "pending";
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
  stage: "brand" | "campaign"
): string | null {
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
