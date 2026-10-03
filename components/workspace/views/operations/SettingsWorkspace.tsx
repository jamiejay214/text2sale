"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  KeyRound,
  Link2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  Webhook,
  X,
} from "lucide-react";
import ActivationStatus from "@/components/ActivationStatus";
import BusinessDetailsForm, { EMPTY_BUSINESS_FORM, businessFormProblem, type BusinessFormValues } from "@/components/BusinessDetailsForm";
import { authFetch } from "@/lib/auth-fetch";
import { fetchCampaigns, fetchProfile, joinTeamByCode, leaveTeam, updateProfile } from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import { hasNonGsmChars, sanitizeForSms } from "@/lib/sms-text";
import { PACKAGES } from "@/lib/packages";
import {
  DEFAULT_FIRST_MESSAGE_OPT_OUT,
  MANDATORY_OPT_OUT_KEYWORDS,
  hasOptOutInstruction,
  normalizeOptOutKeyword,
  normalizeOptOutSettings,
} from "@/lib/opt-out";
import type { Campaign, OptOutSettings, OwnedNumber, Profile } from "@/lib/types";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../../WorkspacePrimitives";

type Props = WorkspaceViewProps & { settingsTab: string };
type AvailableNumber = { raw: string; display: string; locality: string; region: string };
type Delivery = { total: number; delivered: number; failed: number; pending: number };
type Integration = { id: string; name: string; token: string; campaign_id: string | null; auto_sms: boolean; created_at: string; campaigns?: { name: string } | null };

function isTextingApproved(profile: Profile) {
  return profile.messaging_status === "ACTIVE" || ["completed", "campaign_approved"].includes(profile.a2p_registration?.status || "");
}

function SettingsHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} />;
}

function Numbers({ profile, onProfile, onNavigate }: Props) {
  const [areaCode, setAreaCode] = useState("");
  const [available, setAvailable] = useState<AvailableNumber[]>([]);
  const [deliverability, setDeliverability] = useState<Record<string, Delivery>>({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const approved = isTextingApproved(profile);

  const refreshDelivery = useCallback(async () => {
    const { data } = await supabase.rpc("deliverability_stats", { p_user_id: profile.id, p_days: 30 });
    const next: Record<string, Delivery> = {};
    for (const row of (data || []) as Array<{ digits: string; total: number; delivered: number; failed: number; pending: number }>) next[row.digits] = { total: Number(row.total), delivered: Number(row.delivered), failed: Number(row.failed), pending: Number(row.pending || 0) };
    setDeliverability(next);
  }, [profile.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshDelivery(), 0);
    const channel = supabase.channel(`v2-delivery-${profile.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refreshDelivery).subscribe();
    return () => { window.clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [profile.id, refreshDelivery]);

  const search = async () => {
    setBusy("search"); setNotice(null);
    const response = await authFetch("/api/search-numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ areaCode }) });
    const data = await response.json(); setBusy("");
    if (!response.ok || !data.success) { setNotice({ tone: "error", text: data.error || "Number search failed." }); return; }
    setAvailable(data.numbers || []);
    if (!data.numbers?.length) setNotice({ tone: "error", text: "No matching numbers were found. Try a nearby area code." });
  };
  const buy = async (number: AvailableNumber) => {
    if (!approved) { onNavigate("settings", "10dlc"); return; }
    setBusy(number.raw);
    const response = await authFetch("/api/buy-number", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber: number.raw, userId: profile.id }) });
    const data = await response.json(); setBusy("");
    if (!response.ok || !data.success) { setNotice({ tone: "error", text: data.error || "The number could not be purchased." }); return; }
    const latest = await fetchProfile(profile.id); if (latest) onProfile(latest);
    setAvailable((current) => current.filter((item) => item.raw !== number.raw)); setNotice({ tone: "ok", text: `${data.number || number.display} is now connected to your workspace.` });
  };
  const release = async (number: OwnedNumber) => {
    if (!window.confirm(`Permanently release ${number.number}? Incoming texts and calls to it will stop.`)) return;
    setBusy(number.id);
    const response = await authFetch("/api/delete-number", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numberId: number.id, phoneNumber: number.number }) });
    const data = await response.json(); setBusy("");
    if (!response.ok || !data.success) { setNotice({ tone: "error", text: data.error || "The number could not be released." }); return; }
    const latest = await fetchProfile(profile.id); if (latest) onProfile(latest);
  };
  return <>
    <SettingsHeader eyebrow="Phone numbers" title="Your numbers, reputation, and reach." description="Buy or replace local numbers and see 30-day deliverability before a problem becomes a campaign failure." />
    {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button onClick={() => setNotice(null)}><X size={15} /></button></div>}
    <div className="v2-number-layout">
      <Panel className="v2-number-search-card"><div className="v2-panel-head"><div><h2>Find a business number</h2><p>$1.50 to activate · $1/month</p></div><Phone size={18} /></div><div className="v2-number-search-body">{!approved && <button className="v2-setup-warning" onClick={() => onNavigate("settings", "10dlc")}><ShieldCheck size={17} /><span><strong>Messaging registration required</strong><small>Finish the guided carrier setup before buying a number.</small></span><ArrowRight size={15} /></button>}<label>Preferred area code<div><input inputMode="numeric" maxLength={3} value={areaCode} onChange={(event) => setAreaCode(event.target.value.replace(/\D/g, ""))} placeholder="954" onKeyDown={(event) => event.key === "Enter" && void search()} /><button onClick={search} disabled={busy === "search"}><Search size={15} />{busy === "search" ? "Searching…" : "Search"}</button></div></label><div className="v2-available-numbers">{available.map((number) => <button key={number.raw} onClick={() => buy(number)} disabled={busy === number.raw || !approved}><span><strong>{number.display}</strong><small>{[number.locality, number.region].filter(Boolean).join(", ") || "United States"}</small></span><span><i>SMS</i><i>Voice</i></span><b>{busy === number.raw ? "Buying…" : "$1.50"}</b></button>)}</div></div></Panel>
      <Panel className="v2-owned-numbers"><div className="v2-panel-head"><div><h2>Connected numbers</h2><p>{profile.owned_numbers?.length || 0} active lines · delivery health updates live</p></div><button className="v2-icon-btn" onClick={refreshDelivery}><RefreshCw size={15} /></button></div>{profile.owned_numbers?.length ? <div className="v2-number-cards">{profile.owned_numbers.map((number) => { const digits = number.number.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); const stats = deliverability[digits]; const receipts = (stats?.delivered || 0) + (stats?.failed || 0); const rate = receipts ? Math.round((stats.delivered / receipts) * 1000) / 10 : null; const tone = rate === null ? "neutral" : rate >= 90 ? "success" : rate >= 70 ? "warning" : "danger"; return <article key={number.id}><header><span className="v2-number-icon"><Phone size={16} /></span><div><small>{number.alias || "Business line"}</small><strong>{number.number}</strong></div><button onClick={() => release(number)} disabled={busy === number.id}><Trash2 size={14} /></button></header><div className="v2-delivery-row"><StatusPill tone={tone}>{rate === null ? stats?.total ? "Awaiting receipts" : "No sends yet" : `${rate}% delivered`}</StatusPill><span>{stats?.total?.toLocaleString() || 0} sent in 30 days</span></div><div className="v2-delivery-bar"><span style={{ width: `${rate ?? 0}%` }} /></div><footer><span>{stats?.delivered || 0} delivered</span><span>{stats?.failed || 0} failed</span><span>{stats?.pending || 0} pending</span></footer></article>; })}</div> : <EmptyState title="No phone numbers yet" description="Complete messaging registration, then search for the local number you want customers to see." />}</Panel>
    </div>
  </>;
}

function AiUpgrade({ profile, onProfile, onNavigate }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const aiAccess = !!profile.ai_plan || !!profile.free_ai_plan;
  const subscribed = !!profile.free_subscription || ["active", "canceling"].includes(profile.subscription_status);

  const upgrade = async () => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (subscribed) {
        const response = await authFetch("/api/upgrade-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ industry: profile.industry || null }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "The AI upgrade could not be completed.");
        const latest = await fetchProfile(profile.id);
        if (latest) onProfile(latest);
        onNavigate("settings", "ai");
        return;
      }

      const planResponse = await authFetch("/api/onboarding/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: "ai", industry: profile.industry || null }),
      });
      const planData = await planResponse.json().catch(() => ({}));
      if (!planResponse.ok) throw new Error(planData.error || "The AI plan could not be selected.");
      const checkoutResponse = await authFetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, userEmail: profile.email }),
      });
      const checkoutData = await checkoutResponse.json().catch(() => ({}));
      if (!checkoutResponse.ok || !checkoutData.url) throw new Error(checkoutData.error || "Secure checkout could not be opened.");
      window.location.href = checkoutData.url;
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "The AI upgrade could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  if (aiAccess) {
    return <><PageHeader eyebrow="Text2Sale + AI" title="Your AI workspace is unlocked." description="AI texting, AI calling, training, qualification, and appointment booking are ready." actions={<button className="v2-btn v2-btn-primary" onClick={() => onNavigate("settings", "ai")}>Open AI texting <ArrowRight size={15} /></button>} /><Panel><EmptyState title="AI plan active" description="Use the AI texting and AI receptionist tabs to train and control your assistants." /></Panel></>;
  }

  return <>
    <PageHeader eyebrow="Upgrade to Text2Sale + AI" title="Put follow-up and phone coverage on autopilot." description="Standard includes the complete CRM. Upgrade when you want trained AI to text, qualify, call, and book for you." />
    {notice ? <div className="v2-notice is-error">{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div> : null}
    <div className="v2-ai-upgrade-layout">
      <Panel className="v2-ai-upgrade-offer">
        <span className="v2-ai-upgrade-kicker"><Sparkles size={14} /> Text2Sale + AI</span>
        <div className="v2-ai-upgrade-price"><strong>${PACKAGES.ai.price.toFixed(2)}</strong><span>/month</span></div>
        <p>AI feature access is included. Texts, AI replies, and AI call minutes use your wallet at the rates shown in the workspace.</p>
        <button className="v2-btn v2-btn-accent" onClick={upgrade} disabled={busy || !!profile.is_usha}>{busy ? "Opening secure upgrade…" : subscribed ? "Upgrade to AI" : "Choose AI & continue to Stripe"}<ArrowRight size={16} /></button>
        <small>{profile.is_usha ? "The AI package is not available for this partner account." : subscribed ? "Stripe securely charges the prorated plan difference before AI is unlocked." : "You will review the $119.99 monthly subscription in Stripe before paying."}</small>
      </Panel>
      <Panel className="v2-ai-upgrade-features">
        <div className="v2-panel-head"><div><h2>Everything AI unlocks</h2><p>One upgrade across the entire workspace</p></div><Bot size={19} /></div>
        <div>
          {[
            ["AI texting", "Responds in your voice, qualifies leads, handles objections, and follows your rules."],
            ["AI calling receptionist", "Answers inbound calls, gathers lead details, books appointments, and transfers when needed."],
            ["Workspace training", "Set goals, tone, business knowledge, scripts, guardrails, and handoff instructions."],
            ["Per-conversation control", "Use AI everywhere or switch it on and off for one lead at a time."],
            ["Calendar booking", "Offers available times and keeps booked appointments connected to your CRM."],
          ].map(([title, detail]) => <article key={title}><span><Check size={14} /></span><div><strong>{title}</strong><small>{detail}</small></div></article>)}
        </div>
      </Panel>
    </div>
  </>;
}

function Billing({ profile, onProfile, onNavigate }: Props) {
  const [amount, setAmount] = useState(50);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const subscribed = profile.free_subscription || ["active", "canceling"].includes(profile.subscription_status);
  const aiAccess = !!profile.ai_plan || !!profile.free_ai_plan;
  const checkout = async () => {
    if (amount < 20) { setNotice("The minimum wallet add is $20."); return; }
    setBusy("funds");
    const paid = amount >= 500 ? Number((amount * .9).toFixed(2)) : amount;
    const response = await authFetch("/api/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: paid, creditAmount: amount, userId: profile.id, userEmail: profile.email }) });
    const data = await response.json(); setBusy("");
    if (data.success && data.url) window.location.href = data.url; else setNotice(data.error || "Could not open secure checkout.");
  };
  const portal = async () => { setBusy("portal"); const response = await authFetch("/api/create-portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: profile.id }) }); const data = await response.json(); setBusy(""); if (data.success && data.url) window.location.href = data.url; else setNotice(data.error || "Could not open the billing portal."); };
  const subscribe = async () => { setBusy("subscribe"); const response = await authFetch("/api/create-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: profile.id, userEmail: profile.email }) }); const data = await response.json(); setBusy(""); if (data.success && data.url) window.location.href = data.url; else setNotice(data.error || "Could not open subscription checkout."); };
  const saveAutoRecharge = async (enabled: boolean) => { const latest = await updateProfile(profile.id, { auto_recharge: { enabled, threshold: profile.auto_recharge?.threshold || 10, amount: profile.auto_recharge?.amount || 50 } }); if (latest) onProfile(latest); };
  return <>
    <SettingsHeader eyebrow="Billing & funds" title="Keep every conversation moving." description="Your live wallet balance stays in the top bar. Add funds securely through Stripe, manage cards, and prevent campaigns from stopping." />
    {notice && <div className="v2-notice is-error">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <div className="v2-billing-grid">
      <Panel className="v2-wallet-card"><div className="v2-wallet-hero"><span><Wallet size={22} /></span><p>Available balance</p><strong>${Number(profile.wallet_balance || 0).toFixed(2)}</strong><small>Updates automatically after payments and usage</small></div><div className="v2-fund-picker"><label>Add funds<input type="number" min={20} step={10} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><div>{[20, 50, 100, 250, 500].map((value) => <button className={amount === value ? "is-active" : ""} key={value} onClick={() => setAmount(value)}>${value}</button>)}</div>{amount >= 500 && <p><Sparkles size={14} /> You receive ${amount.toFixed(2)} in credit and pay ${(amount * .9).toFixed(2)}.</p>}<button className="v2-btn v2-btn-accent" onClick={checkout} disabled={!subscribed || busy === "funds"}><CreditCard size={16} /> {busy === "funds" ? "Opening Stripe…" : `Add $${amount.toFixed(2)}`}</button>{!subscribed && <small>Activate your subscription before adding usage funds.</small>}</div></Panel>
      <div className="v2-billing-stack">
        <Panel><div className="v2-panel-head"><div><h2>Subscription</h2><p>Platform access</p></div><StatusPill tone={subscribed ? "success" : "warning"}>{profile.free_subscription ? "Owner sponsored" : profile.subscription_status || "Inactive"}</StatusPill></div><div className="v2-subscription-card"><span><strong>{profile.plan?.name || "Text2Sale"}</strong><small>{aiAccess ? "CRM, AI texting, AI calling, imports, and integrations" : "CRM, texting, calling, campaigns, imports, and integrations"}</small></span><b>${Number(profile.plan?.price || 39.99).toFixed(2)}<small>/month</small></b></div>{subscribed ? <><button className="v2-settings-row" onClick={portal}><span className="v2-settings-icon"><CreditCard size={16} /></span><span><strong>Cards, invoices & subscription</strong><small>Opens the secure Stripe customer portal.</small></span><ArrowRight size={15} /></button>{!aiAccess ? <button className="v2-settings-row" onClick={() => onNavigate("settings", "upgrade")}><span className="v2-settings-icon"><Sparkles size={16} /></span><span><strong>Upgrade to Text2Sale + AI</strong><small>Unlock AI texting and the AI calling receptionist for $119.99/month.</small></span><ArrowRight size={15} /></button> : null}</> : <button className="v2-settings-row" onClick={subscribe}><span className="v2-settings-icon"><Plus size={16} /></span><span><strong>Activate Text2Sale</strong><small>Choose a card securely on Stripe.</small></span><ArrowRight size={15} /></button>}</Panel>
        <Panel><div className="v2-panel-head"><div><h2>Auto recharge</h2><p>Protect active campaigns from a low balance.</p></div><label className="v2-compact-switch"><input type="checkbox" checked={profile.auto_recharge?.enabled || false} onChange={(event) => saveAutoRecharge(event.target.checked)} /><i /></label></div><div className="v2-auto-recharge"><div><span>When balance falls below</span><strong>${Number(profile.auto_recharge?.threshold || 10).toFixed(2)}</strong></div><ArrowRight size={16} /><div><span>Automatically add</span><strong>${Number(profile.auto_recharge?.amount || 50).toFixed(2)}</strong></div></div></Panel>
      </div>
      <Panel className="v2-usage-panel"><div className="v2-panel-head"><div><h2>Recent account activity</h2><p>Wallet deposits, message usage, and number purchases</p></div></div>{profile.usage_history?.length ? <div>{profile.usage_history.slice(0, 20).map((entry) => <article key={entry.id}><span className="v2-usage-icon">{entry.amount >= 0 ? "+" : "−"}</span><div><strong>{entry.description}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></div><b className={entry.amount >= 0 ? "is-credit" : ""}>{entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}</b></article>)}</div> : <EmptyState title="No billing activity yet" description="Deposits and usage will appear here." />}</Panel>
    </div>
  </>;
}

function TextingAi({ profile, onProfile }: Props) {
  const [instructions, setInstructions] = useState(profile.ai_instructions || "");
  const [goal, setGoal] = useState("qualify_book");
  const [tone, setTone] = useState("warm");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const save = async (autoReply = profile.ai_auto_reply) => {
    setSaving(true);
    const guidance = `Primary goal: ${goal === "qualify_book" ? "qualify the lead and book a consultation" : goal === "answer" ? "answer questions and keep the conversation moving" : "follow up until the lead responds"}. Tone: ${tone}.\n\n${instructions}`;
    const latest = await updateProfile(profile.id, { ai_instructions: guidance, ai_auto_reply: autoReply });
    setSaving(false); if (latest) { onProfile(latest); setNotice("AI texting settings saved."); }
  };
  return <>
    <PageHeader eyebrow="AI texting" title="Teach your AI how your best rep responds." description="Set one workspace-wide AI switch, then give it goals, tone, qualification rules, booking instructions, and clear guardrails." actions={<label className="v2-master-switch"><span><Bot size={17} /><b>{profile.ai_auto_reply ? "AI texting on" : "AI texting off"}</b></span><input type="checkbox" checked={profile.ai_auto_reply || false} onChange={(event) => save(event.target.checked)} /><i /></label>} />
    {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <div className="v2-ai-text-grid"><Panel className="v2-ai-text-main"><div className="v2-panel-head"><div><h2>Workspace training</h2><p>These rules guide every AI-enabled conversation.</p></div><span className="v2-training-score"><Check size={13} /> Private to your workspace</span></div><div className="v2-ai-form"><div className="v2-form-grid"><label>Primary goal<select value={goal} onChange={(event) => setGoal(event.target.value)}><option value="qualify_book">Qualify and book</option><option value="answer">Answer questions</option><option value="follow_up">Persistent follow-up</option></select></label><label>Voice & personality<select value={tone} onChange={(event) => setTone(event.target.value)}><option value="warm and conversational">Warm & conversational</option><option value="clear and professional">Clear & professional</option><option value="friendly and upbeat">Friendly & upbeat</option><option value="short and direct">Short & direct</option></select></label></div><label>Business knowledge & instructions<textarea rows={13} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={`What you sell\nWho is a qualified lead\nQuestions to ask\nObjections and approved answers\nWhen to offer the calendar\nThings the AI must never promise`} /><small>{instructions.length}/4,000</small></label><button className="v2-btn v2-btn-primary" onClick={() => save()} disabled={saving}>{saving ? "Saving…" : "Save AI training"}</button></div></Panel><Panel className="v2-ai-guardrails"><div className="v2-panel-head"><div><h2>How control works</h2><p>Global and conversation-level switches</p></div></div><ol><li><span>1</span><div><strong>Global AI switch</strong><small>Turns automated texting on or off for the workspace.</small></div></li><li><span>2</span><div><strong>Conversation override</strong><small>The inbox lets you enable or pause AI on one lead.</small></div></li><li><span>3</span><div><strong>Reply-aware follow-up</strong><small>Campaign steps stop for a lead once they answer.</small></div></li><li><span>4</span><div><strong>Human handoff</strong><small>Your team can take over any conversation immediately.</small></div></li></ol><button className="v2-btn" onClick={() => navigator.clipboard.writeText(instructions)}><Copy size={14} /> Copy training</button></Panel></div>
  </>;
}

function Registration({ profile, onProfile, onNavigate }: Props) {
  const registration = profile.a2p_registration;
  const [showForm, setShowForm] = useState(!registration || ["not_started", "brand_failed", "campaign_failed"].includes(registration.status));
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<BusinessFormValues>(() => ({
    ...EMPTY_BUSINESS_FORM,
    businessName: registration?.businessName || "", businessType: registration?.businessType || "llc", ein: registration?.ein || "",
    businessAddress: registration?.businessAddress || "", businessCity: registration?.businessCity || "", businessState: registration?.businessState || "", businessZip: registration?.businessZip || "",
    contactPhone: registration?.contactPhone || profile.phone || "", contactEmail: registration?.contactEmail || profile.email || "", industry: profile.industry || registration?.industry || "",
    businessDescription: profile.business_description || "", areaCode: registration?.desiredAreaCode || "", hasWebsite: registration?.websiteMode === "own" ? "yes" : "no", website: registration?.websiteMode === "own" ? registration.website || "" : "", customDomain: registration?.websiteMode === "hosted" ? profile.custom_domain || "" : "",
  }));
  const submit = async () => {
    const problem = businessFormProblem(form); if (problem) { setNotice(problem); return; }
    setBusy(true); const response = await authFetch("/api/register-10dlc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: profile.id, action: "register_brand", ...form }) }); const data = await response.json(); setBusy(false);
    if (!response.ok || !data.success) { setNotice(data.error || "Could not submit your business details."); return; }
    const latest = await fetchProfile(profile.id); if (latest) onProfile(latest); setShowForm(false); setRefreshKey((value) => value + 1); setNotice(data.message || "Your activation is underway.");
  };
  return <>
    <SettingsHeader eyebrow="Messaging setup" title="One smooth path to carrier-approved texting." description="Enter your business once. Text2Sale builds the required pages, submits your registration, connects a number, and shows progress here." />
    {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <div className="v2-registration-grid"><div><div className="v2-registration-roadmap">{["Business details", "Website & consent", "Carrier review", "Number connected"].map((label, index) => <div className={index === 0 || registration ? "is-active" : ""} key={label}><span>{isTextingApproved(profile) || index === 0 ? <Check size={13} /> : index + 1}</span><strong>{label}</strong></div>)}</div><div className="v2-activation-shell"><ActivationStatus authFetch={authFetch} refreshKey={refreshKey} onStart={() => setShowForm(true)} onFixDetails={() => setShowForm(true)} onAddFunds={() => onNavigate("settings", "billing")} onFixSubscription={() => onNavigate("settings", "billing")} onActive={async () => { const latest = await fetchProfile(profile.id); if (latest) onProfile(latest); }} /></div></div><Panel className="v2-registration-help"><ShieldCheck size={22} /><h2>What Text2Sale handles</h2><ul><li><Check size={14} /> A carrier-ready business website</li><li><Check size={14} /> Opt-in language, privacy policy, and terms</li><li><Check size={14} /> Business and campaign registration</li><li><Check size={14} /> Local phone-number connection</li><li><Check size={14} /> Background progress after you close the page</li></ul><p>Use your exact IRS business name, EIN, and address. A mismatch is the most common reason carriers reject an application.</p></Panel></div>
    {showForm && !isTextingApproved(profile) && <Panel className="v2-registration-form"><div className="v2-panel-head"><div><h2>Business information</h2><p>Securely used for your carrier registration and compliance pages.</p></div></div><div className="v2-legacy-form"><BusinessDetailsForm values={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} authFetch={authFetch} /></div><footer><span>{businessFormProblem(form) || "Everything looks ready."}</span><button className="v2-btn v2-btn-accent" disabled={busy || !!businessFormProblem(form)} onClick={submit}>{busy ? "Submitting…" : "Create my website & activate texting"}</button></footer></Panel>}
  </>;
}

function Integrations({ profile, onProfile }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ name: "", campaign_id: "", auto_sms: true });
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => { const response = await authFetch("/api/integrations"); const data = await response.json(); setIntegrations(data.integrations || []); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); fetchCampaigns(profile.id).then(setCampaigns); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, profile.id]);
  const create = async () => { const response = await authFetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) { setNotice(data.error || "Could not create integration."); return; } setForm({ name: "", campaign_id: "", auto_sms: true }); setNotice("API key created."); void load(); };
  const remove = async (id: string) => { if (!window.confirm("Delete this API key? The lead vendor will stop sending leads immediately.")) return; await authFetch(`/api/integrations/${id}`, { method: "DELETE" }); setIntegrations((current) => current.filter((item) => item.id !== id)); };
  const connectGoogle = async () => { const { data } = await supabase.auth.getSession(); const token = data.session?.access_token; if (token) window.location.href = `/api/google-calendar/auth?token=${encodeURIComponent(token)}`; };
  const disconnectGoogle = async () => { await authFetch("/api/google-calendar/disconnect", { method: "POST" }); const latest = await fetchProfile(profile.id); if (latest) onProfile(latest); };
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return <>
    <SettingsHeader eyebrow="Integrations" title="Connect the systems that feed your pipeline." description="Sync Google Calendar and issue secure webhook keys so lead vendors can add contacts directly into a campaign." />
    {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <div className="v2-integration-grid"><Panel className="v2-integration-card"><span className="v2-google-mark">G</span><div><StatusPill tone={profile.google_calendar_tokens ? "success" : "neutral"}>{profile.google_calendar_tokens ? "Connected" : "Not connected"}</StatusPill><h2>Google Calendar</h2><p>Put AI-booked appointments on your calendar and prevent double booking with your existing events.</p></div>{profile.google_calendar_tokens ? <button className="v2-btn" onClick={disconnectGoogle}>Disconnect</button> : <button className="v2-btn v2-btn-primary" onClick={connectGoogle}><CalendarDays size={15} /> Connect calendar</button>}</Panel><Panel className="v2-api-create"><div className="v2-panel-head"><div><h2>Create lead-vendor API key</h2><p>Each vendor gets its own secure webhook.</p></div><KeyRound size={17} /></div><div className="v2-modal-form"><label>Integration name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Health leads — Vendor A" /></label><label>Campaign for incoming leads<select value={form.campaign_id} onChange={(event) => setForm({ ...form, campaign_id: event.target.value })}><option value="">Add to contacts only</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><label className="v2-check-row"><input type="checkbox" checked={form.auto_sms} onChange={(event) => setForm({ ...form, auto_sms: event.target.checked })} /><span><b>Automatically start selected campaign</b><small>New valid leads begin the workflow as soon as the vendor sends them.</small></span></label><button className="v2-btn v2-btn-primary" disabled={!form.name.trim()} onClick={create}><Plus size={15} /> Create API key</button></div></Panel></div>
    <Panel className="v2-api-list"><div className="v2-panel-head"><div><h2>Lead vendor connections</h2><p>{integrations.length} active API keys</p></div></div>{integrations.length ? <div>{integrations.map((integration) => { const url = `${origin}/api/integrations/inbound/${integration.token}`; return <article key={integration.id}><span className="v2-api-icon"><Webhook size={17} /></span><div><strong>{integration.name}</strong><small>{integration.campaigns?.name ? `Campaign: ${integration.campaigns.name}` : "Contacts only"} · Created {new Date(integration.created_at).toLocaleDateString()}</small></div><div className="v2-api-secret"><label>Webhook URL</label><button onClick={() => navigator.clipboard.writeText(url)}><code>{url}</code><Copy size={14} /></button></div><div className="v2-api-secret"><label>Token</label><button onClick={() => navigator.clipboard.writeText(integration.token)}><code>{integration.token}</code><Copy size={14} /></button></div><button className="v2-icon-btn is-danger" onClick={() => remove(integration.id)}><Trash2 size={15} /></button></article>; })}</div> : <EmptyState title="No lead vendors connected" description="Create an API key above, then send its webhook URL to your lead vendor." />}</Panel>
  </>;
}

function OptOutEditor({ profile, onProfile }: Pick<Props, "profile" | "onProfile">) {
  const [settings, setSettings] = useState<OptOutSettings>(() =>
    normalizeOptOutSettings(profile.opt_out_settings),
  );
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const mandatory = new Set<string>(MANDATORY_OPT_OUT_KEYWORDS);
  const customKeywords = settings.keywords.filter((keyword) => !mandatory.has(keyword));
  const firstMessageText = settings.firstMessageText ?? DEFAULT_FIRST_MESSAGE_OPT_OUT;

  const addKeyword = () => {
    const keyword = normalizeOptOutKeyword(newKeyword);
    if (!keyword) return;
    if (settings.keywords.includes(keyword)) {
      setNotice({ tone: "error", text: `${keyword} is already an opt-out trigger.` });
      return;
    }
    setSettings((current) => ({ ...current, keywords: [...current.keywords, keyword] }));
    setNewKeyword("");
    setNotice(null);
  };

  const save = async () => {
    const sanitizedText = sanitizeForSms(firstMessageText.trim());
    if (!sanitizedText || !hasOptOutInstruction(sanitizedText, settings.keywords)) {
      setNotice({
        tone: "error",
        text: "Use a clear instruction such as ‘Reply STOP to opt out.’",
      });
      return;
    }
    if (hasNonGsmChars(sanitizedText)) {
      setNotice({ tone: "error", text: "Remove emojis or unsupported characters from the opt-out text." });
      return;
    }
    setSaving(true);
    const nextSettings = normalizeOptOutSettings({
      ...settings,
      firstMessageText: sanitizedText,
    });
    const latest = await updateProfile(profile.id, { opt_out_settings: nextSettings });
    setSaving(false);
    if (!latest) {
      setNotice({ tone: "error", text: "The opt-out settings could not be saved." });
      return;
    }
    onProfile(latest);
    setSettings(nextSettings);
    setNotice({ tone: "ok", text: "Opt-out settings saved." });
  };

  return (
    <Panel className="v2-optout-card">
      <div className="v2-panel-head">
        <div><h2>Message opt-out</h2><p>Required on the first campaign text only.</p></div>
        <ShieldCheck size={18} />
      </div>
      <div className="v2-optout-body">
        {notice ? <div className={`v2-optout-notice is-${notice.tone}`}>{notice.text}<button onClick={() => setNotice(null)}><X size={13} /></button></div> : null}
        <label>
          First-message opt-out line
          <textarea
            rows={3}
            maxLength={160}
            value={firstMessageText}
            onChange={(event) => setSettings((current) => ({ ...current, firstMessageText: event.target.value }))}
            placeholder={DEFAULT_FIRST_MESSAGE_OPT_OUT}
          />
          <small>Added automatically to step one. Follow-up texts do not repeat it. {firstMessageText.length}/160</small>
        </label>
        <div className="v2-optout-preview"><span>First text preview</span><p>Hi Jamie, thanks for requesting information.<br /><b>{firstMessageText || "Your opt-out line appears here."}</b></p></div>
        <div className="v2-optout-keywords">
          <div><strong>Opt-out triggers</strong><small>Carrier-required words stay locked. Add your own word or phrase.</small></div>
          <div className="v2-optout-chips">
            {MANDATORY_OPT_OUT_KEYWORDS.map((keyword) => <span className="is-locked" key={keyword}><ShieldCheck size={11} /> {keyword}</span>)}
            {customKeywords.map((keyword) => <span key={keyword}>{keyword}<button aria-label={`Remove ${keyword}`} onClick={() => setSettings((current) => ({ ...current, keywords: current.keywords.filter((item) => item !== keyword) }))}><X size={11} /></button></span>)}
          </div>
          <div className="v2-optout-add"><input value={newKeyword} maxLength={40} onChange={(event) => setNewKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addKeyword(); } }} placeholder="Add a custom trigger" /><button onClick={addKeyword} disabled={!newKeyword.trim()}><Plus size={14} /> Add</button></div>
        </div>
        <button className="v2-btn v2-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save opt-out settings"}</button>
      </div>
    </Panel>
  );
}

function Team({ profile, onProfile }: Props) {
  const [code, setCode] = useState(""); const [notice, setNotice] = useState("");
  const join = async () => { const result = await joinTeamByCode(profile.id, code.trim().toUpperCase()); if (!result.success) { setNotice(result.error || "Could not join team."); return; } const latest = await fetchProfile(profile.id); if (latest) onProfile(latest); setNotice(`Joined ${result.managerName || "the team"}.`); setCode(""); };
  const leave = async () => { if (!window.confirm("Leave your current team?")) return; await leaveTeam(profile.id); const latest = await fetchProfile(profile.id); if (latest) onProfile(latest); };
  return <><SettingsHeader eyebrow="Workspace settings" title="Your workspace, compliance, and team." description="Manage workspace identity, first-message opt-outs, and team membership in one place." />{notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}<div className="v2-team-grid"><Panel><div className="v2-panel-head"><div><h2>Workspace identity</h2><p>Signed in account</p></div><Users size={17} /></div><dl className="v2-account-details"><div><dt>Name</dt><dd>{profile.first_name} {profile.last_name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Role</dt><dd><StatusPill tone="info">{profile.role}</StatusPill></dd></div><div><dt>Workspace code</dt><dd><code>{profile.team_code || profile.referral_code || "Not created"}</code></dd></div></dl></Panel><OptOutEditor profile={profile} onProfile={onProfile} /><Panel className="v2-team-membership-card"><div className="v2-panel-head"><div><h2>Team membership</h2><p>Share data with a manager workspace.</p></div></div><div className="v2-join-team">{profile.manager_id ? <><span><Check size={18} /></span><h3>Connected to a team</h3><p>Your manager can view team-level performance and help manage the account.</p><button className="v2-btn" onClick={leave}>Leave team</button></> : <><span><Link2 size={18} /></span><h3>Join with a team code</h3><p>Enter the code your manager shared with you.</p><div><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="TEAM-CODE" /><button onClick={join} disabled={!code.trim()}>Join</button></div></>}</div></Panel></div></>;
}

export default function SettingsWorkspace(props: Props) {
  switch (props.settingsTab) {
    case "upgrade": return <AiUpgrade {...props} />;
    case "billing": return <Billing {...props} />;
    case "10dlc": return <Registration {...props} />;
    case "integrations": return <Integrations {...props} />;
    case "team": return <Team {...props} />;
    case "ai": return <TextingAi {...props} />;
    default: return <Numbers {...props} />;
  }
}
