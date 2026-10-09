"use client";
import { useState } from "react";
import type { LeadRow } from "@/lib/leads-intel";
import { PROSPECT_STATUSES } from "@/lib/prospect-capture";

export default function ProspectActions({ lead, token, demo, onSaved }: { lead: LeadRow; token?: string | null; demo: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(lead.followup || "new");
  const [notes, setNotes] = useState(lead.notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy || demo) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/command-center/leads", { method: "PATCH", headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, status, notes }) });
      if (!response.ok) throw new Error("Could not save. Please try again.");
      setOpen(false); onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 border-t border-white/10 pt-2">
    <button className="text-xs font-semibold text-lime-200 underline" onClick={() => { if (!open) { setStatus(lead.followup || "new"); setNotes(lead.notes || ""); } setOpen(!open); }}>{(lead.followup || "new").replaceAll("_", " ")} · {open ? "Close" : "Manage follow-up"}</button>
    {lead.notes && !open && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-200">{lead.notes}</p>}
    {open && <div className="mt-3 space-y-3">
      <label className="block text-xs text-slate-200">Status<select value={status} onChange={e => setStatus(e.target.value)} className="ml-3 rounded-lg border border-white/20 bg-slate-950 p-2 text-white">{PROSPECT_STATUSES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <label className="block text-xs text-slate-200">Follow-up notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} rows={3} className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-white" /></label>
      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
      <button disabled={busy || demo} onClick={save} className="rounded-lg bg-lime-300 px-4 py-2 text-xs font-bold text-emerald-950 disabled:opacity-50">{busy ? "Saving…" : "Save follow-up"}</button>
    </div>}
  </div>;
}
