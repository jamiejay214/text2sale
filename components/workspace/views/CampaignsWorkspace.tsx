"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  GripVertical,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { WorkspaceViewProps } from "../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../WorkspacePrimitives";
import { authFetch } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";
import {
  deleteCampaign,
  fetchCampaigns,
  insertCampaign,
  updateCampaign,
} from "@/lib/supabase-data";
import type { Campaign, CampaignStep } from "@/lib/types";
import { normalizeOptOutSettings } from "@/lib/opt-out";

const TOKENS = ["{firstName}", "{lastName}", "{phone}", "{city}", "{state}"];

type Draft = {
  name: string;
  steps: CampaignStep[];
  selectedNumbers: string[];
  quietHours: "inherit" | "on" | "off";
};

const newStep = (delayMinutes = 60): CampaignStep => ({
  id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  message: "",
  delayMinutes,
});

const blankDraft = (): Draft => ({
  name: "",
  steps: [newStep(0)],
  selectedNumbers: [],
  quietHours: "inherit",
});

function campaignDraft(campaign: Campaign): Draft {
  return {
    name: campaign.name,
    steps:
      campaign.steps?.length > 0
        ? campaign.steps
        : [{ ...newStep(0), message: campaign.message || "" }],
    selectedNumbers: campaign.selected_numbers || [],
    quietHours:
      campaign.quiet_hours_enabled === null || campaign.quiet_hours_enabled === undefined
        ? "inherit"
        : campaign.quiet_hours_enabled
          ? "on"
          : "off",
  };
}

function statusTone(status: Campaign["status"]) {
  if (status === "Completed") return "success" as const;
  if (status === "Sending") return "info" as const;
  if (status === "Paused") return "warning" as const;
  return "neutral" as const;
}

function delayLabel(minutes: number) {
  if (minutes === 0) return "Immediately";
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minutes`;
}

function sequenceDuration(steps: CampaignStep[]) {
  const total = steps.reduce((sum, step) => sum + Number(step.delayMinutes || 0), 0);
  if (total === 0) return "Sends immediately";
  return `Runs over ${delayLabel(total).toLowerCase()}`;
}

export default function CampaignsWorkspace({ profile, onNavigate }: WorkspaceViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [activeStep, setActiveStep] = useState(0);
  const [audience, setAudience] = useState<"assigned" | "all">("assigned");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [pendingContactIds, setPendingContactIds] = useState<string[]>([]);
  const [assignOnCreate, setAssignOnCreate] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await fetchCampaigns(profile.id);
    setCampaigns(rows);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem("t2s_campaign_contact_ids") || "[]");
      if (Array.isArray(stored)) setPendingContactIds(stored.filter((id): id is string => typeof id === "string"));
      if (window.sessionStorage.getItem("t2s_campaign_create_for_selected") === "1") {
        setSelectedId(null);
        setDraft(blankDraft());
        setActiveStep(0);
        setAssignOnCreate(true);
        window.sessionStorage.removeItem("t2s_campaign_create_for_selected");
      }
    } catch {
      window.sessionStorage.removeItem("t2s_campaign_contact_ids");
      window.sessionStorage.removeItem("t2s_campaign_create_for_selected");
    }
  }, []);

  useEffect(() => {
    const requested = window.sessionStorage.getItem("t2s_campaign_id");
    if (requested && campaigns.some((campaign) => campaign.id === requested)) {
      const campaign = campaigns.find((item) => item.id === requested)!;
      setSelectedId(campaign.id);
      setDraft(campaignDraft(campaign));
      window.sessionStorage.removeItem("t2s_campaign_id");
    }
  }, [campaigns]);

  const selected = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) || null,
    [campaigns, selectedId],
  );
  const ownedNumbers = profile.owned_numbers || [];
  const validSteps = draft.steps.filter((step) => step.message.trim());
  const firstMessageOptOut = normalizeOptOutSettings(profile.opt_out_settings).firstMessageText;
  const allNumbersSelected = ownedNumbers.length > 0 && ownedNumbers.every((number) => draft.selectedNumbers.includes(number.number));

  const chooseCampaign = (campaign: Campaign) => {
    setSelectedId(campaign.id);
    setDraft(campaignDraft(campaign));
    setActiveStep(0);
    setAssignOnCreate(false);
    setNotice(null);
  };

  const startNew = () => {
    setSelectedId(null);
    setDraft(blankDraft());
    setActiveStep(0);
    setAssignOnCreate(pendingContactIds.length > 0);
    setNotice(null);
  };

  const patchStep = (index: number, updates: Partial<CampaignStep>) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...updates } : step,
      ),
    }));
  };

  const addStep = () => {
    setDraft((current) => ({ ...current, steps: [...current.steps, newStep(60)] }));
    setActiveStep(draft.steps.length);
  };

  const removeStep = (index: number) => {
    if (draft.steps.length === 1) return;
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }));
    setActiveStep((current) => Math.max(0, Math.min(current, draft.steps.length - 2)));
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setNotice({ tone: "error", text: "Give this campaign a clear name." });
      return;
    }
    if (!validSteps.length || validSteps.length !== draft.steps.length) {
      setNotice({ tone: "error", text: "Every workflow step needs a message." });
      return;
    }
    setSaving(true);
    setNotice(null);
    const quietHoursEnabled =
      draft.quietHours === "inherit" ? null : draft.quietHours === "on";
    const values = {
      name: draft.name.trim(),
      message: draft.steps[0].message.trim(),
      steps: draft.steps.map((step) => ({ ...step, message: step.message.trim() })),
      selected_numbers: draft.selectedNumbers,
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start_hour: draft.quietHours === "on" ? 21 : null,
      quiet_hours_end_hour: draft.quietHours === "on" ? 8 : null,
    };
    const result = selected
      ? await updateCampaign(selected.id, values)
      : await insertCampaign({
          user_id: profile.id,
          ...values,
          audience: 0,
          sent: 0,
          replies: 0,
          failed: 0,
          status: "Draft",
          logs: [],
        });
    setSaving(false);
    if (!result) {
      setNotice({ tone: "error", text: "The campaign could not be saved. Try again." });
      return;
    }
    setCampaigns((current) =>
      selected ? current.map((item) => (item.id === result.id ? result : item)) : [result, ...current],
    );
    setSelectedId(result.id);
    setDraft(campaignDraft(result));
    if (!selected && assignOnCreate && pendingContactIds.length) {
      const { error: assignmentError } = await supabase
        .from("contacts")
        .update({ campaign: result.name })
        .eq("user_id", profile.id)
        .in("id", pendingContactIds);
      if (assignmentError) {
        setNotice({ tone: "error", text: "The campaign was saved, but the selected leads could not be added. Use the assignment bar to try again." });
        return;
      }
      const count = pendingContactIds.length;
      window.sessionStorage.removeItem("t2s_campaign_contact_ids");
      setPendingContactIds([]);
      setAssignOnCreate(false);
      setNotice({ tone: "ok", text: `Campaign saved. ${count} selected lead${count === 1 ? " was" : "s were"} added.` });
      return;
    }
    setNotice({ tone: "ok", text: "Campaign and follow-up workflow saved." });
  };

  const launch = async () => {
    if (!selected) {
      setNotice({ tone: "error", text: "Save the campaign before launching it." });
      return;
    }
    if (!selected.selected_numbers?.length && !ownedNumbers.length) {
      setNotice({ tone: "error", text: "Add a sending number before launching." });
      return;
    }
    setLaunching(true);
    setNotice(null);
    try {
      const response = await authFetch("/api/campaigns/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selected.id,
          audience,
          resume: selected.status === "Paused",
        }),
      });
      const data = (await response.json()) as { error?: string; queued?: number; status?: Campaign["status"] };
      if (!response.ok) throw new Error(data.error || "Campaign could not be launched.");
      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === selected.id
            ? { ...campaign, status: data.status || "Sending" }
            : campaign,
        ),
      );
      setNotice({
        tone: "ok",
        text: `${Number(data.queued || 0).toLocaleString()} messages are queued. Follow-ups keep running in the background.`,
      });
    } catch (reason) {
      setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Campaign could not be launched." });
    } finally {
      setLaunching(false);
    }
  };

  const pause = async () => {
    if (!selected) return;
    const result = await updateCampaign(selected.id, { status: "Paused" });
    if (result) setCampaigns((current) => current.map((campaign) => (campaign.id === result.id ? result : campaign)));
  };

  const assignPendingContacts = async () => {
    if (!selected || !pendingContactIds.length) return;
    setNotice(null);
    const { error } = await supabase
      .from("contacts")
      .update({ campaign: selected.name })
      .eq("user_id", profile.id)
      .in("id", pendingContactIds);
    if (error) {
      setNotice({ tone: "error", text: "Those conversations could not be moved. Try again." });
      return;
    }
    const count = pendingContactIds.length;
    window.sessionStorage.removeItem("t2s_campaign_contact_ids");
    setPendingContactIds([]);
    setNotice({ tone: "ok", text: `${count} lead${count === 1 ? "" : "s"} assigned to ${selected.name}.` });
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete “${selected.name}”? Its campaign history will no longer appear here.`)) return;
    if (!(await deleteCampaign(selected.id))) {
      setNotice({ tone: "error", text: "The campaign could not be deleted." });
      return;
    }
    setCampaigns((current) => current.filter((campaign) => campaign.id !== selected.id));
    startNew();
  };

  const clone = () => {
    if (!selected) return;
    setSelectedId(null);
    setDraft({ ...campaignDraft(selected), name: `${selected.name} copy`, steps: selected.steps.map((step) => ({ ...step, id: newStep().id })) });
    setActiveStep(0);
  };

  const active = draft.steps[activeStep];
  return (
    <>
      <PageHeader
        eyebrow="Campaign studio"
        title="Build the whole follow-up in one place."
        description="One campaign can be a single text or a complete multi-step workflow with timing, spin text, and personalization."
        actions={
          <>
            <button className="v2-btn" onClick={() => onNavigate("upload")}><Users size={16} /> Import leads</button>
            <button className="v2-btn v2-btn-primary" onClick={startNew}><Plus size={16} /> New campaign</button>
          </>
        }
      />
      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {pendingContactIds.length > 0 && (
        <div className="v2-campaign-handoff">
          <span><Users size={17} /><strong>{pendingContactIds.length} selected lead{pendingContactIds.length === 1 ? "" : "s"}</strong> from Conversations</span>
          <span>{assignOnCreate ? `Create and save the campaign below. ${pendingContactIds.length === 1 ? "This lead will" : "These leads will"} be added automatically.` : selected ? `Ready to move into ${selected.name}.` : "Choose a campaign, then assign them together."}</span>
          {!assignOnCreate && <button className="v2-btn v2-btn-accent" disabled={!selected} onClick={assignPendingContacts}>Assign to campaign</button>}
          <button className="v2-icon-btn" aria-label="Cancel assignment" onClick={() => { window.sessionStorage.removeItem("t2s_campaign_contact_ids"); setPendingContactIds([]); setAssignOnCreate(false); }}><X size={15} /></button>
        </div>
      )}
      <div className="v2-campaign-layout">
        <Panel className="v2-campaign-library">
          <div className="v2-panel-head">
            <div><h2>Campaigns</h2><p>{campaigns.length} saved workflows</p></div>
            <button className="v2-icon-btn" aria-label="Create campaign" onClick={startNew}><Plus size={17} /></button>
          </div>
          {loading ? (
            <div className="v2-mini-loading"><span className="v2-spin">◌</span> Loading campaigns</div>
          ) : campaigns.length === 0 ? (
            <EmptyState title="Start your first campaign" description="Build a message sequence, then add leads from a CSV or your inbox." />
          ) : (
            <div className="v2-campaign-list">
              {campaigns.map((campaign) => (
                <button key={campaign.id} className={campaign.id === selectedId ? "is-active" : ""} onClick={() => chooseCampaign(campaign)}>
                  <span className="v2-campaign-list-icon"><MessageSquareText size={16} /></span>
                  <span><strong>{campaign.name}</strong><small>{campaign.steps?.length || 1} step{(campaign.steps?.length || 1) === 1 ? "" : "s"} · {campaign.audience || 0} leads</small></span>
                  <StatusPill tone={statusTone(campaign.status)}>{campaign.status}</StatusPill>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="v2-campaign-builder">
          <div className="v2-campaign-titlebar">
            <div>
              <label htmlFor="campaign-name">Campaign name</label>
              <input id="campaign-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. New lead — 7 day follow-up" />
            </div>
            <div className="v2-titlebar-actions">
              {selected && <button className="v2-icon-btn" title="Duplicate" onClick={clone}><Copy size={16} /></button>}
              {selected && <button className="v2-icon-btn is-danger" title="Delete" onClick={remove}><Trash2 size={16} /></button>}
              <button className="v2-btn v2-btn-primary" onClick={save} disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save campaign"}</button>
            </div>
          </div>

          <div className="v2-sequence-summary">
            <span><Sparkles size={15} /> {draft.steps.length}-step workflow</span>
            <span>{sequenceDuration(draft.steps)}</span>
            <span>{draft.selectedNumbers.length || ownedNumbers.length} sending number{(draft.selectedNumbers.length || ownedNumbers.length) === 1 ? "" : "s"}</span>
          </div>

          <div className="v2-workflow-canvas">
            {draft.steps.map((step, index) => (
              <div className="v2-workflow-node-wrap" key={step.id}>
                {index > 0 && (
                  <button className="v2-delay-node" onClick={() => setActiveStep(index)}>
                    <Clock3 size={14} /> Wait {delayLabel(step.delayMinutes)}
                  </button>
                )}
                <button className={`v2-message-node ${index === activeStep ? "is-active" : ""}`} onClick={() => setActiveStep(index)}>
                  <GripVertical size={15} />
                  <span className="v2-node-count">{index + 1}</span>
                  <span><strong>Send text message</strong><small>{step.message || "Write the message for this step"}</small></span>
                  {step.message ? <Check size={16} /> : <MoreHorizontal size={16} />}
                </button>
                {index < draft.steps.length - 1 && <span className="v2-workflow-line" />}
              </div>
            ))}
            <button className="v2-add-workflow-step" onClick={addStep}><Plus size={16} /> Add follow-up step</button>
          </div>
        </Panel>

        <Panel className="v2-step-editor">
          {active ? (
            <>
              <div className="v2-panel-head">
                <div><h2>Step {activeStep + 1}</h2><p>Text message</p></div>
                {draft.steps.length > 1 && <button className="v2-icon-btn is-danger" aria-label="Remove step" onClick={() => removeStep(activeStep)}><Trash2 size={16} /></button>}
              </div>
              <div className="v2-step-editor-body">
                {activeStep > 0 && (
                  <div className="v2-field">
                    <label>Wait before this step</label>
                    <div className="v2-delay-control">
                      <input type="number" min={0} value={active.delayMinutes} onChange={(event) => patchStep(activeStep, { delayMinutes: Math.max(0, Number(event.target.value)) })} />
                      <select value={active.delayMinutes % 1440 === 0 && active.delayMinutes > 0 ? "days" : active.delayMinutes % 60 === 0 ? "hours" : "minutes"} onChange={(event) => {
                        const unit = event.target.value;
                        const current = unit === "days" ? Math.max(1, Math.round(active.delayMinutes / 1440)) * 1440 : unit === "hours" ? Math.max(1, Math.round(active.delayMinutes / 60)) * 60 : Math.max(1, active.delayMinutes);
                        patchStep(activeStep, { delayMinutes: current });
                      }}><option value="minutes">minutes</option><option value="hours">hours</option><option value="days">days</option></select>
                    </div>
                    <div className="v2-delay-presets">
                      {[60, 1440, 4320, 10080].map((minutes) => <button key={minutes} onClick={() => patchStep(activeStep, { delayMinutes: minutes })}>{delayLabel(minutes)}</button>)}
                    </div>
                  </div>
                )}
                <div className="v2-field">
                  <label htmlFor="campaign-message">Message</label>
                  <textarea id="campaign-message" value={active.message} onChange={(event) => patchStep(activeStep, { message: event.target.value })} placeholder="Hi {firstName}, thanks for requesting information…" rows={8} />
                  <div className="v2-message-meta"><span>{active.message.length} characters</span><span>Personalize:</span></div>
                  <div className="v2-token-row">{TOKENS.map((token) => <button key={token} onClick={() => patchStep(activeStep, { message: `${active.message}${active.message && !active.message.endsWith(" ") ? " " : ""}${token}` })}>{token}</button>)}</div>
                </div>
                {activeStep === 0 ? <div className="v2-first-optout"><ShieldCheck size={16} /><div><strong>First-message opt-out</strong><p><b>{firstMessageOptOut}</b> is added automatically when this campaign starts. Follow-up steps do not repeat it.</p></div><button onClick={() => onNavigate("settings", "team")}>Edit</button></div> : null}
                <div className="v2-spin-help">
                  <Sparkles size={16} />
                  <div><strong>Spin text</strong><p>Use braces and pipes to rotate wording: <code>{"{Hi|Hey|Hello}"}</code>. Each lead receives one variation.</p></div>
                </div>
                <div className="v2-field">
                  <div className="v2-field-label-row"><label>Sending numbers</label>{ownedNumbers.length > 1 ? <button disabled={allNumbersSelected} onClick={() => setDraft((current) => ({ ...current, selectedNumbers: ownedNumbers.map((number) => number.number) }))}><Check size={13} /> {allNumbersSelected ? "All selected" : `Select all ${ownedNumbers.length}`}</button> : null}</div>
                  {ownedNumbers.length ? <div className="v2-number-picks">{ownedNumbers.map((number) => {
                    const checked = draft.selectedNumbers.includes(number.number);
                    return <button className={checked ? "is-active" : ""} key={number.id || number.number} onClick={() => setDraft((current) => ({ ...current, selectedNumbers: checked ? current.selectedNumbers.filter((item) => item !== number.number) : [...current.selectedNumbers, number.number] }))}><span>{checked ? <Check size={13} /> : null}</span>{number.alias || number.number}<small>{number.number}</small></button>;
                  })}</div> : <button className="v2-link-card" onClick={() => onNavigate("settings", "numbers")}>Get a business number <ArrowRight size={15} /></button>}
                </div>
                <div className="v2-field">
                  <label>Quiet hours</label>
                  <select value={draft.quietHours} onChange={(event) => setDraft((current) => ({ ...current, quietHours: event.target.value as Draft["quietHours"] }))}><option value="inherit">Use workspace setting</option><option value="on">Pause 9 PM–8 AM</option><option value="off">No campaign override</option></select>
                </div>
              </div>
            </>
          ) : null}
        </Panel>
      </div>

      {selected && (
        <Panel className="v2-launch-bar">
          <div><StatusPill tone={statusTone(selected.status)}>{selected.status}</StatusPill><span><strong>{selected.sent || 0}</strong> sent</span><span><strong>{selected.replies || 0}</strong> replies</span><span><strong>{selected.failed || 0}</strong> failed</span></div>
          <div>
            <label>Audience <select value={audience} onChange={(event) => setAudience(event.target.value as "assigned" | "all")}><option value="assigned">Leads assigned to this campaign</option><option value="all">All eligible contacts</option></select><ChevronDown size={13} /></label>
            {selected.status === "Sending" ? <button className="v2-btn" onClick={pause}><Pause size={15} /> Pause</button> : <button className="v2-btn v2-btn-accent" onClick={launch} disabled={launching}><Play size={15} /> {launching ? "Queueing…" : selected.status === "Paused" ? "Resume campaign" : "Launch campaign"}</button>}
          </div>
        </Panel>
      )}
    </>
  );
}
