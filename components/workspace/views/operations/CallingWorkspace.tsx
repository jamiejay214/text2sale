"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronLeft,
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
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import BrowserPhone, { type BrowserPhoneHandle, type BrowserPhoneStatus } from "@/components/BrowserPhone";
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
  sessions?: Array<{ id: string; from_number: string | null; outcome: string | null; summary: string | null; started_at: string; charged_amount: number | string; turns?: Array<{ role: string; content: unknown }>; pending_transcript?: string | null }>;
};

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
      <PageHeader eyebrow="AI receptionist" title="Train an assistant that sounds like your business." description="Set its goal, voice, guardrails, booking rules, and handoff behavior. It answers, qualifies, and books around the clock." actions={<label className="v2-master-switch"><span><Bot size={17} /><b>{draft.enabled ? "Assistant live" : "Assistant off"}</b></span><input type="checkbox" checked={draft.enabled} onChange={() => save({ enabled: !draft.enabled })} /><i /></label>} />
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
          {sessions.length ? <div>{sessions.slice(0, 8).map((session) => <article key={session.id}><span className="v2-ai-session-icon"><Headphones size={15} /></span><div><strong>{prettyPhone(session.from_number || "Unknown")}</strong><small>{session.summary || "Call completed"}</small><time>{new Date(session.started_at).toLocaleString()}</time>{(session.turns || []).some((turn) => typeof turn.content === "string") && <details className="v2-ai-transcript"><summary>Transcript</summary>{(session.turns || []).filter((turn) => typeof turn.content === "string").map((turn, index) => <p key={index}><b>{turn.role === "assistant" ? "Assistant" : "Caller"}:</b> {String(turn.content)}</p>)}{session.pending_transcript?.trim() ? <p className="is-unanswered"><b>Heard but not answered:</b> {session.pending_transcript}</p> : !(session.turns || []).some((turn) => turn.role === "user") && <p className="is-unanswered">The assistant didn&apos;t hear anything from the caller.</p>}</details>}</div><StatusPill tone={session.outcome === "booked" ? "success" : "neutral"}>{session.outcome || "handled"}</StatusPill></article>)}</div> : <EmptyState title="No AI calls yet" description="Once Alex handles a call, its summary and outcome will appear here." />}
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
  const fromNumber = profile.owned_numbers?.[0]?.number || "";

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
    if (CALLING_ENABLED) authFetch("/api/telnyx/webrtc-token").then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => response.ok ? setToken(data.token) : setNotice(data.error || "Browser calling is unavailable."));
  }, [profile.id]);

  const append = useCallback((key: string) => setNumber((current) => key === "+" && current ? current : `${current}${key}`.slice(0, 18)), []);
  const dial = useCallback(async (to: string, contact?: Contact) => {
    if (!CALLING_ENABLED) { setNotice("Calling is temporarily paused while the provider connection is being finalized."); return; }
    if (!fromNumber) { setNotice("Add a business number before placing calls."); return; }
    if (!token || !phoneRef.current || !phoneStatus.ready) { setNotice("The browser phone is still connecting. Try again in a moment."); return; }
    const digits = to.replace(/\D/g, "");
    if (digits.length < 10) { setNotice("Enter a complete phone number."); return; }
    const destination = `+${digits.startsWith("1") ? digits : `1${digits}`}`;
    const fromDigits = fromNumber.replace(/\D/g, "");
    const from = `+${fromDigits.startsWith("1") ? fromDigits : `1${fromDigits}`}`;
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
  }, [fromNumber, token, phoneStatus.ready]);

  const hangup = useCallback(async () => {
    phoneRef.current?.hangup();
    if (callId) await authFetch("/api/hangup-call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId }) }).catch(() => undefined);
    setCallId(null);
  }, [callId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (/^[0-9*#]$/.test(event.key)) append(event.key);
      else if (event.key === "Backspace") setNumber((current) => current.slice(0, -1));
      else if (event.key === "Enter" && number) void dial(number);
      else if (event.key === "Escape") setNumber("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [append, dial, number]);

  useEffect(() => {
    if (phoneStatus.callState !== "ended" || !autoAdvance || queuePaused || !queue.length) return;
    const timer = window.setTimeout(() => {
      const next = queueIndex + 1;
      if (next < queue.length) { setQueueIndex(next); setNumber(queue[next].phone); void dial(queue[next].phone, queue[next]); }
      else { setQueuePaused(true); setNotice("Queue complete."); }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, dial, phoneStatus.callState, queue, queueIndex, queuePaused]);

  const startQueue = () => {
    const next = contacts.slice(0, 50);
    if (!next.length) { setNotice("Import leads with phone numbers before starting a queue."); return; }
    setQueue(next); setQueueIndex(0); setQueuePaused(false); setNumber(next[0].phone); void dial(next[0].phone, next[0]);
  };

  const contactById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const inCall = ["calling", "ringing", "active"].includes(phoneStatus.callState);
  return (
    <>
      <BrowserPhone ref={phoneRef} token={token} onStateChange={setPhoneStatus} />
      <PageHeader eyebrow="Calling workspace" title="Call one lead—or fifty—without losing your rhythm." description="A cleaner browser dialer, keyboard input, organized call history, and a back-to-back queue with lead context." actions={<><button className="v2-btn" onClick={() => onNavigate("contacts")}><Users size={16} /> Choose leads</button><button className="v2-btn v2-btn-primary" onClick={startQueue}><Play size={16} /> Start power queue</button></>} />
      {(notice || phoneStatus.error) && <div role="alert" className="v2-notice is-error">{notice || phoneStatus.error}<button onClick={() => setNotice("")}>×</button></div>}
      {phoneStatus.incoming && phoneStatus.callState === "ringing" && <div role="alert" className="v2-incoming-call"><span><PhoneIncoming size={18} /></span><div><strong>Incoming call</strong><small>{prettyPhone(phoneStatus.incoming.from) || "Unknown caller"}</small></div><button className="v2-btn" onClick={() => phoneRef.current?.decline()}>Decline</button><button className="v2-btn v2-btn-primary" onClick={() => phoneRef.current?.answer()}><Phone size={15} /> Answer</button></div>}
      {!CALLING_ENABLED && <div className="v2-provider-banner"><Clock3 size={18} /><div><strong>Calling provider connection is temporarily paused</strong><span>The workspace and queue are ready; placing live calls will unlock once routing is confirmed.</span></div><button onClick={() => onNavigate("settings", "numbers")}>Manage numbers</button></div>}
      <div className="v2-calling-layout">
        <Panel className="v2-dialer-card">
          <div className="v2-panel-head"><div><h2>Browser dialer</h2><p>From {fromNumber || "No number selected"}</p></div><StatusPill tone={phoneStatus.ready ? "success" : "warning"}>{phoneStatus.ready ? "Phone ready" : "Connecting"}</StatusPill></div>
          <div className="v2-dial-display"><small>{activeContact ? nameOf(activeContact) : "Enter a phone number"}</small><input aria-label="Phone number" value={number} onChange={(event) => setNumber(event.target.value.replace(/[^0-9+*#() -]/g, ""))} placeholder="(000) 000-0000" /><span>{inCall ? phoneStatus.callState : "Use your keyboard or keypad"}</span></div>
          <div className="v2-keypad">{KEYS.map(([key, letters]) => <button key={key} onClick={() => append(key)}><strong>{key}</strong><small>{letters}</small></button>)}</div>
          <div className="v2-dial-actions">{inCall ? <><button className={`v2-call-control ${phoneStatus.muted ? "is-on" : ""}`} onClick={() => phoneStatus.muted ? phoneRef.current?.unmute() : phoneRef.current?.mute()}>{phoneStatus.muted ? <MicOff size={18} /> : <Mic size={18} />}</button><button className="v2-hangup" onClick={hangup}><PhoneOff size={21} /></button><button className="v2-call-control"><Volume2 size={18} /></button></> : <><button className="v2-dial-clear" onClick={() => setNumber((current) => current.slice(0, -1))}>Delete</button><button className="v2-call-start" onClick={() => dial(number)} disabled={!number || !phoneStatus.ready}><PhoneCall size={21} /></button><button className="v2-dial-clear" onClick={() => setNumber("")}>Clear</button></>}</div>
          <p className="v2-keyboard-hint"><kbd>0–9</kbd> type · <kbd>Enter</kbd> call · <kbd>Esc</kbd> clear</p>
        </Panel>

        <div className="v2-calling-main">
          <Panel className="v2-queue-card">
            <div className="v2-panel-head"><div><h2>Power queue</h2><p>Dial leads back-to-back</p></div><label className="v2-compact-switch">Auto advance<input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} /><i /></label></div>
            {queue.length ? <div className="v2-active-queue"><div className="v2-queue-progress"><span style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }} /></div><div className="v2-current-lead"><span className="v2-avatar">{queue[queueIndex]?.first_name?.[0]}{queue[queueIndex]?.last_name?.[0]}</span><div><small>Lead {queueIndex + 1} of {queue.length}</small><strong>{nameOf(queue[queueIndex])}</strong><span>{prettyPhone(queue[queueIndex]?.phone || "")} · {[queue[queueIndex]?.city, queue[queueIndex]?.state, queue[queueIndex]?.zip].filter(Boolean).join(", ") || "Location not added"}</span></div><button onClick={() => setQueuePaused((current) => !current)}>{queuePaused ? <Play size={16} /> : <Pause size={16} />}{queuePaused ? "Resume" : "Pause"}</button></div><div className="v2-queue-next"><button disabled={queueIndex === 0} onClick={() => setQueueIndex((current) => current - 1)}><ChevronLeft size={15} /></button><span>Up next: {queue[queueIndex + 1] ? nameOf(queue[queueIndex + 1]) : "Queue complete"}</span><button disabled={queueIndex + 1 >= queue.length} onClick={() => setQueueIndex((current) => current + 1)}><ChevronRight size={15} /></button></div></div> : <EmptyState title="Build a back-to-back call queue" description="Start with your newest 50 eligible leads, or choose a list from Contacts." action={<button className="v2-btn v2-btn-accent" onClick={startQueue}><Plus size={15} /> Load newest leads</button>} />}
          </Panel>
          <CallForwarding />
          <Panel className="v2-call-history">
            <div className="v2-panel-head"><div><h2>Recent calls</h2><p>Today and recent activity</p></div><History size={18} /></div>
            {history.length ? <div>{history.map((call) => { const contact = call.contact_id ? contactById.get(call.contact_id) : undefined; return <article key={call.id}><span className={`v2-history-icon is-${call.direction}`}><Phone size={14} /></span><div><strong>{nameOf(contact)}</strong><small>{prettyPhone(call.direction === "inbound" ? call.from_number || "" : call.to_number)} · {call.outcome || call.status}</small></div><div><strong>{Math.floor(Number(call.duration_seconds || 0) / 60)}:{String(Number(call.duration_seconds || 0) % 60).padStart(2, "0")}</strong><small>{new Date(call.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div></article>; })}</div> : <EmptyState title="No calls yet" description="Placed and received calls will appear here." />}
          </Panel>
        </div>
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
