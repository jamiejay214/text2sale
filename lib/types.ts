// ============================================================
// Shared types for Text2Sale
// These match the Supabase DB schema (snake_case)
// ============================================================

export type Profile = {
  id: string;
  role: "user" | "admin";
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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
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

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: "Draft" | "Sending" | "Completed" | "Paused";
  message: string;
  logs: CampaignLog[];
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
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "sent" | "delivered" | "failed" | "received";
  created_at: string;
};

// Conversation with messages and contact joined in
export type ConversationWithDetails = Conversation & {
  messages: Message[];
  contact: Contact | null;
};

export const DEFAULT_PLAN: Plan = {
  name: "Text2Sale Package",
  price: 39.99,
  messageCost: 0.012,
};
