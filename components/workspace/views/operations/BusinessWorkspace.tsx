"use client";
import {useSearchParams} from "next/navigation";

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
import {nowInTimezone} from "@/lib/availability";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/auth-fetch";
import { deleteTemplate, fetchContactsPage, fetchTemplates, insertTemplate, updateTemplate } from "@/lib/supabase-data";
import type { Contact, MessageTemplate } from "@/lib/types";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../../WorkspacePrimitives";
import { canCall } from "@/lib/entitlements";

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
  google_event_id?:string;
  calendar_sync_error?:string | null;
  contacts?: { first_name: string; last_name: string; phone: string } | null;
};

const STAGES = [
  { id: "new", label: "New lead", hint: "Just arrived" },
  { id: "working", label: "Working", hint: "Conversation started" },
  { id: "qualified", label: "Qualified", hint: "Needs confirmed" },
  { id: "proposal", label: "Proposal", hint: "Decision pending" },
  { id: "won", label: "Won", hint: "Closed" },
  { id: "lost", label: "Lost", hint: "Closed without a sale" },
] as const;

function fullName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed lead";
}

function Pipeline({ profile, onNavigate }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Record<string,string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchContactsPage(profile.id, { page, pageSize: 100, search }).then(async result => {
      if (!alive) return;
      setContacts(result.rows); setTotal(result.total);
      setStages(Object.fromEntries(result.rows.map(c => [c.id,c.pipeline_stage || "new"])));
      const key = `t2s_pipeline_${profile.id}`;
      const legacy = JSON.parse(localStorage.getItem(key) || "{}");
      for (const [id,stage] of Object.entries(legacy)) {
        if (!STAGES.some(s => s.id === stage)) continue;
        const {error} = await supabase.from("contacts").update({pipeline_stage:stage}).eq("user_id",profile.id).eq("id",id).eq("pipeline_stage","new");
        if (error) throw error;
      }
      if (Object.keys(legacy).length) { localStorage.removeItem(key); setPage(0); setNotice("Previous pipeline positions were saved to your account. Refresh to see migrated positions."); }
    }).catch(e => { if(alive)setNotice(e.message || "Could not load pipeline."); }).finally(() => {if(alive)setLoading(false);});
    return () => {alive=false;};
  },[profile.id,page,search]);
  const move = async (contactId:string,stage:string) => {
    const {error} = await supabase.from("contacts").update({pipeline_stage:stage}).eq("id",contactId).eq("user_id",profile.id);
    if(error) {setNotice("Could not save this move. Please retry.");return;}
    setStages(current=>({...current,[contactId]:stage}));
  };
  const visible = contacts.filter((contact) => fullName(contact).toLowerCase().includes(search.toLowerCase()) || contact.phone.includes(search));
  return (
    <>
      <PageHeader eyebrow="Sales pipeline" title="Sales pipeline" description="Drag leads through the pipeline while texts, calls, campaigns, and AI stay connected to the same record." actions={<><div className="v2-header-search"><Search size={15} /><input value={search} onChange={(event) => {setPage(0);setSearch(event.target.value);}} placeholder="Find a lead…" /></div><button className="v2-btn v2-btn-primary" onClick={() => onNavigate("contacts")}><Plus size={15} /> Add lead</button></>} />
      {notice && <p role="status" className="v2-notice">{notice}</p>}
      <div className="v2-toolbar"><span>{total.toLocaleString()} matching leads · Page {page+1}</span><button disabled={!page || loading} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={(page+1)*100>=total || loading} onClick={()=>setPage(p=>p+1)}>Next</button></div>
      <div className="v2-pipeline-board">
        {STAGES.map((stage) => {
          const rows = visible.filter((contact) => (stages[contact.id] || "new") === stage.id);
          return <section key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer.getData("text/contact-id"), stage.id)}>
            <header><div><span className={`v2-stage-dot is-${stage.id}`} /><strong>{stage.label}</strong><b>{rows.length}</b></div><small>{stage.hint}</small></header>
            <div className="v2-pipeline-column">
              {rows.map((contact) => <article draggable onDragStart={(event) => event.dataTransfer.setData("text/contact-id", contact.id)} key={contact.id}><div className="v2-lead-card-head"><GripVertical size={14} /><StatusPill tone={contact.dnc ? "danger" : "neutral"}>{contact.campaign || contact.lead_source || "Lead"}</StatusPill></div><button className="v2-lead-name" onClick={() => { window.sessionStorage.setItem("t2s_contact_id", contact.id); onNavigate("conversations"); }}><span className="v2-avatar">{contact.first_name?.[0]}{contact.last_name?.[0]}</span><span><strong>{fullName(contact)}</strong><small>{contact.city || contact.state ? [contact.city, contact.state].filter(Boolean).join(", ") : "Location not added"}</small></span></button><form className="v2-modal-form" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);const due=String(data.get("followUp") || "");const value=Number(data.get("value") || 0);if(!Number.isFinite(value)||value<0){setNotice("Enter a valid non-negative sales value.");return;}const {error}=await supabase.from("contacts").update({follow_up_at:due ? new Date(due).toISOString() : null,deal_value:value}).eq("id",contact.id).eq("user_id",profile.id);setNotice(error ? "Could not save lead details." : "Lead details saved.");}}><label>Follow-up (your device timezone)<input name="followUp" type="datetime-local" defaultValue={contact.follow_up_at ? new Date(new Date(contact.follow_up_at).getTime()-new Date(contact.follow_up_at).getTimezoneOffset()*60000).toISOString().slice(0,16) : ""}/></label><label>Sales value ($)<input name="value" type="number" min="0" step="0.01" defaultValue={contact.deal_value || 0}/></label><button className="v2-btn" type="submit">Save lead details</button></form><div className="v2-lead-contact"><span><Phone size={11} />{contact.phone || "No phone"}</span><span><Mail size={11} />{contact.email || "No email"}</span></div><footer>{canCall(profile) ? <button onClick={() => {sessionStorage.setItem("t2s_call_lead",JSON.stringify({contactId:contact.id,phone:contact.phone}));onNavigate("calls");}}><Phone size={13} /> Call</button> : null}<button onClick={() => { window.sessionStorage.setItem("t2s_contact_id", contact.id); onNavigate("conversations"); }}><MessageSquare size={13} /> Text</button><select aria-label={`Move ${fullName(contact)}`} value={stages[contact.id] || "new"} onChange={(event) => move(contact.id, event.target.value)}>{STAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></footer></article>)}
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
  const requestedAppointment=useSearchParams().get("appointment");
  const [filter, setFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [open, setOpen] = useState(false);
  const [editing,setEditing]=useState<string | null>(null);
  const [contactSearch,setContactSearch]=useState("");
  const [form, setForm] = useState({ contactId: "", title: "Consultation", date: "", time: "", notes: "" });
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [response, page] = await Promise.all([authFetch(`/api/appointments?userId=${profile.id}`), fetchContactsPage(profile.id, { pageSize: 100, search:contactSearch })]);
    const data = await response.json();
    setAppointments(data.appointments || []); setContacts(page.rows);
  }, [profile.id,contactSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const timezone=String(profile.available_hours?.timezone || "America/New_York");
  const today = nowInTimezone(timezone).date;
  const filtered = appointments.filter((appointment) => requestedAppointment ? appointment.id===requestedAppointment : filter === "cancelled" ? appointment.status === "cancelled" : filter === "past" ? appointment.date < today || ["completed", "no_show"].includes(appointment.status) : appointment.date >= today && appointment.status === "confirmed");
  const create = async () => {
    const response = await authFetch("/api/appointments", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id:editing,userId: profile.id, contactId: form.contactId || null, date: form.date, time: `${form.time}:00`, title: form.title, notes: form.notes }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Could not create appointment."); return; }
    setOpen(false); setForm({ contactId: "", title: "Consultation", date: "", time: "", notes: "" }); setEditing(null);setNotice(data.appointment?.calendar_sync_error || "Appointment saved."); void load();
  };
  const status = async (id: string, value: string) => {
    const response = await authFetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: value }) });
    if(!response.ok) {setNotice((await response.json()).error || "Could not update appointment.");return;}
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status: value } : appointment));
  };
  return (
    <>
      <PageHeader eyebrow="Calendar" title="Appointments" description="Manual bookings and AI-booked consultations appear together, with reminders and Google Calendar sync." actions={<><button className="v2-btn" onClick={() => onNavigate("settings", "integrations")}><CalendarDays size={15} /> Calendar connection</button><button className="v2-btn v2-btn-primary" onClick={() => {setEditing(null);setForm({contactId:"",title:"Consultation",date:"",time:"",notes:""});setOpen(true);}}><Plus size={15} /> New appointment</button></>} />
      {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="v2-calendar-strip"><div><span>{new Date().toLocaleDateString("en-US", { weekday: "long" })}</span><strong>{new Date().getDate()}</strong><small>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small></div><article><Sparkles size={18} /><div><strong>Booking availability &amp; calendar</strong><span>Business timezone: {timezone}. Set working hours and check calendar sync in Settings.</span></div></article><div className="v2-calendar-metrics"><span><strong>{appointments.filter((item) => item.date === today && item.status === "confirmed").length}</strong> today</span><span><strong>{appointments.filter((item) => item.date >= today && item.status === "confirmed").length}</strong> upcoming</span></div></div>
      {requestedAppointment && <p className="v2-notice">Showing the appointment you opened. <button onClick={()=>{sessionStorage.removeItem("t2s_appointment_id");onNavigate("appointments");}}>Show all appointments</button></p>}
      <div className="v2-segmented">{(["upcoming", "past", "cancelled"] as const).map((item) => <button className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <Panel className="v2-appointments-list">
        {filtered.length ? filtered.map((appointment) => { const date = new Date(`${appointment.date}T12:00:00`); return <article key={appointment.id}><div className="v2-date-tile"><span>{date.toLocaleDateString("en-US", { month: "short" })}</span><strong>{date.getDate()}</strong></div><div><StatusPill tone={appointment.status === "confirmed" ? "success" : appointment.status === "cancelled" ? "danger" : "neutral"}>{appointment.status.replace("_", " ")}</StatusPill><h3>{appointment.title}</h3><small>{appointment.time.slice(0,5)} · {timezone} · {appointment.calendar_sync_error ? "Google sync needs attention" : appointment.google_event_id ? "Google synced" : "Saved in Text2Sale"}</small><div className="v2-toolbar"><button className="v2-btn" onClick={()=>{setEditing(appointment.id);setForm({contactId:appointment.contact_id || "",title:appointment.title,date:appointment.date,time:appointment.time.slice(0,5),notes:appointment.notes || ""});setOpen(true);}}>Reschedule / edit</button>{(appointment.status!=="cancelled" && !appointment.google_event_id) || appointment.calendar_sync_error ? <button className="v2-btn" onClick={async()=>{try{const r=await authFetch("/api/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:appointment.id,retrySync:true})});const d=await r.json();setNotice(r.ok ? d.appointment?.calendar_sync_error || "Calendar synced." : d.error);void load();}catch{setNotice("Calendar retry failed. Please try again.");}}}>Retry calendar sync</button>:null}</div><p>{appointment.contacts ? `${appointment.contacts.first_name || ""} ${appointment.contacts.last_name || ""}`.trim() : "No contact"} {appointment.contacts?.phone ? `· ${appointment.contacts.phone}` : ""}</p>{appointment.notes && <small>{appointment.notes}</small>}</div><div className="v2-appointment-time"><strong>{new Date(`${appointment.date}T${appointment.time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{appointment.duration_minutes} minutes</span><small>{appointment.reminder_sent ? "Reminder sent" : "Reminder pending"}</small></div>{appointment.status === "confirmed" && <div className="v2-appointment-actions"><button onClick={() => status(appointment.id, "completed")}><Check size={14} /> Complete</button><button onClick={() => status(appointment.id, "no_show")}><Clock3 size={14} /> No show</button><button onClick={() => status(appointment.id, "cancelled")}><X size={14} /></button></div>}</article>; }) : <EmptyState title={`No ${filter} appointments`} description="Appointments created by you or your AI assistant will appear here." />}
      </Panel>
      {open && <div className="v2-modal-backdrop" onMouseDown={() => setOpen(false)}><div className="v2-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Calendar</span><h2>{editing ? "Edit appointment" : "Schedule appointment"}</h2><p>Times in {timezone}</p></div><button onClick={() => setOpen(false)}><X size={18} /></button></header><div className="v2-modal-form"><label>Find contact<input placeholder="Search all contacts…" value={contactSearch} onChange={e=>setContactSearch(e.target.value)}/></label><label>Contact<select disabled={!!editing} value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{fullName(contact)} — {contact.phone}</option>)}</select></label><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><div className="v2-form-grid"><label>Date<input type="date" min={today} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Time<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Notes<textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><footer><button className="v2-btn" onClick={() => setOpen(false)}>Cancel</button><button className="v2-btn v2-btn-primary" disabled={!form.date || !form.time} onClick={create}>Schedule</button></footer></div></div>}
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
      <PageHeader eyebrow="Message library" title="Message templates" description="Keep approved replies, follow-ups, and appointment messages ready for your team and AI." actions={<button className="v2-btn v2-btn-primary" onClick={() => { setSelectedId(null); setDraft({ name: "", body: "", category: "General" }); }}><Plus size={15} /> New template</button>} />
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
