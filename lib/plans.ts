// ── Text2Sale plans and retail rates ───────────────────────────────────────
// The one place subscription prices, plan features and customer usage rates
// are defined. Checkout, the pricing pages, upgrade dialogs, entitlement
// checks and wallet charges all read from here (usage rates are re-exported
// from lib/call-pricing.ts and lib/sms-pricing.ts, which the billing paths
// already use), so a price shown is the price charged.
//
// The subscription pays for software access; the prepaid wallet pays for
// usage (minutes, segments, AI); phone numbers and messaging registration
// are separate pass-through charges. None of them turn into each other.

import {
  AI_CALL_RATE_PER_MIN,
  CALL_RATE_FORWARD_PER_MIN,
  CALL_RATE_INBOUND_PER_MIN,
  CALL_RATE_OUTBOUND_PER_MIN,
} from "./call-pricing";
import { AI_REPLY_FEE, STANDARD_SMS_RATE_PER_SEGMENT, VOLUME_SMS_RATE_PER_SEGMENT } from "./sms-pricing";

/** Bump when any price below changes, so stored quotes can be traced. */
export const PRICING_VERSION = "2026-10-20";

export type PlanKey = "text" | "dialer" | "complete";
export type Capability = "texting" | "calling";

export type Plan = {
  key: PlanKey;
  name: string;
  /** Monthly subscription per user, USD. */
  price: number;
  capabilities: Capability[];
  tagline: string;
  includes: string[];
  excludes: string[];
};

export const PLANS: Record<PlanKey, Plan> = {
  text: {
    key: "text",
    name: "Text2Sale Text",
    price: 39.99,
    capabilities: ["texting"],
    tagline: "Texting, campaigns and AI text replies",
    includes: [
      "Contacts, CSV uploads, field mapping and saved lead lists",
      "Two-way SMS conversations",
      "Campaigns with multiple messages, delays, personalization and spintax",
      "AI text replies, qualification and appointment booking",
      "Calendar integration, lead intake integrations and reporting",
    ],
    excludes: ["Manual, power and predictive dialing", "AI receptionist for incoming calls"],
  },
  dialer: {
    key: "dialer",
    name: "Text2Sale Dialer",
    price: 89.99,
    capabilities: ["calling"],
    tagline: "Manual, power and predictive dialing with an AI receptionist",
    includes: [
      "Contacts, CSV uploads, field mapping and saved calling lists",
      "Manual, power and predictive dialing (up to 3 lines)",
      "Call outcomes, notes, history, callbacks and transfers",
      "AI receptionist for incoming calls (minutes billed separately)",
      "Appointment booking and calendar integration",
      "Calling stats and team call sharing",
    ],
    excludes: ["Texting inbox, SMS campaigns and AI text replies"],
  },
  complete: {
    key: "complete",
    name: "Text2Sale Complete",
    price: 119.99,
    capabilities: ["texting", "calling"],
    tagline: "Everything in Text and Dialer",
    includes: ["Everything in Text2Sale Text", "Everything in Text2Sale Dialer"],
    excludes: [],
  },
};

export const PLAN_KEYS: PlanKey[] = ["text", "dialer", "complete"];

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "text" || value === "dialer" || value === "complete";
}

/** Order used to tell an upgrade (more capabilities / higher price) from a downgrade. */
export function isUpgrade(from: PlanKey, to: PlanKey): boolean {
  return PLANS[to].price > PLANS[from].price;
}

/** Monthly savings of Complete over buying Text and Dialer separately. */
export const COMPLETE_SAVINGS = +(PLANS.text.price + PLANS.dialer.price - PLANS.complete.price).toFixed(2);

// ── Usage rates (prepaid wallet) ─────────────────────────────────────────
// Re-exported from the modules the billing code already charges with.
export const USAGE_RATES = {
  smsPerSegment: STANDARD_SMS_RATE_PER_SEGMENT,
  smsVolumePerSegment: VOLUME_SMS_RATE_PER_SEGMENT,
  inboundSms: 0,
  aiReplyFee: AI_REPLY_FEE,
  outboundCallPerMin: CALL_RATE_OUTBOUND_PER_MIN,
  inboundCallPerMin: CALL_RATE_INBOUND_PER_MIN,
  forwardedCallPerMin: CALL_RATE_FORWARD_PER_MIN,
  /** A live dialer call moved to a cell keeps two outbound legs open. */
  transferredToCellPerMin: +(CALL_RATE_OUTBOUND_PER_MIN * 2).toFixed(4),
  aiReceptionistPerMin: AI_CALL_RATE_PER_MIN,
  localNumberMonthly: 1.5,
  numberActivation: 0,
} as const;

/** Messaging registration pass-through fees (Telnyx 10DLC). Not charged to voice-only accounts. */
export const REGISTRATION_FEES = {
  brand: 4.5,
  campaignReview: 15,
  lowVolumeCampaignMonthly: 1.5,
  standardCampaignMonthly: 10,
  /** Campaign fees are billed three months up front at registration. */
  upfrontCampaignMonths: 3,
} as const;
