import type { DnsPlan } from "@/lib/email-dns";
import type { EmailDesign } from "@/lib/email-design";

export type Sender = {
  domain: string;
  from_name: string;
  from_local: string;
  reply_to: string | null;
  status: "pending" | "verified" | "failed";
  dns_records: { type: string; name: string; value: string }[];
  dns_managed: boolean;
};

export type SenderInfo = {
  enabled: boolean;
  account: { ok: boolean; error: string | null; businessName: string; address: string; replyTo: string | null; logoUrl: string | null; industry: string | null };
  suggestedDomain: string | null;
  sender: Sender | null;
  dnsPlan: DnsPlan | null;
};

export type Audience = { lists: string[]; tags: string[]; sources?: string[]; uploads?: string[] };

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  body: string;
  design: Partial<EmailDesign> | null;
  audience: Audience | null;
  status: "Draft" | "Scheduled" | "Sending" | "Sent" | "Paused" | "Cancelled";
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  cost: number;
  scheduled_at: string | null;
  local_time: string | null;
  hourly_limit: number;
  sent_at: string | null;
  created_at: string;
};

export type Channel = "text" | "email" | "sequence";
