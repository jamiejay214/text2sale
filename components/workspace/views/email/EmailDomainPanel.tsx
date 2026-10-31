"use client";

import { useState } from "react";
import { Copy, ExternalLink, Mail, RefreshCw } from "lucide-react";
import type { DnsPlan, RecordAction } from "@/lib/email-dns";
import { Panel, StatusPill } from "../../WorkspacePrimitives";
import type { Sender, SenderInfo } from "./types";

// The sending domain: set it up, follow the step-by-step DNS guide
// (lib/email-dns.ts), check verification, or change to another domain.

const STEP_LABEL: Record<RecordAction, { text: string; tone: "info" | "warning" | "neutral" | "success" }> = {
  add: { text: "Add new", tone: "info" },
  edit: { text: "Edit existing", tone: "warning" },
  keep: { text: "Keep yours", tone: "neutral" },
  done: { text: "Found", tone: "success" },
};

export default function EmailDomainPanel({
  info,
  busy,
  onAction,
  onNotice,
}: {
  info: SenderInfo;
  busy: boolean;
  onAction: (payload: Record<string, unknown>) => Promise<boolean>;
  onNotice: (text: string) => void;
}) {
  const sender = info.sender;
  const [changing, setChanging] = useState(false);
  const [domain, setDomain] = useState(sender?.domain || info.suggestedDomain || "");
  const [fromName, setFromName] = useState(sender?.from_name || info.account.businessName || "");
  const [fromLocal, setFromLocal] = useState(sender?.from_local || "hello");
  const [replyTo, setReplyTo] = useState(sender?.reply_to || info.account.replyTo || "");

  const verified = sender?.status === "verified";
  const plan: DnsPlan | null = info.dnsPlan;
  const planOpen = plan ? plan.steps.some((st) => st.action === "add" || st.action === "edit") : false;
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => onNotice("Copied."), () => undefined);
  };
  const startChange = (s: Sender) => {
    setDomain(s.domain);
    setFromName(s.from_name);
    setFromLocal(s.from_local);
    setReplyTo(s.reply_to || "");
    setChanging(true);
  };
  const submit = async (payload: Record<string, unknown>) => {
    if (await onAction(payload)) setChanging(false);
  };

  return (
    <Panel>
      <div className="v2-panel-head"><h2>Sending domain</h2>{sender && <StatusPill tone={verified ? "success" : "warning"}>{verified ? "Verified" : "Waiting for DNS"}</StatusPill>}</div>
      {!sender || changing ? (
        <div className="v2-panel-body" style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>Emails go out from your own domain so they land in the inbox and replies come to you.{info.suggestedDomain ? " We'll add the DNS records to your Text2Sale domain for you." : " We'll walk you through the DNS records to add."}</p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="v2-field"><label htmlFor="email-domain">Domain</label><input id="email-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="news.yourbusiness.com" /><small>Already use this domain for email (Google, Outlook, GoDaddy)? Use a subdomain like news.yourbusiness.com. Your inbox stays untouched and campaigns get their own reputation.</small></div>
            <div className="v2-field"><label htmlFor="email-from-name">From name</label><input id="email-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
            <div className="v2-field"><label htmlFor="email-from-local">From address</label><input id="email-from-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} /><small>{fromLocal || "hello"}@{domain || "yourbusiness.com"}</small></div>
            <div className="v2-field"><label htmlFor="email-reply-to">Replies go to</label><input id="email-reply-to" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="v2-btn v2-btn-primary" disabled={busy || !domain} onClick={() => submit({ domain, fromName, fromLocal, replyTo })}><Mail size={15} /> {sender ? "Save sending domain" : "Set up sending domain"}</button>
            {sender && <button className="v2-btn" disabled={busy} onClick={() => setChanging(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div className="v2-panel-body" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <p style={{ margin: 0 }}>Sending as <strong>{sender.from_name} &lt;{sender.from_local}@{sender.domain}&gt;</strong>{sender.reply_to ? <> · replies to <strong>{sender.reply_to}</strong></> : null}</p>
            <button className="v2-btn" disabled={busy} onClick={() => startChange(sender)}>Change domain</button>
          </div>
          {!verified && plan && (
            <>
              {plan.suggestSubdomain && planOpen && (
                <div className="v2-notice is-ok" style={{ display: "grid", gap: 8 }}>
                  <span><strong>{sender.domain}</strong> already handles your email. The simplest setup is to send campaigns from <strong>{plan.suggestSubdomain}</strong>: nothing about your inbox changes, there are no records to edit, and campaign reputation stays separate from your everyday mail.</span>
                  <div><button className="v2-btn v2-btn-primary" disabled={busy} onClick={() => submit({ domain: plan.suggestSubdomain, fromName: sender.from_name, fromLocal: sender.from_local, replyTo: sender.reply_to })}>Use {plan.suggestSubdomain} instead</button></div>
                </div>
              )}
              <p style={{ margin: 0 }}>
                {sender.dns_managed ? "We added these records to your domain. Verification usually finishes within an hour." : planOpen ? <>Make these changes where <strong>{plan.zone}</strong>&apos;s DNS is managed{plan.provider ? <> (<strong>{plan.provider.name}</strong>)</> : null}, then check verification.</> : "All records are in place. Check verification. It can take a few minutes after DNS updates."}
                {plan.provider && planOpen && <> <a href={plan.provider.url} target="_blank" rel="noreferrer">Open {plan.provider.name} <ExternalLink size={12} /></a></>}
              </p>
              {plan.provider?.tip && planOpen && <small style={{ opacity: 0.8 }}>{plan.provider.tip}</small>}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Step</th><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Host</th><th style={{ textAlign: "left", padding: 6 }}>Value</th></tr></thead>
                  <tbody>
                    {plan.steps.map((st) => (
                      <tr key={`${st.name}${st.value}`} style={{ verticalAlign: "top" }}>
                        <td style={{ padding: 6, whiteSpace: "nowrap" }}><StatusPill tone={STEP_LABEL[st.action].tone}>{STEP_LABEL[st.action].text}</StatusPill></td>
                        <td style={{ padding: 6 }}>{st.type}</td>
                        <td style={{ padding: 6, minWidth: 150 }}><code style={{ whiteSpace: "nowrap" }}>{st.host}</code><br /><small style={{ opacity: 0.7, wordBreak: "break-all" }}>{st.name}</small></td>
                        <td style={{ padding: 6, wordBreak: "break-all" }}>
                          {st.action === "edit" && <small style={{ display: "block", opacity: 0.8 }}>Don&apos;t add a second SPF record. Change your existing one from <code>{st.current}</code> to:</small>}
                          {st.action === "keep" && <small style={{ display: "block", opacity: 0.8 }}>You already have a DMARC record. Keep it; nothing to add.</small>}
                          <code>{st.value}</code>
                          {(st.action === "add" || st.action === "edit") && <button className="v2-btn" style={{ marginLeft: 6, padding: "2px 6px", minHeight: 0 }} aria-label="Copy value" onClick={() => copy(st.value)}><Copy size={12} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div><button className="v2-btn" disabled={busy} onClick={() => onAction({ action: "refresh" })}><RefreshCw size={15} /> Check verification</button></div>
            </>
          )}
          {!verified && !plan && (
            <>
              <p style={{ margin: 0 }}>{sender.dns_managed ? "We added these records to your domain. Verification usually finishes within an hour." : "Add these records where your domain's DNS is managed, then check verification. If your domain already has an SPF record (v=spf1 ...), add the include to it instead of adding a second one."}</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Type</th><th style={{ textAlign: "left", padding: 6 }}>Name</th><th style={{ textAlign: "left", padding: 6 }}>Value</th></tr></thead>
                  <tbody>{sender.dns_records.map((r) => <tr key={`${r.name}${r.value}`}><td style={{ padding: 6 }}>{r.type}</td><td style={{ padding: 6, minWidth: 150, wordBreak: "break-all" }}>{r.name}</td><td style={{ padding: 6, wordBreak: "break-all" }}>{r.value}</td></tr>)}</tbody>
                </table>
              </div>
              <div><button className="v2-btn" disabled={busy} onClick={() => onAction({ action: "refresh" })}><RefreshCw size={15} /> Check verification</button></div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
