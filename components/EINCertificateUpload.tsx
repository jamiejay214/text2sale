"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, ExternalLink, FileText, LoaderCircle, LockKeyhole, Upload } from "lucide-react";
import { certificateFileProblem, EIN_CERTIFICATE_ACCEPT, type EINCertificate } from "@/lib/ein-certificate";
import styles from "./EINCertificateUpload.module.css";

type Props = {
  userId: string;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  readOnly?: boolean;
};

export default function EINCertificateUpload({ userId, authFetch, readOnly = false }: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [certificate, setCertificate] = useState<EINCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await authFetch("/api/ein-certificate-url", {
          method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, metadataOnly: true }),
        });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !data.success) throw new Error(data.error || "Could not check your certificate.");
        setCertificate(data.certificate);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not check your certificate.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [authFetch, userId, reload]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice("");
    const problem = certificateFileProblem(file);
    if (problem) { setError(problem); return; }
    setError(""); setBusy("upload");
    try {
      const form = new FormData(); form.append("userId", userId); form.append("file", file);
      const response = await authFetch("/api/upload-ein-certificate", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Your certificate could not be saved. Please try again.");
      setCertificate(data.certificate);
      setNotice("Certificate saved privately. Your registration continues from its current step.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your certificate could not be saved. Please try again.");
    } finally { setBusy(""); }
  };

  const open = async (download: boolean) => {
    setError(""); setBusy(download ? "download" : "view");
    // Open during the click so browsers allow the new tab after the authenticated request.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const response = await authFetch("/api/ein-certificate-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, view: !download }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.url) throw new Error(data.error || "Could not open your certificate.");
      if (tab) tab.location.href = data.url;
      else window.location.assign(data.url);
    } catch (cause) {
      tab?.close(); setError(cause instanceof Error ? cause.message : "Could not open your certificate.");
    } finally { setBusy(""); }
  };

  return <section className={`${styles.card} ${readOnly ? styles.dark : ""}`} aria-labelledby={`${inputId}-title`} aria-busy={loading || !!busy}>
    <header className={styles.heading}><span className={styles.icon}><FileText size={19} aria-hidden="true" /></span><div><h2 id={`${inputId}-title`}>EIN certificate</h2><p>{readOnly ? "Private business document" : "IRS EIN confirmation letter · Required before messaging"}</p></div></header>
    {!readOnly && <p className={styles.description}>Upload your IRS letter (CP 575) before sending messages. The legal name, EIN, and address should match your registration.</p>}
    {loading ? <p className={styles.loading}><LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /> Checking for a certificate…</p> : certificate ? <div className={styles.document}>
      <div className={styles.fileName}><FileText size={18} aria-hidden="true" /><strong>{certificate.name}</strong></div>
      <p>{certificate.uploadedAt ? `Uploaded ${new Date(certificate.uploadedAt).toLocaleDateString()}` : "Uploaded"}{certificate.size !== null ? ` · ${certificate.size < 1024 * 1024 ? `${Math.ceil(certificate.size / 1024)} KB` : `${(certificate.size / (1024 * 1024)).toFixed(1)} MB`}` : ""}</p>
      <span className={styles.saved}><CheckCircle2 size={13} aria-hidden="true" /> Saved privately</span>
      <div className={styles.actions}><button type="button" disabled={!!busy} onClick={() => void open(false)}><ExternalLink size={14} aria-hidden="true" />{busy === "view" ? "Opening…" : "View"}</button><button type="button" disabled={!!busy} onClick={() => void open(true)}><Download size={14} aria-hidden="true" />{busy === "download" ? "Opening…" : "Download"}</button></div>
    </div> : <div className={styles.empty}><FileText size={22} aria-hidden="true" /><p>{readOnly ? "No EIN certificate uploaded." : "No certificate uploaded yet"}</p></div>}
    {!readOnly && <><input ref={input} id={inputId} type="file" accept={EIN_CERTIFICATE_ACCEPT} onChange={(event) => void upload(event)} disabled={loading || !!busy} className={styles.fileInput} aria-label={certificate ? "Replace EIN certificate" : "Upload EIN certificate"} aria-describedby={`${inputId}-formats`} /><button type="button" className={styles.upload} disabled={loading || !!busy} onClick={() => input.current?.click()}>{busy === "upload" ? <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}{busy === "upload" ? "Saving certificate…" : certificate ? "Replace certificate" : "Upload EIN certificate"}</button><p id={`${inputId}-formats`} className={styles.formats}>PDF, PNG, JPG, or WebP · Up to 4 MB</p></>}
    {error && <div className={styles.error} role="alert"><p>{error}</p>{!busy && <button type="button" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Check again</button>}</div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" /><span>Only the account holder and Text2Sale can open this file. It is never published on the business website.</span></p>
    {!readOnly && <p className={styles.caption}>Saving a certificate does not submit it to Telnyx or restart your registration.</p>}
  </section>;
}
