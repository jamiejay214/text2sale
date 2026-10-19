"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pause, PhoneCall, Play, Square, Zap } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import type { OwnedNumber } from "@/lib/types";
import { Panel, StatusPill } from "../../WorkspacePrimitives";

// The predictive dialer's controls and live view (server side: lib/dialer.ts
// and /api/dialer). The browser phone stays on the Calling page; while the
// agent is ready, live answers are put through to it and picked up
// automatically (see the autoAnswer prop on BrowserPhone).

type Session = {
  id: string;
  status: "active" | "paused" | "stopped" | "completed";
  agent_state: "ready" | "connecting" | "on_call" | "wrap" | "away";
  max_lines: number;
  lines: number;
  pause_reason: string | null;
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
  error?: string;
};

const DISPOSITIONS: Array<{ id: string; label: string }> = [
  { id: "interested", label: "Interested" },
  { id: "callback", label: "Call back" },
  { id: "not_interested", label: "Not interested" },
  { id: "wrong_number", label: "Wrong number" },
  { id: "dnc", label: "Do not call" },
];

const OPEN = (session: Session | null) => !!session && (session.status === "active" || session.status === "paused");

function prettyPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

function stateLabel(session: Session) {
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
  ownedNumbers,
  phoneReady,
  onAutoAnswerChange,
}: {
  ownedNumbers: OwnedNumber[];
  phoneReady: boolean;
  onAutoAnswerChange: (on: boolean) => void;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [list, setList] = useState("");
  const [maxLines, setMaxLines] = useState(2);
  const [agentName, setAgentName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [disposition, setDisposition] = useState("");
  const [notes, setNotes] = useState("");

  const session = snap?.session || null;
  const open = OPEN(session);

  const load = useCallback(async (withLists = false) => {
    const response = await authFetch(`/api/dialer${withLists ? "?lists=1" : ""}`);
    const data = (await response.json().catch(() => ({}))) as Snapshot;
    if (!response.ok) { setNotice(data.error || "Could not load the dialer."); return; }
    setSnap((current) => ({ ...data, total: data.total ?? current?.total, lists: data.lists ?? current?.lists }));
  }, []);

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

  const autoAnswer = open && (session?.agent_state === "ready" || session?.agent_state === "connecting");
  useEffect(() => { onAutoAnswerChange(!!autoAnswer); }, [autoAnswer, onAutoAnswerChange]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNotice("");
    try {
      const response = await authFetch("/api/dialer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json().catch(() => ({}))) as Snapshot;
      if (!response.ok) { setNotice(data.error || "Something went wrong. Please retry."); return false; }
      setSnap((current) => ({ ...data, total: current?.total, lists: current?.lists }));
      return true;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!phoneReady) { setNotice("Wait until the browser phone says Phone ready."); return; }
    try { window.localStorage.setItem("t2s_dialer_names", JSON.stringify({ agentName, businessName })); } catch { /* optional */ }
    if (await act({ action: "start", list, maxLines, agentName, businessName, fromNumbers: numbers })) await act({ action: "ready" });
  };

  const next = async () => {
    if (await act({ action: "next", disposition: disposition || null, notes })) { setDisposition(""); setNotes(""); }
  };

  if (!snap) return <Panel className="v2-pd-card"><p className="v2-forwarding-note">Loading the dialer…</p></Panel>;

  if (!open) {
    return (
      <Panel className="v2-pd-card">
        <div className="v2-panel-head"><div><h2>Predictive dialer</h2><p>Dials several leads at once and puts the first person who answers through to you</p></div><Zap size={18} /></div>
        {notice && <div role="alert" className="v2-notice is-error">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        <div className="v2-pd-form">
          <label>Leads<select value={list} onChange={(event) => setList(event.target.value)}><option value="">All leads ({(snap.total || 0).toLocaleString()})</option>{(snap.lists || []).map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count.toLocaleString()})</option>)}</select></label>
          <label>Lines at once<select value={maxLines} onChange={(event) => setMaxLines(Number(event.target.value))}><option value={1}>1 (power dialer, never abandons)</option><option value={2}>Up to 2</option><option value={3}>Up to 3</option></select></label>
          <label>Your name<input value={agentName} maxLength={40} onChange={(event) => setAgentName(event.target.value)} placeholder="Sarah" /></label>
          <label>Business name<input value={businessName} maxLength={60} onChange={(event) => setBusinessName(event.target.value)} placeholder="Johnson Health Quotes" /></label>
        </div>
        {ownedNumbers.length > 1 && <div className="v2-pd-numbers"><span>Caller ID</span><div className="v2-number-picks">{ownedNumbers.map((owned) => { const checked = numbers.includes(owned.number); return <button key={owned.number} className={checked ? "is-active" : ""} onClick={() => setNumbers((current) => checked ? current.filter((n) => n !== owned.number) : [...current, owned.number])}><span>{checked ? <Check size={12} /> : null}</span>{prettyPhone(owned.number)}<small>{checked ? "Used" : "Not used"}</small></button>; })}</div><small>None selected uses all your numbers in turn.</small></div>}
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

      {lead && (session!.agent_state === "connecting" || session!.agent_state === "on_call" || session!.agent_state === "wrap") && (
        <div className="v2-pd-lead">
          <div><small>{session!.agent_state === "connecting" ? "Connecting…" : session!.agent_state === "on_call" ? "On the line" : "Last call"}</small><strong>{leadName}</strong><span>{prettyPhone(lead.phone)} · {[contact?.city, contact?.state, contact?.zip].filter(Boolean).join(", ") || "Location not added"}</span></div>
          <dl>{contact?.age && <div><dt>Age</dt><dd>{contact.age}</dd></div>}{contact?.household_size && <div><dt>Household</dt><dd>{contact.household_size}</dd></div>}{contact?.quote && <div><dt>Quote</dt><dd>{contact.quote}</dd></div>}{contact?.lead_source && <div><dt>Source</dt><dd>{contact.lead_source}</dd></div>}</dl>
          {contact?.notes && <p>{contact.notes}</p>}
        </div>
      )}

      {session!.agent_state === "wrap" || (session!.agent_state === "on_call" && lead) ? (
        <div className="v2-pd-wrap">
          <div className="v2-pd-dispositions">{DISPOSITIONS.map((item) => <button key={item.id} className={disposition === item.id ? "is-active" : ""} onClick={() => setDisposition(item.id)}>{item.label}</button>)}</div>
          <textarea rows={2} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for this call" />
          <div className="v2-pd-actions">
            <button className="v2-btn v2-btn-primary" disabled={busy || session!.agent_state === "on_call"} onClick={next}><PhoneCall size={15} /> {session!.agent_state === "on_call" ? "Hang up to continue" : "Save & dial next"}</button>
            <button className="v2-btn" disabled={busy} onClick={() => act({ action: "stop" })}><Square size={14} /> Stop</button>
          </div>
        </div>
      ) : (
        <div className="v2-pd-actions">
          {session!.status === "paused" || session!.agent_state === "away"
            ? <button className="v2-btn v2-btn-primary" disabled={busy || !phoneReady} onClick={() => act({ action: "ready" })}><Play size={15} /> {phoneReady ? "Ready, resume dialing" : "Waiting for phone…"}</button>
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
      <p className="v2-pd-rules">30-day abandoned rate {abandonPct}% (legal limit 3%){stats?.opted_out ? ` · ${stats.opted_out} opted out` : ""}{stats?.skipped ? ` · ${stats.skipped} skipped (calling hours or DNC)` : ""}</p>
    </Panel>
  );
}
