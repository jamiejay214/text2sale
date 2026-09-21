import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assignNumberToCampaign } from "@/app/api/buy-number/route";
import {
  createCampaign,
  fetchBrand,
  fetchCampaign,
  findAvailableNumber,
  orderNumber,
  NUMBER_PURCHASE_COST,
} from "@/lib/telnyx-10dlc";
import {
  MAX_ATTEMPTS,
  MessagingStatus,
  PENDING_STATUSES,
  legacyStatusFor,
  mapBrandStatus,
  mapCampaignStatus,
  nextAttemptDelayMinutes,
} from "@/lib/messaging-status";

// ── Activation driver ──────────────────────────────────────────────────────
//
// Advances every in-flight texting activation without a browser open.
//
// Before this existed the dashboard drove the flow itself: submit the brand,
// then poll in a `for` loop for ~3 minutes waiting on approval. Campaign
// review routinely takes hours, so any customer who closed the tab — which is
// most of them — left their activation parked forever until they happened to
// come back and click again.
//
// Now the browser's only job is to display status. This cron owns progress:
//   brand approved  -> create the campaign
//   campaign approved -> buy a number (after charging for it) and attach it
//   number attached -> texting is ACTIVE
//
// Purchases are strictly pay-first. The wallet is debited before Telnyx is
// asked for anything billable, and refunded if the order then fails. An
// account that cannot cover the fee parks in AWAITING_PAYMENT and resumes by
// itself on a later run once the balance is topped up — no support ticket and
// no button for the customer to rediscover.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Accounts advanced per run. Keeps one run inside the function time limit. */
const BATCH_SIZE = 25;

/**
 * How long a claimed account is reserved for. Long enough to cover the
 * Telnyx round-trips one account needs, short enough that a crashed run
 * frees it again quickly.
 */
const LEASE_MINUTES = 5;

type Registration = Record<string, unknown> & {
  brandRegistrationSid?: string;
  campaignSid?: string;
  businessName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  desiredAreaCode?: string;
  errors?: string[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  messaging_status: MessagingStatus;
  messaging_attempts: number;
  a2p_registration: Registration | null;
  owned_numbers: Array<{ number: string; campaignId?: string }> | null;
};

// Matches how the rest of the API routes type the service-role client; the
// generated database types aren't wired up in this project.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = ReturnType<typeof createClient<any, any, any>>;

/** Outcome of advancing one account, for the run summary. */
type StepResult = { userId: string; from: MessagingStatus; to: MessagingStatus; note?: string };

function stageOf(status: MessagingStatus): "brand" | "campaign" {
  return status === "BUSINESS_SUBMITTED" || status === "BRAND_PENDING" || status === "BRAND_APPROVED"
    ? "brand"
    : "campaign";
}

/**
 * Persist a status change, keeping the legacy JSONB blob in step so the
 * existing dashboard doesn't show something different from the new UI.
 */
async function setStatus(
  db: Db,
  profile: ProfileRow,
  status: MessagingStatus,
  opts: { error?: string | null; reschedule?: boolean; registrationPatch?: Registration } = {}
) {
  const attempts = opts.reschedule ? profile.messaging_attempts + 1 : 0;
  const reg: Registration = { ...(profile.a2p_registration || {}), ...(opts.registrationPatch || {}) };

  const legacy = legacyStatusFor(status, stageOf(profile.messaging_status));
  if (legacy) reg.status = legacy;
  reg.updatedAt = new Date().toISOString();
  if (opts.error) reg.errors = [opts.error];

  // Rescheduling backs the account off; otherwise it just advanced a stage,
  // so hold the lease rather than marking it due immediately. Releasing here
  // would let a concurrent run claim an account this run is still working
  // through and, for example, create a second campaign for it.
  const nextAttempt = opts.reschedule
    ? new Date(Date.now() + nextAttemptDelayMinutes(attempts) * 60_000).toISOString()
    : new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();

  await db
    .from("profiles")
    .update({
      messaging_status: status,
      messaging_status_at: new Date().toISOString(),
      messaging_error: opts.error ?? null,
      messaging_attempts: attempts,
      messaging_next_attempt_at: nextAttempt,
      a2p_registration: reg,
    })
    .eq("id", profile.id);

  // Keep the in-memory copy consistent so a single run can advance an account
  // through several stages without re-reading it.
  profile.messaging_status = status;
  profile.messaging_attempts = attempts;
  profile.a2p_registration = reg;
}

/**
 * Buy and attach a number. Charges first, refunds on failure.
 * Returns the status the account should land in.
 */
async function provisionNumber(db: Db, profile: ProfileRow): Promise<{ status: MessagingStatus; note: string }> {
  const reg = profile.a2p_registration || {};
  const campaignId = reg.campaignSid;
  if (!campaignId) return { status: "REJECTED", note: "No campaign to attach a number to" };

  // Already holds a number: attach it rather than selling them another.
  const owned = Array.isArray(profile.owned_numbers) ? profile.owned_numbers : [];
  const unattached = owned.find((n) => n && n.number && !n.campaignId);
  if (unattached) {
    const res = await assignNumberToCampaign(unattached.number.replace(/[^\d+]/g, ""), campaignId);
    if (res.assigned) return { status: "NUMBER_ASSIGNED", note: `Attached existing ${unattached.number}` };
    return { status: "CAMPAIGN_APPROVED", note: `Attach failed: ${res.error}` };
  }
  if (owned.length > 0) {
    // Every number they own is already attached — nothing left to buy.
    return { status: "NUMBER_ASSIGNED", note: "Existing numbers already attached" };
  }

  // ── Pay first ───────────────────────────────────────────────────────────
  // decrement_wallet is atomic and returns null when the balance is short, so
  // a concurrent run can't double-spend and we can't order a number the
  // customer hasn't paid for.
  const { data: newBalance, error: debitErr } = await db.rpc("decrement_wallet", {
    p_user_id: profile.id,
    p_amount: NUMBER_PURCHASE_COST,
  });
  if (debitErr || newBalance === null) {
    return {
      status: "AWAITING_PAYMENT",
      note: `Insufficient balance — needs $${NUMBER_PURCHASE_COST.toFixed(2)}`,
    };
  }

  const refund = async (why: string) => {
    try {
      await db.rpc("credit_wallet", {
        p_user_id: profile.id,
        p_amount: NUMBER_PURCHASE_COST,
        p_idempotency_key: null,
        p_description: `Refund — auto-provision failed: ${why.slice(0, 80)}`,
      });
    } catch (e) {
      console.error("[messaging/advance] refund failed — needs reconciliation:", profile.id, e);
    }
  };

  const candidate = await findAvailableNumber(reg.desiredAreaCode);
  if (!candidate) {
    await refund("no numbers available");
    return { status: "CAMPAIGN_APPROVED", note: "No SMS numbers available in that area code" };
  }

  const order = await orderNumber(candidate);
  if (!order.ok) {
    await refund(order.error);
    return { status: "CAMPAIGN_APPROVED", note: `Order failed: ${order.error}` };
  }

  // Record the number before attaching. If attachment lags, the customer
  // still owns what they paid for and a later run finishes the job.
  const entry = {
    number: order.number,
    purchasedAt: new Date().toISOString(),
    autoProvisioned: true,
  };
  await db
    .from("profiles")
    .update({ owned_numbers: [...owned, entry] })
    .eq("id", profile.id);
  profile.owned_numbers = [...owned, entry];

  const assigned = await assignNumberToCampaign(order.number, campaignId);
  if (!assigned.assigned) {
    // Paid for, owned, not yet attached — retry attachment, don't refund.
    return { status: "CAMPAIGN_APPROVED", note: `Bought ${order.number}, attach pending: ${assigned.error}` };
  }

  return { status: "NUMBER_ASSIGNED", note: `Provisioned ${order.number}` };
}

/**
 * Atomically claim an account for this run.
 *
 * The cron fires every minute but a run over a full batch can take longer
 * than that, so two runs can overlap. Without a claim both would see an
 * account with no numbers, both would pass the wallet debit, and both would
 * order a number — the customer pays twice and gets two numbers.
 *
 * The conditional update is the lock: it only matches while the row is still
 * due, so exactly one run wins and the loser skips the account. The lease
 * doubles as the retry time, so a run that dies mid-flight simply lets the
 * account become due again rather than stranding it.
 */
async function claim(db: Db, profile: ProfileRow): Promise<boolean> {
  const leaseUntil = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
  const { data } = await db
    .from("profiles")
    .update({ messaging_next_attempt_at: leaseUntil })
    .eq("id", profile.id)
    .lte("messaging_next_attempt_at", new Date().toISOString())
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/** Advance one account as far as it will go this run. */
async function advance(db: Db, profile: ProfileRow): Promise<StepResult> {
  const from = profile.messaging_status;
  let note = "";

  // Up to four hops so a single run can go brand-approved -> campaign ->
  // number -> active when everything is ready, instead of making the customer
  // wait a full cron interval per stage.
  for (let hop = 0; hop < 4; hop++) {
    const reg = profile.a2p_registration || {};
    const status = profile.messaging_status;

    if (status === "BUSINESS_SUBMITTED" || status === "BRAND_PENDING") {
      if (!reg.brandRegistrationSid) {
        await setStatus(db, profile, "REJECTED", { error: "No brand registration on file" });
        return { userId: profile.id, from, to: profile.messaging_status, note: "missing brand id" };
      }
      const brand = await fetchBrand(reg.brandRegistrationSid);
      const outcome = mapBrandStatus(brand?.status);
      if (outcome === "failed") {
        await setStatus(db, profile, "REJECTED", {
          error: brand?.failureReasons?.[0]?.description || "Business verification was rejected",
        });
        return { userId: profile.id, from, to: profile.messaging_status, note: "brand rejected" };
      }
      if (outcome === "pending") {
        await setStatus(db, profile, "BRAND_PENDING", { reschedule: true });
        return { userId: profile.id, from, to: profile.messaging_status, note: "brand pending" };
      }
      await setStatus(db, profile, "BRAND_APPROVED");
      note = "brand approved";
      continue;
    }

    if (status === "BRAND_APPROVED") {
      const created = await createCampaign({
        brandId: reg.brandRegistrationSid!,
        businessName: reg.businessName || "Text2Sale User",
        contactEmail: reg.contactEmail || profile.email || "",
        contactPhone: reg.contactPhone || profile.phone || "",
        websiteUrl: reg.website || "https://text2sale.com",
      });
      if (created?.errors) {
        const msg = created.errors
          .map((e: { detail?: string; title?: string }) => e.detail || e.title)
          .join(", ");
        await setStatus(db, profile, "REJECTED", { error: msg });
        return { userId: profile.id, from, to: profile.messaging_status, note: "campaign rejected" };
      }
      await setStatus(db, profile, "CAMPAIGN_PENDING", {
        registrationPatch: {
          campaignSid: created.campaignId,
          campaignStatus: created.campaignStatus || "TCR_PENDING",
        } as Registration,
      });
      note = "campaign created";
      continue;
    }

    if (status === "CAMPAIGN_PENDING") {
      if (!reg.campaignSid) {
        await setStatus(db, profile, "BRAND_APPROVED");
        continue;
      }
      const campaign = await fetchCampaign(reg.campaignSid);
      const outcome = mapCampaignStatus(campaign?.campaignStatus, campaign?.submissionStatus);
      if (outcome === "failed") {
        const msg =
          campaign?.failureReasons?.map((f: { description: string }) => f.description).join(", ") ||
          "Messaging registration was rejected";
        await setStatus(db, profile, "REJECTED", { error: msg });
        return { userId: profile.id, from, to: profile.messaging_status, note: "campaign rejected" };
      }
      if (outcome === "pending") {
        await setStatus(db, profile, "CAMPAIGN_PENDING", { reschedule: true });
        return { userId: profile.id, from, to: profile.messaging_status, note: "campaign pending" };
      }
      await setStatus(db, profile, "CAMPAIGN_APPROVED");
      note = "campaign approved";
      continue;
    }

    if (status === "CAMPAIGN_APPROVED" || status === "AWAITING_PAYMENT") {
      const result = await provisionNumber(db, profile);
      note = result.note;
      if (result.status === "NUMBER_ASSIGNED") {
        await setStatus(db, profile, "NUMBER_ASSIGNED");
        continue;
      }
      // AWAITING_PAYMENT or a retryable provisioning failure: back off and
      // try again rather than burning the account's attempt budget instantly.
      await setStatus(db, profile, result.status, { error: result.note, reschedule: true });
      return { userId: profile.id, from, to: profile.messaging_status, note };
    }

    if (status === "NUMBER_ASSIGNED") {
      await setStatus(db, profile, "ACTIVE", { error: null });
      return { userId: profile.id, from, to: "ACTIVE", note: note || "activated" };
    }

    break;
  }

  return { userId: profile.id, from, to: profile.messaging_status, note };
}

export async function GET(req: NextRequest) {
  // Fail closed, same as the billing cron: without a configured secret we
  // refuse rather than letting anyone trigger purchases.
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) {
    console.error("[messaging/advance] CRON_SECRET not configured — refusing to run");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(supabaseUrl, serviceKey);

  const { data, error } = await db
    .from("profiles")
    .select("id, email, phone, messaging_status, messaging_attempts, a2p_registration, owned_numbers")
    .in("messaging_status", PENDING_STATUSES)
    .lte("messaging_next_attempt_at", new Date().toISOString())
    .lt("messaging_attempts", MAX_ATTEMPTS)
    .order("messaging_next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[messaging/advance] query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const profiles = (data || []) as unknown as ProfileRow[];
  const results: StepResult[] = [];

  for (const profile of profiles) {
    try {
      // Skip anything a concurrent run already took.
      if (!(await claim(db, profile))) continue;
      results.push(await advance(db, profile));
    } catch (e) {
      // One bad account must not stop the batch.
      console.error("[messaging/advance] account failed:", profile.id, e);
      try {
        await setStatus(db, profile, profile.messaging_status, {
          error: e instanceof Error ? e.message : "Unexpected error",
          reschedule: true,
        });
      } catch {
        /* status write failed too — next run picks it up */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    examined: profiles.length,
    activated: results.filter((r) => r.to === "ACTIVE").length,
    awaitingPayment: results.filter((r) => r.to === "AWAITING_PAYMENT").length,
    rejected: results.filter((r) => r.to === "REJECTED").length,
    results,
  });
}
