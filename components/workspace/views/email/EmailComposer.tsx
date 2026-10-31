"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { UNSUBSCRIBE_LABELS, buildEmail, footerFor, isMailingAddress, personalize, type EmailDesign } from "@/lib/email-design";
import { ideasFor, type EmailIdea } from "@/lib/email-ideas";
import type { Audience, EmailCampaign, SenderInfo } from "./types";

// The email campaign composer: the letter on the left, audience, schedule,
// cost and an inbox preview on the right. Personal letters (one button and a
// sign-off) are the default; a branded card is available under Templates.

type Groups = { lists: { name: string; count: number }[]; tags: { name: string; count: number }[] };
type Summary = { willReceive: number; unsubscribed: number; bounced: number };
type Field = "subject" | "preview" | "body";

const MERGE = ["{first_name}", "{state}", "{agent_name}"];
const SAMPLE = { first_name: "Maria", last_name: "Diaz", city: "Miami", state: "FL" };
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });
const snake = (s: string) => String(s || "").replace(/\{firstName\}/g, "{first_name}").replace(/\{lastName\}/g, "{last_name}");
const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Dark text on a light button color, white on a dark one (matches the sent email). */
const textOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16) || 0;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? "#0b3b2c" : "#ffffff";
};

/** Next weekday morning: a good default send time for a campaign. */
function defaultSendDate(): string {
  const d = new Date();
  if (d.getHours() >= 9) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return isoDate(d);
}

const blankCard = (): EmailDesign => ({
  theme: "dark", brandColor: "#34d399", logoUrl: null, eyebrow: "", headline: "", bullets: ["", "", ""], problemTitle: "", problem: "",
  solutionTitle: "", solution: "", offerLabel: "", offerTitle: "", offerSubtitle: "", offerValue: "", ctaText: "", ctaUrl: "",
});

async function json<T>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

export default function EmailComposer({
  info,
  rate,
  initial,
  footerDefaults,
  channelSwitch,
  onDone,
  onCancel,
}: {
  info: SenderInfo;
  rate: number;
  initial: EmailCampaign | null;
  /** The footer the account used last, so a custom name or address carries over to new campaigns. */
  footerDefaults?: Pick<EmailDesign, "footerName" | "footerAddress" | "footerNote" | "footerUnsubscribe"> | null;
  channelSwitch: ReactNode;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const sender = info.sender;
  const verified = sender?.status === "verified";
  const d = initial?.design || null;

  const [draftId, setDraftId] = useState<string | null>(initial?.id || null);
  const [name, setName] = useState(initial?.name || "");
  const [fromName, setFromName] = useState(sender?.from_name || info.account.businessName || "");
  const [replyTo, setReplyTo] = useState(sender?.reply_to || info.account.replyTo || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState(initial?.preview_text || "");
  const [body, setBody] = useState(initial?.body || "Hi {first_name},\n\n");
  const [ctaText, setCtaText] = useState(d?.ctaText || "");
  const [ctaUrl, setCtaUrl] = useState(d?.ctaUrl || "");
  const [signature, setSignature] = useState(d?.signature || (sender?.from_name || "").split(" at ")[0]);
  const [look, setLook] = useState<"personal" | "card">(d && d.style !== "personal" && d.headline ? "card" : "personal");
  const [card, setCard] = useState<EmailDesign>(() => ({ ...blankCard(), ...(d && d.style !== "personal" ? d : {}), bullets: [...(d?.bullets || []), "", "", ""].slice(0, 3) }));
  const [useLogo, setUseLogo] = useState(true);
  const [brandColor, setBrandColor] = useState(d?.brandColor || "#34d399");
  const [footerName, setFooterName] = useState((d || footerDefaults)?.footerName || "");
  const [footerAddress, setFooterAddress] = useState((d || footerDefaults)?.footerAddress || "");
  const [footerNote, setFooterNote] = useState((d || footerDefaults)?.footerNote || "");
  const [footerUnsubscribe, setFooterUnsubscribe] = useState((d || footerDefaults)?.footerUnsubscribe || "Unsubscribe");
  const [editingFooter, setEditingFooter] = useState(false);

  const [audience, setAudience] = useState<Audience>(initial?.audience || { lists: [], tags: [] });
  const [groups, setGroups] = useState<Groups | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editingAudience, setEditingAudience] = useState(false);

  const [when, setWhen] = useState<"later" | "now">("later");
  const [sendDate, setSendDate] = useState(defaultSendDate);
  const [sendTime, setSendTime] = useState("09:30");
  const [contactZone, setContactZone] = useState(true);
  const [hourlyLimit, setHourlyLimit] = useState(500);
  const [editingSchedule, setEditingSchedule] = useState(false);

  const [panel, setPanel] = useState<"none" | "ai" | "templates">("none");
  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState("");
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const refs = { subject: useRef<HTMLInputElement>(null), preview: useRef<HTMLInputElement>(null), body: useRef<HTMLTextAreaElement>(null) };
  const lastField = useRef<Field>("body");

  useEffect(() => {
    let alive = true;
    authFetch("/api/email/campaigns?groups=1").then((r) => json<Groups>(r)).then((g) => { if (alive) setGroups({ lists: g.lists || [], tags: g.tags || [] }); });
    return () => { alive = false; };
  }, []);

  const audienceKey = JSON.stringify(audience);
  useEffect(() => {
    let alive = true;
    authFetch(`/api/email/campaigns?audience=${encodeURIComponent(audienceKey)}`)
      .then((r) => json<Summary>(r))
      .then((s) => { if (alive) setSummary({ willReceive: s.willReceive || 0, unsubscribed: s.unsubscribed || 0, bounced: s.bounced || 0 }); });
    return () => { alive = false; };
  }, [audienceKey]);

  const logoUrl = info.account.logoUrl;
  const design = useMemo<Partial<EmailDesign>>(
    () =>
      look === "personal"
        ? { style: "personal", ctaText, ctaUrl, signature, brandColor, footerName, footerAddress, footerNote, footerUnsubscribe }
        : { ...card, style: "card", signature, brandColor, footerName, footerAddress, footerNote, footerUnsubscribe, ctaText: card.ctaText || ctaText, ctaUrl: card.ctaUrl || ctaUrl, logoUrl: useLogo ? logoUrl : null, bullets: card.bullets.filter((b) => b.trim()) },
    [look, ctaText, ctaUrl, signature, brandColor, card, useLogo, logoUrl, footerName, footerAddress, footerNote, footerUnsubscribe],
  );
  const accountFooter = { businessName: info.account.businessName || "Your business", address: info.account.address || "[YOUR BUSINESS ADDRESS]" };
  const footer = footerFor(accountFooter, design, "https://text2sale.com");
  const addressRejected = footerAddress.trim() !== "" && !isMailingAddress(footerAddress.trim());
  const cardPreview = useMemo(
    () =>
      look === "card"
        ? buildEmail({ subject, previewText, body: "", design, contact: { ...SAMPLE, agent_name: signature }, footer: footerFor({ businessName: info.account.businessName || "Your business", address: info.account.address || "[YOUR BUSINESS ADDRESS]" }, design, "https://text2sale.com") }).html
        : "",
    [look, subject, previewText, design, signature, info.account],
  );

  const insert = (token: string) => {
    const field = lastField.current;
    const el = refs[field].current;
    const [value, set] = field === "subject" ? [subject, setSubject] : field === "preview" ? [previewText, setPreviewText] : [body, setBody];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    set(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const fill = (args: { subjects: string[]; previewText: string; note: string; design: Partial<EmailDesign>; strategy: string; name?: string }) => {
    const dz = args.design;
    setSubject(snake(args.subjects[0] || ""));
    setSubjectOptions(args.subjects.map(snake));
    setPreviewText(snake(args.previewText));
    setBody(
      [snake(args.note), dz.problem ? `${dz.problemTitle || ""} ${dz.problem}`.trim() : "", dz.solution ? `${dz.solutionTitle || ""} ${dz.solution}`.trim() : ""]
        .map((p) => snake(p))
        .filter(Boolean)
        .join("\n\n"),
    );
    if (dz.ctaText) setCtaText(snake(dz.ctaText));
    setCard((c) => ({ ...c, ...Object.fromEntries(Object.entries(dz).filter(([, v]) => v !== undefined && v !== null)), bullets: [...(dz.bullets || []), "", "", ""].slice(0, 3) }));
    setStrategy(args.strategy);
    if (args.name) setName((n) => n || args.name || "");
    setPanel("none");
  };

  const applyIdea = (idea: EmailIdea) =>
    fill({ subjects: idea.subjects, previewText: idea.previewText, note: idea.note, design: idea.design, strategy: `${idea.why} Best time: ${idea.when}`, name: idea.name });

  const writeWithAi = async () => {
    setWriting(true);
    setNotice(null);
    const res = await authFetch("/api/email/ai-write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
    const out = await json<{ subjects: string[]; previewText: string; note: string; strategy: string; design: Partial<EmailDesign> }>(res);
    setWriting(false);
    if (!res.ok) return setNotice({ tone: "error", text: out.error || "The AI draft didn't come through." });
    fill({ ...out, name: goal.slice(0, 60) });
  };

  const save = async (): Promise<string | null> => {
    if (sender && (fromName.trim() !== sender.from_name || (replyTo.trim() || null) !== sender.reply_to)) {
      await authFetch("/api/email/sender", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: sender.domain, fromLocal: sender.from_local, fromName, replyTo }) });
    }
    const res = await authFetch("/api/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftId, name: name.trim() || subject.slice(0, 60), subject, previewText, body, audience, design }),
    });
    const out = await json<{ campaign: { id: string } }>(res);
    if (!res.ok) {
      setNotice({ tone: "error", text: out.error || "Couldn't save the campaign." });
      return null;
    }
    setDraftId(out.campaign.id);
    return out.campaign.id;
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const sendTest = () =>
    act(async () => {
      const id = await save();
      if (!id) return;
      const res = await authFetch("/api/email/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, mode: "test" }) });
      const out = await json<{ to: string }>(res);
      setNotice(res.ok ? { tone: "ok", text: `Test sent to ${out.to}.` } : { tone: "error", text: out.error || "The test couldn't be sent." });
    });

  const schedule = () =>
    act(async () => {
      setConfirming(false);
      const id = await save();
      if (!id) return;
      const timing = when === "now" ? {} : contactZone ? { localTime: `${sendDate}T${sendTime}` } : { sendAt: new Date(`${sendDate}T${sendTime}`).toISOString() };
      const res = await authFetch("/api/email/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, mode: "schedule", hourlyLimit, ...timing }) });
      const out = await json<{ queued: number }>(res);
      if (!res.ok) return setNotice({ tone: "error", text: out.error || "Couldn't schedule the campaign." });
      onDone(when === "now" ? `Sending to ${out.queued.toLocaleString()} contacts.` : `Scheduled for ${out.queued.toLocaleString()} contacts: ${scheduleText}.`);
    });

  const toggle = (kind: keyof Audience, value: string) =>
    setAudience((a) => ({ ...a, [kind]: a[kind].includes(value) ? a[kind].filter((v) => v !== value) : [...a[kind], value] }));

  const audienceText = [...audience.lists.map((l) => l), ...audience.tags.map((t) => t)];
  const when_ = new Date(`${sendDate}T${sendTime}`);
  const scheduleText =
    when === "now"
      ? "Now"
      : `${when_.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${when_.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ${contactZone ? "in each contact's time zone" : "your time"}`;
  const estimate = (summary?.willReceive || 0) * rate;
  const hasContent = look === "card" ? Boolean(card.headline.trim()) : Boolean(body.replace(/Hi \{first_name\},?/i, "").trim());
  const ready = verified && info.account.ok && subject.trim() && hasContent && (summary?.willReceive || 0) > 0;
  const fromLabel = fromName.trim() || info.account.businessName || "Your business";

  return (
    <div className="em-compose">
      <header className="em-head">
        <div>
          <p className="em-eyebrow">{initial ? "Edit campaign" : "New campaign"}</p>
          <input className="em-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this campaign" aria-label="Campaign name" />
        </div>
        <div className="em-head-actions">
          {channelSwitch}
          <button className="v2-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="v2-btn" disabled={!ready || busy} onClick={sendTest}>Send test</button>
          <button className="v2-btn v2-btn-primary" disabled={!ready || busy} onClick={() => setConfirming(true)}>{when === "now" ? "Send now" : "Schedule"}</button>
        </div>
      </header>

      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {!verified && <div className="v2-notice is-error">Verify your sending domain above before sending. You can write and save this campaign now.</div>}
      {confirming && (
        <div className="v2-notice is-ok em-confirm">
          <span>{when === "now" ? "Send now" : `Schedule for ${scheduleText}`} to {summary?.willReceive.toLocaleString() || 0} contacts, up to {money(estimate)} from your wallet, charged batch by batch as it sends?</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="v2-btn v2-btn-primary" onClick={schedule}><Check size={15} /> {when === "now" ? "Yes, send" : "Yes, schedule"}</button>
            <button className="v2-btn" onClick={() => setConfirming(false)}>Back</button>
          </span>
        </div>
      )}

      <div className="em-grid">
        <section className="em-card em-editor">
          <div className="em-row">
            <label className="em-field"><span>From name</span><input value={fromName} onChange={(e) => setFromName(e.target.value)} /></label>
            <label className="em-field"><span>Reply-to</span><input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} /></label>
          </div>
          <label className="em-field">
            <span>Subject line</span>
            <input ref={refs.subject} onFocus={() => (lastField.current = "subject")} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{first_name}, quick question about your coverage" />
          </label>
          {subjectOptions.length > 1 && <div className="em-chips">{subjectOptions.map((s) => <button key={s} className={s === subject ? "is-on" : ""} onClick={() => setSubject(s)}>{s}</button>)}</div>}
          <label className="em-field">
            <span>Preview text</span>
            <input ref={refs.preview} onFocus={() => (lastField.current = "preview")} value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Shown after the subject in most inboxes" />
          </label>
          <div className="em-chips">
            {MERGE.map((t, i) => <button key={t} onClick={() => insert(t)}>{i === 0 ? `Personalize: ${t}` : t}</button>)}
            <button className={`is-accent${panel === "ai" ? " is-on" : ""}`} onClick={() => setPanel((p) => (p === "ai" ? "none" : "ai"))}><Sparkles size={12} /> Write with AI</button>
            <button className={panel === "templates" ? "is-on" : ""} onClick={() => setPanel((p) => (p === "templates" ? "none" : "templates"))}>Templates</button>
          </div>

          {panel === "ai" && (
            <div className="em-drawer">
              <label className="em-field"><span>What should this email do?</span><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Get past health clients to book a review before open enrollment" /></label>
              <div><button className="v2-btn v2-btn-primary" disabled={writing || goal.trim().length < 5} onClick={writeWithAi}><Sparkles size={15} /> {writing ? "Writing…" : "Write it for me ($0.02)"}</button></div>
            </div>
          )}
          {panel === "templates" && (
            <div className="em-drawer">
              <div className="em-look" role="group" aria-label="Email look">
                <button className={look === "personal" ? "is-on" : ""} onClick={() => setLook("personal")}><b>Personal letter</b><small>Reads like a note from you. Best for replies.</small></button>
                <button className={look === "card" ? "is-on" : ""} onClick={() => setLook("card")}><b>Branded card</b><small>Your logo, color, benefits and an offer box.</small></button>
              </div>
              <div className="em-ideas">
                {ideasFor(info.account.industry).map((idea) => (
                  <article key={idea.id}>
                    <b>{idea.name}</b>
                    <small>{idea.why}</small>
                    <small><b>When:</b> {idea.when}</small>
                    <button className="v2-btn" onClick={() => applyIdea(idea)}>Use this</button>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="em-letter">
            <textarea ref={refs.body} onFocus={() => (lastField.current = "body")} value={body} onChange={(e) => setBody(e.target.value)} rows={Math.max(7, body.split("\n").length + 1)} aria-label="Email message" placeholder="Write like a person. Leave a blank line between paragraphs." />
            {look === "card" && cardPreview && <iframe title="Branded card preview" srcDoc={cardPreview} sandbox="" className="em-card-preview" />}
            {ctaText || ctaUrl ? (
              <div className="em-cta">
                <span className="em-cta-button" style={{ background: brandColor }}>
                  <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Button text" aria-label="Button text" size={Math.max(10, ctaText.length)} style={{ color: textOn(brandColor) }} />
                </span>
                <input className="em-cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://your-booking-link.com" aria-label="Button link" />
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} aria-label="Button color" />
                <button className="em-x" aria-label="Remove button" onClick={() => { setCtaText(""); setCtaUrl(""); }}><X size={14} /></button>
              </div>
            ) : (
              <button className="em-add" onClick={() => setCtaText("Book my 10-minute review")}><Plus size={14} /> Add a button</button>
            )}
            {ctaText && !/^https:\/\//.test(ctaUrl) && <small className="em-warn">Add an https:// link for the button. Without one it isn&apos;t shown.</small>}
            <input className="em-signature" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Your name" aria-label="Signature" />
          </div>

          {look === "card" && (
            <details className="em-card-fields" open>
              <summary>Branded card</summary>
              <label className="em-field"><span>Brand name at the top{useLogo && logoUrl ? " (shown when the logo is off)" : ""}</span><input value={card.eyebrow} onChange={(e) => setCard({ ...card, eyebrow: e.target.value })} placeholder={(footer.businessName || "Your business").toUpperCase()} maxLength={60} /></label>
              <div className="em-row">
                <label className="em-field"><span>Background</span><select value={card.theme} onChange={(e) => setCard({ ...card, theme: e.target.value as EmailDesign["theme"] })}><option value="dark">Dark</option><option value="light">Light</option></select></label>
                <label className="em-field"><span>Logo</span><select value={useLogo && logoUrl ? "yes" : "no"} disabled={!logoUrl} onChange={(e) => setUseLogo(e.target.value === "yes")}><option value="yes">Show my logo</option><option value="no">No logo</option></select></label>
              </div>
              <label className="em-field"><span>Headline</span><input value={card.headline} onChange={(e) => setCard({ ...card, headline: e.target.value })} placeholder="Open enrollment is coming. Is your plan still right?" /></label>
              {card.bullets.map((b, i) => <label key={i} className="em-field"><span>Benefit {i + 1}</span><input value={b} onChange={(e) => setCard({ ...card, bullets: card.bullets.map((x, j) => (j === i ? e.target.value : x)) })} /></label>)}
              <div className="em-row">
                <label className="em-field"><span>Offer</span><input value={card.offerTitle} onChange={(e) => setCard({ ...card, offerTitle: e.target.value })} placeholder="Free 10-minute review" /></label>
                <label className="em-field"><span>Price or value</span><input value={card.offerValue} onChange={(e) => setCard({ ...card, offerValue: e.target.value })} placeholder="$0" /></label>
              </div>
            </details>
          )}
          <div className="em-footer">
            <div className="em-footer-head">
              <b>Email footer</b>
              <button className="em-link" onClick={() => setEditingFooter((v) => !v)}>{editingFooter ? "Done" : "Edit footer"}</button>
            </div>
            <button type="button" className="em-footer-preview" title="Edit the footer" onClick={() => setEditingFooter(true)}>
              {footer.businessName} · {footer.address}<br />
              {footer.note || `You're receiving this because you contacted ${footer.businessName}.`} <u>{footer.unsubscribeLabel || "Unsubscribe"}</u>
            </button>
            {editingFooter && (
              <div className="em-footer-fields">
                <label className="em-field"><span>Business name</span><input value={footerName} onChange={(e) => setFooterName(e.target.value)} placeholder={info.account.businessName || "Your business"} maxLength={120} /></label>
                <label className="em-field"><span>Mailing address</span><input value={footerAddress} onChange={(e) => setFooterAddress(e.target.value)} placeholder={info.account.address || "Street or PO box, city, state, ZIP"} maxLength={200} /></label>
                {addressRejected && <small className="em-warn">Enter a full mailing address (street or PO box, city, state and ZIP). Until then your registered address is used.</small>}
                <label className="em-field"><span>Why they&apos;re getting this</span><input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder={`You're receiving this because you contacted ${footer.businessName}.`} maxLength={200} /></label>
                <label className="em-field"><span>Unsubscribe link wording</span><select value={footerUnsubscribe} onChange={(e) => setFooterUnsubscribe(e.target.value)}>{UNSUBSCRIBE_LABELS.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
                <small className="em-note">Leave a field blank to use your business details. A mailing address and the unsubscribe link are required by law, so the unsubscribe link is always added.</small>
              </div>
            )}
          </div>
        </section>

        <aside className="em-side">
          <section className="em-card">
            <h3>Audience</h3>
            <p className="em-line">{audienceText.length ? <>Tag: <b>{audienceText.join(" + ")}</b></> : <b>Everyone with an email address</b>} <button className="em-link" onClick={() => setEditingAudience((v) => !v)}>{editingAudience ? "Done" : "Change"}</button></p>
            {editingAudience && (
              <div className="em-picker">
                {!groups ? <small>Loading lists and tags…</small> : !groups.lists.length && !groups.tags.length ? <small>No lead lists or tags yet. Everyone with an email address is included.</small> : null}
                {groups?.lists.length ? <><small>Lead lists</small><div className="em-chips">{groups.lists.map((g) => <button key={g.name} className={audience.lists.includes(g.name) ? "is-on" : ""} onClick={() => toggle("lists", g.name)}>{g.name} · {g.count.toLocaleString()}</button>)}</div></> : null}
                {groups?.tags.length ? <><small>Tags</small><div className="em-chips">{groups.tags.map((g) => <button key={g.name} className={audience.tags.includes(g.name) ? "is-on" : ""} onClick={() => toggle("tags", g.name)}>{g.name} · {g.count.toLocaleString()}</button>)}</div></> : null}
              </div>
            )}
            <div className="em-stats">
              <div><strong>{summary ? summary.willReceive.toLocaleString() : "…"}</strong><span>Will receive</span></div>
              <div><strong>{summary ? summary.unsubscribed.toLocaleString() : "…"}</strong><span>Unsubscribed</span></div>
              <div><strong>{summary ? summary.bounced.toLocaleString() : "…"}</strong><span>Bounced before</span></div>
            </div>
            <p className="em-note">Unsubscribes and hard bounces are skipped automatically.</p>
          </section>

          <section className="em-card">
            <h3>Schedule</h3>
            <p className="em-line">{scheduleText} <button className="em-link" onClick={() => setEditingSchedule((v) => !v)}>{editingSchedule ? "Done" : "Change"}</button></p>
            {editingSchedule && (
              <div className="em-picker">
                <div className="em-chips">
                  <button className={when === "later" ? "is-on" : ""} onClick={() => setWhen("later")}>Pick a time</button>
                  <button className={when === "now" ? "is-on" : ""} onClick={() => setWhen("now")}>Send now</button>
                </div>
                {when === "later" && (
                  <>
                    <div className="em-row">
                      <label className="em-field"><span>Date</span><input type="date" value={sendDate} min={isoDate(new Date())} onChange={(e) => setSendDate(e.target.value)} /></label>
                      <label className="em-field"><span>Time</span><input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} /></label>
                    </div>
                    <label className="em-check"><input type="checkbox" checked={contactZone} onChange={(e) => setContactZone(e.target.checked)} /> In each contact&apos;s time zone (from their state)</label>
                  </>
                )}
                <label className="em-field"><span>Batch size</span><select value={hourlyLimit} onChange={(e) => setHourlyLimit(Number(e.target.value))}>{[250, 500, 1000, 2000].map((n) => <option key={n} value={n}>{n.toLocaleString()} per hour</option>)}</select></label>
              </div>
            )}
            <p className="em-note">Send in batches of {hourlyLimit.toLocaleString()} per hour to protect your sender reputation.</p>
          </section>

          <section className="em-card em-cost">
            <h3>Estimated cost</h3>
            <strong>{money(estimate)}</strong>
            <p>{(summary?.willReceive || 0).toLocaleString()} emails × {money(rate)} per email, paid from your wallet before sending</p>
          </section>

          <section className="em-inbox">
            <small>Inbox preview</small>
            <b>{fromLabel}</b>
            <span>{personalize(subject, SAMPLE) || "Subject line"}</span>
            <em>{personalize(previewText, SAMPLE) || "Preview text"}</em>
          </section>

          {strategy && <section className="em-card"><h3>Why this works</h3><p className="em-note">{strategy}</p></section>}
        </aside>
      </div>
    </div>
  );
}
