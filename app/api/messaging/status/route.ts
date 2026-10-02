import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import {
  MessagingStatus,
  PENDING_STATUSES,
  isEntitled,
  isMessagingStatus,
  statusCopy,
} from "@/lib/messaging-status";
import { NUMBER_PURCHASE_COST } from "@/lib/telnyx-10dlc";
import { computePipeline, type StepKey } from "@/lib/activation-pipeline";
import type { A2PRegistration } from "@/lib/types";

// What the activation screen polls. Returns progress in plain language — the
// customer never sees brand, campaign, TCR or MNO anywhere in this payload.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Customer-facing names for the checklist; none of them are carrier jargon. */
const CUSTOMER_LABELS: Partial<Record<StepKey, string>> = {
  subscription: "Subscription",
  business: "Business details",
  website: "Your website",
  brand: "Business verified",
  campaign: "Messaging approved",
  number: "Phone number",
  active: "Texting live",
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const db = createClient(supabaseUrl, serviceKey);
  const { data, error } = await db
    .from("profiles")
    .select(
      "created_at, messaging_status, messaging_status_at, messaging_error, messaging_attempts, wallet_balance, owned_numbers, subscription_status, free_subscription, a2p_registration, custom_domain, business_slug"
    )
    .eq("id", auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  }

  const raw = data.messaging_status;
  const status: MessagingStatus = isMessagingStatus(raw) ? raw : "NOT_STARTED";
  const reg = (data.a2p_registration || {}) as Partial<A2PRegistration> & { siteNote?: string };
  const awaiting = reg.awaiting ?? null;
  const entitled = isEntitled(data);
  const inFlight = (PENDING_STATUSES as string[]).includes(status);
  const needsSubscription = inFlight && !entitled;

  let copy = statusCopy(status, awaiting);
  if (needsSubscription) {
    // Nothing is bought for an account that isn't paying; say why it's quiet.
    copy = {
      headline: "Your subscription needs attention",
      detail:
        "Texting setup is paused until your subscription payment goes through. It picks up where it left off automatically.",
      progress: copy.progress,
      needsCustomerAction: true,
    };
  }

  const numbers = Array.isArray(data.owned_numbers) ? data.owned_numbers : [];
  const balance = Number(data.wallet_balance) || 0;

  // What the customer still has to pay for, depending on what's blocking.
  let amountNeeded = 0;
  if (status === "AWAITING_PAYMENT") {
    const price = awaiting === "domain" ? reg.domainRequest?.price ?? 0 : NUMBER_PURCHASE_COST;
    amountNeeded = Math.max(Math.round((price - balance) * 100) / 100, 0);
  }

  // While the website comes up, say what is happening (and, for a domain they
  // brought themselves, what they need to do).
  let websiteNote: string | null = null;
  if (status === "BUSINESS_SUBMITTED" && reg.siteNote) {
    websiteNote =
      data.custom_domain && !reg.domainRequest
        ? `We're waiting for ${data.custom_domain} to point at us. In your domain's DNS settings, add an A record for @ with the value 76.76.21.21, and a CNAME for www pointing to cname.vercel-dns.com. We'll continue automatically as soon as it resolves.`
        : "Your website is being published. This usually takes a few minutes.";
  }

  const pipeline = computePipeline(data);
  const steps = pipeline.steps
    .filter((s) => CUSTOMER_LABELS[s.key])
    .map((s) => ({ key: s.key, label: CUSTOMER_LABELS[s.key] as string, state: s.state }));

  return NextResponse.json({
    success: true,
    status,
    headline: copy.headline,
    detail: copy.detail,
    progress: copy.progress,
    needsCustomerAction: copy.needsCustomerAction,
    updatedAt: data.messaging_status_at,
    // Only surface the underlying error when the customer can act on it.
    // Mid-flight retry noise ("attach pending") would just alarm them.
    error: copy.needsCustomerAction && !needsSubscription ? data.messaging_error : null,
    activeNumber: numbers[0]?.number ?? null,
    // Lets the UI render an exact "add $X" prompt rather than a vague nudge.
    amountNeeded,
    awaiting,
    needsSubscription,
    websiteNote,
    website: data.custom_domain || null,
    steps,
  });
}
