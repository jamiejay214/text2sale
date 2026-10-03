"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  History,
  Info,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { fetchCampaigns } from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import type { Campaign, Contact } from "@/lib/types";
import type { WorkspaceViewProps } from "../../WorkspaceApp";
import { EmptyState, PageHeader, Panel, StatusPill } from "../../WorkspacePrimitives";

type Props = WorkspaceViewProps & { settingsTab?: string };
type CsvRow = Record<string, string>;
type UploadRecord = {
  id: string;
  file_name: string;
  uploaded_at: string;
  total_rows: number;
  success: number;
  duplicates: number;
  invalid: number;
  validation_used: string | null;
  charged: number | null;
};

const FIELDS = [
  ["", "Do not import"], ["first_name", "First name"], ["last_name", "Last name"], ["phone", "Phone number"], ["email", "Email"], ["address", "Address"], ["city", "City"], ["state", "State"], ["zip", "ZIP code"], ["lead_source", "Lead source"], ["notes", "Notes"], ["quote", "Quote"], ["policy_id", "Policy ID"], ["timeline", "Timeline"], ["household_size", "Household size"], ["date_of_birth", "Date of birth"], ["age", "Age"],
] as const;

function guessField(header: string) {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches: Record<string, string> = {
    firstname: "first_name", fname: "first_name", first: "first_name",
    lastname: "last_name", lname: "last_name", last: "last_name",
    phone: "phone", phonenumber: "phone", mobile: "phone", cell: "phone",
    email: "email", emailaddress: "email", address: "address", streetaddress: "address",
    city: "city", state: "state", zip: "zip", zipcode: "zip", postalcode: "zip",
    leadsource: "lead_source", source: "lead_source", notes: "notes", note: "notes",
    quote: "quote", policyid: "policy_id", timeline: "timeline", householdsize: "household_size",
    dateofbirth: "date_of_birth", dob: "date_of_birth", age: "age",
  };
  return matches[normalized] || "";
}

function normalizePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export default function UploadWorkspace({ profile, onProfile, onNavigate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [historyCampaign, setHistoryCampaign] = useState<Record<string, string>>({});

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("csv_uploads").select("id,file_name,uploaded_at,total_rows,success,duplicates,invalid,validation_used,charged").eq("user_id", profile.id).order("uploaded_at", { ascending: false }).limit(30);
    setHistory((data || []) as UploadRecord[]);
  }, [profile.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadHistory(); fetchCampaigns(profile.id).then(setCampaigns); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory, profile.id]);

  const reset = () => { setStep(1); setFileName(""); setRawText(""); setRows([]); setHeaders([]); setMapping({}); setCampaignId(""); setProgress(0); if (inputRef.current) inputRef.current.value = ""; };

  const parseFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) { setNotice({ tone: "error", text: "Choose a CSV file." }); return; }
    setFileName(file.name);
    setRawText(file.size <= 5_000_000 ? await file.text() : "");
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (result) => {
        const fields = (result.meta.fields || []).filter(Boolean);
        if (!fields.length || !result.data.length) { setNotice({ tone: "error", text: "No contact rows were found in that CSV." }); return; }
        setHeaders(fields);
        setRows(result.data);
        setMapping(Object.fromEntries(fields.map((header) => [header, guessField(header)])));
        setStep(2);
        setNotice(null);
      },
      error: () => setNotice({ tone: "error", text: "The CSV could not be read." }),
    });
  };

  const mappedPhone = useMemo(() => Object.values(mapping).includes("phone"), [mapping]);
  const mappedFields = useMemo(() => Object.values(mapping).filter(Boolean).length, [mapping]);
  const campaign = campaigns.find((item) => item.id === campaignId);

  const importContacts = async () => {
    if (!mappedPhone) { setNotice({ tone: "error", text: "Map one CSV column to Phone number before importing." }); return; }
    setUploading(true); setProgress(5); setNotice(null);
    const mappedRows: Array<Omit<Contact, "id" | "created_at">> = rows.map((row) => {
      const values: Record<string, string> = {};
      for (const header of headers) if (mapping[header]) values[mapping[header]] = String(row[header] || "").trim();
      return {
        user_id: profile.id,
        first_name: values.first_name || "",
        last_name: values.last_name || "",
        phone: values.phone || "",
        email: values.email || "",
        address: values.address || "",
        city: values.city || "",
        state: values.state || "",
        zip: values.zip || "",
        lead_source: values.lead_source || "",
        notes: values.notes || "",
        quote: values.quote || "",
        policy_id: values.policy_id || "",
        timeline: values.timeline || "",
        household_size: values.household_size || "",
        date_of_birth: values.date_of_birth || "",
        age: values.age || "",
        campaign: campaign?.name || "",
        tags: [],
        dnc: false,
      };
    });
    const valid = mappedRows.filter((row) => normalizePhone(row.phone));
    const invalidCount = mappedRows.length - valid.length;
    let deduped = valid;
    let duplicateCount = 0;
    if (ignoreDuplicates) {
      const phones = [...new Set(valid.map((row) => normalizePhone(row.phone)))];
      const existing = new Set<string>();
      for (let index = 0; index < phones.length; index += 1000) {
        const { data } = await supabase.rpc("check_existing_phones", { p_user_id: profile.id, p_phones_last10: phones.slice(index, index + 1000) });
        for (const value of (data || []) as Array<string | { check_existing_phones?: string }>) {
          const phone = typeof value === "string" ? value : value.check_existing_phones;
          if (phone) existing.add(phone);
        }
      }
      const seen = new Set<string>();
      deduped = valid.filter((row) => {
        const phone = normalizePhone(row.phone);
        if (existing.has(phone) || seen.has(phone)) { duplicateCount += 1; return false; }
        seen.add(phone); return true;
      });
    }
    setProgress(25);
    let imported = 0;
    const importedSinceIso = new Date().toISOString();
    for (let index = 0; index < deduped.length; index += 1000) {
      const { data } = await supabase.from("contacts").insert(deduped.slice(index, index + 1000)).select("id");
      imported += data?.length || 0;
      setProgress(25 + Math.round(((index + 1000) / Math.max(1, deduped.length)) * 55));
    }
    let charge: number | null = null;
    if (imported > 0) {
      try {
        const response = await authFetch("/api/charge-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: profile.id, count: imported }) });
        const data = await response.json();
        if (data.success) { charge = Number(data.charged || 0); if (typeof data.walletBalance === "number") onProfile({ ...profile, wallet_balance: data.walletBalance }); }
      } catch { /* Contacts are already imported; preserve the audit record. */ }
    }
    await supabase.from("csv_uploads").insert({
      user_id: profile.id, file_name: fileName, uploaded_at: importedSinceIso, total_rows: rows.length,
      success: imported, duplicates: duplicateCount, invalid: invalidCount, tcpa_violations: 0,
      dnc_complainers: 0, validation_used: "Internal DNC", charged: charge, file_content: rawText || null,
    });
    if (campaign && imported > 0) {
      try {
        const response = await authFetch("/api/campaigns/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id, audience: "assigned", importedSinceIso }) });
        const data = await response.json();
        if (!response.ok) setNotice({ tone: "error", text: `Imported ${imported.toLocaleString()} leads, but the campaign was not queued: ${data.error || "Open the campaign to retry."}` });
        else setNotice({ tone: "ok", text: `Imported ${imported.toLocaleString()} leads and queued ${Number(data.queued || 0).toLocaleString()} campaign messages.` });
      } catch { setNotice({ tone: "error", text: `Imported ${imported.toLocaleString()} leads. Open the campaign to launch it.` }); }
    } else setNotice({ tone: "ok", text: `Imported ${imported.toLocaleString()} leads. ${duplicateCount} duplicates and ${invalidCount} invalid rows were skipped.` });
    setProgress(100); setUploading(false); await loadHistory(); reset();
  };

  const download = async (record: UploadRecord) => {
    const { data } = await supabase.from("csv_uploads").select("file_content").eq("id", record.id).eq("user_id", profile.id).single();
    if (!data?.file_content) { setNotice({ tone: "error", text: "The original file was too large to keep for download." }); return; }
    const url = URL.createObjectURL(new Blob([data.file_content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = record.file_name; anchor.click(); URL.revokeObjectURL(url);
  };

  const reuse = async (record: UploadRecord) => {
    const selected = campaigns.find((item) => item.id === historyCampaign[record.id]);
    if (!selected) return;
    const { data } = await supabase.from("csv_uploads").select("file_content").eq("id", record.id).eq("user_id", profile.id).single();
    if (!data?.file_content) { setNotice({ tone: "error", text: "The original file is unavailable, so this batch cannot be matched automatically." }); return; }
    const parsed = Papa.parse<CsvRow>(data.file_content, { header: true, skipEmptyLines: true });
    const phoneHeader = (parsed.meta.fields || []).find((header) => guessField(header) === "phone");
    if (!phoneHeader) { setNotice({ tone: "error", text: "A phone column could not be identified in this file." }); return; }
    const phones = [...new Set(parsed.data.map((row) => String(row[phoneHeader] || "")).filter(Boolean))];
    let updated = 0;
    for (let index = 0; index < phones.length; index += 500) {
      const { data: matches } = await supabase.from("contacts").update({ campaign: selected.name }).eq("user_id", profile.id).in("phone", phones.slice(index, index + 500)).select("id");
      updated += matches?.length || 0;
    }
    window.sessionStorage.setItem("t2s_campaign_id", selected.id);
    setNotice({ tone: "ok", text: `${updated.toLocaleString()} matching leads moved to ${selected.name}. Review and launch it from Campaigns.` });
    onNavigate("campaigns");
  };

  const removeHistory = async (record: UploadRecord) => {
    if (!window.confirm("Remove this upload record? Imported contacts will stay in your CRM.")) return;
    await supabase.from("csv_uploads").delete().eq("id", record.id).eq("user_id", profile.id);
    setHistory((current) => current.filter((item) => item.id !== record.id));
  };

  return (
    <>
      <PageHeader eyebrow="Lead import" title="Turn any CSV into campaign-ready leads." description="Upload, map fields, clean duplicates, choose a campaign, and keep every prior list available for a future follow-up." />
      {notice && <div className={`v2-notice is-${notice.tone}`}>{notice.text}<button onClick={() => setNotice(null)}><X size={15} /></button></div>}
      <div className="v2-import-layout">
        <Panel className="v2-import-wizard">
          <div className="v2-import-steps">{([[1, "Choose file"], [2, "Map fields"], [3, "Campaign & import"]] as const).map(([number, label]) => <div className={step >= number ? "is-active" : ""} key={number}><span>{step > number ? <Check size={13} /> : number}</span><strong>{label}</strong></div>)}</div>
          {step === 1 && <div className="v2-upload-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void parseFile(file); }}><span><UploadCloud size={27} /></span><h2>Drop your CSV here</h2><p>or browse from your computer. Your first row should contain column names.</p><button className="v2-btn v2-btn-primary" onClick={() => inputRef.current?.click()}>Choose CSV file</button><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseFile(file); }} /><small>CSV up to 5 MB is retained for future downloads</small></div>}
          {step === 2 && <div className="v2-mapping-screen"><div className="v2-import-file"><FileSpreadsheet size={19} /><div><strong>{fileName}</strong><small>{rows.length.toLocaleString()} rows · {headers.length} columns</small></div><button onClick={reset}>Change file</button></div><div className="v2-mapping-head"><span>CSV column</span><span>Maps to Text2Sale field</span><span>Preview</span></div><div className="v2-mapping-list">{headers.map((header) => <div key={header}><strong>{header}</strong><label><select value={mapping[header] || ""} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}>{FIELDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={13} /></label><span>{rows.slice(0, 2).map((row) => row[header]).filter(Boolean).join(" · ") || "No preview"}</span></div>)}</div><footer><div><ShieldCheck size={16} /><span><strong>{mappedFields} fields mapped</strong><small>Phone is required</small></span></div><button className="v2-btn v2-btn-primary" disabled={!mappedPhone} onClick={() => setStep(3)}>Continue <ArrowRight size={15} /></button></footer></div>}
          {step === 3 && <div className="v2-import-review"><div className="v2-review-hero"><span><CheckCircle2 size={24} /></span><div><p>Ready to import</p><h2>{rows.length.toLocaleString()} leads from {fileName}</h2><small>{mappedFields} mapped fields will be added to each contact.</small></div></div><div className="v2-review-options"><label><span>Campaign after import<small>Choose a saved campaign to start its texts immediately.</small></span><select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}><option value="">Import only — no campaign</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.steps?.length || 1} steps</option>)}</select></label><label className="v2-check-row"><input type="checkbox" checked={ignoreDuplicates} onChange={(event) => setIgnoreDuplicates(event.target.checked)} /><span><b>Skip duplicate phone numbers</b><small>Checks both this file and your existing contact database.</small></span></label><div className="v2-import-compliance"><ShieldCheck size={17} /><div><strong>Compliance checks included</strong><span>Invalid phones and internal DNC matches are excluded before campaign enrollment.</span></div></div></div>{uploading && <div className="v2-import-progress"><span><i style={{ width: `${progress}%` }} /></span><small>Importing and preparing your leads… {progress}%</small></div>}<footer><button className="v2-btn" onClick={() => setStep(2)} disabled={uploading}>Back</button><button className="v2-btn v2-btn-accent" onClick={importContacts} disabled={uploading}>{uploading ? "Importing…" : campaignId ? "Import & start campaign" : "Import leads"}</button></footer></div>}
        </Panel>

        <aside className="v2-import-aside"><Panel><div className="v2-panel-head"><div><h2>Import checklist</h2><p>For the cleanest results</p></div><Info size={16} /></div><ol><li><span>1</span><div><strong>Keep one lead per row</strong><small>Use column headers in row one.</small></div></li><li><span>2</span><div><strong>Include a phone number</strong><small>We normalize common US formats.</small></div></li><li><span>3</span><div><strong>Map before importing</strong><small>You control where every column lands.</small></div></li><li><span>4</span><div><strong>Choose an optional campaign</strong><small>Its full follow-up workflow is queued.</small></div></li></ol></Panel><Panel className="v2-csv-sample"><FileSpreadsheet size={19} /><div><strong>Need a sample format?</strong><small>Download a clean template with every supported field.</small></div><button onClick={() => { const content = "First Name,Last Name,Phone,Email,City,State,ZIP,Lead Source\nAlex,Morgan,9545550123,alex@example.com,Fort Lauderdale,FL,33301,Website"; const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "text2sale-import-template.csv"; anchor.click(); URL.revokeObjectURL(url); }}><Download size={14} /> Download</button></Panel></aside>
      </div>

      <Panel className="v2-upload-history"><div className="v2-panel-head"><div><h2>Uploaded lead lists</h2><p>Download, audit, or put an earlier list into another campaign.</p></div><History size={18} /></div>{history.length ? <div className="v2-upload-table"><table><thead><tr><th>File</th><th>Imported</th><th>Rows</th><th>Clean-up</th><th>Charge</th><th>Retext with campaign</th><th /></tr></thead><tbody>{history.map((record) => <tr key={record.id}><td><span className="v2-file-icon"><FileSpreadsheet size={15} /></span><span><strong>{record.file_name}</strong><small>{new Date(record.uploaded_at).toLocaleString()}</small></span></td><td><StatusPill tone="success">{record.success.toLocaleString()} added</StatusPill></td><td>{record.total_rows.toLocaleString()}</td><td><span>{record.duplicates} duplicates</span><small>{record.invalid} invalid</small></td><td>{record.charged == null ? "—" : `$${Number(record.charged).toFixed(2)}`}</td><td><div className="v2-reuse-campaign"><select value={historyCampaign[record.id] || ""} onChange={(event) => setHistoryCampaign((current) => ({ ...current, [record.id]: event.target.value }))}><option value="">Choose campaign…</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={!historyCampaign[record.id]} onClick={() => reuse(record)}><RefreshCw size={13} /> Assign & open</button></div></td><td><button title="Download original" onClick={() => download(record)}><Download size={14} /></button><button title="Remove history record" onClick={() => removeHistory(record)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div> : <EmptyState title="No CSV uploads yet" description="Your imported files and clean-up results will stay available here." />}</Panel>
    </>
  );
}
