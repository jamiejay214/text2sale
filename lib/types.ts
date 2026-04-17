// ============================================================
// Shared types for Text2Sale
// These match the Supabase DB schema (snake_case)
// ============================================================

export type Profile = {
  id: string;
  role: "user" | "admin" | "manager";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  referral_code: string;
  credits: number;
  verified: boolean;
  paused: boolean;
  workflow_note: string;
  wallet_balance: number;
  usage_history: UsageHistoryItem[];
  owned_numbers: OwnedNumber[];
  plan: Plan;
  subscription_status: "active" | "canceling" | "past_due" | "inactive";
  // Admin-granted comp — when true, user is treated as subscribed even without
  // an active Stripe subscription, and Stripe webhooks won't override the flag.
  free_subscription: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  opt_out_settings: OptOutSettings;
  team_code: string;
  manager_id: string | null;
  referred_by: string | null;
  referral_rewarded: boolean;
  total_deposited: number;
  a2p_registration: A2PRegistration | null;
  compliance_log: ComplianceEventRecord[] | null;
  auto_recharge: { enabled: boolean; threshold: number; amount: number } | null;
  // Profile-level quiet hours. Enabled by default for TCPA compliance.
  // Stored on the row directly (not as JSON) so SQL can check them cheaply.
  quiet_hours_enabled?: boolean;
  quiet_hours_start_hour?: number; // 0-23, default 21 (9 PM)
  quiet_hours_end_hour?: number;   // 0-23, default 8 (8 AM)
  visitor_alerts?: boolean;
  business_slug?: string | null;
  business_description?: string | null;
  business_logo_url?: string | null;
  tag_library?: TagLibraryEntry[] | null;
  ai_instructions?: string | null;
  ai_auto_reply?: boolean;
  ai_plan?: boolean;
  free_ai_plan?: boolean;
  agent_plan?: boolean;
  industry?: string;
  available_hours?: Record<string, unknown> | null;
  appointment_reminders?: Record<string, unknown> | null;
  google_calendar_tokens?: Record<string, unknown> | null;
  created_at: string;
};

export type TagLibraryEntry = {
  name: string;
  // Tailwind color key — one of "violet" | "emerald" | "amber" | "red" |
  // "blue" | "pink" | "cyan" | "indigo" | "orange" | "lime" | "fuchsia" |
  // "zinc". Stored as a string so we can extend without a migration.
  color: string;
};

export type ComplianceEventRecord = {
  id: string;
  type: "opt_out" | "opt_in" | "dnc_added" | "dnc_removed" | "consent_recorded";
  contactPhone: string;
  contactName: string;
  method: "sms_keyword" | "manual" | "csv_import" | "api";
  keyword?: string;
  fromNumber?: string;
  timestamp: string;
  userId: string;
};

export type A2PRegistration = {
  status: "not_started" | "brand_pending" | "brand_approved" | "brand_failed"
    | "campaign_pending" | "campaign_approved" | "campaign_failed" | "completed";
  // Trust Hub / Brand
  customerProfileSid: string | null;
  trustProductSid: string | null;
  brandRegistrationSid: string | null;
  brandStatus: string | null;
  // Messaging Service & Campaign
  messagingServiceSid: string | null;
  campaignSid: string | null;
  campaignStatus: string | null;
  // Business info (stored for reference)
  businessName: string;
  businessType: "sole_proprietor" | "partnership" | "corporation" | "llc" | "non_profit";
  ein: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessCountry: string;
  website: string;
  // Authorized contact
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  // Campaign info
  useCase: string;
  description: string;
  sampleMessages: string[];
  messageFlow: string;
  optInMessage: string;
  optOutMessage: string;
  helpMessage: string;
  hasEmbeddedLinks: boolean;
  hasEmbeddedPhone: boolean;
  // EIN certificate (uploaded proof of EIN)
  einCertificatePath?: string | null;
  einCertificateName?: string | null;
  einCertificateType?: string | null;
  einCertificateUploadedAt?: string | null;
  // Errors
  errors: string[];
  updatedAt: string;
};

export type OptOutSettings = {
  keywords: string[];
  optInKeywords: string[];
  autoReplyMessage: string;
  optInReplyMessage: string;
  includeCompanyName: boolean;
  companyName: string;
  confirmOptOut: boolean;
  autoMarkDnc: boolean;
};

export type Plan = {
  name: string;
  price: number;
  messageCost: number;
};

export type UsageHistoryItem = {
  id: string;
  type: "charge" | "credit_add" | "credit_remove" | "fund_add" | "number_purchase";
  amount: number;
  description: string;
  createdAt: string;
  status?: "succeeded" | "failed";
};

export type OwnedNumber = {
  id: string;
  number: string;
  alias: string;
};

export type Contact = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  tags: string[];
  notes: string;
  dnc: boolean;
  campaign: string;
  address: string;
  zip: string;
  lead_source: string;
  quote: string;
  policy_id: string;
  timeline: string;
  household_size: string;
  date_of_birth: string;
  age: string;
  created_at: string;
};

export type CampaignStep = {
  id: string;
  message: string;
  delayMinutes: number; // delay before sending this step (0 for first)
};

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: "Draft" | "Sending" | "Completed" | "Paused" | "Scheduled";
  message: string;
  steps: CampaignStep[];
  selected_numbers: string[];
  logs: CampaignLog[];
  // Per-campaign quiet hours override. null/undefined = inherit from the user's
  // profile-level quiet hours setting. Set these to tailor the send window for
  // a specific campaign (e.g. a 10am–6pm call-center blast).
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start_hour?: number | null;
  quiet_hours_end_hour?: number | null;
  created_at: string;
};

export type CampaignLog = {
  id: string;
  createdAt: string;
  attempted: number;
  success: number;
  failed: number;
  notes: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  contact_id: string;
  preview: string;
  unread: number;
  last_message_at: string;
  starred: boolean;
  created_at: string;
  from_number?: string;
  ai_enabled?: boolean;
  agent_enabled?: boolean;
  ai_skipped_reason?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "sent" | "delivered" | "failed" | "received";
  created_at: string;
  from_number?: string;
};

// Conversation with messages and contact joined in
export type ConversationWithDetails = Conversation & {
  messages: Message[];
  contact: Contact | null;
};

export type MessageTemplate = {
  id: string;
  user_id: string;
  name: string;
  body: string;
  category: string;
  created_at: string;
};

export type ScheduledMessage = {
  id: string;
  user_id: string;
  contact_id: string;
  body: string;
  from_number: string;
  scheduled_at: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  created_at: string;
  // Set by workflow enrollment paths. When present, this message is part of
  // a multi-step drip and should cancel automatically if the lead replies.
  campaign_id?: string | null;
  cancel_on_reply?: boolean | null;
};

export type QuickReply = {
  id: string;
  label: string;
  body: string;
};

export const DEFAULT_PLAN: Plan = {
  name: "Text2Sale Package",
  price: 39.99,
  messageCost: 0.012,
};
