"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";
import {
  deleteContact,
  fetchCampaigns,
  fetchContactsPage,
  insertContact,
  updateContact,
} from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import type { Campaign, Contact } from "@/lib/types";

const PAGE_SIZE = 50;

type ContactDraft = Pick<Contact, "first_name" | "last_name" | "phone" | "email" | "city" | "state" | "zip" | "lead_source" | "notes">;

const emptyContact = (): ContactDraft => ({
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  zip: "",
  lead_source: "",
  notes: "",
});

function initials(contact: Contact) {
  return `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() || "?";
}

function displayName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed lead";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function ContactEditor({
  contact,
  onClose,
  onSave,
  saving,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSave: (draft: ContactDraft) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<ContactDraft>(() =>
    contact
      ? {
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          phone: contact.phone || "",
          email: contact.email || "",
          city: contact.city || "",
          state: contact.state || "",
          zip: contact.zip || "",
          lead_source: contact.lead_source || "",
          notes: contact.notes || "",
        }
      : emptyContact(),
  );
  const patch = (field: keyof ContactDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <div className="v2-drawer-backdrop" onMouseDown={onClose}>
      <aside className="v2-contact-drawer" onMouseDown={(event) => event.stopPropagation()} aria-label={contact ? "Edit contact" : "Add contact"}>
        <header><div><span>{contact ? "Contact details" : "New contact"}</span><h2>{contact ? displayName(contact) : "Add a lead"}</h2></div><button onClick={onClose}><X size={19} /></button></header>
        <div className="v2-contact-form">
          <div className="v2-form-grid"><label>First name<input autoFocus value={draft.first_name} onChange={(event) => patch("first_name", event.target.value)} /></label><label>Last name<input value={draft.last_name} onChange={(event) => patch("last_name", event.target.value)} /></label></div>
          <label>Phone number<input type="tel" value={draft.phone} onChange={(event) => patch("phone", event.target.value)} placeholder="(954) 555-0123" /></label>
          <label>Email<input type="email" value={draft.email} onChange={(event) => patch("email", event.target.value)} placeholder="lead@example.com" /></label>
          <div className="v2-form-grid is-location"><label>City<input value={draft.city} onChange={(event) => patch("city", event.target.value)} /></label><label>State<input maxLength={2} value={draft.state} onChange={(event) => patch("state", event.target.value.toUpperCase())} /></label><label>ZIP<input value={draft.zip} onChange={(event) => patch("zip", event.target.value)} /></label></div>
          <label>Lead source<input value={draft.lead_source} onChange={(event) => patch("lead_source", event.target.value)} placeholder="Facebook, referral, website…" /></label>
          <label>Notes<textarea rows={5} value={draft.notes} onChange={(event) => patch("notes", event.target.value)} /></label>
        </div>
        <footer><button className="v2-btn" onClick={onClose}>Cancel</button><button className="v2-btn v2-btn-primary" disabled={saving || !draft.first_name.trim() || !draft.phone.trim()} onClick={() => onSave(draft)}>{saving ? "Saving…" : contact ? "Save changes" : "Add contact"}</button></footer>
      </aside>
    </div>
  );
}

export default function ContactsWorkspace({ profile, onNavigate }: WorkspaceViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Contact | null | "new">(null);
  const [saving, setSaving] = useState(false);
  const [campaignChoice, setCampaignChoice] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setQuery(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchContactsPage(profile.id, { page, pageSize: PAGE_SIZE, search: query });
      setContacts(result.rows);
      setTotal(result.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page, profile.id, query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCampaigns(profile.id).then(setCampaigns);
  }, [profile.id]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allPageSelected = contacts.length > 0 && contacts.every((contact) => selected.has(contact.id));
  const selectedContacts = useMemo(() => contacts.filter((contact) => selected.has(contact.id)), [contacts, selected]);

  const togglePage = () => setSelected(allPageSelected ? new Set() : new Set(contacts.map((contact) => contact.id)));
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const saveContact = async (draft: ContactDraft) => {
    setSaving(true);
    const result = editing && editing !== "new"
      ? await updateContact(editing.id, draft)
      : await insertContact({
          user_id: profile.id,
          ...draft,
          tags: [],
          dnc: false,
          campaign: "",
          address: "",
          quote: "",
          policy_id: "",
          timeline: "",
          household_size: "",
          date_of_birth: "",
          age: "",
        });
    setSaving(false);
    if (!result) {
      setNotice("Contact could not be saved. Check the phone number and try again.");
      return;
    }
    setEditing(null);
    setNotice(editing === "new" ? "Contact added." : "Contact updated.");
    await load();
  };

  const removeOne = async (contact: Contact) => {
    if (!window.confirm(`Delete ${displayName(contact)}? This cannot be undone.`)) return;
    if (await deleteContact(contact.id)) {
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setTotal((current) => Math.max(0, current - 1));
    }
  };

  const removeSelected = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} selected contacts? This cannot be undone.`)) return;
    const ids = [...selected];
    const { error } = await supabase.from("contacts").delete().eq("user_id", profile.id).in("id", ids);
    if (error) {
      setNotice("Selected contacts could not be deleted.");
      return;
    }
    setContacts((current) => current.filter((contact) => !selected.has(contact.id)));
    setTotal((current) => Math.max(0, current - ids.length));
    setSelected(new Set());
  };

  const assignCampaign = async () => {
    if (!selected.size || !campaignChoice) return;
    const campaign = campaigns.find((item) => item.id === campaignChoice);
    if (!campaign) return;
    const ids = [...selected];
    const { error } = await supabase.from("contacts").update({ campaign: campaign.name }).eq("user_id", profile.id).in("id", ids);
    if (error) {
      setNotice("Contacts could not be assigned to the campaign.");
      return;
    }
    setContacts((current) => current.map((contact) => selected.has(contact.id) ? { ...contact, campaign: campaign.name } : contact));
    setNotice(`${ids.length} contacts assigned to ${campaign.name}.`);
    setSelected(new Set());
    setCampaignChoice("");
  };

  const toggleDnc = async (contact: Contact) => {
    const result = await updateContact(contact.id, { dnc: !contact.dnc });
    if (result) setContacts((current) => current.map((item) => item.id === result.id ? result : item));
  };

  const exportPage = () => {
    const rows = selectedContacts.length ? selectedContacts : contacts;
    const headings = ["First Name", "Last Name", "Phone", "Email", "City", "State", "ZIP", "Campaign", "Lead Source", "DNC"];
    const body = rows.map((contact) => [contact.first_name, contact.last_name, contact.phone, contact.email, contact.city, contact.state, contact.zip, contact.campaign, contact.lead_source, contact.dnc ? "Yes" : "No"].map(csvCell).join(","));
    const blob = new Blob([[headings.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `text2sale-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact intelligence"
        title="Every lead, ready for the next move."
        description="Search, organize, assign, and manage your lead database without loading thousands of records at once."
        actions={<><button className="v2-btn" onClick={() => onNavigate("upload")}><Upload size={16} /> Import CSV</button><button className="v2-btn" onClick={exportPage}><Download size={16} /> Export</button><button className="v2-btn v2-btn-primary" onClick={() => setEditing("new")}><Plus size={16} /> Add contact</button></>}
      />
      {notice && <div className="v2-notice is-ok">{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
      <Panel className="v2-contacts-panel">
        <div className="v2-contacts-toolbar">
          <div className="v2-contacts-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or email…" /></div>
          <button className="v2-btn"><Filter size={15} /> Filters</button>
          <button className={`v2-btn v2-select-page ${allPageSelected ? "is-active" : ""}`} aria-pressed={allPageSelected} disabled={!contacts.length || loading} onClick={togglePage}><Check size={15} /> {allPageSelected ? "Clear page" : `Select all ${contacts.length || ""}`}</button>
          <span>{total.toLocaleString()} contacts</span>
        </div>
        {selected.size > 0 && (
          <div className="v2-contact-bulk">
            <strong>{selected.size} selected</strong>
            <select value={campaignChoice} onChange={(event) => setCampaignChoice(event.target.value)}><option value="">Choose campaign…</option>{campaigns.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select>
            <button onClick={assignCampaign} disabled={!campaignChoice}>Assign</button>
            <button onClick={exportPage}><Download size={14} /> Export</button>
            <button className="is-danger" onClick={removeSelected}><Trash2 size={14} /> Delete</button>
            <button className="is-clear" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
        <div className="v2-contacts-table-wrap">
          <table className="v2-contacts-table">
            <thead><tr><th><button className={`v2-table-check ${allPageSelected ? "is-on" : ""}`} onClick={togglePage}>{allPageSelected && <Check size={12} />}</button></th><th>Contact</th><th>Location</th><th>Campaign</th><th>Source</th><th>Status</th><th /></tr></thead>
            <tbody>
              {!loading && contacts.map((contact) => (
                <tr key={contact.id} className={selected.has(contact.id) ? "is-selected" : ""}>
                  <td><button className={`v2-table-check ${selected.has(contact.id) ? "is-on" : ""}`} onClick={() => toggle(contact.id)}>{selected.has(contact.id) && <Check size={12} />}</button></td>
                  <td><button className="v2-contact-cell" onClick={() => setEditing(contact)}><span className="v2-avatar">{initials(contact)}</span><span><strong>{displayName(contact)}</strong><small><Phone size={11} /> {contact.phone || "No phone"}</small><small><Mail size={11} /> {contact.email || "No email"}</small></span></button></td>
                  <td>{contact.city || contact.state || contact.zip ? <span className="v2-location"><MapPin size={13} /> {[contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}</span> : <span className="v2-muted-cell">Not added</span>}</td>
                  <td>{contact.campaign ? <StatusPill tone="info">{contact.campaign}</StatusPill> : <span className="v2-muted-cell">Unassigned</span>}</td>
                  <td>{contact.lead_source || <span className="v2-muted-cell">—</span>}</td>
                  <td>{contact.dnc ? <StatusPill tone="danger">Do not contact</StatusPill> : <StatusPill tone="success">Textable</StatusPill>}</td>
                  <td><div className="v2-row-actions"><button title="Open conversation" onClick={() => { window.sessionStorage.setItem("t2s_contact_id", contact.id); onNavigate("conversations"); }}><MessageSquare size={15} /></button><button title={contact.dnc ? "Remove DNC" : "Mark DNC"} onClick={() => toggleDnc(contact)}><Ban size={15} /></button><button title="Delete" onClick={() => removeOne(contact)}><MoreHorizontal size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="v2-table-loading"><span className="v2-spin">◌</span> Loading contacts</div>}
          {!loading && contacts.length === 0 && <EmptyState title={query ? "No contacts match that search" : "Your lead database is ready"} description={query ? "Try a different name, phone number, or email." : "Add a contact or import a CSV to start building your pipeline."} action={!query ? <button className="v2-btn v2-btn-primary" onClick={() => onNavigate("upload")}><Upload size={15} /> Import leads</button> : undefined} />}
        </div>
        <div className="v2-contacts-footer"><span>Showing {total ? page * PAGE_SIZE + 1 : 0}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total.toLocaleString()}</span><div><button disabled={page === 0} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /></button><span>Page {page + 1} of {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={15} /></button></div></div>
      </Panel>
      {editing && <ContactEditor key={editing === "new" ? "new" : editing.id} contact={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={saveContact} saving={saving} />}
    </>
  );
}
