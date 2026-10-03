"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, MessageSquare, Phone, Sparkles, Users } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";
import type { Campaign, Contact, Conversation } from "@/lib/types";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";

type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: string;
  contacts?: { first_name?: string; last_name?: string } | null;
};

type Snapshot = {
  contacts: number;
  conversations: number;
  unread: number;
  campaigns: number;
  sent: number;
  replies: number;
  recentConversations: Conversation[];
  recentCampaigns: Campaign[];
  contactMap: Map<string, Contact>;
  appointments: Appointment[];
};

const EMPTY: Snapshot = {
  contacts: 0,
  conversations: 0,
  unread: 0,
  campaigns: 0,
  sent: 0,
  replies: 0,
  recentConversations: [],
  recentCampaigns: [],
  contactMap: new Map(),
  appointments: [],
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function relativeTime(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function OverviewWorkspace({ profile, onNavigate }: WorkspaceViewProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [contactCount, conversationCount, campaignsResult, recentConversations, appointmentResponse] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
        supabase.from("campaigns").select("id,user_id,name,audience,sent,replies,failed,status,message,steps,selected_numbers,logs,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(12),
        supabase.from("conversations").select("id,user_id,contact_id,preview,unread,last_message_at,starred,created_at,from_number,ai_enabled,agent_enabled,ai_skipped_reason").eq("user_id", profile.id).order("last_message_at", { ascending: false }).limit(6),
        authFetch(`/api/appointments?userId=${profile.id}`).then((response) => response.ok ? response.json() : null).catch(() => null),
      ]);

      const convs = (recentConversations.data || []) as Conversation[];
      const contactIds = Array.from(new Set(convs.map((item) => item.contact_id).filter(Boolean)));
      const contactMap = new Map<string, Contact>();
      if (contactIds.length) {
        const { data } = await supabase
          .from("contacts")
          .select("id,user_id,first_name,last_name,phone,email,city,state,tags,notes,dnc,campaign,address,zip,lead_source,quote,policy_id,timeline,household_size,date_of_birth,age,created_at")
          .eq("user_id", profile.id)
          .in("id", contactIds);
        for (const contact of (data || []) as Contact[]) contactMap.set(contact.id, contact);
      }

      const campaigns = (campaignsResult.data || []) as Campaign[];
      setSnapshot({
        contacts: contactCount.count || 0,
        conversations: conversationCount.count || 0,
        unread: convs.reduce((sum, item) => sum + Number(item.unread || 0), 0),
        campaigns: campaigns.length,
        sent: campaigns.reduce((sum, item) => sum + Number(item.sent || 0), 0),
        replies: campaigns.reduce((sum, item) => sum + Number(item.replies || 0), 0),
        recentConversations: convs,
        recentCampaigns: campaigns.slice(0, 4),
        contactMap,
        appointments: (appointmentResponse?.appointments || []).slice(0, 4),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this overview.");
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = profile.first_name || "there";
  const responseRate = snapshot.sent > 0 ? (snapshot.replies / snapshot.sent) * 100 : 0;
  const cards = useMemo(
    () => [
      { label: "Contacts", value: compactNumber(snapshot.contacts), note: "Ready for follow-up", icon: Users },
      { label: "Conversations", value: compactNumber(snapshot.conversations), note: `${snapshot.unread} unread`, icon: MessageSquare },
      { label: "Messages sent", value: compactNumber(snapshot.sent), note: `${responseRate.toFixed(1)}% reply rate`, icon: CheckCircle2 },
      { label: "Available balance", value: `$${Number(profile.wallet_balance || 0).toFixed(2)}`, note: "Messaging wallet", icon: Sparkles },
    ],
    [profile.wallet_balance, responseRate, snapshot],
  );

  return (
    <div className="v2-overview">
      <PageHeader
        eyebrow="Workspace overview"
        title={`Welcome back, ${firstName}.`}
        description="Here is the next best place to spend your attention."
        actions={
          <>
            <button className="v2-btn" onClick={() => onNavigate("contacts")}>Import leads</button>
            <button className="v2-btn v2-btn-primary" onClick={() => onNavigate("conversations")}>New message <ArrowRight size={16} /></button>
          </>
        }
      />

      {error ? <div className="v2-inline-error">{error} <button onClick={load}>Retry</button></div> : null}

      <section className="v2-metric-grid" aria-busy={loading}>
        {cards.map((card) => (
          <Panel key={card.label} className="v2-metric-card">
            <span className="v2-metric-icon"><card.icon size={18} /></span>
            <p>{card.label}</p>
            <strong>{loading ? "—" : card.value}</strong>
            <small>{card.note}</small>
          </Panel>
        ))}
      </section>

      <section className="v2-overview-grid">
        <Panel className="v2-overview-conversations">
          <div className="v2-panel-head">
            <div><h2>Your conversations</h2><p>Recent replies and leads waiting on you.</p></div>
            <button className="v2-text-button" onClick={() => onNavigate("conversations")}>Open inbox <ArrowRight size={14} /></button>
          </div>
          {snapshot.recentConversations.length === 0 && !loading ? (
            <EmptyState title="No conversations yet" description="Import opted-in leads and start a campaign to bring your inbox to life." />
          ) : (
            <div className="v2-conversation-preview-list">
              {snapshot.recentConversations.map((conversation) => {
                const contact = snapshot.contactMap.get(conversation.contact_id);
                const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.phone || "New lead";
                return (
                  <button key={conversation.id} onClick={() => onNavigate("conversations")}>
                    <span className="v2-avatar">{name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                    <span className="v2-preview-copy"><strong>{name}</strong><small>{conversation.preview || "Conversation started"}</small></span>
                    <span className="v2-preview-meta">{conversation.ai_enabled ? <StatusPill tone="info">AI on</StatusPill> : null}<small>{relativeTime(conversation.last_message_at)}</small></span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="v2-overview-stack">
          <Panel className="v2-next-step-card">
            <div className="v2-next-step-icon"><Sparkles size={20} /></div>
            <p>YOUR AI ASSISTANT</p>
            <h2>A helping hand. Always ready.</h2>
            <span>Train the assistant on your scripts and let it qualify, follow up, and book appointments.</span>
            <button className="v2-btn v2-btn-accent" onClick={() => onNavigate("settings", "ai")}>Train your assistant</button>
          </Panel>
          <Panel>
            <div className="v2-panel-head"><div><h3>Coming up</h3><p>Your next scheduled conversations.</p></div><CalendarDays size={18} /></div>
            {snapshot.appointments.length ? (
              <div className="v2-appointment-list">
                {snapshot.appointments.map((appointment) => (
                  <button key={appointment.id} onClick={() => onNavigate("appointments")}>
                    <span><strong>{appointment.title || "Appointment"}</strong><small>{[appointment.contacts?.first_name, appointment.contacts?.last_name].filter(Boolean).join(" ")}</small></span>
                    <span><strong>{appointment.time?.slice(0, 5)}</strong><small>{appointment.date}</small></span>
                  </button>
                ))}
              </div>
            ) : <EmptyState title="Your calendar is clear" description="Appointments booked by you or your assistant will appear here." />}
          </Panel>
        </div>
      </section>

      <section className="v2-lower-grid">
        <Panel>
          <div className="v2-panel-head"><div><h3>Campaign pulse</h3><p>Your most recent follow-up workflows.</p></div><button className="v2-text-button" onClick={() => onNavigate("campaigns")}>Manage campaigns</button></div>
          <div className="v2-campaign-pulse">
            {snapshot.recentCampaigns.map((campaign) => (
              <button key={campaign.id} onClick={() => onNavigate("campaigns")}>
                <span><strong>{campaign.name}</strong><small>{campaign.sent} sent · {campaign.replies} replies</small></span>
                <StatusPill tone={campaign.status === "Completed" ? "success" : campaign.status === "Paused" ? "warning" : "info"}>{campaign.status}</StatusPill>
              </button>
            ))}
            {!snapshot.recentCampaigns.length && !loading ? <EmptyState title="Build your first campaign" description="Send one message or create a complete follow-up sequence." action={<button className="v2-btn v2-btn-primary" onClick={() => onNavigate("campaigns")}>Create campaign</button>} /> : null}
          </div>
        </Panel>
        <Panel className="v2-call-card">
          <span><Phone size={22} /></span>
          <p>POWER CALLING</p>
          <h3>Turn your next list into a focused call session.</h3>
          <button className="v2-btn" onClick={() => onNavigate("calls")}>Open calling workspace</button>
        </Panel>
      </section>
    </div>
  );
}
