"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, MessageSquare, Phone, Sparkles, Users } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";
import type { Campaign, Contact, Conversation } from "@/lib/types";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";
import { canCall, canText, planKeyOf } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";

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
      { label: "Leads", value: compactNumber(snapshot.contacts), note: "In your CRM", icon: Users },
      { label: "Conversations", value: compactNumber(snapshot.conversations), note: `${snapshot.unread} unread`, icon: MessageSquare },
      { label: "Messages sent", value: compactNumber(snapshot.sent), note: `${responseRate.toFixed(1)}% reply rate`, icon: CheckCircle2 },
      { label: "Available balance", value: `$${Number(profile.wallet_balance || 0).toFixed(2)}`, note: "Messaging wallet", icon: Sparkles },
    ],
    [profile.wallet_balance, responseRate, snapshot],
  );

  return (
    <div className="v2-overview">
      <PageHeader
        eyebrow="Sales command center"
        title={`Good to see you, ${firstName}.`}
        description="Your leads, conversations, and appointments in one place."
        actions={
          <>
            <button className="v2-btn" onClick={() => onNavigate("upload")}>Import leads</button>
            <button className="v2-btn v2-btn-primary" onClick={() => onNavigate(canCall(profile) ? "calls" : "contacts")}>{canCall(profile) ? "Open dialer" : "View leads"} <ArrowRight size={16} /></button>
          </>
        }
      />

      <SetupChecklist profile={profile} onNavigate={onNavigate} />

      <section className="emerald-overview-actions" aria-label="Quick actions">
        <button onClick={() => onNavigate("contacts")}><Users size={21} /><span><strong>Your leads</strong><small>Find your next opportunity</small></span><ArrowRight size={16} /></button>
        {canText(profile) ? <>
          <button onClick={() => onNavigate("conversations")}><MessageSquare size={21} /><span><strong>Follow up</strong><small>Keep the conversation going</small></span><ArrowRight size={16} /></button>
          <button onClick={() => onNavigate("campaigns")}><Sparkles size={21} /><span><strong>Automate outreach</strong><small>Build a campaign that works for you</small></span><ArrowRight size={16} /></button>
        </> : <>
          <button onClick={() => onNavigate("calls")}><Phone size={21} /><span><strong>Start dialing</strong><small>Work a list with the predictive dialer</small></span><ArrowRight size={16} /></button>
          <button onClick={() => onNavigate("aicalls")}><Sparkles size={21} /><span><strong>AI receptionist</strong><small>Answer callbacks while you dial</small></span><ArrowRight size={16} /></button>
        </>}
      </section>

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
        {canCall(profile) ? (
          <Panel className="v2-call-card">
            <span><Phone size={22} /></span>
            <p>POWER CALLING</p>
            <h3>Turn your next list into a focused call session.</h3>
            <button className="v2-btn" onClick={() => onNavigate("calls")}>Open calling workspace</button>
          </Panel>
        ) : null}
      </section>
    </div>
  );
}

type SetupStep = { label: string; detail: string; done: boolean; go: () => void };

/**
 * Plan-specific setup steps. Dialer accounts need a voice number, a working
 * microphone and funds, and never the texting (10DLC) registration; texting
 * plans register first. Complete shows both, and calling works while the
 * texting registration is still in review.
 */
function SetupChecklist({ profile, onNavigate }: Pick<WorkspaceViewProps, "profile" | "onNavigate">) {
  const plan = planKeyOf(profile);
  const hasNumber = (profile.owned_numbers?.length || 0) > 0;
  const funded = Number(profile.wallet_balance || 0) > 0;
  const textingLive = profile.messaging_status === "ACTIVE";
  const steps: SetupStep[] = [];
  if (PLANS[plan].capabilities.includes("texting")) {
    steps.push({ label: "Register your business for texting", detail: "EIN and business details for carrier (10DLC) approval. Registration fees apply.", done: textingLive, go: () => onNavigate("settings", "10dlc") });
  }
  steps.push({ label: "Get a phone number", detail: plan === "dialer" ? "A local number to call from. No texting registration needed." : "A local number for calls and texts.", done: hasNumber, go: () => onNavigate("settings", "numbers") });
  steps.push({ label: "Add funds to your wallet", detail: "Calls, texts and AI minutes are paid from your prepaid wallet.", done: funded, go: () => onNavigate("settings", "billing") });
  steps.push({ label: "Import your leads", detail: "Upload a CSV. Phone numbers are found in any column.", done: false, go: () => onNavigate("upload") });
  if (PLANS[plan].capabilities.includes("calling")) {
    steps.push({ label: "Test your microphone and make a first call", detail: "Open the dialer, allow the microphone, and call your own cell.", done: false, go: () => onNavigate("calls") });
    steps.push({ label: "Set up the AI receptionist", detail: "Answers callbacks while you're on the phone. Billed per minute.", done: !!(profile as { ai_call_enabled?: boolean }).ai_call_enabled, go: () => onNavigate("aicalls") });
  }
  if (PLANS[plan].capabilities.includes("texting")) {
    steps.push({ label: "Send your first campaign", detail: plan === "complete" ? "Available once texting registration is approved. You can call meanwhile." : "Available once texting registration is approved.", done: false, go: () => onNavigate("campaigns") });
  }
  const required = steps.filter((step) => step.label.startsWith("Register") || step.label.startsWith("Get a phone") || step.label.startsWith("Add funds"));
  if (required.every((step) => step.done)) return null;
  return (
    <Panel className="v2-setup-checklist">
      <div className="v2-panel-head"><div><h2>Set up {PLANS[plan].name}</h2><p>A few steps before your first {plan === "text" ? "campaign" : "call"}.</p></div></div>
      <ol>
        {steps.map((step) => (
          <li key={step.label} className={step.done ? "is-done" : ""}>
            <button onClick={step.go}>
              <span>{step.done ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}</span>
              <span><strong>{step.label}</strong><small>{step.detail}</small></span>
            </button>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
