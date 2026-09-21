// ── Shared Telnyx 10DLC helpers ────────────────────────────────────────────
//
// Both the interactive route (/api/register-10dlc) and the background driver
// (/api/messaging/advance) register brands and campaigns. The campaign
// payload in particular is carrier-reviewed compliance copy — if the two
// paths drifted, a customer's registration would describe something different
// depending on which code path submitted it. So it lives here once.

/**
 * What we charge a customer's wallet for a phone number. Lives here so the
 * interactive purchase route and the background driver can never drift to
 * different prices.
 */
export const NUMBER_PURCHASE_COST = 1.5;

const telnyxApiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

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

export async function fetchBrand(brandId: string) {
  return telnyxFetch(`/10dlc/brand/${brandId}`);
}

export async function fetchCampaign(campaignId: string) {
  return telnyxFetch(`/10dlc/campaign/${campaignId}`);
}

export type CampaignPayloadArgs = {
  brandId: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
};

/**
 * The 10DLC campaign registration body.
 *
 * Copied verbatim from the original inline payload in /api/register-10dlc so
 * that extracting it changes nothing a carrier sees. Edit with care: every
 * string here is read by TCR and the mobile network operators during review,
 * and the opt-in/opt-out/help language is what makes the campaign compliant.
 */
export function buildCampaignPayload(args: CampaignPayloadArgs) {
  const { brandId, businessName, contactEmail, contactPhone, websiteUrl } = args;
  return {
    brandId,
    usecase: "MIXED",
    subUsecases: ["MARKETING", "CUSTOMER_CARE"],
    description: `${businessName} uses Text2Sale to send marketing promotions, appointment reminders, follow-up messages, and customer service notifications via SMS to customers and leads who have voluntarily opted in to receive text messages.`,
    messageFlow: `Consumers opt in to receive SMS messages by voluntarily providing their phone number through the business website at ${websiteUrl} or through an in-person paper sign-up form. The opt-in form clearly discloses: (1) the types of messages they will receive, (2) that message frequency varies, (3) that message and data rates may apply, (4) instructions to reply STOP to opt out, (5) instructions to reply HELP for help, and (6) a link to the privacy policy at https://text2sale.com/privacy-policy. Consent to receive messages is not a condition of any purchase. Written consent with timestamp is recorded before any messages are sent.`,
    helpMessage: `${businessName}: For help, contact us at ${contactEmail} or call ${contactPhone}. Msg frequency varies. Msg&data rates may apply. Reply STOP to opt out.`,
    helpKeywords: "HELP,INFO",
    optinMessage: `${businessName}: You are now subscribed to receive text messages. Msg frequency varies. Msg&data rates may apply. Reply HELP for help. Reply STOP to unsubscribe. Privacy policy: https://text2sale.com/privacy-policy`,
    optinKeywords: "START,SUBSCRIBE,YES",
    optoutMessage: `${businessName}: You have been unsubscribed and will no longer receive text messages. Reply START to re-subscribe. Contact ${contactEmail} for questions.`,
    optoutKeywords: "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
    sample1: `Hi Sarah, ${businessName} here! We have new health coverage options that could save you money this enrollment period. Reply for details or visit ${websiteUrl}. Reply STOP to unsubscribe. Msg&data rates may apply.`,
    sample2: `Hi John, this is ${businessName}. Your account has been updated and your new policy documents are ready to view. If you have any questions, reply to this message or call us at ${contactPhone}. Reply STOP to opt out. Msg&data rates may apply.`,
    embeddedLink: true,
    embeddedPhone: false,
    numberPool: false,
    ageGated: false,
    directLending: false,
    subscriberOptin: true,
    subscriberOptout: true,
    subscriberHelp: true,
    termsAndConditions: true,
  };
}

export async function createCampaign(args: CampaignPayloadArgs) {
  return telnyxFetch("/v2/10dlc/campaignBuilder", {
    method: "POST",
    body: JSON.stringify(buildCampaignPayload(args)),
  });
}

// ── Number provisioning ────────────────────────────────────────────────────
// Mirrors the search/order behaviour of /api/buy-number: SMS-only local
// numbers, because voice-capable locals cost roughly double and the
// click-to-call feature is gated off.

type ApiFeature = string | { name?: string };
type ApiNumber = { phone_number: string; features?: ApiFeature[] };

export async function findAvailableNumber(areaCode?: string): Promise<string | null> {
  const params = new URLSearchParams({
    "filter[country_code]": "US",
    "filter[features]": "sms",
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
    return feats.includes("sms");
  });

  return candidates[0]?.phone_number || null;
}

export type OrderResult = { ok: true; number: string } | { ok: false; error: string };

export async function orderNumber(e164: string): Promise<OrderResult> {
  const res = await fetch("https://api.telnyx.com/v2/number_orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${telnyxApiKey}`,
    },
    body: JSON.stringify({
      phone_numbers: [{ phone_number: e164 }],
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

  return { ok: true, number: e164 };
}
