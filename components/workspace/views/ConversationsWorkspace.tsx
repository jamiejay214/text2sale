"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Bot, Check, ChevronLeft, ChevronRight, Loader2, Megaphone, MessageSquare, MoreHorizontal, PhoneCall, Search, Send, Trash2, UserRound, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { sanitizeForSms, countSegments, hasNonGsmChars } from "@/lib/sms-text";
import { supabase } from "@/lib/supabase";
import { fetchCampaigns, fetchConversationsPage, fetchMessagesPage, insertMessage, updateConversation } from "@/lib/supabase-data";
import type { Campaign, Contact, Conversation, Message } from "@/lib/types";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";

type InboxFilter = "inbox" | "unread" | "ai" | "archived";

const SALES_QUOTES = [
  "The next conversation could be the one.",
  "Speed creates trust. Consistency closes.",
  "Every follow-up is a fresh chance to win.",
  "Small conversations build a powerful pipeline.",
  "Stay helpful. Stay human. Keep moving forward.",
];

function initials(contact?: Contact) {
  const value = `${contact?.first_name?.[0] || ""}${contact?.last_name?.[0] || ""}`;
  return value.toUpperCase() || "?";
}

function contactName(contact?: Contact) {
  return [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.phone || "Unknown contact";
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function campaignStatusTone(status: Campaign["status"]) {
  if (status === "Sending") return "info" as const;
  if (status === "Scheduled") return "success" as const;
  if (status === "Paused") return "warning" as const;
  return "neutral" as const;
}

const ConversationList = memo(function ConversationList({
  conversations,
  contacts,
  selectedId,
  checked,
  selectMode,
  onOpen,
  onCheck,
}: {
  conversations: Conversation[];
  contacts: Map<string, Contact>;
  selectedId: string;
  checked: Set<string>;
  selectMode: boolean;
  onOpen: (id: string) => void;
  onCheck: (id: string) => void;
}) {
  return (
    <div className="v2-inbox-list">
      {conversations.map((conversation) => {
        const contact = contacts.get(conversation.contact_id);
        const active = conversation.id === selectedId;
        const isChecked = checked.has(conversation.id);
        const toggle = () => (selectMode ? onCheck(conversation.id) : onOpen(conversation.id));
        return (
          <div
            key={conversation.id}
            className={`v2-inbox-item ${active ? "is-active" : ""} ${isChecked ? "is-checked" : ""}`}
            role="button"
            tabIndex={0}
            aria-current={active ? "true" : undefined}
            onClick={toggle}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
              }
            }}
          >
            <button
              type="button"
              className={`v2-inbox-avatar-picker ${isChecked ? "is-on" : ""}`}
              aria-label={`${isChecked ? "Deselect" : "Select"} ${contactName(contact)}`}
              aria-pressed={isChecked}
              title={`${isChecked ? "Deselect" : "Select"} conversation`}
              onClick={(event) => {
                event.stopPropagation();
                onCheck(conversation.id);
              }}
            >
              <span className="v2-avatar">{initials(contact)}</span>
              <span className="v2-avatar-picker-hint" aria-hidden="true"><Check size={10} /></span>
            </button>
            <span className="v2-inbox-copy">
              <span><strong>{contactName(contact)}</strong><small>{relativeTime(conversation.last_message_at)}</small></span>
              <span>{conversation.preview || "Conversation started"}</span>
              <span className="v2-inbox-badges">
                {conversation.ai_enabled ? <StatusPill tone="info">AI</StatusPill> : null}
                {contact?.dnc ? <StatusPill tone="danger">DNC</StatusPill> : null}
              </span>
            </span>
            {conversation.unread > 0 ? <b>{conversation.unread > 9 ? "9+" : conversation.unread}</b> : null}
          </div>
        );
      })}
    </div>
  );
});

const Thread = memo(function Thread({ messages, loading, hasOlder, onOlder }: { messages: Message[]; loading: boolean; hasOlder: boolean; onOlder: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  return (
    <div className="v2-thread">
      {hasOlder ? <button className="v2-load-older" onClick={onOlder}>Load earlier messages</button> : null}
      {loading ? <div className="v2-thread-loading"><Loader2 size={18} className="v2-spin" /> Loading messages</div> : null}
      {!loading && messages.length === 0 ? <EmptyState title="No messages yet" description="Start this conversation with a personal message." /> : null}
      {messages.map((message) => (
        <div key={message.id} className={`v2-message-row ${message.direction === "outbound" ? "is-outbound" : "is-inbound"}`}>
          <div>
            <p>{message.body}</p>
            <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{message.direction === "outbound" ? ` · ${message.status}` : ""}</span>
          </div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
});

function MessageComposer({ disabled, firstName, onSend }: { disabled: boolean; firstName: string; onSend: (body: string) => Promise<boolean> }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sanitized = sanitizeForSms(body);
  const unicode = hasNonGsmChars(sanitized);
  const segments = body ? countSegments(sanitized) : 0;
  const send = async () => {
    if (!body.trim() || disabled || sending) return;
    if (unicode) { setError("Remove emojis or special characters before sending."); return; }
    setSending(true); setError("");
    const sent = await onSend(sanitized.trim()).catch((reason) => { setError(reason instanceof Error ? reason.message : "Message failed."); return false; });
    if (sent) setBody("");
    setSending(false);
  };
  return (
    <div className="v2-composer">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }}
        placeholder={`Message ${firstName || "this contact"}…`}
        disabled={disabled}
      />
      <div>
        <span className={unicode ? "is-error" : ""}>{body.length ? `${sanitized.length} characters · ${segments} segment${segments === 1 ? "" : "s"}` : "Enter to send · Shift+Enter for a new line"}</span>
        <button onClick={send} disabled={disabled || sending || !body.trim()}>{sending ? <Loader2 className="v2-spin" size={17} /> : <Send size={17} />} Send</button>
      </div>
      {error ? <p>{error}</p> : null}
    </div>
  );
}

export default function ConversationsWorkspace({ profile, onProfile, onNavigate }: WorkspaceViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Map<string, Contact>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [messagePage, setMessagePage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [campaignChoices, setCampaignChoices] = useState<Campaign[]>([]);
  const [campaignChoiceId, setCampaignChoiceId] = useState("");
  const [campaignPickerLoading, setCampaignPickerLoading] = useState(false);
  const [campaignPickerSaving, setCampaignPickerSaving] = useState(false);
  const [campaignPickerError, setCampaignPickerError] = useState("");
  const [campaignTargetIds, setCampaignTargetIds] = useState<string[]>([]);
  const [bulkNotice, setBulkNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [contactRailOpen, setContactRailOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const selected = conversations.find((item) => item.id === selectedId);
  const selectedContact = selected ? contacts.get(selected.contact_id) : undefined;
  const aiAccess = !!profile.ai_plan || !!profile.free_ai_plan;

  const loadPage = useCallback(async (nextPage = page) => {
    setLoading(true); setError("");
    try {
      const result = await fetchConversationsPage(profile.id, { page: nextPage, pageSize: 50 });
      const contactIds = Array.from(new Set(result.rows.map((item) => item.contact_id).filter(Boolean)));
      const nextContacts = new Map<string, Contact>();
      if (contactIds.length) {
        const { data, error: contactsError } = await supabase
          .from("contacts")
          .select("id,user_id,first_name,last_name,phone,email,city,state,tags,notes,dnc,campaign,address,zip,lead_source,quote,policy_id,timeline,household_size,date_of_birth,age,created_at")
          .eq("user_id", profile.id)
          .in("id", contactIds);
        if (contactsError) throw contactsError;
        for (const contact of (data || []) as Contact[]) nextContacts.set(contact.id, contact);
      }
      setConversations(result.rows);
      setContacts(nextContacts);
      setTotal(result.total);
      setPage(nextPage);
      if (!result.rows.some((item) => item.id === selectedId)) setSelectedId(result.rows[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load conversations.");
    } finally { setLoading(false); }
  }, [page, profile.id, selectedId]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`t2s_archived_convs_${profile.id}`);
      if (stored) setArchived(new Set(JSON.parse(stored)));
    } catch {}
    loadPage(0);
  // only reload when the signed-in account changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  useEffect(() => {
    try { window.localStorage.setItem(`t2s_archived_convs_${profile.id}`, JSON.stringify([...archived])); } catch {}
  }, [archived, profile.id]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setQuoteIndex((current) => (current + 1) % SALES_QUOTES.length),
      8_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const loadThread = useCallback(async (conversationId: string, nextPage = 0) => {
    if (!conversationId) { setMessages([]); return; }
    setThreadLoading(true);
    try {
      const result = await fetchMessagesPage(conversationId, { page: nextPage, pageSize: 80 });
      setMessages((current) => nextPage === 0 ? result.rows : [...result.rows, ...current]);
      setMessagePage(nextPage);
      setHasOlder(result.hasMore);
      if (nextPage === 0) {
        await updateConversation(conversationId, { unread: 0 });
        setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unread: 0 } : item));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this message thread.");
    } finally { setThreadLoading(false); }
  }, []);

  useEffect(() => { loadThread(selectedId, 0); }, [loadThread, selectedId]);

  useEffect(() => {
    const channel = supabase
      .channel(`workspace-thread-${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as Message;
        if (message.conversation_id === selectedId) {
          setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        }
        setConversations((current) => current.map((item) => item.id === message.conversation_id ? { ...item, preview: message.body, last_message_at: message.created_at } : item));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, selectedId]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const contact = contacts.get(conversation.contact_id);
      const isArchived = archived.has(conversation.id) || !!contact?.dnc;
      if (filter === "archived" ? !isArchived : isArchived) return false;
      if (filter === "unread" && conversation.unread < 1) return false;
      if (filter === "ai" && !conversation.ai_enabled) return false;
      if (!needle) return true;
      return `${contactName(contact)} ${contact?.phone || ""} ${conversation.preview || ""}`.toLowerCase().includes(needle);
    });
  }, [archived, contacts, conversations, filter, search]);

  const sendMessage = useCallback(async (body: string) => {
    if (!selected || !selectedContact) return false;
    const from = selected.from_number || profile.owned_numbers?.[0]?.number;
    if (!from) throw new Error("Buy or connect a sending number before messaging.");
    const response = await authFetch("/api/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: selectedContact.phone, from, body, conversationId: selected.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Message failed.");
    const sentBody = typeof result.body === "string" ? result.body : body;
    const inserted = await insertMessage({ conversation_id: selected.id, direction: "outbound", body: sentBody, status: "sent", from_number: from });
    const now = new Date().toISOString();
    if (inserted) setMessages((current) => current.some((item) => item.id === inserted.id) ? current : [...current, inserted]);
    await updateConversation(selected.id, { preview: sentBody, last_message_at: now, unread: 0 });
    setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, preview: sentBody, last_message_at: now, unread: 0 } : item));
    return true;
  }, [profile.owned_numbers, selected, selectedContact]);

  const toggleAi = async () => {
    if (!aiAccess) { onNavigate("settings", "upgrade"); return; }
    if (!selected) return;
    const next = !selected.ai_enabled;
    await updateConversation(selected.id, { ai_enabled: next });
    setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, ai_enabled: next } : item));
  };

  const toggleGlobalAi = async () => {
    if (!aiAccess) { onNavigate("settings", "upgrade"); return; }
    const next = !profile.ai_auto_reply;
    const { data, error: updateError } = await supabase.from("profiles").update({ ai_auto_reply: next }).eq("id", profile.id).select().single();
    if (updateError) { setError(updateError.message); return; }
    onProfile(data as typeof profile);
  };

  const archiveChecked = () => {
    const archivedIds = new Set(checked);
    const restoring = filter === "archived";
    setArchived((current) => {
      const next = new Set(current);
      for (const id of checked) {
        if (restoring) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    if (!restoring && archivedIds.has(selectedId)) {
      setSelectedId(visible.find((conversation) => !archivedIds.has(conversation.id))?.id || "");
    }
    setChecked(new Set()); setSelectMode(false);
  };

  const archiveConversation = (conversationId: string) => {
    setArchived((current) => new Set(current).add(conversationId));
    if (conversationId === selectedId) {
      setSelectedId(
        visible.find((conversation) => conversation.id !== conversationId)?.id || "",
      );
    }
    setContactRailOpen(false);
    setBulkNotice({ tone: "ok", text: "Conversation archived. You can restore it from Archived." });
  };

  const openLeadInDialer = () => {
    if (!selected || !selectedContact) return;
    window.sessionStorage.setItem(
      "t2s_call_lead",
      JSON.stringify({ contactId: selectedContact.id, phone: selectedContact.phone }),
    );
    onNavigate("calls");
  };

  const deleteChecked = async () => {
    if (!checked.size || !window.confirm(`Delete ${checked.size} conversation${checked.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    const ids = [...checked];
    await supabase.from("messages").delete().in("conversation_id", ids);
    const { error: deleteError } = await supabase.from("conversations").delete().eq("user_id", profile.id).in("id", ids);
    if (deleteError) { setError(deleteError.message); return; }
    setConversations((current) => current.filter((item) => !checked.has(item.id)));
    setSelectedId(""); setChecked(new Set()); setSelectMode(false);
  };

  const openCampaignPicker = async (conversationIds: string[]) => {
    if (!conversationIds.length) return;
    setCampaignTargetIds(conversationIds);
    setCampaignPickerOpen(true);
    setCampaignPickerLoading(true);
    setCampaignPickerError("");
    try {
      const available = (await fetchCampaigns(profile.id)).filter(
        (campaign) => campaign.status !== "Completed",
      );
      setCampaignChoices(available);
      setCampaignChoiceId(available[0]?.id || "");
    } catch (reason) {
      setCampaignPickerError(reason instanceof Error ? reason.message : "Campaigns could not be loaded.");
    } finally {
      setCampaignPickerLoading(false);
    }
  };

  const assignCheckedToCampaign = async () => {
    if (!campaignChoiceId || !campaignTargetIds.length || campaignPickerSaving) return;
    const targetSet = new Set(campaignTargetIds);
    const contactIds = conversations
      .filter((conversation) => targetSet.has(conversation.id))
      .map((conversation) => conversation.contact_id);
    setCampaignPickerSaving(true);
    setCampaignPickerError("");
    const response = await authFetch("/api/campaigns/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaignChoiceId, contactIds }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      warning?: string;
      message?: string;
      campaign?: string;
    };
    setCampaignPickerSaving(false);
    if (!response.ok) {
      setCampaignPickerError(result.error || "The selected leads could not be added.");
      return;
    }
    if (result.campaign) {
      const selectedContactIds = new Set(contactIds);
      setContacts((current) => {
        const next = new Map(current);
        for (const [id, contact] of next) {
          if (selectedContactIds.has(id)) next.set(id, { ...contact, campaign: result.campaign! });
        }
        return next;
      });
    }
    setBulkNotice({
      tone: "ok",
      text: [result.message, result.warning].filter(Boolean).join(" ") || "Selected leads added to the campaign.",
    });
    setChecked(new Set());
    setSelectMode(false);
    setCampaignTargetIds([]);
    setCampaignPickerOpen(false);
  };

  const chosenCampaign = campaignChoices.find((campaign) => campaign.id === campaignChoiceId);

  return (
    <div className="v2-conversations">
      <PageHeader
        eyebrow="Workspace / Conversations"
        title={SALES_QUOTES[quoteIndex]}
        description="Handle replies, turn AI on when you need it, and move leads into the right follow-up."
        actions={
          <>
            <label className="v2-global-ai"><span><Bot size={16} /> {aiAccess ? "AI handles all replies" : "Unlock AI replies"}</span><input type="checkbox" checked={aiAccess && !!profile.ai_auto_reply} onChange={toggleGlobalAi} /><i /></label>
            <button className="v2-btn v2-btn-primary" onClick={() => onNavigate("contacts")}>New message</button>
          </>
        }
      />
      {error ? <div className="v2-inline-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div> : null}
      {bulkNotice ? <div className={`v2-notice is-${bulkNotice.tone}`}>{bulkNotice.text}<button onClick={() => setBulkNotice(null)}><X size={15} /></button></div> : null}
      <Panel className={`v2-inbox-shell ${contactRailOpen && selectedContact ? "is-contact-open" : ""}`}>
        <aside className="v2-inbox-sidebar">
          <div className="v2-inbox-sidebar-heading">
            <div><span>Conversations</span><small>{visible.length} shown</small></div>
            <button onClick={() => onNavigate("learn")} title="Open inbox tutorials">Learn</button>
          </div>
          <div className="v2-inbox-toolbar">
            <button className="v2-inbox-select" onClick={() => { setSelectMode((value) => !value); setChecked(new Set()); }}>{selectMode ? "Done" : "Select"}</button>
            <div className="v2-inbox-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></div>
          </div>
          <div className="v2-inbox-filters">
            {(["inbox", "unread", "ai", "archived"] as InboxFilter[]).map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item === "ai" ? "AI handled" : item[0].toUpperCase() + item.slice(1)}</button>)}
          </div>
          {selectMode && checked.size > 0 ? (
            <div className="v2-bulk-actions">
              <strong>{checked.size} selected</strong>
              <button onClick={() => setChecked(new Set(visible.map((conversation) => conversation.id)))}><Check size={14} /> Select page</button>
              <button
                title="Add the selected leads to a campaign"
                onClick={() => void openCampaignPicker([...checked])}
              >
                <Megaphone size={14} /> Add to campaign
              </button>
              <button onClick={archiveChecked}><Archive size={14} /> {filter === "archived" ? "Restore" : "Archive"}</button>
              <button className="is-danger" onClick={deleteChecked}><Trash2 size={14} /> Delete</button>
            </div>
          ) : null}
          {loading ? <div className="v2-thread-loading"><Loader2 size={17} className="v2-spin" /> Loading inbox</div> : null}
          {!loading && visible.length === 0 ? <EmptyState title="Nothing here" description={filter === "archived" ? "Archived conversations will stay available here." : "New replies will appear here as soon as they arrive."} /> : null}
          <ConversationList conversations={visible} contacts={contacts} selectedId={selectedId} checked={checked} selectMode={selectMode} onOpen={(id) => { setSelectedId(id); setContactRailOpen(false); }} onCheck={(id) => { setSelectMode(true); setChecked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }} />
          <div className="v2-page-controls">
            <button disabled={page === 0} onClick={() => loadPage(page - 1)}><ChevronLeft size={15} /></button>
            <span>{total ? `${page * 50 + 1}–${Math.min(total, (page + 1) * 50)} of ${total}` : "0 conversations"}</span>
            <button disabled={(page + 1) * 50 >= total} onClick={() => loadPage(page + 1)}><ChevronRight size={15} /></button>
          </div>
        </aside>

        <section className="v2-thread-pane">
          {selected && selectedContact ? (
            <>
              <header className="v2-thread-head">
                <div className="v2-thread-person"><span className="v2-avatar">{initials(selectedContact)}</span><span><strong>{contactName(selectedContact)}</strong><small>{selectedContact.phone}{selectedContact.city ? ` · ${selectedContact.city}, ${selectedContact.state} ${selectedContact.zip || ""}` : ""}</small></span></div>
                <div className="v2-thread-actions">
                  <button className="v2-thread-quick" title="Archive conversation" onClick={() => archiveConversation(selected.id)}><Archive size={15} /><span>Archive</span></button>
                  <button className="v2-thread-quick" title={`Call ${contactName(selectedContact)}`} onClick={openLeadInDialer}><PhoneCall size={15} /><span>Call</span></button>
                  <button className="v2-thread-quick" title="Add this lead to a campaign" onClick={() => void openCampaignPicker([selected.id])}><Megaphone size={15} /><span>Add to campaign</span></button>
                  <label className="v2-ai-switch"><span><Bot size={15} /> {aiAccess ? `AI ${selected.ai_enabled ? "on" : "off"}` : "Unlock AI"}</span><input type="checkbox" checked={aiAccess && !!selected.ai_enabled} onChange={toggleAi} /><i /></label>
                  <button className={contactRailOpen ? "is-active" : ""} aria-label={contactRailOpen ? "Hide contact details" : "Show contact details"} aria-expanded={contactRailOpen} aria-controls="conversation-contact-details" onClick={() => setContactRailOpen((open) => !open)}><MoreHorizontal size={18} /></button>
                </div>
              </header>
              <Thread messages={messages} loading={threadLoading} hasOlder={hasOlder} onOlder={() => loadThread(selected.id, messagePage + 1)} />
              <MessageComposer disabled={!!selectedContact.dnc} firstName={selectedContact.first_name} onSend={sendMessage} />
              {selectedContact.dnc ? <div className="v2-dnc-notice">This contact opted out. Sending is disabled.</div> : null}
            </>
          ) : (
            <EmptyState title="Choose a conversation" description="Open a lead from the inbox to see their history and continue the conversation." action={<MessageSquare size={22} />} />
          )}
        </section>

        {contactRailOpen && selectedContact ? <aside className="v2-contact-rail" id="conversation-contact-details">
          {selectedContact ? (
            <>
              <button className="v2-contact-rail-close" aria-label="Close contact details" onClick={() => setContactRailOpen(false)}><X size={17} /></button>
              <div className="v2-contact-hero"><span className="v2-avatar">{initials(selectedContact)}</span><strong>{contactName(selectedContact)}</strong><small>{selectedContact.phone}</small></div>
              <dl>
                <div><dt>Location</dt><dd>{[selectedContact.city, selectedContact.state, selectedContact.zip].filter(Boolean).join(", ") || "Not provided"}</dd></div>
                <div><dt>Lead source</dt><dd>{selectedContact.lead_source || "Not provided"}</dd></div>
                <div><dt>Campaign</dt><dd>{selectedContact.campaign || "Unassigned"}</dd></div>
                <div><dt>Status</dt><dd>{selectedContact.dnc ? "Do not contact" : selected?.ai_enabled ? "AI assisting" : "Active lead"}</dd></div>
              </dl>
              <button className="v2-btn" onClick={() => onNavigate("contacts")}>View full contact</button>
              <button className="v2-btn" onClick={() => onNavigate("calls")}><UserRound size={15} /> Add to call queue</button>
            </>
          ) : null}
        </aside> : null}
      </Panel>
      {campaignPickerOpen ? (
        <div className="v2-modal-backdrop" onMouseDown={() => { if (!campaignPickerSaving) { setCampaignPickerOpen(false); setCampaignTargetIds([]); } }}>
          <div className="v2-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>{campaignTargetIds.length === 1 ? "Quick action" : "Bulk action"}</span><h2 id="campaign-picker-title">Add {campaignTargetIds.length} lead{campaignTargetIds.length === 1 ? "" : "s"} to a campaign</h2></div>
              <button aria-label="Close campaign picker" disabled={campaignPickerSaving} onClick={() => { setCampaignPickerOpen(false); setCampaignTargetIds([]); }}><X size={18} /></button>
            </header>
            <div className="v2-modal-form v2-campaign-picker-form">
              <label>Choose an active campaign
                <select autoFocus value={campaignChoiceId} disabled={campaignPickerLoading || campaignPickerSaving} onChange={(event) => { setCampaignChoiceId(event.target.value); setCampaignPickerError(""); }}>
                  <option value="">Select a campaign</option>
                  {campaignChoices.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} — {campaign.status}</option>)}
                </select>
              </label>
              {campaignPickerLoading ? <div className="v2-campaign-picker-state"><Loader2 className="v2-spin" size={17} /> Loading campaigns</div> : null}
              {!campaignPickerLoading && !campaignChoices.length ? <EmptyState title="No active campaigns" description="Create a campaign first, then return here to add the selected leads." /> : null}
              {chosenCampaign ? (
                <div className="v2-campaign-picker-summary">
                  <span><Megaphone size={17} /></span>
                  <div><strong>{chosenCampaign.name}</strong><small>{chosenCampaign.steps?.length || 1} message step{(chosenCampaign.steps?.length || 1) === 1 ? "" : "s"} · {chosenCampaign.status === "Draft" ? "Starts when launched" : chosenCampaign.status === "Paused" ? "Queues until resumed" : "Flow starts automatically"}</small></div>
                  <StatusPill tone={campaignStatusTone(chosenCampaign.status)}>{chosenCampaign.status}</StatusPill>
                </div>
              ) : null}
              {campaignPickerError ? <p className="v2-campaign-picker-error">{campaignPickerError}</p> : null}
            </div>
            <footer>
              <button className="v2-btn" disabled={campaignPickerSaving} onClick={() => { setCampaignPickerOpen(false); setCampaignTargetIds([]); }}>Cancel</button>
              <button className="v2-btn v2-btn-primary" disabled={!campaignChoiceId || campaignPickerLoading || campaignPickerSaving} onClick={assignCheckedToCampaign}>{campaignPickerSaving ? <Loader2 className="v2-spin" size={15} /> : <Check size={15} />} {campaignPickerSaving ? "Adding…" : "Add leads"}</button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
