"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  FileText,
  GripVertical,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { deleteTemplate, fetchContactsPage, fetchTemplates, insertTemplate, updateTemplate } from "@/lib/supabase-data";
import type { Contact, MessageTemplate } from "@/lib/types";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../../WorkspacePrimitives";

type Props = WorkspaceViewProps & { mode: "pipeline" | "appointments" | "templates" };

type Appointment = {
  id: string;
  contact_id: string | null;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  notes: string;
  status: string;
  reminder_sent: boolean;
  contacts?: { first_name: string; last_name: string; phone: string } | null;
};

const STAGES = [
  { id: "new", label: "New lead", hint: "Just arrived" },
  { id: "working", label: "Working", hint: "Conversation started" },
  { id: "qualified", label: "Qualified", hint: "Needs confirmed" },
  { id: "proposal", label: "Proposal", hint: "Decision pending" },
  { id: "won", label: "Won", hint: "Closed" },
] as const;

function fullName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed lead";
}

function Pipeline({ profile, onNavigate }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem(`t2s_pipeline_${profile.id}`) || "{}"); } catch { return {}; }
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactsPage(profile.id, { pageSize: 200 }).then((page) => { setContacts(page.rows); setLoading(false); });
  }, [profile.id]);

  const move = (contactId: string, stage: string) => setStages((current) => {
    const next = { ...current, [contactId]: stage };
    window.localStorage.setItem(`t2s_pipeline_${profile.id}`, JSON.stringify(next));
    return next;
  });
  const visible = contacts.filter((contact) => fullName(contact).toLowerCase().includes(search.toLowerCase()) || contact.phone.includes(search));
  return (
    <>
      <PageHeader eyebrow="Sales pipeline" title="See every deal—and what should happen next." description="Drag leads through the pipeline while texts, calls, campaigns, and AI stay connected to the same record." actions={<><div className="v2-header-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a lead…" /></div><button className="v2-btn v2-btn-primary" onClick={() => onNavigate("contacts")}><Plus size={15} /> Add lead</button></>} />
      <div className="v2-pipeline-board">
        {STAGES.map((stage) => {
          const rows = visible.filter((contact) => (stages[contact.id] || "new") === stage.id);
          return <section key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer.getData("text/contact-id"), stage.id)}>
            <header><div><span className={`v2-stage-dot is-${stage.id}`} /><strong>{stage.label}</strong><b>{rows.length}</b></div><small>{stage.hint}</small></header>
            <div className="v2-pipeline-column">
              {rows.map((contact) => <article draggable onDragStart={(event) => event.dataTransfer.setData("text/contact-id", contact.id)} key={contact.id}><div className="v2-lead-card-head"><GripVertical size={14} /><StatusPill tone={contact.dnc ? "danger" : "neutral"}>{contact.campaign || contact.lead_source || "Lead"}</StatusPill><button><MoreHorizontal size={15} /></button></div><button className="v2-lead-name" onClick={() => { window.sessionStorage.setItem("t2s_contact_id", contact.id); onNavigate("conversations"); }}><span className="v2-avatar">{contact.first_name?.[0]}{contact.last_name?.[0]}</span><span><strong>{fullName(contact)}</strong><small>{contact.city || contact.state ? [contact.city, contact.state].filter(Boolean).join(", ") : "Location not added"}</small></span></button><div className="v2-lead-contact"><span><Phone size={11} />{contact.phone || "No phone"}</span><span><Mail size={11} />{contact.email || "No email"}</span></div><footer><button onClick={() => onNavigate("calls")}><Phone size={13} /> Call</button><button onClick={() => { window.sessionStorage.setItem("t2s_contact_id", contact.id); onNavigate("conversations"); }}><MessageSquare size={13} /> Text</button><select aria-label={`Move ${fullName(contact)}`} value={stages[contact.id] || "new"} onChange={(event) => move(contact.id, event.target.value)}>{STAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></footer></article>)}
              {!rows.length && !loading && <div className="v2-stage-empty">Drop a lead here</div>}
            </div>
          </section>;
        })}
      </div>
    </>
  );
}

function Appointments({ profile, onNavigate }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contactId: "", title: "Consultation", date: "", time: "", notes: "" });
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [response, page] = await Promise.all([authFetch(`/api/appointments?userId=${profile.id}`), fetchContactsPage(profile.id, { pageSize: 100 })]);
    const data = await response.json();
    setAppointments(data.appointments || []); setContacts(page.rows);
  }, [profile.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = appointments.filter((appointment) => filter === "cancelled" ? appointment.status === "cancelled" : filter === "past" ? appointment.date < today || ["completed", "no_show"].includes(appointment.status) : appointment.date >= today && appointment.status === "confirmed");
  const create = async () => {
    const response = await authFetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: profile.id, contactId: form.contactId || null, date: form.date, time: `${form.time}:00`, title: form.title, notes: form.notes }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Could not create appointment."); return; }
    setOpen(false); setForm({ contactId: "", title: "Consultation", date: "", time: "", notes: "" }); setNotice("Appointment scheduled."); void load();
  };
  const status = async (id: string, value: string) => {
    await authFetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: value }) });
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status: value } : appointment));
  };
  return (
    <>
      <PageHeader eyebrow="Calendar" title="A calendar your team and AI share." description="Manual bookings and AI-booked consultations appear together, with reminders and Google Calendar sync." actions={<><button className="v2-btn" onClick={() => onNavigate("settings", "integrations")}><CalendarDays size={15} /> Calendar connection</button><button className="v2-btn v2-btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> New appointment</button></>} />
      {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="v2-calendar-strip"><div><span>{new Date().toLocaleDateString("en-US", { weekday: "long" })}</span><strong>{new Date().getDate()}</strong><small>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small></div><article><Sparkles size={18} /><div><strong>AI booking is connected to availability</strong><span>Your assistant only offers open time slots and avoids double booking.</span></div></article><div className="v2-calendar-metrics"><span><strong>{appointments.filter((item) => item.date === today && item.status === "confirmed").length}</strong> today</span><span><strong>{appointments.filter((item) => item.date >= today && item.status === "confirmed").length}</strong> upcoming</span></div></div>
      <div className="v2-segmented">{(["upcoming", "past", "cancelled"] as const).map((item) => <button className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <Panel className="v2-appointments-list">
        {filtered.length ? filtered.map((appointment) => { const date = new Date(`${appointment.date}T12:00:00`); return <article key={appointment.id}><div className="v2-date-tile"><span>{date.toLocaleDateString("en-US", { month: "short" })}</span><strong>{date.getDate()}</strong></div><div><StatusPill tone={appointment.status === "confirmed" ? "success" : appointment.status === "cancelled" ? "danger" : "neutral"}>{appointment.status.replace("_", " ")}</StatusPill><h3>{appointment.title}</h3><p>{appointment.contacts ? `${appointment.contacts.first_name || ""} ${appointment.contacts.last_name || ""}`.trim() : "No contact"} {appointment.contacts?.phone ? `· ${appointment.contacts.phone}` : ""}</p>{appointment.notes && <small>{appointment.notes}</small>}</div><div className="v2-appointment-time"><strong>{new Date(`${appointment.date}T${appointment.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{appointment.duration_minutes} minutes</span><small>{appointment.reminder_sent ? "Reminder sent" : "Reminder pending"}</small></div>{appointment.status === "confirmed" && <div className="v2-appointment-actions"><button onClick={() => status(appointment.id, "completed")}><Check size={14} /> Complete</button><button onClick={() => status(appointment.id, "no_show")}><Clock3 size={14} /> No show</button><button onClick={() => status(appointment.id, "cancelled")}><X size={14} /></button></div>}</article>; }) : <EmptyState title={`No ${filter} appointments`} description="Appointments created by you or your AI assistant will appear here." />}
      </Panel>
      {open && <div className="v2-modal-backdrop" onMouseDown={() => setOpen(false)}><div className="v2-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Calendar</span><h2>Schedule appointment</h2></div><button onClick={() => setOpen(false)}><X size={18} /></button></header><div className="v2-modal-form"><label>Contact<select value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{fullName(contact)} — {contact.phone}</option>)}</select></label><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><div className="v2-form-grid"><label>Date<input type="date" min={today} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Time<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Notes<textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><footer><button className="v2-btn" onClick={() => setOpen(false)}>Cancel</button><button className="v2-btn v2-btn-primary" disabled={!form.date || !form.time} onClick={create}>Schedule</button></footer></div></div>}
    </>
  );
}

function Templates({ profile, onNavigate }: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", body: "", category: "General" });
  const [notice, setNotice] = useState("");
  const load = useCallback(() => fetchTemplates(profile.id).then(setTemplates), [profile.id]);
  useEffect(() => { void load(); }, [load]);
  const choose = (template: MessageTemplate) => { setSelectedId(template.id); setDraft({ name: template.name, body: template.body, category: template.category }); };
  const save = async () => {
    const result = selectedId ? await updateTemplate(selectedId, draft) : await insertTemplate({ user_id: profile.id, ...draft });
    if (!result) { setNotice("Template could not be saved."); return; }
    setSelectedId(result.id); setNotice("Template saved."); void load();
  };
  const remove = async () => { if (!selectedId || !window.confirm("Delete this template?")) return; await deleteTemplate(selectedId); setSelectedId(null); setDraft({ name: "", body: "", category: "General" }); void load(); };
  return (
    <>
      <PageHeader eyebrow="Message library" title="Write it once. Use it everywhere." description="Keep approved replies, follow-ups, and appointment messages ready for your team and AI." actions={<button className="v2-btn v2-btn-primary" onClick={() => { setSelectedId(null); setDraft({ name: "", body: "", category: "General" }); }}><Plus size={15} /> New template</button>} />
      {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="v2-template-layout">
        <Panel className="v2-template-list"><div className="v2-panel-head"><div><h2>Templates</h2><p>{templates.length} saved replies</p></div></div>{templates.length ? <div>{templates.map((template) => <button className={template.id === selectedId ? "is-active" : ""} key={template.id} onClick={() => choose(template)}><span><FileText size={15} /></span><div><strong>{template.name}</strong><small>{template.category} · {template.body}</small></div></button>)}</div> : <EmptyState title="No templates yet" description="Create reusable messages for your most common conversations." />}</Panel>
        <Panel className="v2-template-editor"><div className="v2-panel-head"><div><h2>{selectedId ? "Edit template" : "Create template"}</h2><p>Available in the conversation composer</p></div>{selectedId && <button className="v2-icon-btn is-danger" onClick={remove}><Trash2 size={15} /></button>}</div><div className="v2-modal-form"><div className="v2-form-grid"><label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Appointment follow-up" /></label><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>General</option><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Objection</option></select></label></div><label>Message<textarea rows={11} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Hi {firstName}, thanks for your interest…" /><small>{draft.body.length} characters</small></label><div className="v2-token-row">{["{firstName}", "{lastName}", "{city}", "{state}"].map((token) => <button key={token} onClick={() => setDraft({ ...draft, body: `${draft.body}${token}` })}>{token}</button>)}</div><div className="v2-template-actions"><button className="v2-btn" onClick={() => navigator.clipboard.writeText(draft.body)}><Copy size={14} /> Copy</button><button className="v2-btn" onClick={() => onNavigate("conversations")}><MessageSquare size={14} /> Open inbox</button><button className="v2-btn v2-btn-primary" onClick={save} disabled={!draft.name.trim() || !draft.body.trim()}>Save template</button></div></div></Panel>
      </div>
    </>
  );
}

export default function BusinessWorkspace(props: Props) {
  if (props.mode === "pipeline") return <Pipeline {...props} />;
  if (props.mode === "appointments") return <Appointments {...props} />;
  return <Templates {...props} />;
}
