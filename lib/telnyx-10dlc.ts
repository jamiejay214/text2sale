// ── Shared Telnyx 10DLC helpers ────────────────────────────────────────────
//
// The interactive route (/api/register-10dlc) and the background driver
// (lib/messaging-driver.ts) both register brands and campaigns. The payloads
// are carrier-reviewed compliance copy, so they live here once — if the two
// paths drifted, a customer's registration would describe something different
// depending on which code path happened to submit it.

import { smsConsentText, smsProgramResponses } from "./sms-consent";
import { getIndustry, industryToVertical } from "./industries";
import { classifyTelnyxError, flattenTelnyxErrors, type ErrorKind } from "./messaging-status";

/**
 * What we charge a customer's wallet for a phone number. Lives here so the
 * interactive purchase route and the background driver can never drift to
 * different prices.
 */
export const NUMBER_PURCHASE_COST = 0;
export const NUMBER_MONTHLY_FEE = 1.5;
export const TEN_DLC_BRAND_FEE = 4.5;
export const TEN_DLC_CAMPAIGN_REVIEW_FEE = 15;
export const TEN_DLC_MIXED_MONTHLY_FEE = 1.5;

const telnyxApiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

/** Legacy helper: returns the parsed body only, so HTTP status is lost. */
export async function telnyxFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.telnyx.com${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${telnyxApiKey}`,
      ...options?.headers,
    },
  });
  return res.json();
}

export type TelnyxResponse = {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  /** No HTTP response at all (DNS, timeout, reset). */
  network: boolean;
};

/**
 * Like telnyxFetch but keeps the status code and never throws. The status is
 * what separates "your EIN is invalid" from "our Telnyx balance ran out" from
 * "Telnyx is having a bad minute", and the driver treats those three very
 * differently.
 */
export async function telnyxRequest(path: string, options?: RequestInit): Promise<TelnyxResponse> {
  try {
    const res = await fetch(`https://api.telnyx.com${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxApiKey}`,
        ...options?.headers,
      },
      signal: AbortSignal.timeout(25_000),
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, network: false };
  } catch {
    return { ok: false, status: 0, json: null, network: true };
  }
}

export async function fetchBrand(brandId: string) {
  return telnyxFetch(`/10dlc/brand/${brandId}`);
}

export async function fetchCampaign(campaignId: string) {
  return telnyxFetch(`/10dlc/campaign/${campaignId}`);
}

// ── Brand ──────────────────────────────────────────────────────────────────

// Sole proprietors with an EIN register as PRIVATE_PROFIT: Telnyx's
// SOLE_PROPRIETOR entity type takes a different path (no EIN, OTP
// verification) that this flow does not collect for.
export function toEntityType(businessType: string): "PRIVATE_PROFIT" | "NON_PROFIT" {
  return businessType === "non_profit" ? "NON_PROFIT" : "PRIVATE_PROFIT";
}

const clip = (v: string, max: number) => v.trim().slice(0, max);

function e164(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return `+1${digits}`;
}

export type BrandInput = {
  businessName: string;
  businessType: string;
  ein: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  website: string;
  industry?: string | null;
};

export function buildBrandPayload(input: BrandInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    entityType: toEntityType(input.businessType),
    displayName: clip(input.businessName, 100),
    companyName: clip(input.businessName, 100),
    ein: input.ein.replace(/\D/g, ""),
    einIssuingCountry: "US",
    phone: e164(input.phone),
    street: clip(input.street, 100),
    city: clip(input.city, 100),
    state: input.state.trim().toUpperCase().slice(0, 2),
    postalCode: clip(input.postalCode, 10),
    country: "US",
    email: input.email.trim(),
    // Was hard-coded to INSURANCE for every customer.
    vertical: industryToVertical(input.industry),
    website: clip(input.website, 100),
  };
  if (input.firstName) payload.firstName = input.firstName;
  if (input.lastName) payload.lastName = input.lastName;
  return payload;
}

export type SubmitFailure = { ok: false; kind: ErrorKind; message: string };

export async function submitBrand(
  input: BrandInput
): Promise<{ ok: true; brandId: string; status?: string } | SubmitFailure> {
  const res = await telnyxRequest("/v2/10dlc/brand", {
    method: "POST",
    body: JSON.stringify(buildBrandPayload(input)),
  });

  const errors = res.json?.errors;
  const brandId = res.json?.brandId;
  if (!res.ok || errors || typeof brandId !== "string") {
    const c = classifyTelnyxError({
      status: res.status,
      errors,
      network: res.network,
      message: res.network ? "Could not reach Telnyx" : undefined,
    });
    return { ok: false, ...c };
  }
  return { ok: true, brandId, status: typeof res.json?.status === "string" ? res.json.status : undefined };
}

// ── Campaign ───────────────────────────────────────────────────────────────

export type CampaignPayloadArgs = {
  brandId: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  /** The brand's site — the address shown on the sample texts. */
  websiteUrl: string;
  industry?: string | null;
  /** Policy pages the carriers read. Default to paths under websiteUrl. */
  optInUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  /** Caller-supplied id; Telnyx rejects a second campaign with the same one. */
  referenceId?: string;
};

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * The 10DLC campaign registration body.
 *
 * Every string here is read by TCR and the mobile network operators during
 * review. Three things in the first version caused avoidable rejections and
 * are fixed here:
 *   - the privacy link pointed at text2sale.com instead of the brand's own
 *     site, and the dedicated privacyPolicyLink / termsAndConditionsLink /
 *     embeddedLinkSample fields were never sent;
 *   - the sample texts were written for health insurance whatever the
 *     customer sold, which is the classic "samples don't match the business"
 *     rejection;
 *   - one sample contained a phone number while embeddedPhone said false.
 */
export function buildCampaignPayload(args: CampaignPayloadArgs) {
  const { brandId, businessName, contactEmail, contactPhone } = args;
  const site = trimSlash(args.websiteUrl);
  const optInUrl = args.optInUrl || `${site}/opt-in`;
  const privacyUrl = args.privacyPolicyUrl || `${site}/privacy-policy`;
  const termsUrl = args.termsUrl || `${site}/terms`;
  const industry = getIndustry(args.industry);
  const [sample1, sample2] = industry.samples({ business: businessName, phone: contactPhone, site });

  const responses = smsProgramResponses(businessName, contactEmail, contactPhone);
  const payload: Record<string, unknown> = {
    brandId,
    usecase: "MIXED",
    subUsecases: ["MARKETING", "CUSTOMER_CARE"],
    description: `${businessName} is a ${industry.businessNoun}. ${businessName} uses Text2Sale to send marketing and customer care messages, including ${industry.messageTypes}, by SMS to customers and prospects who have voluntarily opted in to receive text messages from ${businessName}. Message frequency varies.`,
    messageFlow: `Consumers visit ${site} and select the SMS Opt-In link in the footer to open the publicly accessible form at ${optInUrl}; no account or login is required. They enter their name and mobile phone number and may separately select an optional SMS consent checkbox, which is unchecked by default. The exact disclosure beside the checkbox is: "${smsConsentText(businessName, industry.messageTypes)}". The form includes functional Privacy Policy (${privacyUrl}) and Terms of Service (${termsUrl}) links. Submitting without selecting SMS consent records an inquiry only and does not subscribe the visitor or send any SMS. When the checkbox is selected, the system records the disclosure, source URL, timestamp and consent before sending messages. A confirmation identifies ${businessName}, frequency, rates and STOP/HELP instructions when the registered sending number is active. STOP requests are honored immediately.`,
    helpMessage: responses.help,
    helpKeywords: "HELP,INFO",
    optinMessage: responses.optIn,
    optinKeywords: "START,SUBSCRIBE,YES",
    optoutMessage: responses.optOut,
    optoutKeywords: "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
    sample1,
    sample2,
    embeddedLink: true,
    embeddedLinkSample: site,
    // sample2 includes the business phone number, so this must be true.
    embeddedPhone: true,
    numberPool: false,
    ageGated: false,
    directLending: false,
    subscriberOptin: true,
    subscriberOptout: true,
    subscriberHelp: true,
    termsAndConditions: true,
    privacyPolicyLink: privacyUrl,
    termsAndConditionsLink: termsUrl,
  };
  if (args.referenceId) payload.referenceId = args.referenceId;
  return payload;
}

/** Raw Telnyx response; kept for callers that read the fields it echoes back. */
export async function createCampaign(args: CampaignPayloadArgs) {
  return telnyxFetch("/v2/10dlc/campaignBuilder", {
    method: "POST",
    body: JSON.stringify(buildCampaignPayload(args)),
  });
}

export type CampaignSubmitted = {
  ok: true;
  campaignId: string;
  campaignStatus?: string;
  description?: string;
  messageFlow?: string;
  sampleMessages: string[];
  optInMessage?: string;
  optOutMessage?: string;
  helpMessage?: string;
};

export async function submitCampaign(args: CampaignPayloadArgs): Promise<CampaignSubmitted | SubmitFailure> {
  const res = await telnyxRequest("/v2/10dlc/campaignBuilder", {
    method: "POST",
    body: JSON.stringify(buildCampaignPayload(args)),
  });

  const errors = res.json?.errors;
  const campaignId = res.json?.campaignId;
  if (!res.ok || errors || typeof campaignId !== "string") {
    const c = classifyTelnyxError({
      status: res.status,
      errors,
      network: res.network,
      message: res.network ? "Could not reach Telnyx" : undefined,
    });
    // A duplicate referenceId means an earlier attempt already created this
    // campaign (a concurrent run, or a crash after Telnyx accepted it). That
    // is not an error to surface — back off and let the caller look again.
    if (/reference ?id/i.test(c.message) && /(exist|duplicate|unique|already)/i.test(c.message)) {
      return { ok: false, kind: "transient", message: "Campaign already submitted — waiting for it to appear" };
    }
    return { ok: false, ...c };
  }

  const j = res.json;
  return {
    ok: true,
    campaignId,
    campaignStatus: typeof j.campaignStatus === "string" ? j.campaignStatus : undefined,
    description: j.description,
    messageFlow: j.messageFlow,
    sampleMessages: [j.sample1, j.sample2].filter((x: unknown): x is string => typeof x === "string" && !!x),
    optInMessage: j.optinMessage,
    optOutMessage: j.optoutMessage,
    helpMessage: j.helpMessage,
  };
}

/** Plain-text reason for a Telnyx errors payload, for logs and admin screens. */
export function describeTelnyxErrors(errors: unknown): string {
  return flattenTelnyxErrors(errors);
}

export async function assignNumberToCampaign(e164: string, campaignId: string) {
  // Associate a phone number with an approved 10DLC campaign on Telnyx.
  //
  // CORRECT ENDPOINT (verified live against this account, 2026-06):
  //   POST /v2/10dlc/phone_number_campaigns   body: { phoneNumber, campaignId }
  // The snake_case /v2/phone_number_campaigns route returns 404 (error
  // 10005 "Resource not found") on this account — it does not exist here.
  // An earlier comment had these two reversed, which is why every
  // self-serve purchase silently failed to link to its campaign (David's
  // numbers, and Jamie's, all "bought but never assigned"). The GET list
  // and POST both only work under the /v2/10dlc/ prefix with camelCase.
  //
  // A successful POST returns 200 with { assignmentStatus: "PENDING_ASSIGNMENT" }
  // (no `data` wrapper, `errors: null`). PENDING_ASSIGNMENT counts as
  // assigned — Telnyx just propagates the T-Mobile/AT&T number mapping
  // over the next few hours.
  //
  // Retry because a freshly-ordered number isn't assignable until it goes
  // "active" (can lag ~30-60s); until then the API returns 10005.
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch("https://api.telnyx.com/v2/10dlc/phone_number_campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${telnyxApiKey}`,
      },
      body: JSON.stringify({ phoneNumber: e164, campaignId }),
    });
    const data = await res.json().catch(() => ({}));
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    // Success: 200 with an assignmentStatus and no error payload.
    if (res.ok && errors.length === 0 && typeof data?.assignmentStatus === "string") {
      return { assigned: true as const };
    }
    const detail = errors.length
      ? errors.map((e: { detail?: string; title?: string }) => e.detail || e.title || "").join(", ")
      : typeof data?.error === "string"
        ? data.error
        : "";
    // "already assigned" is fine — idempotent success.
    if (/already/i.test(detail) && /assigned|exists/i.test(detail)) {
      return { assigned: true as const };
    }
    // Number not active/indexed yet → transient, keep retrying. Telnyx
    // phrases this as 10005 "could not be found" while the order settles.
    const transient = /not found|could not be found|provisioning|does not exist|not yet|pending/i.test(detail);
    if (!transient) {
      return { assigned: false as const, error: detail || `HTTP ${res.status}` };
    }
  }
  return { assigned: false as const, error: "Timed out waiting for number to be provisioned" };
}

// ── Number provisioning ────────────────────────────────────────────────────
// Both activation and interactive purchases require SMS + voice capabilities.

type ApiFeature = string | { name?: string };
type ApiNumber = { phone_number: string; features?: ApiFeature[] };

export async function findAvailableNumber(areaCode?: string): Promise<string | null> {
  const params = new URLSearchParams({
    "filter[country_code]": "US",
    "filter[features]": "sms,voice",
    "filter[phone_number_type]": "local",
    "filter[limit]": "40",
  });
  if (areaCode) params.set("filter[national_destination_code]", areaCode);

  const res = await fetch(`https://api.telnyx.com/v2/available_phone_numbers?${params}`, {
    headers: { Authorization: `Bearer ${telnyxApiKey}` },
  });
  const data = await res.json().catch(() => ({}));

  const candidates = ((data?.data as ApiNumber[] | undefined) || []).filter((n) => {
    const feats = (n.features || []).map((f: ApiFeature) =>
      (typeof f === "string" ? f : f?.name || "").toLowerCase()
    );
    return feats.includes("sms") && feats.includes("voice");
  });

  return candidates[0]?.phone_number || null;
}

export type OrderResult =
  | { ok: true; number: string; orderId: string | null }
  | { ok: false; error: string };

export async function orderNumber(e164Number: string): Promise<OrderResult> {
  const res = await fetch("https://api.telnyx.com/v2/number_orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${telnyxApiKey}`,
    },
    body: JSON.stringify({
      phone_numbers: [{ phone_number: e164Number }],
      messaging_profile_id: messagingProfileId,
    }),
  });
  const data = await res.json().catch(() => ({}));

  // Same broad failure detection as /api/buy-number: a non-2xx, either error
  // shape Telnyx uses, or an order document that came back in a state that
  // isn't going to complete. Missing one of these is how a customer gets
  // charged for a number that never arrives.
  const errors = Array.isArray(data?.errors)
    ? (data.errors as Array<{ detail?: string; title?: string }>)
    : [];
  const topLevelError = typeof data?.error === "string" ? data.error : null;
  const status = (data?.data as { status?: string } | undefined)?.status;
  const failed =
    !res.ok ||
    errors.length > 0 ||
    !!topLevelError ||
    (status && !["pending", "success", "complete", "completed"].includes(status));

  if (failed) {
    const msg =
      errors.map((e) => e.detail || e.title).filter(Boolean).join(", ") ||
      topLevelError ||
      `Order failed (HTTP ${res.status})`;
    return { ok: false, error: msg };
  }

  const orderId = (data?.data as { id?: string } | undefined)?.id ?? null;

  // "pending" is a normal first answer, but an order can still land in
  // "failure" a few seconds later — after the customer has been charged.
  // Look again briefly so that case refunds instead of leaving them paying
  // for a number that never arrives. Still pending after the wait is treated
  // as success: orders normally complete in seconds, and the attach step
  // already retries until the number is active.
  if (orderId && status === "pending") {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const check = await telnyxRequest(`/v2/number_orders/${orderId}`);
      const s = (check.json?.data as { status?: string } | undefined)?.status;
      if (s === "failure") return { ok: false, error: "Telnyx could not complete the number order" };
      if (s === "success") break;
    }
  }

  return { ok: true, number: e164Number, orderId };
}
