"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { EmptyState, Panel, StatusPill } from "../WorkspacePrimitives";
import EmailComposer from "./email/EmailComposer";
import EmailDomainPanel from "./email/EmailDomainPanel";
import type { Channel, EmailCampaign, EmailResults, Sender, SenderInfo } from "./email/types";
import type { DnsPlan } from "@/lib/email-dns";

// Email campaigns (Telnyx Email): the sending domain, the campaign list with
// live progress, and the composer. Sending runs in the background
// (lib/email-queue.ts), so closing the page never stops a campaign.

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tone = (s: EmailCampaign["status"]) => (s === "Sent" ? "success" : s === "Sending" || s === "Scheduled" ? "info" : s === "Paused" ? "warning" : "neutral");

const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(part && part / whole < 0.01 ? 2 : 1)}%` : "0%");

/** Spam complaints: Gmail and Yahoo expect bulk senders under 0.1% and block above 0.3%. */
function spamTone(complained: number, sent: number): "success" | "warning" | "danger" {
  const rate = sent ? complained / sent : 0;
  return rate > 0.003 ? "danger" : rate > 0.001 ? "warning" : "success";
}
function bounceTone(bounced: number, sent: number): "success" | "warning" | "danger" {
  const rate = sent ? bounced / sent : 0;
  return rate > 0.05 ? "danger" : rate > 0.02 ? "warning" : "success";
}

async function json<T>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

function when(c: EmailCampaign): string {
  if (c.status === "Sent" && c.sent_at) return `Sent ${new Date(c.sent_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  if (c.status === "Scheduled" && c.local_time) {
    const t = new Date(c.local_time);
    return `${t.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} in each contact's time zone`;
  }
  const fmt = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  // A sending campaign whose next batch is in the future hit the daily sending limit.
  if (c.status === "Sending" && c.scheduled_at && Date.parse(c.scheduled_at) > Date.now()) {
    return `${c.sent.toLocaleString()} sent so far · the rest continue ${fmt(c.scheduled_at)}${c.pause_reason ? `. ${c.pause_reason}` : " (daily sending limit)"}`;
  }
  if (c.scheduled_at && (c.status === "Scheduled" || c.status === "Sending")) return `From ${fmt(c.scheduled_at)}`;
  return new Date(c.created_at).toLocaleDateString();
}

export default function EmailCampaigns({ onChannel }: { onChannel: (channel: Channel) => void }) {
  const [info, setInfo] = useState<SenderInfo | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [health, setHealth] = useState<EmailResults | null>(null);
  const [rate, setRate] = useState(0);
  const [view, setView] = useState<{ mode: "list" } | { mode: "compose"; campaign: EmailCampaign | null }>({ mode: "list" });
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([authFetch("/api/email/sender"), authFetch("/api/email/campaigns")]);
    const senderInfo = await json<SenderInfo>(s);
    const list = await json<{ campaigns: EmailCampaign[]; rate: number; health: EmailResults }>(c);
    setHealth(list.health || null);
    setInfo(senderInfo);
    setCampaigns(list.campaigns || []);
    setRate(list.rate || 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Live progress while anything is scheduled or sending.
  const active = campaigns.some((c) => c.status === "Scheduled" || c.status === "Sending");
  useEffect(() => {
    if (!active || view.mode !== "list") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [active, view.mode, load]);

  const senderAction = async (payload: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    const res = await authFetch("/api/email/sender", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await json<{ sender: Sender; dnsPlan: DnsPlan | null }>(res);
    setBusy(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: out.error || "Something went wrong." });
      return false;
    }
    setInfo((cur) => (cur ? { ...cur, sender: out.sender, dnsPlan: out.dnsPlan ?? null } : cur));
    if (payload.action === "refresh") setNotice(out.sender.status === "verified" ? { tone: "ok", text: "Your domain is verified. You can send email campaigns." } : { tone: "ok", text: "Not verified yet. DNS changes can take up to a few hours." });
    return true;
  };

  const campaignAction = async (campaignId: string, mode: "resume" | "cancel") => {
    setBusy(true);
    setNotice(null);
    const res = await authFetch("/api/email/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, mode }) });
    const out = await json<{ outOfFunds?: boolean }>(res);
    setBusy(false);
    if (!res.ok) setNotice({ tone: "error", text: out.error || "Something went wrong." });
    else if (out.outOfFunds) setNotice({ tone: "error", text: "Still paused: add funds to your wallet, then resume." });
    else setNotice({ tone: "ok", text: mode === "cancel" ? "Campaign cancelled. Unsent emails were dropped and not charged." : "Campaign resumed." });
    load();
  };

  const channelSwitch = (
    <div className="v2-segmented em-channels" role="group" aria-label="Campaign type">
      <button onClick={() => onChannel("text")}>Text</button>
      <button className="is-active" aria-pressed>Email</button>
      <button onClick={() => onChannel("sequence")}>Text + Email</button>
    </div>
  );

  if (!info) return <Panel><div className="v2-mini-loading"><span className="v2-spin">◌</span> Loading email campaigns</div></Panel>;

  if (!info.enabled) {
    return (
      <>
        <header className="em-head"><div><p className="em-eyebrow">Email campaigns</p><h1 className="em-title">Email</h1></div><div className="em-head-actions">{channelSwitch}</div></header>
        <Panel><EmptyState title="Email campaigns are coming soon" description="Send email campaigns to your leads from your own domain, with campaign ideas and AI writing, paid from your wallet per email." /></Panel>
      </>
    );
  }

  const verified = info.sender?.status === "verified";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {view.mode === "list" && (
        <header className="em-head">
          <div><p className="em-eyebrow">Email campaigns</p><h1 className="em-title">Email</h1></div>
          <div className="em-head-actions">
            {channelSwitch}
            <button className="v2-btn v2-btn-primary" onClick={() => setView({ mode: "compose", campaign: null })}><Plus size={15} /> New campaign</button>
          </div>
        </header>
      )}
      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {!info.account.ok && info.account.error && <div className="v2-notice is-error">{info.account.error}</div>}
      {(!verified || view.mode === "list") && <EmailDomainPanel key={`${info.sender?.domain || ""}${info.sender?.status || ""}`} info={info} busy={busy} onAction={senderAction} onNotice={(text) => setNotice({ tone: "ok", text })} />}

      {view.mode === "compose" ? (
        <EmailComposer
          info={info}
          rate={rate}
          initial={view.campaign}
          footerDefaults={campaigns[0]?.design || null}
          channelSwitch={channelSwitch}
          onCancel={() => { setView({ mode: "list" }); load(); }}
          onDone={(text) => { setNotice({ tone: "ok", text }); setView({ mode: "list" }); load(); }}
        />
      ) : (
        <>
        {health && health.sent > 0 && (
          <Panel>
            <div className="v2-panel-head"><h2>Sender health</h2><small>All campaigns, from Telnyx delivery reports</small></div>
            <div className="v2-panel-body">
              <div className="em-health">
                <div><strong>{health.sent.toLocaleString()}</strong><span>Sent</span></div>
                <div><strong>{pct(health.delivered, health.sent)}</strong><span>Delivered ({health.delivered.toLocaleString()})</span></div>
                <div className={`is-${bounceTone(health.bounced, health.sent)}`}><strong>{pct(health.bounced, health.sent)}</strong><span>Bounce rate ({health.bounced.toLocaleString()})</span></div>
                <div className={`is-${spamTone(health.complained, health.sent)}`}><strong>{pct(health.complained, health.sent)}</strong><span>Spam rate ({health.complained.toLocaleString()} complaints)</span></div>
                <div><strong>{pct(health.opened, health.delivered || health.sent)}</strong><span>Opened ({health.opened.toLocaleString()})</span></div>
              </div>
              <p className="em-note">Keep spam complaints under 0.1% (Gmail and Yahoo start blocking bulk senders at 0.3%) and bounces under 2%. Campaigns pause themselves if complaints pass 0.3% or bounces pass 5%. Bounced and complaining addresses are never emailed again. Delivery reports can take a few minutes; complaints can arrive days later.</p>
            </div>
          </Panel>
        )}
        <Panel>
          <div className="v2-panel-head"><h2>Campaigns</h2></div>
          {campaigns.length === 0 ? (
            <EmptyState title="No email campaigns yet" description="Start with a campaign idea or let AI write one. Your campaigns and their results show here." action={<button className="v2-btn v2-btn-primary" onClick={() => setView({ mode: "compose", campaign: null })}><Mail size={15} /> Write your first email</button>} />
          ) : (
            <div className="v2-panel-body" style={{ overflowX: "auto" }}>
              <table className="em-table">
                <thead><tr>{["Campaign", "Status", "When", "Sent", "Delivered", "Bounced", "Spam", "Opened", "Cost", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong><br /><small>{c.subject}</small></td>
                    <td><StatusPill tone={tone(c.status)}>{c.status}</StatusPill>{c.status === "Paused" && c.pause_reason ? <><br /><small className="em-warn">{c.pause_reason}</small></> : null}</td>
                    <td><small>{when(c)}</small></td>
                    <td>{c.sent.toLocaleString()}{c.failed ? <><br /><small>{c.failed.toLocaleString()} failed</small></> : null}</td>
                    <td>{(c.results?.delivered || 0).toLocaleString()}<br /><small>{pct(c.results?.delivered || 0, c.results?.sent || 0)}</small></td>
                    <td>{(c.results?.bounced || 0).toLocaleString()}<br /><small>{pct(c.results?.bounced || 0, c.results?.sent || 0)}</small></td>
                    <td>{(c.results?.complained || 0).toLocaleString()}<br /><small>{pct(c.results?.complained || 0, c.results?.sent || 0)}</small></td>
                    <td>{(c.results?.opened || 0).toLocaleString()}<br /><small>{pct(c.results?.opened || 0, c.results?.delivered || c.results?.sent || 0)}</small></td>
                    <td>{money(Number(c.cost))}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.status === "Draft" && <button className="v2-btn" onClick={() => setView({ mode: "compose", campaign: c })}>Edit</button>}
                      {c.status === "Paused" && <button className="v2-btn" disabled={busy} onClick={() => campaignAction(c.id, "resume")}>Resume</button>}
                      {(c.status === "Scheduled" || c.status === "Sending" || c.status === "Paused") && <button className="v2-btn" disabled={busy} onClick={() => campaignAction(c.id, "cancel")}>Cancel</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Panel>
        </>
      )}
    </div>
  );
}
