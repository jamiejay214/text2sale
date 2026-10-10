import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processDomainRenewal, type RenewalMarker, type RenewalOutcome } from "@/lib/domain-renewal";
import { patchRegistration, priceToCharge } from "@/lib/domain-purchase";
import { getDomainOrder, getDomainRenewalInfo, getDomainRenewalPrice, renewDomain, setDomainAutoRenew } from "@/lib/vercel-domains";
import { isEntitled } from "@/lib/messaging-status";

// ─── GET /api/billing/domains ─────────────────────────────────────────────
// Daily cron. Renews customer website domains only after the customer's
// wallet has paid for the renewal (registrar renewal price + $5), and keeps
// Vercel from auto-renewing them on the platform's card. See
// lib/domain-renewal.ts for the full flow.

export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Reg = { domainPurchase?: { domain?: string; state?: string }; domainRenewal?: RenewalMarker | null };

async function emailInsufficient(to: string | null, name: string, domain: string, amount: number, expiresAt: Date) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  const date = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const text = `Hi ${name || "there"},\n\nYour website domain ${domain} expires on ${date}. Renewing it for another year costs $${amount.toFixed(2)}, and your Text2Sale wallet doesn't have enough to cover it yet.\n\nAdd funds in Settings → Billing and we'll renew it automatically. If the domain expires, your website (and the opt-in page your texting registration points to) goes offline.\n\n— Text2Sale`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `domain-renewal-${domain}-${expiresAt.toISOString().slice(0, 10)}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_ADDRESS || "Text2Sale <hello@text2sale.com>",
      to: [to],
      subject: `Add funds to keep ${domain}`,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  if ((req.headers.get("authorization") || "") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.VERCEL_API_TOKEN) return NextResponse.json({ ok: true, skipped: "registrar not configured" });

  const db = createClient(supabaseUrl, supabaseKey);
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, first_name, a2p_registration, subscription_status, free_subscription, paused")
    .eq("a2p_registration->domainPurchase->>state", "bought");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ userId: string; domain: string; outcome: RenewalOutcome | "error"; detail?: string }> = [];
  for (const profile of profiles || []) {
    const reg = (profile.a2p_registration || {}) as Reg;
    const domain = reg.domainPurchase?.domain;
    if (!domain) continue;
    const userId = profile.id as string;
    try {
      const outcome = await processDomainRenewal(
        { domain, marker: reg.domainRenewal || null, entitled: !profile.paused && isEntitled(profile) },
        {
          getInfo: getDomainRenewalInfo,
          setAutoRenew: setDomainAutoRenew,
          getRenewalPrice: getDomainRenewalPrice,
          renew: renewDomain,
          getOrder: getDomainOrder,
          priceToCharge,
          charge: async (amount) => {
            const { data, error: debitError } = await db.rpc("decrement_wallet", { p_user_id: userId, p_amount: amount });
            return !debitError && data !== null && data !== undefined;
          },
          refund: async (amount, key) => {
            await db.rpc("credit_wallet", { p_user_id: userId, p_amount: amount, p_idempotency_key: key, p_description: `Refund — ${domain} renewal not completed` });
          },
          save: (marker) => patchRegistration(db, userId, { domainRenewal: marker }),
          notifyInsufficient: (d, amount, expiresAt) => emailInsufficient(profile.email, profile.first_name, d, amount, expiresAt),
          recordCharge: async (d, amount, catchUp) => {
            const { data } = await db.from("profiles").select("usage_history").eq("id", userId).single();
            const history = Array.isArray(data?.usage_history) ? data.usage_history : [];
            await db.from("profiles").update({
              usage_history: [{
                id: `domain_renewal_${d}_${Date.now()}`,
                type: "charge",
                amount,
                description: catchUp ? `Website domain renewal — ${d} (1 year, renewed by the registrar)` : `Website domain renewal — ${d} (1 year)`,
                createdAt: new Date().toISOString(),
                status: "succeeded",
              }, ...history],
            }).eq("id", userId);
          },
        }
      );
      results.push({ userId, domain, outcome });
    } catch (e) {
      results.push({ userId, domain, outcome: "error", detail: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
