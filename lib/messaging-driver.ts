// ── Activation driver ──────────────────────────────────────────────────────
//
// Moves a customer from "submitted my business details" to "texting is live"
// without anyone clicking anything and without a browser open:
//
//   business submitted -> website live -> brand submitted -> brand approved
//     -> campaign submitted -> campaign approved -> number bought + attached
//     -> ACTIVE
//
// It runs from the minute cron (/api/messaging/advance) and is also called
// straight away by the routes that start or retry an activation, so the
// customer sees progress immediately instead of waiting for the next tick.
//
// Three rules shape everything below:
//
//   1. Pay first. Brand and campaign registration cost money on our Telnyx
//      account, and a number or domain costs money on theirs. Nothing is
//      bought for an account that isn't paying, and wallet purchases debit
//      before the supplier is called and refund if it fails.
//
//   2. Not every failure is the customer's. An invalid EIN is theirs to fix;
//      our Telnyx balance running out is ours; a timeout is nobody's. Only
//      the first kind is shown to the customer as a problem. The others hold
//      the account in place and raise an alert for the operator, so a
//      customer is never told their details are wrong because of our balance.
//
//   3. Everything is retryable and idempotent. Accounts are claimed with a
//      lease so overlapping runs can't double-buy, campaigns carry a
//      reference id so Telnyx refuses a duplicate, and a crashed run simply
//      lets the lease expire.

import { createClient } from "@supabase/supabase-js";
import type { A2PRegistration, OwnedNumber } from "./types";
import {
  MAX_ATTEMPTS,
  PENDING_STATUSES,
  isEntitled,
  isMessagingStatus,
  legacyStatusFor,
  mapBrandStatus,
  mapCampaignStatus,
  nextAttemptDelayMinutes,
  parseFailureReasons,
  type MessagingStatus,
} from "./messaging-status";
import {
  TEN_DLC_BRAND_FEE,
  TEN_DLC_CAMPAIGN_REVIEW_FEE,
  assignNumberToCampaign,
  findAvailableNumber,
  orderNumber,
  submitBrand,
  submitCampaign,
  telnyxRequest,
} from "./telnyx-10dlc";
import { MAIN_SITE, getUniqueSlug, probeComplianceSite, probeSite, siteBase, siteUrls, toSlug, type Db } from "./business-site";
import { ensureDomainAttached, purchaseDomainForUser } from "./domain-purchase";
import { sendAdminAlertSMS } from "./admin-alert";

/**
 * Auto-purchase kill switch for phone numbers.
 *
 * Registration advancement only reads status and submits paperwork. Buying a
 * number spends real money on a customer's wallet, so it stays off unless
 * MESSAGING_AUTOBUY is explicitly "true". With it off, accounts advance to
 * CAMPAIGN_APPROVED and wait there, visibly, until it is switched on.
 */
const AUTOBUY_ENABLED = process.env.MESSAGING_AUTOBUY === "true";

/** How long a claimed account is reserved for. */
const LEASE_MINUTES = 5;

/** Minimum gap between SMS alerts for the same problem on the same account. */
const ALERT_COOLDOWN_HOURS = 12;

/** After this long waiting on a customer's site, tell the operator. */
const SITE_WAIT_ALERT_HOURS = 48;

export type Registration = Partial<A2PRegistration> & Record<string, unknown>;

export type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  industry: string | null;
  subscription_status: string | null;
  free_subscription: boolean | null;
  wallet_balance: number | string | null;
  custom_domain: string | null;
  business_slug: string | null;
  messaging_status: MessagingStatus;
  messaging_status_at: string | null;
  messaging_attempts: number;
  messaging_error: string | null;
  a2p_registration: Registration | null;
  owned_numbers: OwnedNumber[] | null;
};

export const PROFILE_COLUMNS =
  "id, email, phone, first_name, last_name, industry, subscription_status, free_subscription, wallet_balance, custom_domain, business_slug, messaging_status, messaging_status_at, messaging_attempts, messaging_error, a2p_registration, owned_numbers";

/** Outcome of advancing one account, for run summaries and API responses. */
export type StepResult = { userId: string; from: MessagingStatus; to: MessagingStatus; note?: string };

const hoursSince = (iso: string | null | undefined) =>
  iso ? Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000) : 0;

function notifyAdmin(text: string) {
  void sendAdminAlertSMS(text).catch(() => {});
}

function businessLabel(profile: ProfileRow): string {
  return (profile.a2p_registration?.businessName as string | undefined) || profile.email || profile.id.slice(0, 8);
}

// ── Status writes ──────────────────────────────────────────────────────────

type SetOpts = {
  /** Shown to the customer when the status needs their action. */
  error?: string | null;
  /**
   * advance  made progress — reset the retry budget, hold the lease
   * backoff  nothing to report yet — retry later and count the attempt
   * hold     waiting on someone else — retry later without burning attempts
   */
  mode?: "advance" | "backoff" | "hold";
  holdMinutes?: number;
  /** With "hold": the account just made progress, so also reset the retry budget. */
  resetAttempts?: boolean;
  patch?: Partial<Registration>;
  /** An operator-facing problem. null clears; omitted clears on "advance". */
  alert?: { code: string; message: string } | null;
};

/**
 * Persist a status change, keeping the legacy JSONB status in step so the
 * existing dashboard doesn't show something different from the new UI.
 *
 * `messaging_status_at` only moves when the status actually changes. It used
 * to be bumped on every poll, which made "how long has this been stuck"
 * unanswerable.
 */
export async function setStatus(db: Db, profile: ProfileRow, status: MessagingStatus, opts: SetOpts = {}) {
  const mode = opts.mode ?? "advance";
  const changed = status !== profile.messaging_status;
  const attempts =
    mode === "backoff"
      ? profile.messaging_attempts + 1
      : mode === "hold" && !opts.resetAttempts
        ? profile.messaging_attempts
        : 0;
  const now = new Date().toISOString();

  const reg: Registration = { ...(profile.a2p_registration || {}), ...(opts.patch || {}) };
  if (reg.awaiting && status !== "AWAITING_PAYMENT") reg.awaiting = null;

  const stage = reg.campaignSid ? "campaign" : "brand";
  const legacy = legacyStatusFor(status, stage, reg.awaiting ?? null);
  if (legacy) reg.status = legacy as A2PRegistration["status"];
  reg.updatedAt = now;
  reg.errors = opts.error ? [opts.error] : [];

  // Operator alerts: raise (with an SMS, rate-limited), clear on progress.
  let notifyText: string | null = null;
  const prev = reg.adminAlert ?? null;
  if (opts.alert) {
    const sameProblem = prev?.code === opts.alert.code;
    const cooled = !prev?.notifiedAt || hoursSince(prev.notifiedAt) >= ALERT_COOLDOWN_HOURS;
    reg.adminAlert = {
      code: opts.alert.code,
      message: opts.alert.message,
      at: sameProblem && prev?.at ? prev.at : now,
      notifiedAt: sameProblem && !cooled ? prev?.notifiedAt : now,
    };
    if (!sameProblem || cooled) {
      notifyText = `⚠️ Text2Sale activation needs you\n${businessLabel(profile)}\n${opts.alert.message}`;
    }
  } else if (opts.alert === null || mode === "advance" || opts.resetAttempts) {
    reg.adminAlert = null;
  }

  if (mode === "backoff" && attempts >= MAX_ATTEMPTS && !opts.alert) {
    reg.adminAlert = {
      code: "stalled",
      message: `Automatic retries exhausted after ${attempts} attempts.`,
      at: now,
      notifiedAt: now,
    };
    notifyText = `⚠️ Text2Sale activation stalled\n${businessLabel(profile)}\nRetries exhausted — retry it from the admin Pipeline.`;
  }

  const delay =
    mode === "backoff"
      ? nextAttemptDelayMinutes(attempts)
      : mode === "hold"
        ? (opts.holdMinutes ?? 15)
        : LEASE_MINUTES; // advanced a stage: keep the lease so no one else starts it again
  const next = new Date(Date.now() + delay * 60_000).toISOString();

  await db
    .from("profiles")
    .update({
      messaging_status: status,
      ...(changed ? { messaging_status_at: now } : {}),
      messaging_error: opts.error ?? null,
      messaging_attempts: attempts,
      messaging_next_attempt_at: next,
      a2p_registration: reg,
    })
    .eq("id", profile.id);

  // Keep the in-memory copy consistent so one run can carry an account
  // through several stages without re-reading it.
  const wasStatus = profile.messaging_status;
  profile.messaging_status = status;
  if (changed) profile.messaging_status_at = now;
  profile.messaging_attempts = attempts;
  profile.messaging_error = opts.error ?? null;
  profile.a2p_registration = reg;

  if (notifyText) notifyAdmin(notifyText);
  if (changed && status === "REJECTED") {
    notifyAdmin(`❌ Text2Sale registration rejected\n${businessLabel(profile)}\n${opts.error || "No reason given"}`);
  }
  if (changed && status === "ACTIVE" && wasStatus !== "ACTIVE") {
    notifyAdmin(`✅ Text2Sale texting is live\n${businessLabel(profile)}`);
  }
}

/**
 * Debit a carrier registration/review fee exactly once per submission attempt.
 * The marker lives in a2p_registration so driver retries cannot double-charge.
 */
async function ensureCarrierFee(
  db: Db,
  profile: ProfileRow,
  opts: {
    attempt: number;
    paidThroughKey: "brandFeePaidThrough" | "campaignFeePaidThrough";
    amount: number;
    awaiting: "brand" | "campaign";
    resumeStatus: MessagingStatus;
    label: string;
  }
): Promise<boolean> {
  const reg = profile.a2p_registration || {};
  if (Number(reg[opts.paidThroughKey] || 0) >= opts.attempt) return true;

  const { data: newBalance, error } = await db.rpc("decrement_wallet", {
    p_user_id: profile.id,
    p_amount: opts.amount,
  });

  if (error) {
    await setStatus(db, profile, opts.resumeStatus, {
      mode: "hold",
      holdMinutes: 15,
      alert: { code: "carrier_fee_billing", message: `Could not reserve ${opts.label} fee: ${error.message}` },
    });
    return false;
  }

  if (newBalance === null || newBalance === undefined) {
    await setStatus(db, profile, "AWAITING_PAYMENT", {
      mode: "hold",
      holdMinutes: 5,
      error: `Add funds for the ${opts.amount.toFixed(2)} ${opts.label} carrier fee.`,
      patch: { awaiting: opts.awaiting } as Partial<Registration>,
    });
    return false;
  }

  await setStatus(db, profile, opts.resumeStatus, {
    patch: {
      [opts.paidThroughKey]: opts.attempt,
      awaiting: null,
    } as Partial<Registration>,
  });

  // Make every pass-through fee visible in the customer's billing history.
  try {
    const { data: current } = await db
      .from("profiles")
      .select("usage_history")
      .eq("id", profile.id)
      .single();
    const history = Array.isArray(current?.usage_history) ? current!.usage_history : [];
    await db
      .from("profiles")
      .update({
        usage_history: [
          {
            id: `${opts.awaiting}_fee_${opts.attempt}_${Date.now()}`,
            type: "charge",
            amount: opts.amount,
            description: `Carrier fee — ${opts.label} (submission ${opts.attempt})`,
            createdAt: new Date().toISOString(),
            status: "succeeded",
          },
          ...history,
        ],
      })
      .eq("id", profile.id);
  } catch (historyError) {
    console.error("[messaging-driver] carrier fee history write failed:", historyError);
  }

  profile.wallet_balance = Number(newBalance);
  return true;
}

/** Re-read the row after a helper wrote to it directly. */
async function refresh(db: Db, profile: ProfileRow) {
  const { data } = await db.from("profiles").select(PROFILE_COLUMNS).eq("id", profile.id).single();
  if (data) Object.assign(profile, data as unknown as ProfileRow);
}

const done = (profile: ProfileRow, from: MessagingStatus, note: string): StepResult => ({
  userId: profile.id,
  from,
  to: profile.messaging_status,
  note,
});

// ── Website ────────────────────────────────────────────────────────────────

type WebsiteOutcome =
  | { ok: true }
  | { ok: false; action: "hold"; minutes: number; note: string; alert?: { code: string; message: string } }
  | { ok: false; action: "backoff"; note: string; alert?: { code: string; message: string } }
  | { ok: false; action: "funds"; note: string }
  | { ok: false; action: "reject"; message: string };

/**
 * Make sure the customer's website exists and answers before anything is
 * submitted to Telnyx. Carriers load the site during review; one that 404s or
 * doesn't resolve is rejected, and a rejection means paying the brand fee
 * again.
 */
async function ensureWebsite(db: Db, profile: ProfileRow): Promise<WebsiteOutcome> {
  const reg = profile.a2p_registration || {};
  if (reg.siteLiveAt && reg.website && Number(reg.siteVerifiedVersion || 0) >= 3) return { ok: true };

  const inStage = hoursSince(profile.messaging_status_at);
  const patchLive = async (website: string) => {
    reg.website = website;
    reg.siteLiveAt = new Date().toISOString();
    reg.siteVerifiedVersion = 3;
    profile.a2p_registration = { ...reg };
  };

  // ── The customer's own site ──
  if (reg.websiteMode === "own") {
    const url = reg.website;
    if (!url) return { ok: false, action: "reject", message: "Add your website address to continue." };
    const businessName = String(reg.businessName || "");
    const probe = await probeSite(url, businessName || undefined);
    if (!probe.live) {
      return {
        ok: false,
        action: "hold",
        minutes: 20,
        note: probe.reason,
        alert:
          inStage > SITE_WAIT_ALERT_HOURS
            ? { code: "site_down", message: `Customer's website ${url} isn't reachable: ${probe.reason}` }
            : undefined,
      };
    }
    const consentBase = `${MAIN_SITE}/biz/${profile.business_slug || ""}`;
    const compliance = await probeComplianceSite(consentBase, businessName);
    if (!compliance.live) {
      return {
        ok: false,
        action: "hold",
        minutes: 3,
        note: compliance.reason,
        alert:
          inStage > SITE_WAIT_ALERT_HOURS
            ? { code: "site_compliance", message: `Hosted consent pages are not ready: ${compliance.reason}` }
            : undefined,
      };
    }
    await patchLive(url);
    return { ok: true };
  }

  // ── A site we host ──
  if (!profile.business_slug) {
    const base = toSlug(String(reg.businessName || "")) || `site-${profile.id.slice(0, 6)}`;
    profile.business_slug = await getUniqueSlug(db, base, profile.id);
    await db.from("profiles").update({ business_slug: profile.business_slug }).eq("id", profile.id);
  }

  if (!profile.custom_domain) {
    const chosen = reg.domainRequest;
    if (!chosen?.domain) {
      return { ok: false, action: "hold", minutes: 60, note: "Waiting for the customer to choose a website address" };
    }

    // Pay first: purchaseDomainForUser debits the wallet before it asks the
    // registrar for anything, and refunds if the registrar refuses.
    const result = await purchaseDomainForUser(db, profile.id, chosen.domain, chosen.price);
    await refresh(db, profile);
    if (!result.ok) {
      switch (result.code) {
        case "pending":
          return { ok: false, action: "hold", minutes: 2, note: result.message };
        case "insufficient":
          return { ok: false, action: "funds", note: result.message };
        case "not_configured":
          return {
            ok: false,
            action: "hold",
            minutes: 60,
            note: result.message,
            alert: {
              code: "domain_registrar",
              message: `Domain registrar isn't configured (${result.message}). Set VERCEL_API_TOKEN, VERCEL_PROJECT_ID and VERCEL_TEAM_ID.`,
            },
          };
        case "registrar":
          return {
            ok: false,
            action: "backoff",
            note: result.message,
            alert:
              profile.messaging_attempts >= 3
                ? { code: "domain_registrar", message: `Domain registration keeps failing: ${result.message}` }
                : undefined,
          };
        default:
          // invalid, unavailable, price_changed, missing_details: the customer
          // has to choose again.
          return { ok: false, action: "reject", message: result.message };
      }
    }
  }

  const domain = profile.custom_domain!;
  const name = String(profile.a2p_registration?.businessName || "");
  const probe = await probeComplianceSite(`https://${domain}`, name);
  if (!probe.live) {
    // A purchase can succeed while the attach failed, and a domain the
    // customer already owned needs attaching too. Both are safe to repeat.
    const attachError = await ensureDomainAttached(domain);
    const reason = attachError ? `${probe.reason}; attach: ${attachError}` : probe.reason;
    return {
      ok: false,
      action: "hold",
      minutes: 3,
      note: reason,
      alert:
        inStage > SITE_WAIT_ALERT_HOURS
          ? { code: "site_slow", message: `https://${domain} still isn't serving the business page after ${Math.round(inStage)}h: ${reason}` }
          : undefined,
    };
  }

  await patchLive(`https://${domain}`);
  return { ok: true };
}

// ── Numbers ────────────────────────────────────────────────────────────────

function displayNumber(e164: string): { digits: string; display: string } {
  const digits = e164.replace(/\D/g, "").replace(/^1/, "");
  return { digits, display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` };
}

/**
 * Record a number in the table inbound routing and 1:1 sending check.
 * Without this row a customer can be handed a number they can't text from:
 * /api/send-sms and /api/send-campaign refuse a number the user "doesn't own".
 */
async function ensureOwnedRow(db: Db, userId: string, digits: string, display: string) {
  try {
    const { data: existing } = await db
      .from("owned_phone_numbers")
      .select("id")
      .eq("user_id", userId)
      .eq("digits", digits)
      .maybeSingle();
    if (!existing) await db.from("owned_phone_numbers").insert({ user_id: userId, digits, formatted: display });
  } catch (e) {
    console.error("[messaging-driver] owned_phone_numbers write failed:", e);
  }
}

type NumberOutcome =
  | { status: "NUMBER_ASSIGNED"; note: string }
  | { status: "CAMPAIGN_APPROVED"; note: string; hold?: boolean };

/** Buy (if needed) and attach a number. There is no upfront customer charge. */
async function provisionNumber(db: Db, profile: ProfileRow): Promise<NumberOutcome> {
  const reg = profile.a2p_registration || {};
  const campaignId = reg.campaignSid;
  if (!campaignId) return { status: "CAMPAIGN_APPROVED", note: "No campaign to attach a number to" };

  // Numbers they already hold: attach every one. Attaching is idempotent
  // (Telnyx reports an already-assigned number as success), and there is no
  // per-number record of which campaign a number belongs to, so we simply
  // make sure each is attached and never sell them another.
  const owned = (Array.isArray(profile.owned_numbers) ? profile.owned_numbers : []).filter((n) => n && n.number);
  if (owned.length > 0) {
    let attached = 0;
    let lastError = "";
    for (const n of owned.slice(0, 10)) {
      const { digits, display } = displayNumber(n.number);
      await ensureOwnedRow(db, profile.id, digits, display);
      const res = await assignNumberToCampaign(`+1${digits}`, campaignId);
      if (res.assigned) attached++;
      else lastError = res.error || "attach failed";
    }
    if (attached === Math.min(owned.length, 10)) return { status: "NUMBER_ASSIGNED", note: `Attached ${attached} number(s)` };
    return { status: "CAMPAIGN_APPROVED", note: `Attach failed: ${lastError}` };
  }

  if (!AUTOBUY_ENABLED) {
    // Hold at CAMPAIGN_APPROVED rather than AWAITING_PAYMENT. The customer
    // sees "Approved — getting your number", which is true, instead of being
    // asked for funds that would not unblock anything. Switching it on
    // resumes these accounts on the next run.
    return {
      status: "CAMPAIGN_APPROVED",
      note: "Auto-purchase is off — set MESSAGING_AUTOBUY=true to buy numbers automatically",
      hold: true,
    };
  }

  // Search first: nothing should move in the wallet if there's nothing to buy.
  let candidate = await findAvailableNumber(reg.desiredAreaCode || undefined);
  if (!candidate && reg.desiredAreaCode) {
    // The customer's area code is sold out. Rather than leave them stuck,
    // fall back to any local number — they can swap it from Settings.
    candidate = await findAvailableNumber(undefined);
  }
  if (!candidate) return { status: "CAMPAIGN_APPROVED", note: "No SMS-capable numbers available right now" };

  const order = await orderNumber(candidate);
  if (!order.ok) {
    return { status: "CAMPAIGN_APPROVED", note: `Order failed: ${order.error}` };
  }

  // Record the number before attaching. If attachment lags, a later run
  // finishes the job. Re-read the columns we're about to extend so a
  // concurrent purchase isn't overwritten.
  const { digits, display } = displayNumber(order.number);
  const { data: current } = await db
    .from("profiles")
    .select("owned_numbers, usage_history")
    .eq("id", profile.id)
    .single();
  const ownedNow = Array.isArray(current?.owned_numbers) ? (current!.owned_numbers as OwnedNumber[]) : [];
  const usage = Array.isArray(current?.usage_history) ? (current!.usage_history as unknown[]) : [];
  const entry = { id: order.orderId || `num_${digits}`, number: display, alias: `Sales Line ${ownedNow.length + 1}` };
  await db
    .from("profiles")
    .update({
      owned_numbers: [...ownedNow, entry],
      usage_history: [
        ...usage,
        {
          id: `number_${Date.now()}`,
          type: "number_purchase",
          amount: 0,
          description: `Connected number ${display} — $1.50/month`,
          createdAt: new Date().toISOString(),
          status: "succeeded",
        },
      ],
    })
    .eq("id", profile.id);
  profile.owned_numbers = [...ownedNow, entry];
  await ensureOwnedRow(db, profile.id, digits, display);

  const assigned = await assignNumberToCampaign(order.number, campaignId);
  if (!assigned.assigned) {
    // Number is owned but not yet attached — retry attachment later.
    return { status: "CAMPAIGN_APPROVED", note: `Bought ${order.number}, attach pending: ${assigned.error}` };
  }
  return { status: "NUMBER_ASSIGNED", note: `Provisioned ${order.number}` };
}

// ── The state machine ──────────────────────────────────────────────────────

/** Statuses whose next step spends money — ours (Telnyx fees) or the customer's (domain, number). */
const SPENDING_STATUSES: MessagingStatus[] = ["BUSINESS_SUBMITTED", "BRAND_APPROVED", "CAMPAIGN_APPROVED", "AWAITING_PAYMENT"];

function campaignInputs(profile: ProfileRow, reg: Registration) {
  const slug = profile.business_slug || "";
  const hosted = reg.websiteMode !== "own" && !!profile.custom_domain;
  // Policy and opt-in pages always exist on the hosted site. When the
  // customer brought their own website, the brand is registered against that
  // but the consent flow lives on the page we host for them.
  const consentBase = hosted ? siteBase({ customDomain: profile.custom_domain, slug }) : `${MAIN_SITE}/biz/${slug}`;
  const urls = siteUrls(consentBase);
  return {
    // Sample texts point at the customer's own address: their domain when we
    // host the site (older rows were registered against a text2sale.com path
    // before the domain existed), or the site they brought.
    websiteUrl: hosted ? consentBase : String(reg.website || consentBase),
    optInUrl: urls.optIn,
    privacyPolicyUrl: urls.privacy,
    termsUrl: urls.terms,
  };
}

/** Advance one account as far as it will go this run. */
async function advance(db: Db, profile: ProfileRow): Promise<StepResult> {
  const from = profile.messaging_status;
  let note = "";

  for (let hop = 0; hop < 7; hop++) {
    const reg = profile.a2p_registration || {};
    let status = profile.messaging_status;

    // Resume the correct stage after the customer adds funds.
    const awaiting = status === "AWAITING_PAYMENT" ? reg.awaiting : null;
    if (awaiting === "domain" || awaiting === "brand") status = "BUSINESS_SUBMITTED";
    if (awaiting === "campaign") status = "BRAND_APPROVED";
    if (awaiting === "number") status = "CAMPAIGN_APPROVED";

    // ── Pay-first gate ────────────────────────────────────────────────────
    // Polling Telnyx for status is free; everything after it isn't. An
    // account that has stopped paying keeps its place and resumes on its own
    // once the subscription is back.
    if (SPENDING_STATUSES.includes(profile.messaging_status) && !isEntitled(profile)) {
      await setStatus(db, profile, profile.messaging_status, { mode: "hold", holdMinutes: 30, error: null });
      return done(profile, from, "waiting for an active subscription");
    }

    // ── Business submitted: website, then brand ───────────────────────────
    if (status === "BUSINESS_SUBMITTED") {
      const site = await ensureWebsite(db, profile);
      if (!site.ok) {
        if (site.action === "reject") {
          await setStatus(db, profile, "REJECTED", { error: site.message });
          return done(profile, from, "website needs the customer");
        }
        if (site.action === "funds") {
          await setStatus(db, profile, "AWAITING_PAYMENT", {
            mode: "hold",
            holdMinutes: 5,
            error: site.note,
            patch: { awaiting: "domain" },
          });
          return done(profile, from, site.note);
        }
        if (site.action === "backoff") {
          await setStatus(db, profile, "BUSINESS_SUBMITTED", { mode: "backoff", alert: site.alert, patch: { awaiting: null } });
          return done(profile, from, site.note);
        }
        await setStatus(db, profile, "BUSINESS_SUBMITTED", {
          mode: "hold",
          holdMinutes: site.minutes,
          alert: site.alert ?? undefined,
          patch: { awaiting: null, siteNote: site.note } as Partial<Registration>,
        });
        return done(profile, from, site.note);
      }

      const r = profile.a2p_registration || {};

      // A brand that already exists (a re-submission after the campaign was
      // rejected reuses the approved one) is checked, never bought again.
      if (r.brandRegistrationSid) {
        await setStatus(db, profile, "BRAND_PENDING");
        continue;
      }

      const brandAttempt = (Number(r.brandSubmissions) || 0) + 1;
      const brandFeeReady = await ensureCarrierFee(db, profile, {
        attempt: brandAttempt,
        paidThroughKey: "brandFeePaidThrough",
        amount: TEN_DLC_BRAND_FEE,
        awaiting: "brand",
        resumeStatus: "BUSINESS_SUBMITTED",
        label: "10DLC business registration",
      });
      if (!brandFeeReady) return done(profile, from, "waiting for brand carrier fee");

      const submitted = await submitBrand({
        businessName: String(r.businessName || ""),
        businessType: String(r.businessType || "llc"),
        ein: String(r.ein || ""),
        street: String(r.businessAddress || ""),
        city: String(r.businessCity || ""),
        state: String(r.businessState || ""),
        postalCode: String(r.businessZip || ""),
        phone: String(r.contactPhone || profile.phone || ""),
        email: String(r.contactEmail || profile.email || ""),
        firstName: profile.first_name,
        lastName: profile.last_name,
        website: String(r.website || ""),
        industry: profile.industry || (r.industry as string | undefined),
      });

      if (!submitted.ok) {
        if (submitted.kind === "data") {
          await setStatus(db, profile, "REJECTED", { error: submitted.message });
          return done(profile, from, "brand refused");
        }
        if (submitted.kind === "platform") {
          await setStatus(db, profile, "BUSINESS_SUBMITTED", {
            mode: "hold",
            holdMinutes: 30,
            alert: { code: "telnyx_platform", message: `Telnyx refused the brand submission: ${submitted.message}` },
            patch: { siteNote: undefined } as Partial<Registration>,
          });
          return done(profile, from, `platform: ${submitted.message}`);
        }
        await setStatus(db, profile, "BUSINESS_SUBMITTED", { mode: "backoff" });
        return done(profile, from, `transient: ${submitted.message}`);
      }

      // Brand review takes minutes at best — check back shortly rather than
      // polling in the same breath.
      await setStatus(db, profile, "BRAND_PENDING", {
        mode: "hold",
        holdMinutes: 1,
        resetAttempts: true,
        patch: {
          brandRegistrationSid: submitted.brandId,
          brandStatus: submitted.status || "REGISTRATION_PENDING",
          brandSubmissions: (r.brandSubmissions ?? 0) + 1,
        },
      });
      return done(profile, from, "brand submitted");
    }

    // ── Brand review ──────────────────────────────────────────────────────
    if (status === "BRAND_PENDING") {
      if (!reg.brandRegistrationSid) {
        await setStatus(db, profile, "BUSINESS_SUBMITTED");
        continue;
      }
      const res = await telnyxRequest(`/v2/10dlc/brand/${reg.brandRegistrationSid}`);
      if (res.network || res.status >= 500 || !res.json) {
        await setStatus(db, profile, "BRAND_PENDING", { mode: "backoff" });
        return done(profile, from, "brand status unavailable");
      }
      if (!res.ok) {
        // A 4xx on a read is our credentials or a deleted brand, not progress.
        await setStatus(db, profile, "BRAND_PENDING", {
          mode: "hold",
          holdMinutes: 30,
          alert: { code: "telnyx_platform", message: `Could not read brand status (HTTP ${res.status})` },
        });
        return done(profile, from, `brand read failed ${res.status}`);
      }
      const brand = res.json;
      const outcome = mapBrandStatus(brand.status);
      if (outcome === "failed") {
        await setStatus(db, profile, "REJECTED", {
          error: parseFailureReasons(brand.failureReasons) || "Business verification was rejected",
          patch: { brandStatus: brand.status },
        });
        return done(profile, from, "brand rejected");
      }
      if (outcome === "pending") {
        await setStatus(db, profile, "BRAND_PENDING", { mode: "backoff", patch: { brandStatus: brand.status } });
        return done(profile, from, "brand pending");
      }
      await setStatus(db, profile, "BRAND_APPROVED", {
        patch: { brandStatus: brand.status, brandIdentityStatus: brand.identityStatus ?? null },
      });
      note = "brand approved";
      continue;
    }

    // ── Campaign submission ───────────────────────────────────────────────
    if (status === "BRAND_APPROVED") {
      if (reg.campaignSid) {
        await setStatus(db, profile, "CAMPAIGN_PENDING");
        continue;
      }
      // Recheck immediately before the paid campaign review, even if the
      // site passed earlier during brand verification.
      const inputs = campaignInputs(profile, reg);
      const compliance = await probeComplianceSite(inputs.optInUrl.replace(/\/opt-in$/, ""), String(reg.businessName || ""));
      if (!compliance.live) {
        await setStatus(db, profile, "BRAND_APPROVED", {
          mode: "hold", holdMinutes: 3,
          error: compliance.reason,
          alert: { code: "site_compliance", message: compliance.reason },
        });
        return done(profile, from, "website compliance checks failed before campaign review");
      }
      const attempt = (reg.campaignAttempt ?? 0) + 1;
      const campaignFeeReady = await ensureCarrierFee(db, profile, {
        attempt,
        paidThroughKey: "campaignFeePaidThrough",
        amount: TEN_DLC_CAMPAIGN_REVIEW_FEE,
        awaiting: "campaign",
        resumeStatus: "BRAND_APPROVED",
        label: "10DLC campaign review",
      });
      if (!campaignFeeReady) return done(profile, from, "waiting for campaign carrier fee");

      const submitted = await submitCampaign({
        brandId: String(reg.brandRegistrationSid),
        businessName: String(reg.businessName || "Text2Sale User"),
        contactEmail: String(reg.contactEmail || profile.email || ""),
        contactPhone: String(reg.contactPhone || profile.phone || ""),
        industry: profile.industry || (reg.industry as string | undefined),
        referenceId: `t2s-${profile.id}-${attempt}`,
        ...inputs,
      });

      if (!submitted.ok) {
        if (submitted.kind === "data") {
          await setStatus(db, profile, "REJECTED", { error: submitted.message });
          return done(profile, from, "campaign refused");
        }
        if (submitted.kind === "platform") {
          await setStatus(db, profile, "BRAND_APPROVED", {
            mode: "hold",
            holdMinutes: 30,
            alert: { code: "telnyx_platform", message: `Telnyx refused the campaign submission: ${submitted.message}` },
          });
          return done(profile, from, `platform: ${submitted.message}`);
        }
        await setStatus(db, profile, "BRAND_APPROVED", { mode: "backoff" });
        return done(profile, from, `transient: ${submitted.message}`);
      }

      await setStatus(db, profile, "CAMPAIGN_PENDING", {
        mode: "hold",
        holdMinutes: 2,
        resetAttempts: true,
        patch: {
          campaignSid: submitted.campaignId,
          campaignStatus: submitted.campaignStatus || "TCR_PENDING",
          campaignAttempt: attempt,
          description: submitted.description || "",
          sampleMessages: submitted.sampleMessages,
          messageFlow: submitted.messageFlow || "",
          optInMessage: submitted.optInMessage || "",
          optOutMessage: submitted.optOutMessage || "",
          helpMessage: submitted.helpMessage || "",
          useCase: "MIXED",
        },
      });
      return done(profile, from, "campaign submitted");
    }

    // ── Campaign review ───────────────────────────────────────────────────
    if (status === "CAMPAIGN_PENDING") {
      if (!reg.campaignSid) {
        await setStatus(db, profile, "BRAND_APPROVED");
        continue;
      }
      const res = await telnyxRequest(`/v2/10dlc/campaign/${reg.campaignSid}`);
      if (res.network || res.status >= 500 || !res.json) {
        await setStatus(db, profile, "CAMPAIGN_PENDING", { mode: "backoff" });
        return done(profile, from, "campaign status unavailable");
      }
      if (!res.ok) {
        await setStatus(db, profile, "CAMPAIGN_PENDING", {
          mode: "hold",
          holdMinutes: 30,
          alert: { code: "telnyx_platform", message: `Could not read campaign status (HTTP ${res.status})` },
        });
        return done(profile, from, `campaign read failed ${res.status}`);
      }
      const campaign = res.json;
      const outcome = mapCampaignStatus(campaign.campaignStatus, campaign.submissionStatus);
      if (outcome === "failed") {
        const reason = parseFailureReasons(campaign.failureReasons);
        await setStatus(db, profile, "REJECTED", {
          error: reason || `Messaging registration was rejected (${campaign.campaignStatus || campaign.submissionStatus})`,
          patch: { campaignStatus: campaign.campaignStatus },
        });
        return done(profile, from, "campaign rejected");
      }
      if (outcome === "pending") {
        await setStatus(db, profile, "CAMPAIGN_PENDING", { mode: "backoff", patch: { campaignStatus: campaign.campaignStatus } });
        return done(profile, from, "campaign pending");
      }
      await setStatus(db, profile, "CAMPAIGN_APPROVED", { patch: { campaignStatus: campaign.campaignStatus } });
      note = "campaign approved";
      continue;
    }

    // ── Number ────────────────────────────────────────────────────────────
    if (status === "CAMPAIGN_APPROVED") {
      const result = await provisionNumber(db, profile);
      note = result.note;
      if (result.status === "NUMBER_ASSIGNED") {
        await setStatus(db, profile, "NUMBER_ASSIGNED");
        continue;
      }
      if (result.hold) {
        await setStatus(db, profile, "CAMPAIGN_APPROVED", { mode: "hold", holdMinutes: 15, error: result.note });
        return done(profile, from, note);
      }
      await setStatus(db, profile, "CAMPAIGN_APPROVED", { mode: "backoff", error: result.note });
      return done(profile, from, note);
    }

    if (status === "NUMBER_ASSIGNED") {
      await setStatus(db, profile, "ACTIVE", { error: null });
      return { userId: profile.id, from, to: "ACTIVE", note: note || "activated" };
    }

    break;
  }

  return done(profile, from, note);
}

// ── Claiming and entry points ──────────────────────────────────────────────

/**
 * Atomically claim an account for this run.
 *
 * The cron fires every minute but a run over a full batch can take longer,
 * so two runs can overlap. Without a claim both would see an account with no
 * numbers, both would pass the wallet debit, and both would order a number —
 * the customer pays twice and gets two numbers.
 *
 * The conditional update is the lock: it only matches while the row is still
 * due, so exactly one run wins and the loser skips the account. The lease
 * doubles as the retry time, so a run that dies mid-flight simply lets the
 * account become due again rather than stranding it.
 */
async function claim(db: Db, profile: ProfileRow): Promise<boolean> {
  const leaseUntil = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("profiles")
    .update({ messaging_next_attempt_at: leaseUntil })
    .eq("id", profile.id)
    .or(`messaging_next_attempt_at.is.null,messaging_next_attempt_at.lte.${nowIso}`)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

async function advanceClaimed(db: Db, profile: ProfileRow): Promise<StepResult> {
  try {
    return await advance(db, profile);
  } catch (e) {
    // One bad account must not stop the batch, and must not look like
    // progress either.
    console.error("[messaging-driver] account failed:", profile.id, e);
    try {
      await setStatus(db, profile, profile.messaging_status, {
        mode: "backoff",
        error: null,
        patch: { lastException: e instanceof Error ? e.message.slice(0, 300) : "Unexpected error" } as Partial<Registration>,
      });
    } catch {
      /* the status write failed too — the lease expires and the next run retries */
    }
    return done(profile, profile.messaging_status, `error: ${e instanceof Error ? e.message : "unexpected"}`);
  }
}

/**
 * Advance one account now. `force` makes it due immediately (admin retry,
 * or the customer has just submitted their details); it still takes the
 * lease, so it can't collide with the cron.
 */
export async function advanceUser(db: Db, userId: string, opts: { force?: boolean } = {}): Promise<StepResult | null> {
  if (opts.force) {
    await db
      .from("profiles")
      .update({ messaging_next_attempt_at: new Date().toISOString() })
      .eq("id", userId)
      .in("messaging_status", [...PENDING_STATUSES]);
  }
  const { data } = await db.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).single();
  if (!data) return null;
  const profile = data as unknown as ProfileRow;
  if (!isMessagingStatus(profile.messaging_status) || !PENDING_STATUSES.includes(profile.messaging_status)) {
    return done(profile, profile.messaging_status, "nothing to do");
  }
  if (!(await claim(db, profile))) return done(profile, profile.messaging_status, "already being processed");
  return advanceClaimed(db, profile);
}

/** Accounts per cron run, and how many are worked on at once. */
const BATCH_SIZE = 24;
const CONCURRENCY = 4;

export async function runBatch(db: Db) {
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("messaging_status", [...PENDING_STATUSES])
    .or(`messaging_next_attempt_at.is.null,messaging_next_attempt_at.lte.${new Date().toISOString()}`)
    .lt("messaging_attempts", MAX_ATTEMPTS)
    .order("messaging_next_attempt_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) return { error, results: [] as StepResult[], examined: 0 };

  const rows = (data || []) as unknown as ProfileRow[];
  const results: StepResult[] = [];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const out = await Promise.all(
      chunk.map(async (profile) => {
        // Skip anything a concurrent run already took.
        if (!(await claim(db, profile))) return null;
        return advanceClaimed(db, profile);
      })
    );
    for (const r of out) if (r) results.push(r);
  }
  return { error: null, results, examined: rows.length, autobuy: AUTOBUY_ENABLED };
}

export function createServiceClient(): Db {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export { AUTOBUY_ENABLED };
