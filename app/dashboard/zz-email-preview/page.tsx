"use client";
import EmailComposer from "@/components/workspace/views/email/EmailComposer";
import type { SenderInfo } from "@/components/workspace/views/email/types";
const info: SenderInfo = {
  enabled: true,
  account: { ok: true, error: null, businessName: "JJ JOHNSON HEALTH", address: "6080 SW 24TH PL APT 306, DAVIE, FL 33314", replyTo: "johnsonhealthquotes@gmail.com", logoUrl: null, industry: "health_insurance" },
  suggestedDomain: null,
  sender: { domain: "news.text2sale.com", from_name: "Outreach", from_local: "hello", reply_to: "johnsonhealthquotes@gmail.com", status: "verified", dns_records: [], dns_managed: false },
  dnsPlan: null,
};
export default function Page() {
  return (
    <main className="crm-theme workspace-v2 workspace-app emerald-workspace t2s-light" style={{ padding: 32, minHeight: "100vh", background: "var(--v2-canvas)" }}>
      <EmailComposer info={info} rate={0.003} footerDefaults={null} initial={{ id: "x", name: "Review request", subject: "Would you share your experience?", preview_text: "", body: "", design: { style: "card", theme: "dark", brandColor: "#34d399", headline: "Would you share your experience?", bullets: ["Takes about one minute", "Helps other families find us", "Tell us honestly how we did"] }, audience: null, status: "Draft", recipients: 0, sent: 0, failed: 0, skipped: 0, cost: 0, scheduled_at: null, local_time: null, hourly_limit: 500, sent_at: null, created_at: "" }}
        channelSwitch={<div className="v2-segmented em-channels"><button>Text</button><button className="is-active">Email</button></div>} onDone={() => {}} onCancel={() => {}} />
    </main>
  );
}
