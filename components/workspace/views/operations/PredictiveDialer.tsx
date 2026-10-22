"use client";

import { primeConnectBeep } from "@/components/BrowserPhone";
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Check, Clock, Pause, PhoneCall, PhoneForwarded, PhoneOff, Play, Square, X, Zap } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { inferTimezone } from "@/lib/quiet-hours";
import { Panel, StatusPill } from "../../WorkspacePrimitives";

// The predictive dialer's controls and live view (server side: lib/dialer.ts
// and /api/dialer). The browser phone stays on the Calling page; while the
// agent is ready, live answers are put through to it and picked up
// automatically (see the autoAnswer prop on BrowserPhone).

type Session = {
  user_id: string;
  id: string;
  status: "active" | "paused" | "stopped" | "completed";
  agent_state: "ready" | "connecting" | "on_call" | "wrap" | "away";
  max_lines: number;
  lines: number;
  pause_reason: string | null;
  /** Set while a call put through from outside this dialer is this agent's. */
  inbound_from?: string | null;
  inbound_label?: string | null;
  business_name: string;
  agent_name: string;
  audience: string | null;
};

type Stats = {
  queued: number;
  in_flight: number;
  dials: number;
  connected: number;
  abandoned: number;
  voicemail: number;
  no_answer: number;
  failed: number;
  skipped: number;
  opted_out: number;
};

type Lead = {
  id: string;
  phone: string;
  contact_id?: string | null;
  /** The business number this call went out from. */
  from_number?: string | null;
  /** Set when this call is a scheduled callback. */
  callback_id?: string | null;
  /** When the lead was heard saying hello, and when their call ended. */
  human_at?: string | null;
  ended_at?: string | null;
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    age?: string | null;
    household_size?: string | null;
    quote?: string | null;
    lead_source?: string | null;
    notes?: string | null;
    campaign?: string | null;
  } | null;
};

type Snapshot = {
  session: Session | null;
  stats?: Stats;
  lead?: Lead | null;
  pacing?: { lines: number; abandonRate30d: number; cap: number };
  total?: number;
  lists?: Array<{ name: string; count: number }>;
  uploads?: Array<{ id: string; file_name: string; uploaded_at: string; success: number; total_rows?: number | null }>;
  /** Business numbers calls go out from (the sponsor's, for an agent). */
  callerIds?: string[];
  /** The account's saved transfer number (owner only), to prefill the cell box. */
  transferNumber?: string | null;
  /** Owner only: agents who take inbound calls while the owner dials. */
  overflowAgents?: Array<{ id: string; name: string; on: boolean }>;
  /** People a live call can be passed to. */
  teammates?: Array<{ id: string; name: string }>;
  /** Scheduled callbacks, soonest first. */
  callbacks?: Callback[];
  /** The time zone appointments are booked in. */
  calendarTimeZone?: string;
  error?: string;
};

type Callback = {
  id: string;
  phone: string;
  due_at: string;
  notes: string | null;
  from_number: string | null;
  contacts?: { first_name?: string | null; last_name?: string | null } | null;
};

const timeLabel = (iso: string, timeZone?: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...(timeZone ? { timeZone, timeZoneName: "short" } : {}) });

const DISPOSITIONS: Array<{ id: string; label: string }> = [
  { id: "interested", label: "Interested" },
  { id: "callback", label: "Call back" },
  { id: "not_interested", label: "Not interested" },
  { id: "wrong_number", label: "Wrong number" },
  { id: "dnc", label: "Do not call" },
];

/**
 * Ask for the microphone while the agent is clicking. Dialer calls are picked
 * up automatically later, when the browser can't show its permission prompt,
 * so without this the caller hears dead air.
 */
async function microphoneReady(): Promise<boolean> {
  // The same click unlocks the connect beep (see primeConnectBeep).
  primeConnectBeep();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

const MIC_BLOCKED =
  "Your microphone is blocked, so callers can't hear you. Click the lock icon next to text2sale.com in the address bar, allow Microphone, then try again.";

const OPEN = (session: Session | null) => !!session && (session.status === "active" || session.status === "paused");

function prettyPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

/** m:ss (or h:mm:ss) between two times. */
function callDuration(fromIso: string | null | undefined, toMs: number): string {
  const from = fromIso ? new Date(fromIso).getTime() : NaN;
  if (!Number.isFinite(from)) return "";
  const total = Math.max(0, Math.floor((toMs - from) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function stateLabel(session: Session) {
  if (session.inbound_from) return "Inbound call";
  if (session.status === "paused") return session.agent_state === "on_call" ? "On a call (paused)" : "Paused";
  switch (session.agent_state) {
    case "ready": return "Dialing";
    case "connecting": return "Connecting a lead";
    case "on_call": return "On a call";
    case "wrap": return "Wrap-up";
    default: return "Waiting for you";
  }
}

export default function PredictiveDialer({
  phoneReady,
  onAutoAnswerChange,
  onCallerIds,
  onHangup,
  onSessionActiveChange,
}: {
  phoneReady: boolean;
  onSessionActiveChange?: (active: boolean) => void;
  /** Hang up the browser phone's call (the server ends the lead's side). */
  onHangup?: () => void;
  onAutoAnswerChange: (on: boolean) => void;
  onCallerIds?: (numbers: string[]) => void;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // Leads to call: any mix of uploaded files ("upload:<id>") and campaign
  // lists ("list:<name>"). None chosen dials all leads.
  const [picked, setPicked] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const togglePick = (key: string) => setPicked((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  const [maxLines, setMaxLines] = useState(3);
  // On by default for this account's callers (owner's choice).
  const [forceLines, setForceLines] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [disposition, setDisposition] = useState("");
  const [notes, setNotes] = useState("");

  const session = snap?.session || null;
  const open = OPEN(session);
  useEffect(() => { onSessionActiveChange?.(!!open || busy); }, [open, busy, onSessionActiveChange]);

  const load = useCallback(async (withLists = false) => {
    const response = await authFetch(`/api/dialer${withLists ? "?lists=1" : ""}`);
    const data = (await response.json().catch(() => ({}))) as Snapshot;
    if (!response.ok) { setNotice(data.error || "Could not load the dialer."); return; }
    setSnap((current) => ({ ...data, total: data.total ?? current?.total, lists: data.lists ?? current?.lists, uploads: data.uploads ?? current?.uploads, callerIds: data.callerIds ?? current?.callerIds, callbacks: data.callbacks ?? current?.callbacks, calendarTimeZone: data.calendarTimeZone ?? current?.calendarTimeZone, transferNumber: data.transferNumber ?? current?.transferNumber, overflowAgents: data.overflowAgents ?? current?.overflowAgents, teammates: data.teammates ?? current?.teammates }));
    if (data.callerIds) onCallerIds?.(data.callerIds);
  }, [onCallerIds]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("t2s_dialer_names") || "{}");
      if (saved.agentName) setAgentName(saved.agentName);
      if (saved.businessName) setBusinessName(saved.businessName);
    } catch {
      // per-viewer convenience only
    }
    const timer = window.setTimeout(() => void load(true), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // The poll doubles as the heartbeat that keeps the server dialing.
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [open, load]);

  // Ticks the call timer once a second while a call is on the line.
  const [clock, setClock] = useState(() => Date.now());
  const onCall = session?.agent_state === "on_call";
  useEffect(() => {
    if (!onCall) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [onCall]);

  const autoAnswer = open && (session?.agent_state === "ready" || session?.agent_state === "connecting");
  useEffect(() => { onAutoAnswerChange(!!autoAnswer); }, [autoAnswer, onAutoAnswerChange]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNotice("");
    try {
      const response = await authFetch("/api/dialer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json().catch(() => ({}))) as Snapshot;
      if (!response.ok) { setNotice(data.error || "Something went wrong. Please retry."); return false; }
      setSnap((current) => ({ ...data, total: current?.total, lists: current?.lists, uploads: current?.uploads, callerIds: current?.callerIds, callbacks: data.callbacks ?? current?.callbacks, calendarTimeZone: current?.calendarTimeZone, transferNumber: current?.transferNumber, overflowAgents: current?.overflowAgents, teammates: current?.teammates }));
      return true;
    } finally {
      setBusy(false);
    }
  };

  const ready = async () => {
    if (!(await microphoneReady())) { setNotice(MIC_BLOCKED); return; }
    await act({ action: "ready" });
  };

  const start = async () => {
    if (!phoneReady) { setNotice("Wait until the browser phone says Phone ready."); return; }
    if (!(await microphoneReady())) { setNotice(MIC_BLOCKED); return; }
    try { window.localStorage.setItem("t2s_dialer_names", JSON.stringify({ agentName, businessName })); } catch { /* optional */ }
    // Any mix of uploaded files and campaign lists; none means all leads.
    const audience = {
      uploads: picked.filter((key) => key.startsWith("upload:")).map((key) => key.slice(7)),
      lists: picked.filter((key) => key.startsWith("list:")).map((key) => key.slice(5)),
    };
    if (await act({ action: "start", ...audience, maxLines, forceLines, agentName, businessName, fromNumbers: numbers })) await act({ action: "ready" });
  };

  const [cell, setCell] = useState("");
  useEffect(() => {
    if (cell) return;
    let saved = "";
    try { saved = window.localStorage.getItem("t2s_transfer_cell") || ""; } catch { /* optional */ }
    const fallback = saved || snap?.transferNumber || "";
    if (fallback) setCell(prettyPhone(fallback));
  }, [cell, snap?.transferNumber]);

  const transferToCell = async () => {
    if (!cell.trim()) { setNotice("Enter your cell phone number to transfer to."); return; }
    try { window.localStorage.setItem("t2s_transfer_cell", cell); } catch { /* optional */ }
    await act({ action: "transfer", to: cell });
  };

  const hangUp = async () => {
    onHangup?.();
    await act({ action: "hangup" });
  };

  // "Call back at 3:30": entered in the agent's own clock, sent as an exact time.
  const [callbackAt, setCallbackAt] = useState("");
  const next = async () => {
    if (disposition === "callback" && callbackAt && !(new Date(callbackAt).getTime() > Date.now())) {
      setNotice("Pick a callback time in the future.");
      return;
    }
    if (session?.agent_state === "on_call" || session?.agent_state === "connecting") onHangup?.();
    const at = disposition === "callback" && callbackAt ? new Date(callbackAt).toISOString() : undefined;
    if (await act({ action: "next", disposition: disposition || null, notes, callbackAt: at })) {
      setDisposition("");
      setNotes("");
      setCallbackAt("");
      setBooking(null);
    }
  };

  const cancelCallback = async (id: string) => {
    const response = await authFetch("/api/dialer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel_callback", id }) });
    const data = (await response.json().catch(() => ({}))) as Snapshot;
    if (response.ok) setSnap((current) => current && { ...current, callbacks: data.callbacks });
  };

  // Book an appointment for the lead on the line; it lands on the agent's
  // calendar (and Google Calendar when connected) via /api/appointments.
  const [booking, setBooking] = useState<{ date: string; time: string; duration: number; notes: string } | null>(null);
  const [booked, setBooked] = useState("");
  const book = async (leadName: string) => {
    if (!booking || !snap?.session || !booking.date || !booking.time) { setNotice("Pick a date and time for the appointment."); return; }
    setBusy(true);
    setNotice("");
    try {
      const response = await authFetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: snap.session.user_id,
          contactId: snap.lead?.contact_id || null,
          date: booking.date,
          time: `${booking.time}:00`,
          duration: booking.duration,
          title: `Appointment with ${leadName}`,
          notes: booking.notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error || "Could not book the appointment."); return; }
      setBooked(`Booked ${leadName} for ${booking.date} at ${booking.time}.`);
      setBooking(null);
      if (!disposition) setDisposition("interested");
    } finally {
      setBusy(false);
    }
  };

  const setOverflow = async (agentId: string, enabled: boolean) => {
    const response = await authFetch("/api/dialer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "overflow", agentId, enabled }) });
    const data = (await response.json().catch(() => ({}))) as Snapshot;
    if (!response.ok) { setNotice(data.error || "Could not save that setting."); return; }
    setSnap((current) => current && { ...current, overflowAgents: data.overflowAgents });
  };

  const callbackList = snap?.callbacks?.length ? (
    <div className="v2-pd-callbacks">
      <span><Clock size={14} /> Upcoming callbacks</span>
      <ul>
        {snap.callbacks.map((cb) => {
          const name = [cb.contacts?.first_name, cb.contacts?.last_name].filter(Boolean).join(" ") || prettyPhone(cb.phone);
          const late = new Date(cb.due_at).getTime() <= Date.now();
          return (
            <li key={cb.id}>
              <b>{name}</b>
              <span>{timeLabel(cb.due_at)}{late ? " · due now" : ""}{cb.from_number ? ` · from ${prettyPhone(cb.from_number)}` : ""}</span>
              {cb.notes && <small>{cb.notes}</small>}
              <button className="v2-btn" aria-label={`Cancel callback to ${name}`} onClick={() => void cancelCallback(cb.id)}><X size={13} /></button>
            </li>
          );
        })}
      </ul>
      <small>The dialer calls each one at its time, from the same number, as soon as you&apos;re free on the dialer. Start or resume dialing to make due callbacks.</small>
    </div>
  ) : null;

  const overflowToggles = snap?.overflowAgents?.length ? (
    <div className="v2-pd-overflow">
      {snap.overflowAgents.map((agent) => (
        <label key={agent.id} className="v2-pd-force">
          <input type="checkbox" checked={agent.on} onChange={(event) => void setOverflow(agent.id, event.target.checked)} />
          <span><b>Share calls with {agent.name}</b><small>While you&apos;re dialing, customers calling your numbers ring {agent.name}&apos;s browser phone (unless {agent.name} is on a call; after 20 seconds your AI receptionist picks up). And when a lead answers while one of you is busy, it goes to the other if they&apos;re waiting on the dialer instead of being dropped. Billed to your wallet.</small></span>
        </label>
      ))}
    </div>
  ) : null;

  if (!snap) return <Panel className="v2-pd-card"><p className="v2-forwarding-note">Loading the dialer…</p></Panel>;

  if (!open) {
    return (
      <Panel className="v2-pd-card">
        <div className="v2-panel-head"><div><h2>Predictive dialer</h2><p>Dials several leads at once and puts the first person who answers through to you</p></div><Zap size={18} /></div>
        {notice && <div role="alert" className="v2-notice is-error">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        <div className="v2-pd-form">
          <div className="v2-pd-picker">
            <span>Leads to call</span>
            <button type="button" className="v2-pd-picker-toggle" aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
              {picked.length === 0 ? `All leads (${(snap.total || 0).toLocaleString()})` : `${picked.length} list${picked.length === 1 ? "" : "s"} selected`}
            </button>
            {pickerOpen && (
              <div className="v2-pd-picker-menu" role="group" aria-label="Leads to call">
                <label><input type="checkbox" checked={picked.length === 0} onChange={() => setPicked([])} /> All leads ({(snap.total || 0).toLocaleString()})</label>
                {snap.uploads?.length ? <p>Uploaded CSV files</p> : null}
                {snap.uploads?.map((item) => (
                  <label key={item.id}><input type="checkbox" checked={picked.includes(`upload:${item.id}`)} onChange={() => togglePick(`upload:${item.id}`)} /> {item.file_name} · {Number(item.total_rows || item.success || 0).toLocaleString()} rows · {new Date(item.uploaded_at).toLocaleDateString()}</label>
                ))}
                {snap.lists?.length ? <p>Campaign lists</p> : null}
                {snap.lists?.map((item) => (
                  <label key={item.name}><input type="checkbox" checked={picked.includes(`list:${item.name}`)} onChange={() => togglePick(`list:${item.name}`)} /> {item.name} ({item.count.toLocaleString()})</label>
                ))}
                <button type="button" className="v2-btn" onClick={() => setPickerOpen(false)}>Done</button>
              </div>
            )}
            <small>Pick as many as you like. A lead in more than one is called once.</small>
          </div>
          <label>Lines at once<select value={maxLines} onChange={(event) => setMaxLines(Number(event.target.value))}><option value={1}>1 (power dialer, never abandons)</option><option value={2}>Up to 2</option><option value={3}>Up to 3</option></select></label>
          <label>Your name<input value={agentName} maxLength={40} onChange={(event) => setAgentName(event.target.value)} placeholder="Sarah" /></label>
          <label>Business name<input value={businessName} maxLength={60} onChange={(event) => setBusinessName(event.target.value)} placeholder="Johnson Health Quotes" /></label>
        </div>
        {maxLines > 1 && <label className="v2-pd-force"><input type="checkbox" checked={forceLines} onChange={(event) => setForceLines(event.target.checked)} /><span><b>Always dial {maxLines} lines at once</b><small>Skips the safety pacing. When many people answer, the extra ones are dropped (they hear your name and callback number and can press 9 to opt out). The FTC limits dropped calls to 3% of answered calls; going over can bring fines.</small></span></label>}
        {(snap.callerIds?.length || 0) > 1 && <div className="v2-pd-numbers"><span>Caller ID</span><div className="v2-number-picks">{snap.callerIds!.map((owned) => { const checked = numbers.includes(owned); return <button key={owned} className={checked ? "is-active" : ""} onClick={() => setNumbers((current) => checked ? current.filter((n) => n !== owned) : [...current, owned])}><span>{checked ? <Check size={12} /> : null}</span>{prettyPhone(owned)}<small>{checked ? "Used" : "Not used"}</small></button>; })}</div><small>None selected uses all of them in turn.</small></div>}
        {callbackList}
        {overflowToggles}
        <p className="v2-pd-rules">Calls 8 AM–8 PM in each lead&apos;s time zone, skips Do Not Call contacts and anyone dialed in the last 24 hours, and hangs up on answering machines. It adds lines only while the abandoned-call rate stays under the legal 3%. Anyone who answers while you&apos;re busy hears your name, business and callback number, and can press 9 to opt out. You still need to scrub lists against the National Do Not Call Registry and only call people who agreed to be contacted.</p>
        <button className="v2-btn v2-btn-primary" disabled={busy || !phoneReady || !agentName.trim() || !businessName.trim()} onClick={start}><Play size={15} /> {busy ? "Starting…" : phoneReady ? "Start dialing" : "Waiting for phone…"}</button>
      </Panel>
    );
  }

  const stats = snap.stats;
  const lead = snap.lead;
  const contact = lead?.contact;
  const leadName = contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed lead" : "Lead";
  const abandonPct = ((snap.pacing?.abandonRate30d || 0) * 100).toFixed(1);
  const tone = session!.agent_state === "on_call" ? "success" : session!.status === "paused" ? "warning" : "info";
  return (
    <Panel className="v2-pd-card">
      <div className="v2-panel-head">
        <div><h2>Predictive dialer</h2><p>{session!.audience ? `List: ${session!.audience}` : "All leads"} · {session!.status === "active" && session!.agent_state === "ready" ? `${snap.pacing?.lines || session!.lines} line${(snap.pacing?.lines || session!.lines) === 1 ? "" : "s"} at once` : `up to ${session!.max_lines} lines`}</p></div>
        <StatusPill tone={tone}>{stateLabel(session!)}</StatusPill>
      </div>
      {(notice || session!.pause_reason) && <div role="alert" className="v2-notice is-error">{notice || session!.pause_reason}<button onClick={() => setNotice("")}>×</button></div>}

      {session!.inbound_from && (
        <div className="v2-pd-lead">
          <div><small>{session!.inbound_label || "Customer calling your business line"}</small><strong>{prettyPhone(session!.inbound_from)}</strong><span>Answer it on the phone above if it&apos;s ringing. Dialing resumes where you left off when the call ends.</span></div>
        </div>
      )}

      {lead && !session!.inbound_from && (session!.agent_state === "connecting" || session!.agent_state === "on_call" || session!.agent_state === "wrap") && (
        <div className="v2-pd-lead">
          <div><small>{session!.agent_state === "connecting" ? "Connecting…" : session!.agent_state === "on_call" ? "On the line" : "Last call"}{lead.human_at && session!.agent_state !== "connecting" ? <b className="v2-pd-timer"> · {callDuration(lead.human_at, lead.ended_at ? new Date(lead.ended_at).getTime() : clock)}</b> : null}</small><strong>{leadName}</strong><span>{prettyPhone(lead.phone)} · {[contact?.city, contact?.state, contact?.zip].filter(Boolean).join(", ") || "Location not added"}</span>{lead.from_number && <span className="v2-pd-from">Calling from <b>{prettyPhone(lead.from_number)}</b>{lead.callback_id ? " · scheduled callback" : ""}</span>}</div>
          <dl>{contact?.age && <div><dt>Age</dt><dd>{contact.age}</dd></div>}{contact?.household_size && <div><dt>Household</dt><dd>{contact.household_size}</dd></div>}{contact?.quote && <div><dt>Quote</dt><dd>{contact.quote}</dd></div>}{contact?.lead_source && <div><dt>Source</dt><dd>{contact.lead_source}</dd></div>}</dl>
          {contact?.notes && <p>{contact.notes}</p>}
        </div>
      )}

      {!session!.inbound_from && (session!.agent_state === "wrap" || (session!.agent_state === "on_call" && lead)) ? (
        <div className="v2-pd-wrap">
          <div className="v2-pd-dispositions">{DISPOSITIONS.map((item) => <button key={item.id} className={disposition === item.id ? "is-active" : ""} onClick={() => setDisposition(item.id)}>{item.label}</button>)}</div>
          {disposition === "callback" && (
            <label className="v2-pd-callback">
              <span>Call back at</span>
              <input type="datetime-local" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} />
              <small>
                {callbackAt
                  ? `That's ${new Date(callbackAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: inferTimezone(contact?.state || undefined), timeZoneName: "short" })} for ${leadName}. The dialer calls them then${lead?.from_number ? ` from ${prettyPhone(lead.from_number)}` : ""}.`
                  : "Your local time. Leave empty to just mark it as a callback."}
              </small>
            </label>
          )}
          <textarea rows={2} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for this call" />
          {booked && <div role="status" className="v2-notice">{booked}<button onClick={() => setBooked("")}>×</button></div>}
          {booking ? (
            <div className="v2-pd-book">
              <label>Date<input type="date" value={booking.date} onChange={(event) => setBooking({ ...booking, date: event.target.value })} /></label>
              <label>Time<input type="time" value={booking.time} onChange={(event) => setBooking({ ...booking, time: event.target.value })} /></label>
              <label>Length<select value={booking.duration} onChange={(event) => setBooking({ ...booking, duration: Number(event.target.value) })}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hour</option></select></label>
              <label>Notes<input value={booking.notes} maxLength={500} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} placeholder="What it's about" /></label>
              <small>Times are in your calendar&apos;s time zone ({snap.calendarTimeZone || "America/New_York"}). It goes on your Text2Sale calendar and your Google Calendar if connected.</small>
              <div className="v2-pd-actions">
                <button className="v2-btn v2-btn-primary" disabled={busy} onClick={() => void book(leadName)}><CalendarPlus size={15} /> Book it</button>
                <button className="v2-btn" disabled={busy} onClick={() => setBooking(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            lead && <button className="v2-btn" disabled={busy} onClick={() => { setBooked(""); setBooking({ date: "", time: "", duration: 30, notes: "" }); }}><CalendarPlus size={15} /> Book appointment</button>
          )}
          <div className="v2-pd-actions">
            {session!.agent_state === "on_call" && <span className="v2-pd-transfer"><input aria-label="Your cell number" inputMode="tel" placeholder="Your cell" value={cell} onChange={(event) => setCell(event.target.value.replace(/[^0-9+() -]/g, ""))} /><button className="v2-btn" disabled={busy} onClick={transferToCell}><PhoneForwarded size={15} /> Transfer to my cell</button></span>}
            {session!.agent_state === "on_call" && snap.teammates?.map((mate) => <button key={mate.id} className="v2-btn" disabled={busy} onClick={() => act({ action: "send", to: mate.id })}><PhoneForwarded size={15} /> Send to {mate.name}</button>)}
            {session!.agent_state === "on_call" && <button className="v2-btn" disabled={busy} onClick={hangUp}><PhoneOff size={15} /> Hang up</button>}
            <button className="v2-btn v2-btn-primary" disabled={busy} onClick={next}><PhoneCall size={15} /> {session!.agent_state === "on_call" ? "Hang up & dial next" : "Save & dial next"}</button>
            <button className="v2-btn" disabled={busy} onClick={() => act({ action: "stop" })}><Square size={14} /> Stop</button>
          </div>
        </div>
      ) : (
        <div className="v2-pd-actions">
          {session!.agent_state === "connecting" && <button className="v2-btn" disabled={busy} onClick={hangUp}><PhoneOff size={15} /> Hang up</button>}
          {session!.status === "paused" || session!.agent_state === "away"
            ? <button className="v2-btn v2-btn-primary" disabled={busy || !phoneReady} onClick={ready}><Play size={15} /> {phoneReady ? "Ready, resume dialing" : "Waiting for phone…"}</button>
            : <button className="v2-btn" disabled={busy} onClick={() => act({ action: "pause" })}><Pause size={15} /> Pause</button>}
          <button className="v2-btn" disabled={busy} onClick={() => act({ action: "stop" })}><Square size={14} /> Stop</button>
        </div>
      )}

      {stats && (
        <div className="v2-pd-stats">
          <div><b>{stats.dials.toLocaleString()}</b><small>Dialed</small></div>
          <div><b>{stats.connected.toLocaleString()}</b><small>Talked to</small></div>
          <div><b>{stats.voicemail.toLocaleString()}</b><small>Voicemail</small></div>
          <div><b>{stats.no_answer.toLocaleString()}</b><small>No answer</small></div>
          <div><b>{stats.abandoned.toLocaleString()}</b><small>Abandoned</small></div>
          <div><b>{stats.queued.toLocaleString()}</b><small>Left to dial</small></div>
        </div>
      )}
      {callbackList}
      {overflowToggles}
      <p className="v2-pd-rules">30-day abandoned rate {abandonPct}% (legal limit 3%){stats?.opted_out ? ` · ${stats.opted_out} opted out` : ""}{stats?.skipped ? ` · ${stats.skipped} skipped (calling hours or DNC)` : ""}</p>
    </Panel>
  );
}
