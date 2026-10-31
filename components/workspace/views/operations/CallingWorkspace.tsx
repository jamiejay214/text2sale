"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  History,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Users,
  Search,
} from "lucide-react";
import BrowserPhone, { type BrowserPhoneHandle, type BrowserPhoneStatus } from "@/components/BrowserPhone";
import PredictiveDialer from "./PredictiveDialer";
import { authFetch } from "@/lib/auth-fetch";
import { fetchContactsPage } from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/types";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../../WorkspacePrimitives";

type Props = WorkspaceViewProps & { mode: "dialer" | "ai" };

type CallRow = {
  id: string;
  contact_id: string | null;
  to_number: string;
  from_number: string | null;
  direction: string;
  status: string;
  duration_seconds: number;
  outcome: string | null;
  started_at: string;
};

type AiSettings = {
  enabled: boolean;
  greeting: string | null;
  instructions: string | null;
  voice: string;
  transferNumber: string | null;
  afterHoursOnly: boolean;
  maxMinutes: number;
};

type AiPayload = {
  available: boolean;
  message?: string;
  settings?: AiSettings;
  voices?: { id: string; label: string }[];
  pricing?: { perMinute: number };
  readiness?: Array<{ id: string; ok: boolean; label: string; detail?: string }>;
  sessions?: Array<{ id: string; from_number: string | null; outcome: string | null; summary: string | null; started_at: string; charged_amount: number | string; turns?: Array<{ role: string; content: unknown }>; pending_transcript?: string | null; collected?: { call_quality?: CallQualitySummary } | null }>;
};

type CallQualitySummary = { mos: number | null; inboundLossPct: number | null; outboundLossPct: number | null; rating: "good" | "fair" | "poor" | "unknown" };

/** Plain-English audio quality for one AI call, from Telnyx's stats. */
function callQualityText(quality: CallQualitySummary) {
  const parts: string[] = [];
  if (quality.mos !== null) parts.push(`caller's audio ${quality.mos.toFixed(1)}/5`);
  if (quality.inboundLossPct !== null) parts.push(`${quality.inboundLossPct}% lost from caller`);
  if (quality.outboundLossPct !== null) parts.push(`${quality.outboundLossPct}% lost to caller`);
  const label = quality.rating === "good" ? "Good" : quality.rating === "fair" ? "Fair" : quality.rating === "poor" ? "Poor" : "Unknown";
  return `Call audio: ${label}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

const CALLING_ENABLED = process.env.NEXT_PUBLIC_CALLING_ENABLED === "true";
const KEYS = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];

function prettyPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return value;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function nameOf(contact?: Contact) {
  return contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed lead" : "Unknown caller";
}

function AiReceptionist({ profile }: Pick<Props, "profile">) {
  const [payload, setPayload] = useState<AiPayload | null>(null);
  const [draft, setDraft] = useState<AiSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [callLogs, setCallLogs] = useState<Record<string, string>>({});

  // Full troubleshooting report for one call (session record + Telnyx's
  // event log), to copy and send to support.
  const openCallLog = async (sessionId: string) => {
    setCallLogs((current) => ({ ...current, [sessionId]: "Loading call log…" }));
    const response = await authFetch(`/api/ai-call/log?session=${encodeURIComponent(sessionId)}`);
    const data = await response.json().catch(() => ({}));
    setCallLogs((current) => ({ ...current, [sessionId]: response.ok ? data.text || "" : data.error || "Could not load the call log." }));
  };

  const load = useCallback(async () => {
    const response = await authFetch("/api/ai-call");
    const data = (await response.json()) as AiPayload;
    setPayload(data);
    if (data.settings) setDraft(data.settings);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async (patch: Partial<AiSettings>) => {
    if (!draft) return;
    setSaving(true);
    const response = await authFetch("/api/ai-call", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setNotice(data.error || "Could not save the assistant."); return; }
    setDraft(data.settings);
    setPayload((current) => current ? { ...current, settings: data.settings, readiness: data.readiness || current.readiness?.map((item) => item.id === "enabled" ? { ...item, ok: !!data.settings?.enabled } : item) } : current);
    setNotice("Assistant training saved.");
  };

  if (!payload || !draft) return <div className="v2-loading"><span /><strong>Loading your call assistant</strong></div>;
  if (!payload.available) return <Panel><EmptyState title="AI receptionist is being connected" description={payload.message || "Contact support to finish connecting AI calling to your business number."} /></Panel>;
  const sessions = payload.sessions || [];
  const readiness = payload.readiness || [];
  const blockers = readiness.filter((item) => !item.ok);
  return (
    <>
      <PageHeader eyebrow="AI receptionist" title="AI receptionist" description="Set its goal, voice, guardrails, booking rules, and handoff behavior. It answers, qualifies, and books around the clock." actions={<label className="v2-master-switch"><span><Bot size={17} /><b>{draft.enabled ? "Assistant live" : "Assistant off"}</b></span><input type="checkbox" checked={draft.enabled} onChange={() => save({ enabled: !draft.enabled })} /><i /></label>} />
      {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {readiness.length > 0 && (
        <Panel className="v2-ai-readiness">
          <div className="v2-panel-head"><div><h2>{blockers.length ? "Why calls aren't being answered yet" : "Ready to answer calls"}</h2><p>{blockers.length ? "Fix the items marked below and the assistant picks up calls to your business number." : "Call your business number from another phone and the assistant answers."}</p></div><button className="v2-icon-btn" onClick={load} aria-label="Re-check"><RotateCcw size={15} /></button></div>
          <ul>{readiness.map((item) => <li key={item.id} className={item.ok ? "is-ok" : "is-blocked"}><span>{item.ok ? <Check size={14} /> : "!"}</span><div><b>{item.label}</b>{!item.ok && item.detail && <small>{item.detail}</small>}</div></li>)}</ul>
        </Panel>
      )}
      <div className="v2-ai-call-grid">
        <Panel className="v2-ai-profile-card">
          <div className="v2-ai-orb"><span><Sparkles size={25} /></span><i className={draft.enabled ? "is-live" : ""} /></div>
          <p>Your front desk</p><h2>Alex</h2><span>Warm, confident, and concise</span>
          <dl><div><dt>Status</dt><dd><StatusPill tone={draft.enabled ? "success" : "neutral"}>{draft.enabled ? "Answering calls" : "Paused"}</StatusPill></dd></div><div><dt>Cost</dt><dd>${Number(payload.pricing?.perMinute || 0.18).toFixed(2)}/minute</dd></div><div><dt>Number</dt><dd>{profile.owned_numbers?.[0]?.number || "Add a number"}</dd></div></dl>
        </Panel>
        <Panel className="v2-ai-training-card">
          <div className="v2-panel-head"><div><h2>Training & goals</h2><p>Tell Alex exactly how to handle a new caller.</p></div><span className="v2-training-score"><Check size={13} /> Training ready</span></div>
          <div className="v2-ai-form">
            <label>Primary goal<select value={draft.instructions?.includes("qualif") ? "qualify" : draft.instructions?.includes("message") ? "message" : "book"} onChange={(event) => setDraft((current) => current ? { ...current, instructions: event.target.value === "book" ? "Primary goal: book a qualified consultation." : event.target.value === "qualify" ? "Primary goal: qualify the lead, collect their needs, then book a consultation." : "Primary goal: answer common questions and take a detailed message for the team." } : current)}><option value="book">Book a consultation</option><option value="qualify">Qualify, then book</option><option value="message">Answer and take a message</option></select></label>
            <label>First greeting<textarea rows={3} value={draft.greeting || ""} maxLength={320} onChange={(event) => setDraft({ ...draft, greeting: event.target.value })} placeholder="Thanks for calling. I'm Alex, the virtual assistant…" /></label>
            <label>Business playbook<textarea rows={9} value={draft.instructions || ""} maxLength={4000} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} placeholder="Explain what you sell, questions to ask, what makes a lead qualified, objections to handle, and anything the assistant must never say." /><small>{(draft.instructions || "").length}/4,000</small></label>
            <div className="v2-form-grid"><label>Voice<select value={draft.voice} onChange={(event) => setDraft({ ...draft, voice: event.target.value })}>{(payload.voices || []).map((voice) => <option key={voice.id} value={voice.id}>{voice.label}</option>)}</select></label><label>Max call length<select value={draft.maxMinutes} onChange={(event) => setDraft({ ...draft, maxMinutes: Number(event.target.value) })}>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label></div>
            <label>Human transfer number<input value={draft.transferNumber || ""} onChange={(event) => setDraft({ ...draft, transferNumber: event.target.value })} placeholder="(954) 555-0100" /></label>
            <label className="v2-check-row"><input type="checkbox" checked={draft.afterHoursOnly} onChange={(event) => setDraft({ ...draft, afterHoursOnly: event.target.checked })} /><span><b>Only answer after business hours</b><small>During open hours, calls ring through to your team.</small></span></label>
            <button className="v2-btn v2-btn-primary" disabled={saving} onClick={() => save(draft)}><Save size={15} /> {saving ? "Saving…" : "Save training"}</button>
          </div>
        </Panel>
        <Panel className="v2-ai-sessions">
          <div className="v2-panel-head"><div><h2>Recent AI calls</h2><p>Outcomes and summaries</p></div><button className="v2-icon-btn" onClick={load}><RotateCcw size={15} /></button></div>
          {sessions.length ? <div>{sessions.slice(0, 8).map((session) => <article key={session.id}><span className="v2-ai-session-icon"><Headphones size={15} /></span><div><strong>{prettyPhone(session.from_number || "Unknown")}</strong><small>{session.summary || "Call completed"}</small><time>{new Date(session.started_at).toLocaleString()}</time>{session.collected?.call_quality && <small className={`v2-ai-quality is-${session.collected.call_quality.rating}`}>{callQualityText(session.collected.call_quality)}</small>}{(session.turns || []).some((turn) => typeof turn.content === "string") && <details className="v2-ai-transcript"><summary>Transcript</summary>{(session.turns || []).filter((turn) => typeof turn.content === "string").map((turn, index) => <p key={index}><b>{turn.role === "assistant" ? "Assistant" : "Caller"}:</b> {String(turn.content)}</p>)}{session.pending_transcript?.trim() ? <p className="is-unanswered"><b>Heard but not answered:</b> {session.pending_transcript}</p> : !(session.turns || []).some((turn) => turn.role === "user") && <p className="is-unanswered">The assistant didn&apos;t hear anything from the caller.</p>}</details>}<button type="button" className="v2-ai-log-btn" onClick={() => void openCallLog(session.id)}>Call log</button>{callLogs[session.id] && <div className="v2-ai-log"><button type="button" className="v2-ai-log-btn" onClick={() => { void navigator.clipboard?.writeText(callLogs[session.id]).then(() => setNotice("Call log copied.")).catch(() => setNotice("Select the text and copy it.")); }}>Copy</button><pre>{callLogs[session.id]}</pre></div>}</div><StatusPill tone={session.outcome === "booked" ? "success" : "neutral"}>{session.outcome || "handled"}</StatusPill></article>)}</div> : <EmptyState title="No AI calls yet" description="Once Alex handles a call, its summary and outcome will appear here." />}
        </Panel>
      </div>
    </>
  );
}

export default function CallingWorkspace(props: Props) {
  if (props.mode === "ai") return <AiReceptionist profile={props.profile} />;
  return <Dialer {...props} />;
}

function Dialer({ profile, onNavigate }: Props) {
  const phoneRef = useRef<BrowserPhoneHandle>(null);
  const [number, setNumber] = useState("");
  const [predictiveActive, setPredictiveActive] = useState(false);
  const [dialerMode, setDialerMode] = useState<"manual" | "power" | "predictive">("manual");
  const [leadSearch, setLeadSearch] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [phoneStarting, setPhoneStarting] = useState(false);
  const dialingRef = useRef(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [history, setHistory] = useState<CallRow[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [phoneStatus, setPhoneStatus] = useState<BrowserPhoneStatus>({ ready: false, callState: "idle", muted: false });
  const [queue, setQueue] = useState<Contact[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [queuePaused, setQueuePaused] = useState(false);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [autoAnswer, setAutoAnswer] = useState(false);
  // An agent calling on a sponsor's account has no numbers of their own; the
  // dialer API reports the numbers their calls go out from.
  const [callerIds, setCallerIds] = useState<string[]>([]);
  const handlePredictiveActive = useCallback((active: boolean) => { setPredictiveActive(active); if (active) { setDialerMode("predictive"); setQueuePaused(true); } }, []);
  const fromNumber = profile.owned_numbers?.[0]?.number || callerIds[0] || "";

  useEffect(() => {
    Promise.all([
      fetchContactsPage(profile.id, { pageSize: 100 }),
      supabase.from("calls").select("id,contact_id,to_number,from_number,direction,status,duration_seconds,outcome,started_at").eq("user_id", profile.id).order("started_at", { ascending: false }).limit(30),
    ]).then(([contactPage, callResult]) => {
      const eligibleContacts = contactPage.rows.filter((contact) => contact.phone && !contact.dnc);
      setContacts(eligibleContacts);
      setHistory((callResult.data || []) as CallRow[]);
      try {
        const stored = window.sessionStorage.getItem("t2s_call_lead");
        if (stored) {
          const lead = JSON.parse(stored) as { contactId?: string; phone?: string };
          const contact = eligibleContacts.find((item) => item.id === lead.contactId || item.phone === lead.phone);
          if (contact) {
            setActiveContact(contact);
            setNumber(contact.phone);
          } else if (lead.phone) {
            setNumber(lead.phone);
          }
          window.sessionStorage.removeItem("t2s_call_lead");
        }
      } catch {
        window.sessionStorage.removeItem("t2s_call_lead");
      }
    });
    if (CALLING_ENABLED) authFetch("/api/telnyx/webrtc-token").then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => { if (!response.ok) return setNotice(data.error || "Browser calling is unavailable."); setToken(data.token); if (data.warning) setNotice(data.warning); });
  }, [profile.id]);

  const append = useCallback((key: string) => setNumber((current) => key === "+" && current ? current : `${current}${key}`.slice(0, 18)), []);
  const dial = useCallback(async (to: string, contact?: Contact) => {
    if (predictiveActive || dialingRef.current || ["calling", "ringing", "active"].includes(phoneStatus.callState)) return;
    if (!CALLING_ENABLED) { setNotice("Calling is temporarily paused while the provider connection is being finalized."); return; }
    if (!fromNumber) { setNotice("Add a business number before placing calls."); return; }
    if (!token || !phoneRef.current || !phoneStatus.ready) { setNotice("The browser phone is still connecting. Try again in a moment."); return; }
    const digits = to.replace(/\D/g, "");
    if (digits.length < 10) { setNotice("Enter a complete phone number."); return; }
    const destination = `+${digits.startsWith("1") ? digits : `1${digits}`}`;
    const fromDigits = fromNumber.replace(/\D/g, "");
    const from = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;
    dialingRef.current = true;
    setPhoneStarting(true);
    try {
      setActiveContact(contact || null);
      // Log the call first: the server checks the number, subscription and
      // wallet, and the row it creates is what Telnyx's webhooks bill against.
      const response = await authFetch("/api/calls/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: destination, from, contactId: contact?.id || null }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.callId) { setNotice(data.error || "Could not start the call. Please retry."); return; }
      setCallId(data.callId);
      try {
        phoneRef.current.makeCall(destination, from);
        setNotice("");
      } catch (error) {
        void authFetch("/api/hangup-call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: data.callId }) }).catch(() => undefined);
        setCallId(null);
        setNotice(error instanceof Error ? error.message : "Could not start the call. Please retry.");
      }
    } catch { setNotice("Could not connect. Check your connection and try again."); }
    finally { dialingRef.current = false; setPhoneStarting(false); }
  }, [fromNumber, token, phoneStatus.ready, phoneStatus.callState, predictiveActive]);

  const hangup = useCallback(async () => {
    phoneRef.current?.hangup();
    if (callId) await authFetch("/api/hangup-call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId }) }).catch(() => undefined);
    setCallId(null);
  }, [callId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey || dialerMode === "predictive" || phoneStarting || ["calling", "ringing", "active"].includes(phoneStatus.callState)) return;
      if (/^[0-9*#]$/.test(event.key)) { append(event.key); setActiveContact(null); }
      else if (event.key === "Backspace") setNumber((current) => current.slice(0, -1));
      else if (event.key === "Enter" && number) { event.preventDefault(); void dial(number, activeContact || undefined); }
      else if (event.key === "Escape") setNumber("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [append, dial, number, dialerMode, activeContact, phoneStarting, phoneStatus.callState]);

  useEffect(() => {
    if (dialerMode !== "power" || phoneStatus.callState !== "ended" || !autoAdvance || queuePaused || !queue.length) return;
    const timer = window.setTimeout(() => {
      const next = queueIndex + 1;
      if (next < queue.length) { setQueueIndex(next); setNumber(queue[next].phone); void dial(queue[next].phone, queue[next]); }
      else { setQueuePaused(true); setNotice("Queue complete."); }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, dial, dialerMode, phoneStatus.callState, queue, queueIndex, queuePaused]);

  const startQueue = () => {
    const next = contacts.slice(0, 50);
    if (!next.length) { setNotice("Import leads with phone numbers before starting a queue."); return; }
    setDialerMode("power"); setQueue(next); setQueueIndex(0); setQueuePaused(false); setNumber(next[0].phone); void dial(next[0].phone, next[0]);
  };

  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const inCall = ["calling", "ringing", "active"].includes(phoneStatus.callState);
  return (
    <>
      <BrowserPhone ref={phoneRef} token={token} onStateChange={setPhoneStatus} autoAnswer={autoAnswer} />
      <PageHeader eyebrow="SALES WORKSPACE" title="Dialer" description="Less between you and your next conversation." actions={<><button className="v2-btn" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>Call settings</button><button className="v2-btn" onClick={() => onNavigate("contacts")}><Users size={16} /> Manage leads</button></>} />
      {(notice || phoneStatus.error) && <div role="alert" className="v2-notice is-error">{notice || phoneStatus.error}<button onClick={() => setNotice("")}>×</button></div>}
      {phoneStatus.incoming && phoneStatus.callState === "ringing" && <div role="alert" className="v2-incoming-call"><PhoneIncoming size={18} /><div><strong>Incoming call</strong><small>{prettyPhone(phoneStatus.incoming.from) || "Unknown caller"}</small></div><button className="v2-btn" onClick={() => phoneRef.current?.decline()}>Decline</button><button className="v2-btn v2-btn-primary" onClick={() => phoneRef.current?.answer()}>Answer</button></div>}
      {!CALLING_ENABLED && <div className="v2-provider-banner"><Clock3 size={18} /><div><strong>Calling is temporarily paused</strong><span>Your lead lists and call history are still available.</span></div><button onClick={() => onNavigate("settings", "numbers")}>Manage numbers</button></div>}
      <div className="emerald-modebar">
        <div role="group" aria-label="Calling mode">{(["manual", "power", "predictive"] as const).map(mode => <button key={mode} className={dialerMode === mode ? "is-active" : ""} aria-pressed={dialerMode === mode} disabled={inCall || phoneStarting || predictiveActive || (mode === "predictive" && !CALLING_ENABLED)} onClick={() => { setDialerMode(mode); setQueuePaused(true); }}>{mode === "manual" ? "Manual dialer" : mode === "power" ? "Power dialer" : "Predictive dialer"}</button>)}</div>
        <StatusPill tone={phoneStatus.ready ? "success" : "warning"}>{phoneStatus.ready ? "Phone connected" : CALLING_ENABLED ? "Phone connecting" : "Calling paused"}</StatusPill>
      </div>
      {showSettings && <div className="emerald-call-settings">{profile.owned_numbers?.length ? <CallForwarding /> : <Panel><EmptyState title="No owned numbers" description="Manage your business numbers in workspace settings." action={<button className="v2-btn" onClick={() => onNavigate("settings", "numbers")}>Phone numbers</button>} /></Panel>}</div>}
      {/* Keep the predictive engine mounted when changing the workspace view. */}
      {CALLING_ENABLED && <div hidden={dialerMode !== "predictive"} className="emerald-predictive">{inCall && <div className="emerald-live-controls"><StatusPill tone="success">{phoneStatus.callState}</StatusPill><button className="v2-btn" onClick={() => phoneStatus.muted ? phoneRef.current?.unmute() : phoneRef.current?.mute()}>{phoneStatus.muted ? <MicOff size={16} /> : <Mic size={16} />}{phoneStatus.muted ? "Unmute" : "Mute"}</button></div>}<PredictiveDialer onSessionActiveChange={handlePredictiveActive} phoneReady={phoneStatus.ready && !!token} onAutoAnswerChange={setAutoAnswer} onCallerIds={setCallerIds} onHangup={() => phoneRef.current?.hangup()} /></div>}
      <div className="emerald-call-workspace" hidden={dialerMode === "predictive"}>
        <Panel className="emerald-lead-queue">
          <div className="v2-panel-head"><div><h2>{dialerMode === "power" ? "Call queue" : "Your leads"}</h2><p>{dialerMode === "power" && queue.length ? `${queue.length} leads in this session` : `${contacts.length} recent eligible leads`}</p></div><Users size={18} /></div>
          <label className="emerald-lead-search"><Search size={16} /><input aria-label="Search calling leads" placeholder="Search leads…" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} /></label>
          <div className="emerald-queue-list">{(dialerMode === "power" && queue.length ? queue : contacts).filter(c => `${nameOf(c)} ${c.phone} ${c.city} ${c.state}`.toLowerCase().includes(leadSearch.toLowerCase())).map(contact => <button key={contact.id} disabled={inCall || phoneStarting} aria-pressed={activeContact?.id === contact.id} className={activeContact?.id === contact.id ? "is-active" : ""} onClick={() => { setActiveContact(contact); setNumber(contact.phone); setQueuePaused(true); const index = queue.findIndex(c => c.id === contact.id); if (index >= 0) setQueueIndex(index); }}><span className="v2-avatar">{contact.first_name?.[0]}{contact.last_name?.[0]}</span><span><strong>{nameOf(contact)}</strong><small>{[contact.city, contact.state].filter(Boolean).join(", ") || prettyPhone(contact.phone)}</small></span><ChevronRight size={14} /></button>)}</div>
          {!contacts.length && <EmptyState title="Your next conversation starts here" description="Import a lead list to get started." action={<button className="v2-btn" onClick={() => onNavigate("upload")}>Import leads</button>} />}
          <div className="emerald-queue-footer"><button className="v2-btn" onClick={() => onNavigate("contacts")}>View all leads <ChevronRight size={15} /></button></div>
        </Panel>
        <Panel className="emerald-active-call">
          <div className="emerald-caller-id"><Phone size={15} /><span>Calling from <strong>{prettyPhone(fromNumber) || "No number selected"}</strong></span></div>
          <div className="emerald-contact-focus"><span className="emerald-large-avatar">{activeContact ? `${activeContact.first_name?.[0] || ""}${activeContact.last_name?.[0] || ""}` : <Phone size={30} />}</span><h2>{activeContact ? nameOf(activeContact) : "Make a connection"}</h2><p>{activeContact ? [activeContact.city, activeContact.state, activeContact.zip].filter(Boolean).join(", ") || "Location not added" : "Choose a lead or enter a number below."}</p><StatusPill tone={inCall ? "success" : "neutral"}>{phoneStarting ? "Starting call…" : inCall ? phoneStatus.callState : "Ready for your next call"}</StatusPill></div>
          <div className="v2-dial-display"><input aria-label="Phone number" inputMode="tel" disabled={inCall || phoneStarting} value={number} onChange={event => { setNumber(event.target.value.replace(/[^0-9+*#() -]/g, "")); setActiveContact(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void dial(number, activeContact || undefined); } }} placeholder="Enter phone number" /></div>
          <button className="emerald-keypad-toggle" onClick={() => setShowKeypad(!showKeypad)} aria-expanded={showKeypad}>{showKeypad ? "Hide keypad" : "Show keypad"}</button>
          {showKeypad && <div className="v2-keypad">{KEYS.map(([key, letters]) => <button key={key} disabled={inCall || phoneStarting} onClick={() => { append(key); setActiveContact(null); }}><strong>{key}</strong><small>{letters}</small></button>)}</div>}
          <div className="v2-dial-actions">{inCall ? <><button aria-label={phoneStatus.muted ? "Unmute" : "Mute"} className={`v2-call-control ${phoneStatus.muted ? "is-on" : ""}`} onClick={() => phoneStatus.muted ? phoneRef.current?.unmute() : phoneRef.current?.mute()}>{phoneStatus.muted ? <MicOff size={18} /> : <Mic size={18} />}</button><button className="v2-hangup" onClick={hangup} aria-label="End call"><PhoneOff size={21} /></button></> : <button className="v2-btn v2-btn-primary emerald-start-call" onClick={() => dial(number, activeContact || undefined)} disabled={!number || !phoneStatus.ready || phoneStarting}><PhoneCall size={18} /> {phoneStarting ? "Connecting…" : "Call lead"}</button>}</div>
          <p className="v2-keyboard-hint"><kbd>0–9</kbd> enter number · <kbd>Enter</kbd> call</p>
          {dialerMode === "power" && <div className="emerald-power-controls"><label className="v2-compact-switch">Auto advance<input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} /><i /></label><p>{queue.length ? `Lead ${queueIndex + 1} of ${queue.length} · ${queuePaused ? "Paused" : "Session running"}` : "Start a session with your newest 50 eligible leads."}</p>{queue.length ? <button className="v2-btn" onClick={() => setQueuePaused(!queuePaused)}>{queuePaused ? <Play size={15} /> : <Pause size={15} />}{queuePaused ? "Resume auto advance" : "Pause auto advance"}</button> : <button className="v2-btn" disabled={inCall || phoneStarting || !phoneStatus.ready} onClick={startQueue}><Play size={15} /> Start power session</button>}</div>}
        </Panel>
        <aside className="emerald-call-context">
          <Panel><div className="v2-panel-head"><h2>Lead details</h2><button className="v2-text-button" onClick={() => onNavigate("contacts")}>Manage</button></div><dl className="emerald-detail-list"><div><dt>Email</dt><dd>{activeContact?.email || "—"}</dd></div><div><dt>Location</dt><dd>{activeContact ? [activeContact.city, activeContact.state, activeContact.zip].filter(Boolean).join(", ") || "—" : "—"}</dd></div><div><dt>Campaign</dt><dd>{activeContact?.campaign || "Not assigned"}</dd></div><div><dt>Source</dt><dd>{activeContact?.lead_source || "—"}</dd></div></dl><div className="emerald-contact-notes"><h3>Notes</h3><p>{activeContact?.notes || "Select a lead to review their notes before calling."}</p></div></Panel>
          <Panel className="v2-call-history"><div className="v2-panel-head"><h2>Recent activity</h2><History size={17} /></div>{history.length ? <div>{history.slice(0, 6).map(call => { const contact = call.contact_id ? contactById.get(call.contact_id) : undefined; return <article key={call.id}><span className={`v2-history-icon is-${call.direction}`}><Phone size={14} /></span><div><strong>{contact ? nameOf(contact) : prettyPhone(call.direction === "inbound" ? call.from_number || "" : call.to_number)}</strong><small>{call.outcome || call.status} · {Math.floor(Number(call.duration_seconds || 0) / 60)}:{String(Number(call.duration_seconds || 0) % 60).padStart(2, "0")}</small></div><small>{new Date(call.started_at).toLocaleDateString([], { month: "short", day: "numeric" })}</small></article>; })}</div> : <EmptyState title="No calls yet" description="Your recent calls will appear here." />}</Panel>
        </aside>
      </div>
    </>
  );
}

type ForwardingState = { available: boolean; enabled: boolean; number: string; ratePerMinute?: number; error?: string };

/** Ring your cell for inbound calls the AI receptionist isn't taking. */
function CallForwarding() {
  const [state, setState] = useState<ForwardingState | null>(null);
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    authFetch("/api/call-forwarding")
      .then((response) => response.json())
      .then((data: ForwardingState) => { setState(data); setNumber(prettyPhone(data.number || "")); })
      .catch(() => setState({ available: false, enabled: false, number: "", error: "Could not load call forwarding." }));
  }, []);

  const save = async (patch: { enabled?: boolean; number?: string }) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await authFetch("/api/call-forwarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage({ tone: "error", text: data.error || "Could not save call forwarding." }); return; }
      setState((current) => ({ ...(current || { available: true }), available: true, enabled: data.enabled, number: data.number, ratePerMinute: data.ratePerMinute }));
      setNumber(prettyPhone(data.number || ""));
      setMessage({ tone: "success", text: data.enabled ? `Calls now forward to ${prettyPhone(data.number)}.` : "Saved." });
    } finally {
      setSaving(false);
    }
  };

  const savedNumber = prettyPhone(state?.number || "");
  return (
    <Panel className="v2-forwarding-card">
      <div className="v2-panel-head">
        <div><h2>Call forwarding</h2><p>Ring your cell when someone calls your business number</p></div>
        {state?.available && <label className="v2-compact-switch">{state.enabled ? "On" : "Off"}<input type="checkbox" checked={state.enabled} disabled={saving} onChange={(event) => void save({ enabled: event.target.checked })} /><i /></label>}
      </div>
      {!state ? <p className="v2-forwarding-note">Loading…</p> : !state.available ? <p className="v2-forwarding-note">{state.error || "Call forwarding is unavailable right now."}</p> : <>
        <div className="v2-forwarding-row">
          <PhoneForwarded size={16} />
          <input aria-label="Forward calls to" inputMode="tel" placeholder="Your cell, e.g. (555) 123-4567" value={number} onChange={(event) => setNumber(event.target.value.replace(/[^0-9+() -]/g, ""))} />
          <button className="v2-btn" disabled={saving || number === savedNumber} onClick={() => void save({ number })}>{saving ? "Saving…" : "Save number"}</button>
        </div>
        <p className="v2-forwarding-note">When on, calls the AI receptionist isn&apos;t answering ring this phone instead of your browser. Forwarded calls are ${(state.ratePerMinute || 0.04).toFixed(3)}/minute (the incoming minute plus the forwarded minute), charged from your wallet.</p>
      </>}
      {message && <p className={`v2-forwarding-note is-${message.tone}`}>{message.text}</p>}
    </Panel>
  );
}
