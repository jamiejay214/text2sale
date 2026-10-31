"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Lightbulb, Mail, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { buildEmail, type EmailDesign } from "@/lib/email-design";
import { ideasFor, type EmailIdea } from "@/lib/email-ideas";
import type { DnsPlan, RecordAction } from "@/lib/email-dns";
import { EmptyState, Panel, StatusPill } from "../WorkspacePrimitives";

// Email campaigns (Telnyx Email): sending domain setup, campaign ideas, AI
// "write it for me", a plain or designed email with live preview, test send,
// a paid send that runs in waves, and past results.

type Sender = {
  domain: string;
  from_name: string;
  from_local: string;
  reply_to: string | null;
  status: "pending" | "verified" | "failed";
  dns_records: { type: string; name: string; value: string }[];
  dns_managed: boolean;
};

type SenderInfo = {
  enabled: boolean;
  account: { ok: boolean; error: string | null; businessName: string; address: string; replyTo: string | null; logoUrl: string | null; industry: string | null };
  suggestedDomain: string | null;
  sender: Sender | null;
  dnsPlan: DnsPlan | null;
};

const STEP_LABEL: Record<RecordAction, { text: string; tone: "info" | "warning" | "neutral" | "success" }> = {
  add: { text: "Add new", tone: "info" },
  edit: { text: "Edit existing", tone: "warning" },
  keep: { text: "Keep yours", tone: "neutral" },
  done: { text: "Found", tone: "success" },
};

type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  status: "Draft" | "Sending" | "Sent" | "Paused";
  sent: number;
  failed: number;
  skipped: number;
  cost: number;
  created_at: string;
};

const TOKENS = ["{firstName}", "{lastName}", "{city}", "{state}"];
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tone = (s: EmailCampaign["status"]) => (s === "Sent" ? "success" : s === "Sending" ? "info" : s === "Paused" ? "warning" : "neutral");

const blankDesign = (): EmailDesign => ({
  theme: "dark",
  brandColor: "#34d399",
  logoUrl: null,
  eyebrow: "",
  headline: "",
  bullets: ["", "", ""],
  problemTitle: "",
  problem: "",
  solutionTitle: "",
  solution: "",
  offerLabel: "",
  offerTitle: "",
  offerSubtitle: "",
  offerValue: "",
  ctaText: "",
  ctaUrl: "",
});

async function json<T>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

export default function EmailCampaigns({ campaignNames }: { campaignNames: string[] }) {
  const [info, setInfo] = useState<SenderInfo | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [rate, setRate] = useState(0);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [domain, setDomain] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromLocal, setFromLocal] = useState("hello");
  const [replyTo, setReplyTo] = useState("");
  const [changingDomain, setChangingDomain] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<"plain" | "designed">("designed");
  const [design, setDesign] = useState<EmailDesign>(blankDesign);
  const [useLogo, setUseLogo] = useState(true);
  const [strategy, setStrategy] = useState("");
  const [goal, setGoal] = useState("");
  const [writing, setWriting] = useState(false);
  const [showIdeas, setShowIdeas] = useState(true);

  const [audience, setAudience] = useState("");
  const [audienceCount, setAudienceCount] = useState<{ contacts: number; suppressed: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([authFetch("/api/email/sender"), authFetch("/api/email/campaigns")]);
    const senderInfo = await json<SenderInfo>(s);
    const list = await json<{ campaigns: EmailCampaign[]; rate: number }>(c);
    setInfo(senderInfo);
    setCampaigns(list.campaigns || []);
    setRate(list.rate || 0);
    if (senderInfo.sender) return;
    setDomain((d) => d || senderInfo.suggestedDomain || "");
    setFromName((n) => n || senderInfo.account?.businessName || "");
    setReplyTo((r) => r || senderInfo.account?.replyTo || "");
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/email/campaigns?audience=${encodeURIComponent(audience)}`)
      .then((r) => json<{ contacts: number; suppressed: number }>(r))
      .then((r) => { if (!cancelled) setAudienceCount({ contacts: r.contacts || 0, suppressed: r.suppressed || 0 }); });
    return () => { cancelled = true; };
  }, [audience]);

  const estimate = useMemo(() => (audienceCount ? audienceCount.contacts * rate : 0), [audienceCount, rate]);
  const ideas = useMemo(() => ideasFor(info?.account.industry), [info?.account.industry]);
  const logoUrl = info?.account.logoUrl || null;
  const finalDesign = useMemo<EmailDesign | null>(
    () => (style === "designed" ? { ...design, logoUrl: useLogo ? logoUrl : null, bullets: design.bullets.filter((b) => b.trim()) } : null),
    [style, design, useLogo, logoUrl],
  );

  const previewHtml = useMemo(() => {
    if (!info) return "";
    return buildEmail({
      subject,
      previewText,
      body,
      design: finalDesign,
      contact: { first_name: "Maria", last_name: "Diaz", city: "Miami", state: "FL" },
      footer: { businessName: info.account.businessName || "Your business", address: info.account.address || "[YOUR BUSINESS ADDRESS]", unsubscribeUrl: "https://text2sale.com" },
    }).html;
  }, [info, subject, previewText, body, finalDesign]);

  const patchDesign = (patch: Partial<EmailDesign>) => setDesign((d) => ({ ...d, ...patch }));
  const setBullet = (i: number, value: string) => setDesign((d) => ({ ...d, bullets: d.bullets.map((b, j) => (j === i ? value : b)) }));

  const applyIdea = (idea: EmailIdea) => {
    setName((n) => n || idea.name);
    setSubject(idea.subjects[0]);
    setSubjectOptions(idea.subjects);
    setPreviewText(idea.previewText);
    setBody(idea.note);
    setDesign((d) => ({ ...d, ...idea.design, bullets: [...idea.design.bullets, "", "", ""].slice(0, Math.max(3, idea.design.bullets.length)) }));
    setStyle("designed");
    setStrategy(`${idea.why} Best time: ${idea.when}`);
    setShowIdeas(false);
  };

  const writeWithAi = async () => {
    setWriting(true);
    setNotice(null);
    const res = await authFetch("/api/email/ai-write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
    const out = await json<{ subjects: string[]; previewText: string; note: string; strategy: string; design: Partial<EmailDesign> }>(res);
    setWriting(false);
    if (!res.ok) return setNotice({ tone: "error", text: out.error || "The AI draft didn't come through." });
    setSubject(out.subjects[0] || "");
    setSubjectOptions(out.subjects);
    setPreviewText(out.previewText);
    setBody(out.note);
    setDesign((d) => ({ ...d, ...Object.fromEntries(Object.entries(out.design).filter(([, v]) => v !== undefined && v !== null)), bullets: [...(out.design.bullets || []), "", "", ""].slice(0, 3) }));
    setStyle("designed");
    setStrategy(out.strategy);
    setName((n) => n || goal.slice(0, 60));
    setShowIdeas(false);
  };

  const senderAction = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setNotice(null);
    const res = await authFetch("/api/email/sender", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await json<{ sender: Sender; dnsPlan: DnsPlan | null }>(res);
    setBusy(false);
    if (!res.ok) return setNotice({ tone: "error", text: out.error || "Something went wrong." });
    setInfo((cur) => (cur ? { ...cur, sender: out.sender, dnsPlan: out.dnsPlan ?? null } : cur));
    setChangingDomain(false);
    if (payload.action === "refresh") setNotice(out.sender.status === "verified" ? { tone: "ok", text: "Your domain is verified. You can send email campaigns." } : { tone: "ok", text: "Not verified yet. DNS changes can take up to a few hours." });
  };

  const saveCampaign = async (): Promise<EmailCampaign | null> => {
    const res = await authFetch("/api/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftId, name, subject, previewText, body, audienceCampaign: audience, design: finalDesign }),
    });
    const out = await json<{ campaign: EmailCampaign }>(res);
    if (!res.ok) { setNotice({ tone: "error", text: out.error || "Couldn't save the campaign." }); return null; }
    setDraftId(out.campaign.id);
    return out.campaign;
  };

  const sendTest = async () => {
    setBusy(true);
    setNotice(null);
    const campaign = await saveCampaign();
    if (campaign) {
      const res = await authFetch("/api/email/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, mode: "test" }) });
      const out = await json<{ to: string }>(res);
      setNotice(res.ok ? { tone: "ok", text: `Test sent to ${out.to}.` } : { tone: "error", text: out.error || "The test couldn't be sent." });
      load();
    }
    setBusy(false);
  };

  // Sends wave by wave until done. Resuming a paused campaign starts again
  // from the top; contacts it already reached are skipped and not charged.
  const runSend = async (campaignId: string, clearDraft: boolean) => {
    let totals = { sent: 0, failed: 0, skipped: 0 };
    setProgress(totals);
    let offset = 0;
    for (let i = 0; i < 1000; i++) {
      const res = await authFetch("/api/email/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, offset }) });
      const out = await json<{ sent: number; failed: number; skipped: number; nextOffset: number; done: boolean; outOfFunds: boolean }>(res);
      if (!res.ok) { setNotice({ tone: "error", text: out.error || "Sending stopped." }); break; }
      totals = { sent: totals.sent + out.sent, failed: totals.failed + out.failed, skipped: totals.skipped + out.skipped };
      setProgress(totals);
      if (out.outOfFunds) { setNotice({ tone: "error", text: "Sending paused: add funds to your wallet, then press Resume below." }); break; }
      if (out.done) {
        setNotice({ tone: "ok", text: `Campaign sent: ${totals.sent} emails.` });
        if (clearDraft) { setName(""); setSubject(""); setSubjectOptions([]); setPreviewText(""); setBody(""); setDesign(blankDesign()); setStrategy(""); setDraftId(null); }
        break;
      }
      offset = out.nextOffset;
    }
    setBusy(false);
    setProgress(null);
    load();
  };

  const send = async () => {
    setConfirming(false);
    setBusy(true);
    setNotice(null);
    const campaign = await saveCampaign();
    if (!campaign) return setBusy(false);
    setDraftId(null); // once sending starts it is no longer an editable draft
    await runSend(campaign.id, true);
  };

  const resume = async (campaignId: string) => {
    setBusy(true);
    setNotice(null);
    await runSend(campaignId, false);
  };

  if (!info) return <Panel><div className="v2-mini-loading"><span className="v2-spin">◌</span> Loading email campaigns</div></Panel>;

  if (!info.enabled) {
    return <Panel><EmptyState title="Email campaigns are coming soon" description="Send designed email campaigns to your leads from your own domain, with campaign ideas and AI writing, paid from your wallet per email. This switches on as soon as email sending is connected." /></Panel>;
  }

  const sender = info.sender;
  const verified = sender?.status === "verified";
  const plan = info.dnsPlan;
  const planOpen = plan ? plan.steps.some((st) => st.action === "add" || st.action === "edit") : false;
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => setNotice({ tone: "ok", text: "Copied." }), () => undefined);
  };
  const startChange = () => {
    if (sender) {
      setDomain(sender.domain);
      setFromName(sender.from_name);
      setFromLocal(sender.from_local);
      setReplyTo(sender.reply_to || "");
    }
    setChangingDomain(true);
  };
  const hasContent = style === "designed" ? Boolean(design.headline.trim()) : Boolean(body.trim());
  const ready = verified && info.account.ok && name.trim() && subject.trim() && hasContent;
  const field = (id: string, label: string, value: string, onChange: (v: string) => void, placeholder = "") => (
    <div className="v2-field"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {!info.account.ok && info.account.error && <div className="v2-notice is-error">{info.account.error}</div>}

      <Panel>
        <div className="v2-panel-head"><h2>Sending domain</h2>{sender && <StatusPill tone={verified ? "success" : "warning"}>{verified ? "Verified" : "Waiting for DNS"}</StatusPill>}</div>
        {!sender || changingDomain ? (
          <div className="v2-panel-body" style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0 }}>Emails go out from your own domain so they land in the inbox and replies come to you.{info.suggestedDomain ? " We'll add the DNS records to your Text2Sale domain for you." : " We'll walk you through the DNS records to add."}</p>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="v2-field"><label htmlFor="email-domain">Domain</label><input id="email-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="news.yourbusiness.com" /><small>Already use this domain for email (Google, Outlook, GoDaddy)? Use a subdomain like news.yourbusiness.com. Your inbox stays untouched and campaigns get their own reputation.</small></div>
              {field("email-from-name", "From name", fromName, setFromName)}
              <div className="v2-field"><label htmlFor="email-from-local">From address</label><input id="email-from-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} /><small>{fromLocal || "hello"}@{domain || "yourbusiness.com"}</small></div>
              <div className="v2-field"><label htmlFor="email-reply-to">Replies go to</label><input id="email-reply-to" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="v2-btn v2-btn-primary" disabled={busy || !domain} onClick={() => senderAction({ domain, fromName, fromLocal, replyTo })}><Mail size={15} /> {sender ? "Save sending domain" : "Set up sending domain"}</button>
              {sender && <button className="v2-btn" disabled={busy} onClick={() => setChangingDomain(false)}>Cancel</button>}
            </div>
          </div>
        ) : (
          <div className="v2-panel-body" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <p style={{ margin: 0 }}>Sending as <strong>{sender.from_name} &lt;{sender.from_local}@{sender.domain}&gt;</strong>{sender.reply_to ? <> · replies to <strong>{sender.reply_to}</strong></> : null}</p>
              <button className="v2-btn" disabled={busy} onClick={startChange}>Change domain</button>
            </div>
            {!verified && plan && (
              <>
                {plan.suggestSubdomain && planOpen && (
                  <div className="v2-notice is-ok" style={{ display: "grid", gap: 8 }}>
                    <span><strong>{sender.domain}</strong> already handles your email. The simplest setup is to send campaigns from <strong>{plan.suggestSubdomain}</strong>: nothing about your inbox changes, there are no records to edit, and campaign reputation stays separate from your everyday mail.</span>
                    <div><button className="v2-btn v2-btn-primary" disabled={busy} onClick={() => senderAction({ domain: plan.suggestSubdomain, fromName: sender.from_name, fromLocal: sender.from_local, replyTo: sender.reply_to })}>Use {plan.suggestSubdomain} instead</button></div>
                  </div>
                )}
                <p style={{ margin: 0 }}>
                  {sender.dns_managed ? "We added these records to your domain. Verification usually finishes within an hour." : planOpen ? <>Make these changes where <strong>{plan.zone}</strong>&apos;s DNS is managed{plan.provider ? <> (<strong>{plan.provider.name}</strong>)</> : null}, then check verification.</> : "All records are in place. Check verification. It can take a few minutes after DNS updates."}
                  {plan.provider && planOpen && <> <a href={plan.provider.url} target="_blank" rel="noreferrer">Open {plan.provider.name} <ExternalLink size={12} /></a></>}
                </p>
                {plan.provider?.tip && planOpen && <small style={{ opacity: 0.8 }}>{plan.provider.tip}</small>}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Step</th><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Host</th><th style={{ textAlign: "left", padding: 6 }}>Value</th></tr></thead>
                    <tbody>
                      {plan.steps.map((st) => (
                        <tr key={`${st.name}${st.value}`} style={{ verticalAlign: "top" }}>
                          <td style={{ padding: 6, whiteSpace: "nowrap" }}><StatusPill tone={STEP_LABEL[st.action].tone}>{STEP_LABEL[st.action].text}</StatusPill></td>
                          <td style={{ padding: 6 }}>{st.type}</td>
                          <td style={{ padding: 6, minWidth: 150 }}><code style={{ whiteSpace: "nowrap" }}>{st.host}</code><br /><small style={{ opacity: 0.7, wordBreak: "break-all" }}>{st.name}</small></td>
                          <td style={{ padding: 6, wordBreak: "break-all" }}>
                            {st.action === "edit" && <small style={{ display: "block", opacity: 0.8 }}>Don&apos;t add a second SPF record. Change your existing one from <code>{st.current}</code> to:</small>}
                            {st.action === "keep" && <small style={{ display: "block", opacity: 0.8 }}>You already have a DMARC record. Keep it; nothing to add.</small>}
                            <code>{st.value}</code>
                            {(st.action === "add" || st.action === "edit") && <button className="v2-btn" style={{ marginLeft: 6, padding: "2px 6px" }} aria-label="Copy value" onClick={() => copy(st.value)}><Copy size={12} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div><button className="v2-btn" disabled={busy} onClick={() => senderAction({ action: "refresh" })}><RefreshCw size={15} /> Check verification</button></div>
              </>
            )}
            {!verified && !plan && (
              <>
                <p style={{ margin: 0 }}>{sender.dns_managed ? "We added these records to your domain. Verification usually finishes within an hour." : "Add these records where your domain's DNS is managed, then check verification. If your domain already has an SPF record (v=spf1 ...), add the include to it instead of adding a second one."}</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Name</th><th style={{ textAlign: "left", padding: 6 }}>Value</th></tr></thead>
                    <tbody>{sender.dns_records.map((r) => <tr key={`${r.name}${r.value}`}><td style={{ padding: 6 }}>{r.type}</td><td style={{ padding: 6, minWidth: 150, wordBreak: "break-all" }}>{r.name}</td><td style={{ padding: 6, wordBreak: "break-all" }}>{r.value}</td></tr>)}</tbody>
                  </table>
                </div>
                <div><button className="v2-btn" disabled={busy} onClick={() => senderAction({ action: "refresh" })}><RefreshCw size={15} /> Check verification</button></div>
              </>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="v2-panel-head"><h2>Campaign ideas</h2><button className="v2-btn" onClick={() => setShowIdeas((s) => !s)}><Lightbulb size={15} /> {showIdeas ? "Hide ideas" : "Show ideas"}</button></div>
        <div className="v2-panel-body" style={{ display: "grid", gap: 10 }}>
          <div className="v2-field">
            <label htmlFor="email-goal">Or describe your goal and let AI write it</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input id="email-goal" style={{ flex: "1 1 320px", minWidth: 0 }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Get past health clients to book a review before open enrollment" />
              <button className="v2-btn v2-btn-primary" disabled={writing || goal.trim().length < 5} onClick={writeWithAi}><Sparkles size={15} /> {writing ? "Writing…" : "Write it for me ($0.02)"}</button>
            </div>
          </div>
          {showIdeas && (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {ideas.map((idea) => (
                <div key={idea.id} className="v2-panel" style={{ padding: 14, display: "grid", gap: 6, alignContent: "start" }}>
                  <strong>{idea.name}</strong>
                  <small>{idea.why}</small>
                  <small><b>When:</b> {idea.when}</small>
                  <div><button className="v2-btn" onClick={() => applyIdea(idea)}>Use this idea</button></div>
                </div>
              ))}
            </div>
          )}
          {strategy && <div className="v2-notice is-ok"><Lightbulb size={15} /> {strategy}</div>}
        </div>
      </Panel>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "start" }}>
        <Panel>
          <div className="v2-panel-head"><h2>Compose</h2><div className="v2-segmented" role="group" aria-label="Email style">{(["designed", "plain"] as const).map((s) => <button key={s} className={style === s ? "is-active" : ""} aria-pressed={style === s} onClick={() => setStyle(s)}>{s === "designed" ? "Designed" : "Plain text"}</button>)}</div></div>
          <div className="v2-panel-body" style={{ display: "grid", gap: 12 }}>
            {field("email-name", "Campaign name", name, setName, "Open enrollment check-in")}
            <div className="v2-field">
              <label htmlFor="email-subject">Subject line</label>
              <input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{firstName}, quick question about your coverage" />
              {subjectOptions.length > 1 && <div className="v2-token-row">{subjectOptions.map((s) => <button key={s} onClick={() => setSubject(s)}>{s}</button>)}</div>}
            </div>
            {field("email-preview", "Preview text", previewText, setPreviewText, "Shown after the subject in most inboxes")}
            <div className="v2-field">
              <label htmlFor="email-body">{style === "designed" ? "Personal note above the design (optional)" : "Message"}</label>
              <textarea id="email-body" rows={style === "designed" ? 3 : 10} value={body} onChange={(e) => setBody(e.target.value)} placeholder={"Hi {firstName},\n\nWrite like a person. Leave a blank line between paragraphs."} />
              <div className="v2-token-row">{TOKENS.map((t) => <button key={t} onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}${t}`)}>{t}</button>)}</div>
            </div>

            {style === "designed" && (
              <>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  <div className="v2-field"><label htmlFor="email-color">Brand color</label><input id="email-color" type="color" value={design.brandColor} onChange={(e) => patchDesign({ brandColor: e.target.value })} /></div>
                  <div className="v2-field"><label htmlFor="email-theme">Background</label><select id="email-theme" value={design.theme} onChange={(e) => patchDesign({ theme: e.target.value as EmailDesign["theme"] })}><option value="dark">Dark</option><option value="light">Light</option></select></div>
                  <div className="v2-field"><label htmlFor="email-logo">Logo</label><select id="email-logo" value={useLogo && logoUrl ? "yes" : "no"} disabled={!logoUrl} onChange={(e) => setUseLogo(e.target.value === "yes")}><option value="yes">Show my logo</option><option value="no">{logoUrl ? "Use business name" : "No logo uploaded"}</option></select></div>
                </div>
                {field("email-headline", "Headline", design.headline, (v) => patchDesign({ headline: v }), "Texting and dialing in one place")}
                {design.bullets.map((b, i) => <div key={i}>{field(`email-bullet-${i}`, `Benefit ${i + 1}`, b, (v) => setBullet(i, v))}</div>)}
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}>
                  {field("email-problem-title", "Problem title", design.problemTitle, (v) => patchDesign({ problemTitle: v }), "The problem:")}
                  {field("email-problem", "Problem", design.problem, (v) => patchDesign({ problem: v }))}
                  {field("email-solution-title", "Solution title", design.solutionTitle, (v) => patchDesign({ solutionTitle: v }), "How we fix it:")}
                  {field("email-solution", "Solution", design.solution, (v) => patchDesign({ solution: v }))}
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  {field("email-offer-label", "Offer label", design.offerLabel, (v) => patchDesign({ offerLabel: v }), "Best fit for you")}
                  {field("email-offer-title", "Offer", design.offerTitle, (v) => patchDesign({ offerTitle: v }), "Free 10-minute review")}
                  {field("email-offer-sub", "Offer detail", design.offerSubtitle, (v) => patchDesign({ offerSubtitle: v }))}
                  {field("email-offer-value", "Price or value", design.offerValue, (v) => patchDesign({ offerValue: v }), "$0")}
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  {field("email-cta", "Button text", design.ctaText, (v) => patchDesign({ ctaText: v }), "Book my review")}
                  {field("email-cta-url", "Button link (https://)", design.ctaUrl, (v) => patchDesign({ ctaUrl: v }), "https://calendly.com/you")}
                </div>
              </>
            )}

            <div className="v2-field">
              <label htmlFor="email-audience">Audience</label>
              <select id="email-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="">All contacts with an email address</option>
                {campaignNames.map((n) => <option key={n} value={n}>Leads in {n}</option>)}
              </select>
              {audienceCount && <small>{audienceCount.contacts.toLocaleString()} contacts with an email · unsubscribed and bounced addresses are skipped automatically · estimated cost up to {money(estimate)} ({money(rate)} per email)</small>}
            </div>

            {progress && <div className="v2-notice is-ok">Sending… {progress.sent.toLocaleString()} sent · {progress.failed} failed · {progress.skipped.toLocaleString()} skipped</div>}

            {confirming ? (
              <div className="v2-notice is-ok" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span>Send to up to {audienceCount?.contacts.toLocaleString() || 0} contacts for up to {money(estimate)}, charged from your wallet as it sends?</span>
                <button className="v2-btn v2-btn-primary" onClick={send}><Check size={15} /> Yes, send now</button>
                <button className="v2-btn" onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="v2-btn" disabled={!ready || busy} onClick={sendTest}><Mail size={15} /> Send me a test ({money(rate)})</button>
                <button className="v2-btn v2-btn-primary" disabled={!ready || busy || !audienceCount?.contacts} onClick={() => setConfirming(true)}><Send size={15} /> Send campaign</button>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="v2-panel-head"><h2>Preview</h2><small>As Maria Diaz will see it</small></div>
          <div className="v2-panel-body">
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <small><b>{sender?.from_name || info.account.businessName || "Your business"}</b></small>
            <small>{subject.replace(/\{firstName\}/gi, "Maria") || "Subject line"} — {previewText.replace(/\{firstName\}/gi, "Maria")}</small>
          </div>
          <iframe title="Email preview" srcDoc={previewHtml} sandbox="" style={{ width: "100%", height: 760, border: "1px solid rgba(127,127,127,.25)", borderRadius: 12, background: "#fff" }} />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="v2-panel-head"><h2>Email campaigns</h2></div>
        {campaigns.length === 0 ? (
          <EmptyState title="No email campaigns yet" description="Your sent campaigns and their results will appear here." />
        ) : (
          <div className="v2-panel-body" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead><tr>{["Campaign", "Status", "Sent", "Failed", "Skipped", "Cost", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 8 }}>{h}</th>)}</tr></thead>
              <tbody>{campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 8 }}><strong>{c.name}</strong><br /><small>{c.subject}</small></td>
                  <td style={{ padding: 8 }}><StatusPill tone={tone(c.status)}>{c.status}</StatusPill></td>
                  <td style={{ padding: 8 }}>{c.sent.toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{c.failed.toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{c.skipped.toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{money(Number(c.cost))}</td>
                  <td style={{ padding: 8 }}>{c.status === "Paused" ? <button className="v2-btn" disabled={busy} onClick={() => resume(c.id)}>Resume</button> : null}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
