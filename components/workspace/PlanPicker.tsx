"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { fetchProfile } from "@/lib/supabase-data";
import { planKeyOf } from "@/lib/entitlements";
import { COMPLETE_SAVINGS, PLAN_KEYS, PLANS, type Plan, type PlanKey } from "@/lib/plans";
import type { Profile } from "@/lib/types";

// The three plans as cards. Without a subscription a card opens Stripe
// checkout for that plan; with one, it previews the change (prorated charge
// now for an upgrade, the renewal date for a downgrade) and asks to confirm
// before /api/change-plan makes it.

type Preview = {
  direction: "upgrade" | "downgrade" | "keep";
  plan: Plan;
  dueNow?: number | null;
  renewsAt?: string;
  message: string;
  lost?: string[];
};

export default function PlanPicker({
  profile,
  onProfile,
  highlight,
  onMessagingSetup,
}: {
  profile: Profile;
  onProfile?: (profile: Profile) => void;
  /** Feature the person tried to open, so the cards that include it stand out. */
  highlight?: "texting" | "calling";
  onMessagingSetup?: () => void;
}) {
  const subscribed = !!profile.free_subscription || ["active", "canceling"].includes(String(profile.subscription_status || ""));
  const current = planKeyOf(profile);
  const pending = profile.plan?.pendingKey || null;
  const [busy, setBusy] = useState<PlanKey | "">("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ key: PlanKey; data: Preview } | null>(null);

  const subscribe = async (key: PlanKey) => {
    setBusy(key);
    setNotice("");
    const response = await authFetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, userEmail: profile.email, package: key }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setBusy("");
    setNotice(data.error || "Secure checkout could not be opened.");
  };

  const change = async (key: PlanKey, confirm: boolean) => {
    setBusy(key);
    setNotice("");
    try {
      const response = await authFetch("/api/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: key, confirm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setNotice(data.error || "Your plan couldn't be changed.");
        return;
      }
      if (!confirm) {
        if (data.unchanged) setNotice(`You're already on ${PLANS[key].name}.`);
        else setPreview({ key, data: data.preview });
        return;
      }
      setPreview(null);
      const latest = await fetchProfile(profile.id);
      if (latest) onProfile?.(latest);
      setNotice(
        data.pendingPlan
          ? `Booked: you'll move to ${PLANS[data.pendingPlan as PlanKey].name} on ${new Date(data.effectiveAt).toLocaleDateString()}.`
          : `You're now on ${PLANS[key].name}.`,
      );
      if (data.needsMessagingSetup) onMessagingSetup?.();
    } finally {
      setBusy("");
    }
  };

  const choose = (key: PlanKey) => (subscribed ? change(key, false) : subscribe(key));

  return (
    <div className="v2-plan-picker">
      {notice && <div role="status" className="v2-notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="v2-plan-grid">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const isCurrent = subscribed && key === current;
          const helps = highlight ? plan.capabilities.includes(highlight) : key === "complete";
          return (
            <article key={key} className={`v2-plan-card${helps ? " is-featured" : ""}${isCurrent ? " is-current" : ""}`}>
              <header>
                <strong>{plan.name}</strong>
                {key === "complete" && <small>Saves ${COMPLETE_SAVINGS}/mo vs. both</small>}
              </header>
              <b>${plan.price}<small>/month per user</small></b>
              <p>{plan.tagline}</p>
              <ul>{plan.includes.map((line) => <li key={line}><Check size={13} /> {line}</li>)}</ul>
              {plan.excludes.length > 0 && <p className="v2-plan-excludes">Not included: {plan.excludes.join("; ")}</p>}
              {isCurrent ? (
                <span className="v2-plan-current">{pending ? `Current plan · switching to ${PLANS[pending].name}` : "Current plan"}</span>
              ) : null}
              {(!isCurrent || pending) && (
                <button className={`v2-btn${helps ? " v2-btn-primary" : ""}`} disabled={!!busy || !!profile.free_subscription} onClick={() => void choose(key)}>
                  {busy === key ? "One moment…" : isCurrent ? `Stay on ${plan.name.replace("Text2Sale ", "")}` : subscribed ? `Switch to ${plan.name.replace("Text2Sale ", "")}` : `Start ${plan.name.replace("Text2Sale ", "")} · $${plan.price}/mo`}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {profile.free_subscription && <p className="v2-plan-note">Your plan is managed by our team. Message support to change it.</p>}
      {preview && (
        <div className="v2-plan-confirm" role="dialog" aria-label={`Confirm ${preview.data.plan.name}`}>
          <strong>{preview.data.direction === "upgrade" ? `Upgrade to ${preview.data.plan.name}` : preview.data.direction === "downgrade" ? `Switch to ${preview.data.plan.name} at renewal` : `Stay on ${preview.data.plan.name}`}</strong>
          <p>{preview.data.message}</p>
          {preview.data.lost?.length ? <ul>{preview.data.lost.map((line) => <li key={line}>{line}</li>)}</ul> : null}
          <div className="v2-pd-actions">
            <button className="v2-btn v2-btn-primary" disabled={!!busy} onClick={() => void change(preview.key, true)}>
              {busy ? "Working…" : preview.data.direction === "upgrade" ? `Pay${typeof preview.data.dueNow === "number" ? ` $${preview.data.dueNow.toFixed(2)}` : ""} and upgrade` : "Confirm"}
            </button>
            <button className="v2-btn" disabled={!!busy} onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p className="v2-plan-note">Subscriptions cover the software. Calls, texts, AI minutes and phone numbers are paid from your prepaid wallet; messaging registration fees apply only to texting plans.</p>
    </div>
  );
}
