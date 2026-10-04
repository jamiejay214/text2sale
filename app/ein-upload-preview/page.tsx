"use client";
import { useCallback, useState } from "react";
import EINCertificateUpload from "@/components/EINCertificateUpload";
import "../dashboard/workspace-v2.css";

export default function Preview() {
  const [dark, setDark] = useState(false);
  const authFetch = useCallback(async (_url: string, init?: RequestInit) => {
    const body = init?.body instanceof FormData ? null : JSON.parse(String(init?.body || "{}"));
    const certificate = { name: "IRS EIN confirmation letter.pdf", type: "application/pdf", size: 153600, uploadedAt: "2026-10-04T01:00:00Z" };
    const stored = new URLSearchParams(window.location.search).get("state") === "saved";
    return Response.json(body?.metadataOnly ? { success: true, certificate: stored ? certificate : null } : { success: true, certificate, url: "about:blank" });
  }, []);
  return <main className={`workspace-v2 ${dark ? "t2s-dark" : ""}`} style={{ padding: "32px", minHeight: "100vh" }}>
    <h1 style={{ fontSize: "30px", margin: "0 0 24px" }}>Messaging setup</h1>
    <button onClick={() => setDark(!dark)} style={{ marginBottom: "16px" }}>Toggle dark theme</button>
    <div style={{ maxWidth: "760px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
      <EINCertificateUpload userId="1679d7e5-422a-4676-b407-a25b5ef7e69c" authFetch={authFetch} />
      <EINCertificateUpload userId="b7791d04-f7b3-4cbb-8d99-32cd2a90d607" authFetch={authFetch} readOnly />
    </div>
  </main>;
}
