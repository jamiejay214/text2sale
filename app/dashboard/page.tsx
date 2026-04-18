"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import Logo from "@/components/Logo";
import CommandPalette, { type Command } from "@/components/CommandPalette";
import Toasts from "@/components/Toasts";
import Sparkline from "@/components/Sparkline";
import TempBadge from "@/components/TempBadge";
import SmartReplies from "@/components/SmartReplies";
import { computeTemperature } from "@/lib/lead-temperature";
import { computeSendWindow } from "@/lib/send-window";
import { analyzeSentiment, suggestReplies, type Sentiment } from "@/lib/sentiment";
import { supabase } from "@/lib/supabase";
import { logoutUser } from "@/lib/auth";
import { authFetch } from "@/lib/auth-fetch";
import { sanitizeForSms, hasNonGsmChars } from "@/lib/sms-text";
import {
  fetchProfile, updateProfile,
  fetchContacts as dbFetchContacts, insertContact as dbInsertContact,
  updateContact as dbUpdateContact, deleteContact as dbDeleteContact,
  fetchCampaigns as dbFetchCampaigns, insertCampaign as dbInsertCampaign,
  updateCampaign as dbUpdateCampaign, deleteCampaign as dbDeleteCampaign,
  fetchConversations as dbFetchConversations, fetchMessages,
  insertMessage, updateConversation as dbUpdateConversation,
  addUsageEntry, addOwnedNumber,
  fetchTeamMembers, fetchTeamMemberContacts, fetchTeamMemberCampaigns,
  fetchTeamMemberConversations, joinTeamByCode, leaveTeam,
  insertConversation,
  fetchTemplates, insertTemplate, updateTemplate, deleteTemplate,
  fetchScheduledMessages, insertScheduledMessage, cancelScheduledMessage,
} from "@/lib/supabase-data";
import type {
  Profile, Contact, Campaign, Conversation, Message,
  UsageHistoryItem, OwnedNumber, OptOutSettings, CampaignStep,
  A2PRegistration, MessageTemplate, ScheduledMessage, QuickReply,
  ComplianceEventRecord,
} from "@/lib/types";

// Adapter types — keep the camelCase names the JSX uses
type AccountRecord = {
  id: string;
  role?: "user" | "admin" | "manager";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  credits: number;
  verified: boolean;
  paused: boolean;
  workflowNote?: string;
  usageHistory: UsageHistoryItem[];
  plan: { name: string; price: number; messageCost: number };
  createdAt: string;
  walletBalance?: number;
  ownedNumbers?: OwnedNumber[];
  subscriptionStatus?: "active" | "canceling" | "past_due" | "inactive";
  freeSubscription?: boolean;
  teamCode?: string;
  managerId?: string | null;
  referralCode?: string;
  a2pRegistration?: A2PRegistration | null;
  complianceLog?: ComplianceEventRecord[];
  autoRecharge?: { enabled: boolean; threshold: number; amount: number };
  businessSlug?: string | null;
  businessDescription?: string | null;
  businessLogoUrl?: string | null;
  tagLibrary?: { name: string; color: string }[];
  aiPlan?: boolean;
  aiAutoReply?: boolean;
  aiInstructions?: string;
  agentPlan?: boolean;
  industry?: string;
  googleCalendarConnected?: boolean;
  availableHours?: {
    enabled: boolean;
    timezone: string;
    slots: Record<string, { enabled: boolean; start: string; end: string }>;
    slotDuration: number;
    bufferMinutes: number;
    maxDaysOut: number;
  };
};

type ContactRecord = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  tags?: string[];
  notes?: string;
  dnc?: boolean;
  campaign?: string;
  createdAt?: string;
  address?: string;
  zip?: string;
  leadSource?: string;
  quote?: string;
  policyId?: string;
  timeline?: string;
  householdSize?: string;
  dateOfBirth?: string;
  age?: string;
};

type CampaignRecord = {
  id: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: "Draft" | "Sending" | "Completed" | "Paused" | "Scheduled";
  message?: string;
  steps?: CampaignStep[];
  selectedNumbers?: string[];
  logs?: { id: string; createdAt: string; attempted: number; success: number; failed: number; notes: string }[];
};

type ConversationMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
  status?: "sent" | "delivered" | "failed" | "received";
  fromNumber?: string;
};

type ConversationRecord = {
  id: string;
  contactId: string;
  preview: string;
  unread: number;
  lastMessageAt: string;
  starred?: boolean;
  fromNumber?: string;
  aiEnabled?: boolean;
  agentEnabled?: boolean;
  aiSkippedReason?: string | null;
  messages: ConversationMessage[];
};

type DashboardTab = "overview" | "conversations" | "campaigns" | "contacts" | "appointments" | "upload" | "templates" | "settings" | "learn";
type SettingsSubTab = "numbers" | "billing" | "opt-out" | "activity" | "team" | "10dlc" | "biz-page" | "ai" | "suggestions" | "integrations";

// Map internal Telnyx status to user-facing labels. Telnyx's delivery webhook
// is unreliable (carrier-dependent), so we treat a successful API ack ("sent")
// as Delivered — the alternative is leaving most messages stuck on "Sending"
// forever even though they actually went through. Only "queued"/"sending"
// (pre-handoff to Telnyx) count as in-flight in the UI.
function displayMessageStatus(status?: string): string {
  if (status === "failed") return "Failed";
  if (status === "received") return "Received";
  if (status === "queued" || status === "sending") return "Sending";
  return "Delivered";
}

// Tag color palette — small curated set so users can't pick collisions /
// readability disasters. The map values are tailwind utility strings used
// directly in className.
const TAG_COLORS: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  violet:  { bg: "bg-violet-600/20",  text: "text-violet-300",  ring: "ring-violet-500/40",  dot: "bg-violet-500" },
  emerald: { bg: "bg-emerald-600/20", text: "text-emerald-300", ring: "ring-emerald-500/40", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-600/20",   text: "text-amber-300",   ring: "ring-amber-500/40",   dot: "bg-amber-500" },
  red:     { bg: "bg-red-600/20",     text: "text-red-300",     ring: "ring-red-500/40",     dot: "bg-red-500" },
  blue:    { bg: "bg-blue-600/20",    text: "text-blue-300",    ring: "ring-blue-500/40",    dot: "bg-blue-500" },
  pink:    { bg: "bg-pink-600/20",    text: "text-pink-300",    ring: "ring-pink-500/40",    dot: "bg-pink-500" },
  cyan:    { bg: "bg-cyan-600/20",    text: "text-cyan-300",    ring: "ring-cyan-500/40",    dot: "bg-cyan-500" },
  orange:  { bg: "bg-orange-600/20",  text: "text-orange-300",  ring: "ring-orange-500/40",  dot: "bg-orange-500" },
  lime:    { bg: "bg-lime-600/20",    text: "text-lime-300",    ring: "ring-lime-500/40",    dot: "bg-lime-500" },
  fuchsia: { bg: "bg-fuchsia-600/20", text: "text-fuchsia-300", ring: "ring-fuchsia-500/40", dot: "bg-fuchsia-500" },
  zinc:    { bg: "bg-zinc-600/40",    text: "text-zinc-200",    ring: "ring-zinc-500/40",    dot: "bg-zinc-500" },
};
const TAG_COLOR_KEYS = Object.keys(TAG_COLORS);
const DEFAULT_TAG_COLOR = "zinc";

type CSVUploadRecord = {
  id: string;
  fileName: string;
  date: string;
  totalRows: number;
  success: number;
  duplicates: number;
  invalid: number;
  // Optional extras shown in the history table. Left nullable so older rows
  // still render cleanly as "N/A".
  validationUsed?: string | null;
  charged?: number | null;
  tcpaViolations?: number;
  dncComplainers?: number;
  // If present, the original CSV text we stored so the Download button works.
  fileContent?: string | null;
};

type CSVColumnMapping = {
  csvHeader: string;
  preview: string[];
  mappedTo: string;
};

const CSV_CONTACT_FIELDS = [
  { value: "", label: "Select" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "address", label: "Address" },
  { value: "zip", label: "Zip" },
  { value: "lead_source", label: "Lead Source" },
  { value: "date_of_birth", label: "Date of Birth" },
  { value: "age", label: "Age" },
  { value: "quote", label: "Quote" },
  { value: "policy_id", label: "Policy ID" },
  { value: "timeline", label: "Timeline" },
  { value: "household_size", label: "Household Size" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Tags" },
];

function autoDetectMapping(_header: string): string {
  // Auto-detection is deliberately disabled. CRM exports vary too much — e.g.
  // the real phone number can be under Business/Mobile/Home/Work — so any
  // automatic guess silently dropped rows at send time. The user maps every
  // column themselves.
  return "";
}

type TeamMemberDetail = {
  profile: AccountRecord;
  contacts: ContactRecord[];
  campaigns: CampaignRecord[];
  conversations: ConversationRecord[];
};
// Paginated CSV-history loader — start small, let the user opt in to more.
const CSV_HISTORY_PAGE_SIZE = 20;

type NewCampaignForm = {
  name: string;
  steps: CampaignStep[];
  selectedNumbers: string[];
  // Per-campaign quiet hours override. "inherit" uses the profile default; "on"
  // and "off" override it. The hour fields only apply when mode === "on".
  quietHoursMode?: "inherit" | "on" | "off";
  quietHoursStartHour?: number;
  quietHoursEndHour?: number;
};
type AvailableNumber = { raw: string; display: string; locality: string; region: string };

// Convert DB rows to camelCase adapter types
function profileToAccount(p: Profile): AccountRecord {
  return {
    id: p.id, role: p.role, firstName: p.first_name, lastName: p.last_name,
    phone: p.phone, email: p.email, credits: p.credits, verified: p.verified,
    paused: p.paused, workflowNote: p.workflow_note,
    usageHistory: p.usage_history || [], plan: p.plan,
    createdAt: p.created_at, walletBalance: p.wallet_balance,
    ownedNumbers: p.owned_numbers || [],
    subscriptionStatus: p.subscription_status || "inactive",
    freeSubscription: p.free_subscription || false,
    teamCode: p.team_code || "", managerId: p.manager_id, referralCode: p.referral_code || "",
    a2pRegistration: p.a2p_registration || null,
    complianceLog: p.compliance_log || [],
    autoRecharge: p.auto_recharge || { enabled: false, threshold: 1, amount: 20 },
    businessSlug: p.business_slug || null,
    businessDescription: p.business_description || null,
    businessLogoUrl: p.business_logo_url || null,
    tagLibrary: p.tag_library || [],
    aiPlan: p.ai_plan || false,
    aiAutoReply: p.ai_auto_reply || false,
    agentPlan: p.agent_plan || false,
    aiInstructions: p.ai_instructions || "",
    industry: p.industry || "",
    availableHours: (p.available_hours as AccountRecord["availableHours"]) || undefined,
    googleCalendarConnected: !!p.google_calendar_tokens,
  };
}

function contactToRecord(c: Contact): ContactRecord {
  return {
    id: c.id, firstName: c.first_name, lastName: c.last_name, phone: c.phone,
    email: c.email || undefined, city: c.city || undefined, state: c.state || undefined,
    tags: c.tags, notes: c.notes || undefined, dnc: c.dnc,
    campaign: c.campaign || undefined, createdAt: c.created_at,
    address: c.address || undefined, zip: c.zip || undefined,
    leadSource: c.lead_source || undefined, quote: c.quote || undefined,
    policyId: c.policy_id || undefined, timeline: c.timeline || undefined,
    householdSize: c.household_size || undefined, dateOfBirth: c.date_of_birth || undefined,
    age: c.age || undefined,
  };
}

function campaignToRecord(c: Campaign): CampaignRecord {
  return {
    id: c.id, name: c.name, audience: c.audience, sent: c.sent,
    replies: c.replies, failed: c.failed, status: c.status,
    message: c.message || undefined, steps: c.steps || [],
    selectedNumbers: c.selected_numbers || [], logs: c.logs || [],
  };
}

function messageToRecord(m: Message): ConversationMessage {
  return {
    id: m.id, direction: m.direction, body: m.body,
    createdAt: m.created_at, status: m.status,
    fromNumber: m.from_number,
  };
}

function convToRecord(c: Conversation & { ai_enabled?: boolean; agent_enabled?: boolean; ai_skipped_reason?: string | null }, msgs: ConversationMessage[]): ConversationRecord {
  return {
    id: c.id, contactId: c.contact_id, preview: c.preview,
    unread: c.unread, lastMessageAt: c.last_message_at,
    starred: c.starred, fromNumber: c.from_number,
    aiEnabled: c.ai_enabled || false,
    agentEnabled: c.agent_enabled || false,
    aiSkippedReason: c.ai_skipped_reason || null,
    messages: msgs,
  };
}

function formatCurrency(value: number) {
  // Show 3 decimal places for small values like $0.012, 2 for everything else
  const decimals = value > 0 && value < 1 && value !== Math.round(value * 100) / 100 ? 3 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatTime(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatConversationDay(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] || "";
  const last = lastName?.trim()?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
}

// Deterministic color per phone number — so each of the user's lines gets a
// consistent dot/badge color in the conversation list.
const NUMBER_BADGE_COLORS = [
  "bg-sky-500/20 text-sky-300 ring-sky-500/40",
  "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  "bg-pink-500/20 text-pink-300 ring-pink-500/40",
  "bg-violet-500/20 text-violet-300 ring-violet-500/40",
  "bg-teal-500/20 text-teal-300 ring-teal-500/40",
  "bg-orange-500/20 text-orange-300 ring-orange-500/40",
  "bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/40",
];
function getNumberColor(num?: string) {
  const digits = (num || "").replace(/\D/g, "");
  if (!digits) return NUMBER_BADGE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < digits.length; i++) hash = (hash * 31 + digits.charCodeAt(i)) | 0;
  return NUMBER_BADGE_COLORS[Math.abs(hash) % NUMBER_BADGE_COLORS.length];
}
function getLastFour(num?: string) {
  const digits = (num || "").replace(/\D/g, "");
  return digits.slice(-4);
}

// No more demo data builders — data comes from Supabase

const SALES_QUOTES = [
  "Every 'no' gets you closer to a 'yes.' Keep dialing.",
  "Your pipeline is your lifeline — fill it every single day.",
  "Fortune favors the follow-up. Most deals close after the 5th touch.",
  "Sell the outcome, not the product.",
  "The best time to prospect was yesterday. The second best time is now.",
  "People don't buy what you do — they buy why you do it.",
  "Be so good they can't ignore your messages.",
  "A goal without a plan is just a wish. Set your daily targets.",
  "The money is in the relationship, not the transaction.",
  "Hustle beats talent when talent doesn't hustle.",
  "Stop selling. Start helping. The sales will follow.",
  "Discipline is doing what needs to be done, even when you don't feel like it.",
  "Every champion was once a contender who refused to give up.",
  "Success is rented, and the rent is due every day.",
  "Your attitude determines your altitude in sales.",
  "The difference between try and triumph is a little 'umph.'",
  "Objections are just questions in disguise. Answer them confidently.",
  "You miss 100% of the shots you don't take — Wayne Gretzky.",
  "Don't wait for opportunity. Create it with every text you send.",
  "The top 20% of salespeople make 80% of the money. Be in the 20%.",
  "Sales is not about selling anymore — it's about building trust.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Consistency is what transforms average into excellence.",
  "Your network is your net worth. Grow it daily.",
  "The harder you work, the luckier you get.",
  "Champions don't show up to get everything they want — they show up to give everything they have.",
  "Don't count the days. Make the days count.",
  "A satisfied customer is the best business strategy of all.",
  "Work like there is someone working 24 hours a day to take it away from you.",
  "Success usually comes to those who are too busy to be looking for it.",
  "The secret of getting ahead is getting started.",
  "Great things never come from comfort zones.",
  "Dream big. Start small. Act now.",
  "The only limit to our realization of tomorrow is our doubts of today.",
  "Sales is a numbers game — increase your numbers, increase your income.",
  "Be the person who decided to go for it.",
  "Small daily improvements over time lead to stunning results.",
  "Winners are not people who never fail, but people who never quit.",
  "Your competition is not other people. Your competition is your procrastination.",
  "Revenue is vanity, profit is sanity, but cash flow is reality.",
  "Don't sell life insurance. Sell what life insurance can do.",
  "The best salespeople are the best listeners.",
  "If you're not first, you're last. Speed to lead wins.",
  "Prospects buy emotionally and justify logically.",
  "Stay hungry. Stay foolish. Stay closing.",
  "Success is walking from failure to failure with no loss of enthusiasm.",
  "The question isn't who's going to let me — it's who's going to stop me.",
  "Believe you can and you're halfway there.",
  "It's not about having the right opportunities. It's about handling them the right way.",
  "In sales, it's not what you say — it's how you make them feel.",
  "You don't close a sale. You open a relationship.",
  "The best revenge is massive success.",
  "Don't be afraid to give up the good to go for the great.",
  "Action is the foundational key to all success.",
  "Today's preparation determines tomorrow's achievement.",
  "Your only limit is you. Push past it.",
  "Top performers don't wait for motivation — they create it through action.",
  "The pain of discipline is nothing compared to the pain of regret.",
  "Think like a customer. Act like a partner.",
  "If you want something you've never had, do something you've never done.",
  "Excuses don't build empires. Results do.",
  "The fortune is in the follow-through.",
  "Set a goal so big that you can't achieve it until you grow into the person who can.",
  "Treat every lead like they're your only lead.",
  "Rejection is redirection. Learn from it and move forward.",
  "You are the CEO of your own sales career. Act like it.",
  "Don't wish it were easier. Wish you were better.",
  "Every text you send is a seed. Keep planting.",
  "Be relentless in the pursuit of what sets your soul on fire.",
  "The best way to predict the future is to create it.",
  "Confidence is not 'they will like me.' Confidence is 'I'll be fine if they don't.'",
  "A river cuts through rock not because of its power, but because of its persistence.",
  "Success isn't overnight. It's when every day you get a little better.",
  "The grind you put in today is the success story you'll tell tomorrow.",
  "Average sellers sell features. Top sellers sell transformations.",
  "Make your pipeline so full that you can afford to lose any deal.",
  "When they say 'I'll think about it,' give them something worth thinking about.",
  "The top closers aren't pushier — they're more prepared.",
  "Speed, simplicity, and sincerity — the three S's of great sales.",
  "Never let a bad day make you feel like you have a bad life.",
  "The only way to do great work is to love what you do.",
  "Your energy introduces you before you even speak. Bring the fire.",
  "Stop overthinking. Start outworking.",
  "Prospects don't care about your quota. They care about their problems.",
  "Be the solution they didn't know they needed.",
  "Pressure is a privilege — it means the stakes are high enough to matter.",
  "The close is not the end. It's the beginning of the relationship.",
  "Don't find customers for your product. Find products for your customers.",
  "Work hard in silence. Let your numbers make the noise.",
  "You can't build a reputation on what you're going to do. Build it today.",
  "Success is the sum of small efforts repeated day in and day out.",
  "If plan A doesn't work, the alphabet has 25 more letters.",
  "When you feel like quitting, remember why you started.",
  "Invest in yourself — it pays the best interest.",
  "Nothing will work unless you do.",
  "The person who says it cannot be done should not interrupt the person doing it.",
  "Make today so awesome that yesterday gets jealous.",
  "Don't downgrade your dream just to fit your reality. Upgrade your hustle.",
  "The sale begins when the customer says no.",
  "Go the extra mile. It's never crowded there.",
  "Outwork everyone. Out-care everyone. Outlast everyone.",
];

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AccountRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatingUserName, setImpersonatingUserName] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("billing");
  const [message, setMessage] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>({
    name: "",
    steps: [{ id: `step_${Date.now()}`, message: "", delayMinutes: 0 }],
    selectedNumbers: [],
    quietHoursMode: "inherit",
    quietHoursStartHour: 21,
    quietHoursEndHour: 8,
  });
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [csvCampaignId, setCsvCampaignId] = useState<string>("");
  // CSV Upload Wizard
  const [csvUploadStep, setCsvUploadStep] = useState<1 | 2 | 3>(1);
  const [csvRawData, setCsvRawData] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvColumnMappings, setCsvColumnMappings] = useState<CSVColumnMapping[]>([]);
  const [csvIgnoreDuplicates, setCsvIgnoreDuplicates] = useState(true);
  const [csvUploadTags, setCsvUploadTags] = useState<string[]>([]);
  const [csvTagInput, setCsvTagInput] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvUploadHistory, setCsvUploadHistory] = useState<CSVUploadRecord[]>([]);
  const [csvHistorySearch, setCsvHistorySearch] = useState("");
  const [csvHistoryHasMore, setCsvHistoryHasMore] = useState(false);
  const [csvHistoryLoadingMore, setCsvHistoryLoadingMore] = useState(false);
  // Original CSV file text — stashed at file-select time so we can save it to
  // Supabase on upload and offer re-download from the history table later.
  const [csvRawText, setCsvRawText] = useState("");
  const csvUploadRef = useRef<HTMLInputElement>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editCampaignForm, setEditCampaignForm] = useState<NewCampaignForm>({ name: "", steps: [], selectedNumbers: [] });
  const [editStepIndex, setEditStepIndex] = useState(0);
  const [numberSearch, setNumberSearch] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [deletingNumberId, setDeletingNumberId] = useState<string | null>(null);
  // Deliverability keyed by 10-digit normalized number. Refreshed when the
  // Numbers tab opens and every 30s while it's visible, plus on every
  // messages-table INSERT/UPDATE via realtime so bad numbers show up fast.
  const [deliverability, setDeliverability] = useState<Record<string, { total: number; delivered: number; failed: number; pending: number }>>({});
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [showConvContactPanel, setShowConvContactPanel] = useState(false);
  const [convShowArchived, setConvShowArchived] = useState(false);
  // "All" is the default view when the Chats sidebar first mounts. It's a
  // no-op filter (the archive rule still hides DNC + archived), but we
  // light up the All chip so the user can see which tab is active.
  const [convShowAll, setConvShowAll] = useState(true);
  const [convShowUnread, setConvShowUnread] = useState(false);
  const [convShowRecents, setConvShowRecents] = useState(false);
  const [convShowWorking, setConvShowWorking] = useState(false);
  const [archivedConvIds, setArchivedConvIds] = useState<Set<string>>(new Set());
  // Working-lead pins — conversations the user has flagged as actively being
  // worked. Persists locally per-user so it survives refreshes without a
  // schema change.
  const [workingLeadConvIds, setWorkingLeadConvIds] = useState<Set<string>>(new Set());
  const [convSelectMode, setConvSelectMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [composerText, setComposerText] = useState("");
  const [convFromNumber, setConvFromNumber] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactPage, setContactPage] = useState(0);
  const CONTACTS_PER_PAGE = 100;
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagManagerName, setTagManagerName] = useState("");
  const [tagManagerColor, setTagManagerColor] = useState<string>("violet");
  const [aiSuggestedReply, setAiSuggestedReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  // Appointments
  type AppointmentRecord = {
    id: string; user_id: string; contact_id: string | null; conversation_id: string | null;
    title: string; date: string; time: string; duration_minutes: number;
    notes: string; status: string; reminder_sent: boolean; created_at: string;
    contacts?: { first_name: string; last_name: string; phone: string } | null;
  };
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [newAptForm, setNewAptForm] = useState({ contactId: "", date: "", time: "", title: "Appointment", notes: "" });
  const [viewContactId, setViewContactId] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactForm, setAddContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "", city: "", state: "" });
  const [campaignSearch, setCampaignSearch] = useState("");
  const [launchingCampaignId, setLaunchingCampaignId] = useState<string | null>(null);
  const [scheduleCampaignId, setScheduleCampaignId] = useState<string | null>(null);
  const [campaignScheduleDate, setCampaignScheduleDate] = useState("");
  const [campaignScheduleTime, setCampaignScheduleTime] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const defaultOptOut: OptOutSettings = {
    keywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
    optInKeywords: ["START", "SUBSCRIBE", "UNSTOP", "YES"],
    autoReplyMessage: "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.",
    optInReplyMessage: "You have been re-subscribed. Reply STOP to unsubscribe.",
    includeCompanyName: true,
    companyName: "",
    confirmOptOut: true,
    autoMarkDnc: true,
  };
  const [optOutSettings, setOptOutSettings] = useState<OptOutSettings>(defaultOptOut);
  const [optOutNewKeyword, setOptOutNewKeyword] = useState("");
  const [optInNewKeyword, setOptInNewKeyword] = useState("");
  const [savingOptOut, setSavingOptOut] = useState(false);

  // Quiet hours (TCPA). Default on to keep everyone out of trouble; user can
  // disable explicitly with an "I accept the risk" style acknowledgment.
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStartHour, setQuietHoursStartHour] = useState(21); // 9 PM
  const [quietHoursEndHour, setQuietHoursEndHour] = useState(8);       // 8 AM
  const [savingQuietHours, setSavingQuietHours] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<AccountRecord[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [teamMemberDetail, setTeamMemberDetail] = useState<TeamMemberDetail | null>(null);
  const [teamJoinCode, setTeamJoinCode] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamAddFundsAmount, setTeamAddFundsAmount] = useState("10");
  const [customFundAmount, setCustomFundAmount] = useState("");
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState("1");
  const [autoRechargeAmount, setAutoRechargeAmount] = useState("20");
  const [billingTransferMemberId, setBillingTransferMemberId] = useState("");
  const [billingTransferAmount, setBillingTransferAmount] = useState("");
  const [teamManagerName, setTeamManagerName] = useState("");
  const [learnSection, setLearnSection] = useState<string | null>("getting-started");
  const [demoMode, setDemoMode] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("general");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplateBody, setEditingTemplateBody] = useState("");
  const [editingTemplateCategory, setEditingTemplateCategory] = useState("general");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("all");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Scheduled messages state
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // "Add to Workflow" — puts the current contact (or a bulk selection of
  // conversations) on a multi-step drip that auto-stops the moment they
  // reply (see cancel_on_reply in incoming-sms).
  const [showAddToWorkflow, setShowAddToWorkflow] = useState(false);
  const [workflowCampaignId, setWorkflowCampaignId] = useState("");
  const [workflowUseCurrentNumber, setWorkflowUseCurrentNumber] = useState(true);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [workflowBulkMode, setWorkflowBulkMode] = useState(false);

  // Schedule Follow-up — one-click Calendar event from the conversation.
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  // Inline error shown in the follow-up modal. The global toast lives at
  // z-40 and the modal overlay is z-50, so a toast fired from here is
  // hidden behind the overlay — the user sees the button "do nothing".
  // Render errors inside the modal instead.
  const [followUpError, setFollowUpError] = useState("");

  // ── Integrations tab state ────────────────────────────────────────────────
  type Integration = {
    id: string;
    name: string;
    token: string;
    campaign_id: string | null;
    auto_sms: boolean;
    created_at: string;
    campaigns?: { name: string } | null;
  };
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [integrationName, setIntegrationName] = useState("");
  const [integrationCampaignId, setIntegrationCampaignId] = useState("");
  const [integrationAutoSms, setIntegrationAutoSms] = useState(false);
  const [integrationSaving, setIntegrationSaving] = useState(false);
  const [copiedIntegrationId, setCopiedIntegrationId] = useState<string | null>(null);
  const [leadNotification, setLeadNotification] = useState<string | null>(null);

  // Response-time SLA stats — computed server-side via the first_reply_stats
  // RPC so it stays accurate regardless of how many messages are loaded
  // client-side. Refreshed every 30s while the dashboard is open.
  const [firstReplyStats, setFirstReplyStats] = useState<{
    avgMinutes: number;
    repliedCount: number;
    hotLeads: number;
  }>({ avgMinutes: 0, repliedCount: 0, hotLeads: 0 });

  // Quick replies (stored in profile as JSONB)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([
    { id: "qr1", label: "Thanks", body: "Thank you for your message! I'll get back to you shortly." },
    { id: "qr2", label: "Busy", body: "I'm currently unavailable. I'll respond as soon as possible." },
    { id: "qr3", label: "Confirm", body: "Great, that's confirmed! Talk soon." },
  ]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [newQrLabel, setNewQrLabel] = useState("");
  const [newQrBody, setNewQrBody] = useState("");

  // 10DLC A2P Registration state
  const [a2pStep, setA2pStep] = useState(0); // 0=info, 1=submitting, 2=brand pending, 3=campaign form, 4=campaign pending, 5=done
  const [a2pLoading, setA2pLoading] = useState(false);
  const [a2pForm, setA2pForm] = useState({
    businessName: "", businessType: "llc" as "sole_proprietor" | "partnership" | "corporation" | "llc" | "non_profit",
    ein: "", businessAddress: "", businessCity: "", businessState: "", businessZip: "", businessCountry: "US",
    website: "", hasWebsite: "yes" as "yes" | "no", buildPage: false, businessDescription: "",
    contactFirstName: "", contactLastName: "", contactEmail: "", contactPhone: "",
    useCase: "MIXED", description: "", sampleMessage1: "", sampleMessage2: "",
    messageFlow: "End users opt-in by signing up on our website and providing their phone number. They can opt out at any time by replying STOP.",
    optInMessage: "You have opted in to receive messages. Reply STOP to unsubscribe.",
    optOutMessage: "You have been unsubscribed and will no longer receive messages. Reply START to re-subscribe.",
    helpMessage: "Reply HELP for assistance or STOP to unsubscribe. Contact support at our website.",
    hasEmbeddedLinks: true, hasEmbeddedPhone: false,
  });

  // Search & filter state
  const [globalSearch, setGlobalSearch] = useState("");
  const [dncFilter, setDncFilter] = useState<"all" | "active" | "dnc">("all");
  const [lastContactedFilter, setLastContactedFilter] = useState<"any" | "today" | "7d" | "30d" | "never">("any");

  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Notification permission
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Support chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender_role: string; message: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatUnread, setChatUnread] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Auto-scroll the main conversation messages to bottom on open + new message.
  const convMessagesEndRef = useRef<HTMLDivElement>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const campaignTextareaRef = useRef<HTMLTextAreaElement>(null);

  const messageTemplates = [
    "Hi {firstName}, are you still looking for health coverage options this month?",
    "Hey {firstName}, I found a plan that could lower your monthly cost. Want me to send details?",
    "Hi {firstName}, just following up on your inquiry. Is this still a good time to connect?",
    "Hello {firstName}, I have some $0 deductible PPO options available in your area.",
  ];

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }

      const realUid = session.user.id;

      const myProfile = await fetchProfile(realUid);
      if (!myProfile || myProfile.paused) {
        router.replace("/");
        return;
      }

      // Check for admin impersonation mode
      const impersonateId = searchParams.get("impersonate");
      let uid = realUid;
      let profile = myProfile;

      if (impersonateId && impersonateId !== realUid) {
        const canImpersonate =
          myProfile.role === "admin" ||
          (myProfile.role === "manager" && (await fetchProfile(impersonateId))?.manager_id === realUid);

        if (canImpersonate) {
          const targetProfile = await fetchProfile(impersonateId);
          if (targetProfile) {
            uid = impersonateId;
            profile = targetProfile;
            setImpersonating(true);
            setImpersonatingUserName(`${targetProfile.first_name} ${targetProfile.last_name}`);
          }
        }
      }

      setUserId(uid);
      setCurrentUser(profileToAccount(profile));
      if (profile.opt_out_settings) setOptOutSettings(profile.opt_out_settings);
      if (profile.auto_recharge) {
        setAutoRechargeEnabled(profile.auto_recharge.enabled);
        setAutoRechargeThreshold(String(profile.auto_recharge.threshold));
        setAutoRechargeAmount(String(profile.auto_recharge.amount));
      }
      // Quiet hours — default ON if the profile hasn't set them yet, so brand
      // new users start TCPA-compliant.
      setQuietHoursEnabled(profile.quiet_hours_enabled ?? true);
      setQuietHoursStartHour(profile.quiet_hours_start_hour ?? 21);
      setQuietHoursEndHour(profile.quiet_hours_end_hour ?? 8);

      // Load archived conversation IDs from localStorage
      try {
        const stored = window.localStorage.getItem(`t2s_archived_convs_${uid}`);
        if (stored) setArchivedConvIds(new Set(JSON.parse(stored)));
      } catch { /* ignore */ }

      // Load working-lead pins from localStorage
      try {
        const stored = window.localStorage.getItem(`t2s_working_leads_${uid}`);
        if (stored) setWorkingLeadConvIds(new Set(JSON.parse(stored)));
      } catch { /* ignore */ }

      // Load CSV upload history from DB — first page only. Power users with
      // hundreds of uploads were eating dashboard load time on every mount
      // pulling all 200 rows. Load 20 eagerly, expose "Load more" in the UI.
      try {
        const { data: uploadRows } = await supabase
          .from("csv_uploads")
          // Explicit column list (no file_content) — keeps the payload small on
          // initial load. We pull file_content on demand when Download is clicked.
          .select("id, file_name, uploaded_at, total_rows, success, duplicates, invalid, tcpa_violations, dnc_complainers, validation_used, charged")
          .eq("user_id", uid)
          .order("uploaded_at", { ascending: false })
          .limit(CSV_HISTORY_PAGE_SIZE + 1); // +1 to detect hasMore
        if (uploadRows) {
          const hasMore = uploadRows.length > CSV_HISTORY_PAGE_SIZE;
          const page = hasMore ? uploadRows.slice(0, CSV_HISTORY_PAGE_SIZE) : uploadRows;
          setCsvUploadHistory(page.map((r) => ({
            id: r.id as string,
            fileName: r.file_name as string,
            date: r.uploaded_at as string,
            totalRows: (r.total_rows as number) || 0,
            success: (r.success as number) || 0,
            duplicates: (r.duplicates as number) || 0,
            invalid: (r.invalid as number) || 0,
            validationUsed: (r.validation_used as string | null) || null,
            charged: (r.charged as number | null) ?? null,
            tcpaViolations: (r.tcpa_violations as number) || 0,
            dncComplainers: (r.dnc_complainers as number) || 0,
          })));
          setCsvHistoryHasMore(hasMore);
        }
      } catch { /* ignore */ }

      const [dbContacts, dbCampaigns, dbConversations, dbTemplates, dbScheduled] = await Promise.all([
        dbFetchContacts(uid),
        dbFetchCampaigns(uid),
        dbFetchConversations(uid),
        fetchTemplates(uid),
        fetchScheduledMessages(uid),
      ]);

      setContacts(dbContacts.map(contactToRecord));
      setCampaigns(dbCampaigns.map(campaignToRecord));
      setTemplates(dbTemplates);
      setScheduledMessages(dbScheduled);

      // Load messages for each conversation
      const convRecords: ConversationRecord[] = await Promise.all(
        dbConversations.map(async (conv) => {
          const msgs = await fetchMessages(conv.id);
          return convToRecord(conv, msgs.map(messageToRecord));
        })
      );

      setConversations(convRecords);
      if (convRecords.length > 0) {
        setSelectedConversationId(convRecords[0].id);
      }

      // Load appointments
      try {
        const aptRes = await fetch(`/api/appointments?userId=${uid}`);
        const aptData = await aptRes.json();
        if (aptData.appointments) setAppointments(aptData.appointments);
      } catch { /* ignore */ }

      // Load team data for managers
      if (profile.role === "manager" || profile.role === "admin") {
        const members = await fetchTeamMembers(uid);
        setTeamMembers(members.map(profileToAccount));
      }

      // If user is on a team, load manager name
      if (profile.manager_id) {
        const mgr = await fetchProfile(profile.manager_id);
        if (mgr) setTeamManagerName(`${mgr.first_name} ${mgr.last_name}`);
      }

      // Handle Stripe payment success redirect
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      const paymentAmount = parseFloat(params.get("amount") || "0");

      if (paymentStatus === "success" && paymentAmount > 0) {
        // Re-fetch profile to get updated wallet balance from webhook
        const refreshed = await fetchProfile(uid);
        if (refreshed) setCurrentUser(profileToAccount(refreshed));
        setMessage(`✅ Payment successful — $${paymentAmount.toFixed(2)} added to wallet`);
        window.setTimeout(() => setMessage(""), 4000);
        // Clean URL
        window.history.replaceState({}, "", "/dashboard");
      } else if (paymentStatus === "cancelled") {
        setMessage("Payment cancelled");
        window.setTimeout(() => setMessage(""), 3000);
        window.history.replaceState({}, "", "/dashboard");
      }

      // Handle Stripe subscription success redirect
      const subStatus = params.get("subscription");
      if (subStatus === "success") {
        const refreshed = await fetchProfile(uid);
        if (refreshed) setCurrentUser(profileToAccount(refreshed));
        setMessage("✅ Subscription activated! Welcome to Text2Sale.");
        window.setTimeout(() => setMessage(""), 4000);
        window.history.replaceState({}, "", "/dashboard");
      } else if (subStatus === "cancelled") {
        setMessage("Subscription signup cancelled");
        window.setTimeout(() => setMessage(""), 3000);
        window.history.replaceState({}, "", "/dashboard");
      }

      // Handle Google Calendar connect success redirect
      if (params.get("gcal") === "success") {
        const refreshed = await fetchProfile(uid);
        if (refreshed) setCurrentUser(profileToAccount(refreshed));
        setMessage("\u2705 Google Calendar connected successfully!");
        window.setTimeout(() => setMessage(""), 4000);
        window.history.replaceState({}, "", "/dashboard");
      }

      // Handle Google Calendar connect failure — previously this was silent
      // (user clicked Connect, got bounced back to a blank dashboard with
      // ?gcal=error in the URL but no UI). Now we surface the reason.
      if (params.get("gcal") === "error") {
        const reason = params.get("reason") || "unknown";
        const reasonMap: Record<string, string> = {
          not_configured: "Google Calendar isn't configured on the server yet. Contact support.",
          auth_missing: "Please sign in again and try connecting Google Calendar.",
          auth_invalid: "Your session expired. Sign in again and try connecting.",
          auth_failed: "Authentication with Google failed. Try connecting again.",
          token_exchange: "Google rejected the authorization — try connecting again.",
          save_failed: "Couldn't save your Google tokens. Try again or contact support.",
          missing_params: "Google Calendar connect was cancelled.",
          invalid_state: "Security check failed — try connecting again.",
          access_denied: "You denied Google Calendar access.",
          unknown: "Google Calendar connect failed. Try again.",
        };
        setMessage(`\u274C ${reasonMap[reason] || reasonMap.unknown}`);
        window.setTimeout(() => setMessage(""), 6000);
        window.history.replaceState({}, "", "/dashboard");
      }

      // Handle tab redirect (e.g. from Stripe portal return / thank-you page)
      const tabParam = params.get("tab");
      const subtabParam = params.get("subtab");
      const validTabs: DashboardTab[] = ["overview","conversations","campaigns","contacts","appointments","upload","templates","settings","learn"];
      const validSubtabs: SettingsSubTab[] = ["numbers","billing","opt-out","activity","team","10dlc","biz-page","ai","integrations"];
      if (tabParam && validTabs.includes(tabParam as DashboardTab)) {
        setActiveTab(tabParam as DashboardTab);
      }
      if (subtabParam && validSubtabs.includes(subtabParam as SettingsSubTab)) {
        setActiveTab("settings");
        setSettingsSubTab(subtabParam as SettingsSubTab);
      }
      if (tabParam || subtabParam) {
        window.history.replaceState({}, "", "/dashboard");
      }

      // Show onboarding wizard for new users (skip if impersonating)
      if (!impersonateId) {
        const sub = profile.subscription_status;
        const hasSubscription = sub === "active" || sub === "canceling";
        const hasNumbers = (profile.owned_numbers || []).length > 0;
        const hasContacts = dbContacts.length > 0;
        if (!hasSubscription || !hasNumbers || !hasContacts) {
          setShowOnboarding(true);
          setOnboardingStep(hasSubscription ? (hasNumbers ? 3 : 2) : 0);
        }
      }

      // Load theme preference
      try {
        const savedTheme = window.localStorage.getItem("t2s_theme");
        if (savedTheme === "light") setThemeMode("light");
      } catch { /* ignore */ }

      setMounted(true);
    };

    loadData();
  }, [router, searchParams]);

  // Real-time notifications for new inbound messages
  useEffect(() => {
    if (!userId) return;

    // Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        setNotificationsEnabled(perm === "granted");
      });
    } else if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as { id: string; conversation_id: string; direction: string; body: string; status: string; created_at: string; from_number?: string };
          if (newMsg.direction !== "inbound") return;

          const msgRecord: ConversationMessage = {
            id: newMsg.id,
            direction: newMsg.direction as "inbound" | "outbound",
            body: newMsg.body,
            status: newMsg.status as ConversationMessage["status"],
            createdAt: newMsg.created_at,
            fromNumber: newMsg.from_number,
          };

          // Functional update — avoid stale closures on the conversations array.
          // If we don't have the conversation yet, it's a brand-new thread — fetch it,
          // add the message, and merge it into state so the UI updates immediately.
          let conversationExists = false;
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === newMsg.conversation_id);
            if (idx === -1) return prev;
            conversationExists = true;
            // Skip if we've already applied this message (echoes from our own insert).
            if (prev[idx].messages.some((m) => m.id === newMsg.id)) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              preview: newMsg.body.slice(0, 100),
              lastMessageAt: newMsg.created_at,
              unread: next[idx].id === selectedConversationId ? next[idx].unread : next[idx].unread + 1,
              messages: [...next[idx].messages, msgRecord],
            };
            // Re-sort so the freshly-active conversation jumps to the top of the list.
            next.sort((a, b) => { const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0; const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0; return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta); });
            return next;
          });

          if (!conversationExists) {
            // New conversation — pull it + its messages and merge in.
            const freshConvs = await dbFetchConversations(userId);
            const freshConv = freshConvs.find((c) => c.id === newMsg.conversation_id);
            if (!freshConv) return; // Not ours (wrong user).
            const msgs = await fetchMessages(freshConv.id);
            const freshRecord = convToRecord(freshConv, msgs.map(messageToRecord));
            setConversations((prev) => {
              if (prev.some((c) => c.id === freshRecord.id)) return prev;
              return [freshRecord, ...prev].sort(
                (a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || "")
              );
            });
            // If the contact was auto-created by the webhook, refresh contacts too.
            const dbContacts = await dbFetchContacts(userId);
            setContacts(dbContacts.map(contactToRecord));
          }

          // Browser notification
          if (notificationsEnabled && typeof document !== "undefined" && document.hidden) {
            new Notification("New Message", {
              body: newMsg.body.slice(0, 100),
              icon: "/favicon.ico",
            });
          }

          // Audio ping
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkIuDdW1wfIiOjYV8c3B9iI+OhXtzc3yHjo6FeXV0fIaOjYV7c3J9h46NhXtzcnyHjo2FfHNyfYeOjYV7c3J8h46OhXtzcnuHj46Fe3NyfYePjoV7c3J8h4+OhXtzcnyHj46Fe3NzfIePjoV7c3J8h4+OhXtzcnyHj46FenRyfYeOjoV7c3J8h4+OhXtzcnyGj46Fe3Nze4eOjoV7c3N8h4+OhXt0cnyHj42FfHNyfYeOjYV8cnJ9h46NhXxzc3yHjo2FfHNyfIeOjYV7c3N8ho6NhXxzc32Hjo2Fe3NyfYePjYV7c3J8h46Ng==");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, notificationsEnabled]);

  // Support chat: load messages and subscribe to realtime
  useEffect(() => {
    if (!userId) return;

    const loadChat = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, sender_role, message, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (data) {
        setChatMessages(data);
        const unread = data.filter((m) => m.sender_role === "admin" && !(m as Record<string, unknown>).read).length;
        setChatUnread(unread);
      }
    };
    loadChat();

    const chatChannel = supabase
      .channel("support-chat-user")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` },
        (payload) => {
          const msg = payload.new as { id: string; sender_role: string; message: string; created_at: string };
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_role === "admin") {
            setChatUnread((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(chatChannel); };
  }, [userId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  // Auto-scroll the main conversation thread to the latest message whenever
  // the user switches threads or a new message arrives.
  const selectedConvMsgCount =
    conversations.find((c) => c.id === selectedConversationId)?.messages.length ?? 0;
  useEffect(() => {
    convMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedConversationId, selectedConvMsgCount]);

  // Keep the wallet balance live. Two feeds, belt-and-suspenders:
  //   1) Realtime postgres_changes — fires on every UPDATE to this user's
  //      profiles row, so the ticker moves as send-campaign debits each
  //      chunk (usually within ~100ms of the server write).
  //   2) A 2s polling fallback — covers users whose network / Supabase
  //      realtime is flaky, and catches auth.users/Stripe side-writes too.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const fresh = Number((payload.new as { wallet_balance?: number })?.wallet_balance) || 0;
          setCurrentUser((prev) => {
            if (!prev || prev.walletBalance === fresh) return prev;
            return { ...prev, walletBalance: fresh };
          });
        }
      )
      .subscribe();

    const interval = window.setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", userId)
        .single();
      if (data) {
        const fresh = Number(data.wallet_balance) || 0;
        setCurrentUser((prev) => {
          if (!prev || prev.walletBalance === fresh) return prev;
          return { ...prev, walletBalance: fresh };
        });
      }
    }, 2000);
    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // First-reply SLA feed — keeps the Overview card fresh. Every 30s rather
  // than every 2s because these numbers don't move that often and the RPC
  // does a messages-wide scan per call.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadStats = async () => {
      const { data, error } = await supabase.rpc("first_reply_stats", {
        p_user_id: userId,
        p_days: 30,
      });
      if (cancelled || error || !data || !Array.isArray(data) || data.length === 0) return;
      const row = data[0] as { avg_minutes: number | string; replied_count: number | string; hot_leads: number | string };
      setFirstReplyStats({
        avgMinutes: Number(row.avg_minutes) || 0,
        repliedCount: Number(row.replied_count) || 0,
        hotLeads: Number(row.hot_leads) || 0,
      });
    };

    loadStats();
    const interval = window.setInterval(loadStats, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  // Poll campaigns in "Sending" status so the progress bar on each card
  // actually moves. send-campaign writes sent/failed/audience per wave, and
  // a 10k blast takes ~90s — without a live feed the user sees a spinner
  // with no feedback and refreshes, triggering a duplicate launch.
  useEffect(() => {
    if (!userId) return;
    const hasActive = campaigns.some((c) => c.status === "Sending");
    if (!hasActive) return;

    const interval = window.setInterval(async () => {
      const activeIds = campaigns.filter((c) => c.status === "Sending").map((c) => c.id);
      if (activeIds.length === 0) return;
      const { data } = await supabase
        .from("campaigns")
        .select("id, sent, failed, audience, status")
        .in("id", activeIds);
      if (!data) return;
      setCampaigns((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          const fresh = (data as Array<{ id: string; sent: number; failed: number; audience: number; status: string }>)
            .find((d) => d.id === c.id);
          if (!fresh) return c;
          if (
            c.sent === fresh.sent &&
            c.failed === fresh.failed &&
            c.audience === fresh.audience &&
            c.status === fresh.status
          ) return c;
          changed = true;
          return {
            ...c,
            sent: fresh.sent,
            failed: fresh.failed,
            audience: fresh.audience,
            status: fresh.status as typeof c.status,
          };
        });
        return changed ? next : prev;
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [userId, campaigns]);

  const handleSendChatMessage = async () => {
    if (!userId || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    await supabase.from("support_messages").insert({
      user_id: userId,
      sender_role: "user",
      message: text,
    });
  };

  const userCampaigns = useMemo(() => {
    if (!currentUser) return campaigns;
    return campaigns;
  }, [campaigns, currentUser]);

  const totalSent = useMemo(
    () => userCampaigns.reduce((sum, campaign) => sum + (campaign.sent || 0), 0),
    [userCampaigns]
  );

  const totalFailed = useMemo(
    () => userCampaigns.reduce((sum, campaign) => sum + (campaign.failed || 0), 0),
    [userCampaigns]
  );

  const totalReplies = useMemo(
    () => userCampaigns.reduce((sum, campaign) => sum + (campaign.replies || 0), 0),
    [userCampaigns]
  );

  const deliveryRate = useMemo(() => {
    const attempted = totalSent + totalFailed;
    if (attempted === 0) return 0;
    return (totalSent / attempted) * 100;
  }, [totalSent, totalFailed]);

  const replyRate = useMemo(() => {
    if (totalSent === 0) return 0;
    return (totalReplies / totalSent) * 100;
  }, [totalReplies, totalSent]);

  // ─── 7-day sparkline series ───────────────────────────────────────
  // Walks every conversation's messages and bins outbound vs. inbound
  // counts by day. Returns three parallel arrays of length 7 (oldest
  // first), ready to hand to <Sparkline values={...} />. This runs
  // entirely over in-memory state so it's cheap — no extra fetches.
  const last7 = useMemo(() => {
    const days = 7;
    const sent: number[] = Array(days).fill(0);
    const replies: number[] = Array(days).fill(0);
    const delivered: number[] = Array(days).fill(0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const DAY = 24 * 60 * 60 * 1000;

    for (const conv of conversations) {
      for (const m of conv.messages || []) {
        const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        if (!ts) continue;
        const diff = startOfToday - new Date(ts).setHours(0, 0, 0, 0);
        const idx = days - 1 - Math.round(diff / DAY);
        if (idx < 0 || idx >= days) continue;
        if (m.direction === "outbound") {
          sent[idx]++;
          if (m.status === "delivered" || m.status === "sent") delivered[idx]++;
        } else if (m.direction === "inbound") {
          replies[idx]++;
        }
      }
    }
    return { sent, replies, delivered };
  }, [conversations]);

  // All unique tags across contacts
  const viewContact = useMemo(() => {
    if (!viewContactId) return null;
    return contacts.find((c) => c.id === viewContactId) || null;
  }, [viewContactId, contacts]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    // Library tags always show in the filter bar even if no contact has them
    // yet — so the user sees "Sold" right after creating it.
    (currentUser?.tagLibrary || []).forEach((t) => { if (t.name.trim()) tagSet.add(t.name.trim()); });
    contacts.forEach((c) => (c.tags || []).forEach((t) => { if (t.trim()) tagSet.add(t.trim()); }));
    return Array.from(tagSet).sort();
  }, [contacts, currentUser?.tagLibrary]);

  // Look up the color a user assigned to a tag in their library; fall back
  // to a stable hash-based color for tags that exist on contacts but were
  // never registered (legacy / typed-in tags).
  const getTagStyle = (name: string) => {
    const key = name.trim().toLowerCase();
    const lib = (currentUser?.tagLibrary || []).find((t) => t.name.trim().toLowerCase() === key);
    if (lib && TAG_COLORS[lib.color]) return TAG_COLORS[lib.color];
    return TAG_COLORS[DEFAULT_TAG_COLOR];
  };

  // Pick one motivational quote per page load (stable across re-renders)
  const dailyQuote = useMemo(() => SALES_QUOTES[Math.floor(Math.random() * SALES_QUOTES.length)], []);

  const filteredContacts = useMemo(() => {
    const now = Date.now();
    return contacts.filter((c) => {
      // DNC filter
      if (dncFilter === "active" && c.dnc) return false;
      if (dncFilter === "dnc" && !c.dnc) return false;

      // Last contacted filter
      if (lastContactedFilter !== "any") {
        const conv = conversations.find((cv) => cv.contactId === c.id);
        if (lastContactedFilter === "never") {
          if (conv) return false;
        } else {
          if (!conv) return false;
          const lastAt = new Date(conv.lastMessageAt).getTime();
          const days = lastContactedFilter === "today" ? 1 : lastContactedFilter === "7d" ? 7 : 30;
          if (now - lastAt > days * 86400000) return false;
        }
      }

      // Tag filter
      if (tagFilter.length > 0) {
        const contactTags = (c.tags || []).map((t) => t.trim().toLowerCase());
        if (!tagFilter.every((tf) => contactTags.includes(tf.toLowerCase()))) return false;
      }
      // Search filter
      const q = contactSearch.trim().toLowerCase();
      if (!q) return true;
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const tags = (c.tags || []).join(" ").toLowerCase();
      return name.includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q) || (c.campaign || "").toLowerCase().includes(q) || tags.includes(q);
    });
  }, [contacts, contactSearch, tagFilter, dncFilter, lastContactedFilter, conversations]);

  // ── Realtime "New Lead" notification ─────────────────────────────────────
  // Subscribe to INSERT events on the contacts table. When a new contact
  // lands (e.g. pushed by an integration webhook), show a toast at the
  // bottom-left so the rep knows to act immediately.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("new-lead-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contacts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const contact = payload.new as {
            id: string;
            first_name?: string;
            last_name?: string;
            phone?: string;
            lead_source?: string;
          };

          // Only notify for leads that arrived via an integration webhook.
          // CSV imports, manual adds, and other direct inserts do NOT have
          // lead_source set to "Integration" so they are silently ignored.
          const src = (contact.lead_source || "").toLowerCase();
          if (!src.includes("integration")) return;

          const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.phone || "Unknown";
          setLeadNotification(`🔔 New lead — ${name}`);
          // Add to local contacts list so it appears immediately without a refresh
          setContacts((prev) => {
            if (prev.some((c) => c.id === contact.id)) return prev;
            return [payload.new as typeof prev[0], ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Pagination for the Contacts tab — 100 per page.
  // Reset to page 0 whenever the filtered set changes so the user doesn't
  // land on an empty page after changing a filter.
  const contactPageCount = Math.max(1, Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE));
  useEffect(() => {
    if (contactPage >= contactPageCount) setContactPage(0);
  }, [contactPageCount, contactPage]);
  useEffect(() => {
    setContactPage(0);
  }, [contactSearch, tagFilter, dncFilter, lastContactedFilter]);
  const pagedContacts = useMemo(() => {
    const start = contactPage * CONTACTS_PER_PAGE;
    return filteredContacts.slice(start, start + CONTACTS_PER_PAGE);
  }, [filteredContacts, contactPage]);

  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    if (!q) return userCampaigns;
    return userCampaigns.filter((c) => c.name.toLowerCase().includes(q));
  }, [userCampaigns, campaignSearch]);

  const recentActivity = useMemo(() => {
    if (!currentUser?.usageHistory) return [];
    return [...currentUser.usageHistory]
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);
  }, [currentUser]);

  const conversationsWithContacts = useMemo(() => {
    // Safe timestamp helper — null/undefined/invalid dates become 0 (epoch)
    // so they sort to the bottom instead of producing NaN which breaks the
    // comparator and leaves conversations in random order.
    const ts = (d: string | null | undefined): number => {
      if (!d) return 0;
      const n = new Date(d).getTime();
      return isNaN(n) ? 0 : n;
    };

    return conversations
      .map((conversation) => {
        const contact = contacts.find((item) => item.id === conversation.contactId) || null;
        return { ...conversation, contact };
      })
      .sort((a, b) => ts(b.lastMessageAt) - ts(a.lastMessageAt));
  }, [conversations, contacts]);

  // Persist archived conversation IDs
  useEffect(() => {
    if (userId && archivedConvIds.size >= 0) {
      try { window.localStorage.setItem(`t2s_archived_convs_${userId}`, JSON.stringify([...archivedConvIds])); } catch { /* ignore */ }
    }
  }, [archivedConvIds, userId]);

  // Persist working-lead pins
  useEffect(() => {
    if (userId) {
      try { window.localStorage.setItem(`t2s_working_leads_${userId}`, JSON.stringify([...workingLeadConvIds])); } catch { /* ignore */ }
    }
  }, [workingLeadConvIds, userId]);

  const filteredConversations = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    let list = conversationsWithContacts;

    // Filter by archive status. Opted-out (DNC) contacts are treated as
    // archived automatically — once someone replies STOP (or the user marks
    // them DNC), their conversation drops out of the main chat area so the
    // inbox stays focused on people who actually want to hear back. They
    // remain reachable via the Archived tab if the user needs to review.
    if (convShowArchived) {
      list = list.filter((c) => archivedConvIds.has(c.id) || !!c.contact?.dnc);
    } else {
      list = list.filter((c) => !archivedConvIds.has(c.id) && !c.contact?.dnc);
    }

    // Unread filter — only conversations where a lead actually texted the
    // user and the user hasn't opened it yet. Requires both (a) pending
    // unread count and (b) at least one inbound message, so one-way
    // campaign blasts with no replies never surface here. DNC contacts are
    // already excluded above.
    //
    // We keep the currently-selected conversation visible even after its
    // unread drops to 0 (auto-mark-as-read on click), otherwise it
    // vanishes the instant you click it and there's no way back without
    // switching tabs.
    if (convShowUnread) {
      list = list.filter((c) =>
        (c.unread > 0 && c.messages.some((m) => m.direction === "inbound"))
        || c.id === selectedConversationId
      );
    }

    // Recents filter — conversations the contact has actually replied in
    // (has at least one inbound message). Filters out one-way blasts.
    // Re-sort by the most recent inbound message so the hottest leads
    // (people who texted most recently) float to the top.
    if (convShowRecents) {
      const lastInboundTs = (c: typeof list[0]): number => {
        const inbound = c.messages.filter((m) => m.direction === "inbound");
        if (inbound.length === 0) return 0;
        const t = new Date(inbound[inbound.length - 1].createdAt).getTime();
        return isNaN(t) ? 0 : t;
      };
      list = list
        .filter((c) => c.messages.some((m) => m.direction === "inbound"))
        .sort((a, b) => lastInboundTs(b) - lastInboundTs(a));
    }

    // Working-lead filter — just the conversations the user has actively
    // pinned as "I'm working this". Pure user-flagged list, no automatic
    // heuristics, so it mirrors how a rep thinks about their pipeline.
    if (convShowWorking) {
      list = list.filter((c) => workingLeadConvIds.has(c.id));
    }

    if (!search) return list;

    return list.filter((conversation) => {
      const fullName = `${conversation.contact?.firstName || ""} ${conversation.contact?.lastName || ""}`.toLowerCase();
      const phone = conversation.contact?.phone?.toLowerCase() || "";
      const preview = conversation.preview.toLowerCase();
      return (
        fullName.includes(search) || phone.includes(search) || preview.includes(search)
      );
    });
  }, [conversationSearch, conversationsWithContacts, convShowArchived, convShowUnread, convShowRecents, convShowWorking, workingLeadConvIds, archivedConvIds, selectedConversationId]);

  // Flat list of every outbound message across all conversations — used by
  // the "All" view so the user can see everything that's been sent and what's
  // currently in-flight (campaigns write rows as they send).
  const allSentMessages = useMemo(() => {
    const items: {
      id: string;
      conversationId: string;
      contactName: string;
      contactPhone: string;
      body: string;
      status: string;
      createdAt: string;
      fromNumber?: string;
    }[] = [];
    for (const conv of conversationsWithContacts) {
      for (const msg of conv.messages) {
        if (msg.direction !== "outbound") continue;
        items.push({
          id: msg.id,
          conversationId: conv.id,
          contactName: conv.contact
            ? `${conv.contact.firstName} ${conv.contact.lastName}`.trim()
            : "Unknown Contact",
          contactPhone: conv.contact?.phone || "",
          body: msg.body,
          status: msg.status || "sent",
          createdAt: msg.createdAt,
          fromNumber: msg.fromNumber || conv.fromNumber,
        });
      }
    }
    const search = conversationSearch.trim().toLowerCase();
    const filtered = search
      ? items.filter((m) =>
          m.contactName.toLowerCase().includes(search) ||
          m.contactPhone.toLowerCase().includes(search) ||
          m.body.toLowerCase().includes(search)
        )
      : items;
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [conversationsWithContacts, conversationSearch]);

  const activeSendingCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === "Sending"),
    [campaigns]
  );

  const selectedConversation = useMemo(() => {
    return (
      conversationsWithContacts.find(
        (conversation) => conversation.id === selectedConversationId
      ) || filteredConversations[0] || null
    );
  }, [conversationsWithContacts, filteredConversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversation]);

  const selectedContact = selectedConversation?.contact || null;

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  // Helper to persist profile updates to Supabase and update local state
  const persistProfile = useCallback(async (updates: Record<string, unknown>) => {
    if (!userId) return null;
    const updated = await updateProfile(userId, updates);
    if (updated) setCurrentUser(profileToAccount(updated));
    return updated;
  }, [userId]);

  // Permanently release a Telnyx number and remove it from the profile.
  const handleDeleteOwnedNumber = async (num: OwnedNumber) => {
    if (!userId || !currentUser) return;
    const ok = window.confirm(
      `Permanently release ${num.number}?\n\nThis cancels the number on Telnyx and removes it from your account. You will stop receiving messages to this number immediately. This cannot be undone.`
    );
    if (!ok) return;
    setDeletingNumberId(num.id);
    try {
      const res = await authFetch("/api/delete-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberId: num.id, phoneNumber: num.number }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(`❌ ${data.error || "Could not release number"}`);
        window.setTimeout(() => setMessage(""), 3500);
        return;
      }
      const next = (currentUser.ownedNumbers || []).filter((n) => n.id !== num.id);
      await persistProfile({ owned_numbers: next });
      setMessage(`✅ ${num.number} released`);
      window.setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Could not connect to release service");
      window.setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeletingNumberId(null);
    }
  };

  // Pull deliverability counts per number. Called on mount of the Numbers
  // tab, on a 30s interval while that tab is open, and any time a message
  // status changes via realtime.
  const refreshDeliverability = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc("deliverability_stats", {
      p_user_id: userId,
      p_days: 30,
    });
    if (error || !data) return;
    const next: Record<string, { total: number; delivered: number; failed: number; pending: number }> = {};
    for (const row of data as Array<{ digits: string; total: number; delivered: number; failed: number; pending: number }>) {
      next[row.digits] = {
        total: Number(row.total),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
        pending: Number(row.pending ?? 0),
      };
    }
    setDeliverability(next);
  }, [userId]);

  // Auto-refresh while Numbers sub-tab is visible.
  useEffect(() => {
    if (settingsSubTab !== "numbers") return;
    refreshDeliverability();
    const interval = window.setInterval(refreshDeliverability, 30000);
    return () => window.clearInterval(interval);
  }, [settingsSubTab, refreshDeliverability]);

  // Realtime: any message status change refreshes deliverability so a
  // stream of failed sends turns the card red within a couple seconds.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`deliverability_${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          if (settingsSubTab === "numbers") refreshDeliverability();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, settingsSubTab, refreshDeliverability]);

  // ─── ⌘K / Ctrl+K — global command palette trigger ─────────────────
  // Investor-grade CRMs (Linear, Attio, Superhuman) all have this. It
  // opens from anywhere, anytime — except when focus is already inside
  // an editable element and the user hasn't held the meta key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (!isMeta && e.key === "/" && !paletteOpen) {
        // "/" opens palette too, but only if not typing in a field
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !t?.isContentEditable) {
          e.preventDefault();
          setPaletteOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  const handleManageBilling = async () => {
    if (!userId) return;
    setMessage("Opening billing portal...");
    try {
      const res = await authFetch("/api/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setMessage(`❌ ${data.error || "Could not open billing portal"}`);
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Could not connect to billing service");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  // Auto-recharge: charge stored card when balance drops below threshold
  const checkAutoRecharge = useCallback(async (newBalance: number) => {
    if (!userId || !currentUser) return;
    const settings = currentUser.autoRecharge;
    if (!settings?.enabled) return;
    if (newBalance >= settings.threshold) return;

    try {
      const res = await authFetch("/api/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: settings.amount }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Auto recharged $${settings.amount.toFixed(2)} — new balance: $${data.newBalance.toFixed(2)}`);
        // Refresh profile to get updated balance
        const refreshed = await fetchProfile(userId);
        if (refreshed) setCurrentUser(profileToAccount(refreshed));
      } else {
        setMessage(`⚠️ Auto recharge failed: ${data.error || "Card charge failed"}`);
      }
      window.setTimeout(() => setMessage(""), 4000);
    } catch {
      console.error("Auto recharge error");
    }
  }, [userId, currentUser]);

  const getDiscount = (amount: number) => {
    if (amount >= 500) return { percent: 15, discounted: Number((amount * 0.85).toFixed(2)) };
    if (amount >= 100) return { percent: 10, discounted: Number((amount * 0.9).toFixed(2)) };
    return { percent: 0, discounted: amount };
  };

  const handleAddFunds = async (amount: number) => {
    if (!currentUser || !userId) return;
    if (!Number.isFinite(amount) || amount < 20) {
      setMessage("❌ Minimum amount is $20");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    if (!requireSubscription()) return;

    // Apply discount — user pays less but gets full credit amount
    const { discounted } = getDiscount(amount);

    setMessage("Redirecting to payment...");

    try {
      const res = await authFetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: discounted,
          creditAmount: amount,
          userId,
          userEmail: currentUser.email,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setMessage(`❌ ${data.error || "Payment failed"}`);
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Could not connect to payment service");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser || !userId) return;
    setMessage("Redirecting to subscription checkout...");

    try {
      const res = await authFetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userEmail: currentUser.email }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setMessage(`❌ ${data.error || "Subscription failed"}`);
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Could not connect to payment service");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) return;

    setMessage("Cancelling subscription...");

    try {
      const res = await authFetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentUser({ ...currentUser!, subscriptionStatus: "canceling" });
        setMessage("✅ Subscription will cancel at end of billing period");
        window.setTimeout(() => setMessage(""), 4000);
      } else {
        setMessage(`❌ ${data.error || "Cancel failed"}`);
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Could not connect to payment service");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleSaveOptOut = async () => {
    if (!userId) return;
    setSavingOptOut(true);
    try {
      await updateProfile(userId, { opt_out_settings: optOutSettings });
      setMessage("✅ Opt-out settings saved");
      window.setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Failed to save opt-out settings");
      window.setTimeout(() => setMessage(""), 3000);
    }
    setSavingOptOut(false);
  };

  // Paginated loader for CSV upload history. Uses the last-loaded row's
  // created_at as the cursor so we don't need a row count or OFFSET.
  const handleLoadMoreCsvHistory = async () => {
    if (!userId || csvHistoryLoadingMore) return;
    const oldest = csvUploadHistory[csvUploadHistory.length - 1];
    if (!oldest) return;
    setCsvHistoryLoadingMore(true);
    try {
      const { data: rows } = await supabase
        .from("csv_uploads")
        .select("id, file_name, uploaded_at, total_rows, success, duplicates, invalid, tcpa_violations, dnc_complainers, validation_used, charged")
        .eq("user_id", userId)
        .lt("uploaded_at", oldest.date)
        .order("uploaded_at", { ascending: false })
        .limit(CSV_HISTORY_PAGE_SIZE + 1);
      if (rows) {
        const hasMore = rows.length > CSV_HISTORY_PAGE_SIZE;
        const page = hasMore ? rows.slice(0, CSV_HISTORY_PAGE_SIZE) : rows;
        setCsvUploadHistory((prev) => [
          ...prev,
          ...page.map((r) => ({
            id: r.id as string,
            fileName: r.file_name as string,
            date: r.uploaded_at as string,
            totalRows: (r.total_rows as number) || 0,
            success: (r.success as number) || 0,
            duplicates: (r.duplicates as number) || 0,
            invalid: (r.invalid as number) || 0,
            validationUsed: (r.validation_used as string | null) || null,
            charged: (r.charged as number | null) ?? null,
            tcpaViolations: (r.tcpa_violations as number) || 0,
            dncComplainers: (r.dnc_complainers as number) || 0,
          })),
        ]);
        setCsvHistoryHasMore(hasMore);
      }
    } catch {
      /* ignore */
    }
    setCsvHistoryLoadingMore(false);
  };

  const handleSaveQuietHours = async () => {
    if (!userId) return;
    setSavingQuietHours(true);
    try {
      await updateProfile(userId, {
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start_hour: quietHoursStartHour,
        quiet_hours_end_hour: quietHoursEndHour,
      });
      setMessage(quietHoursEnabled
        ? "✅ Quiet hours saved"
        : "⚠️ Quiet hours OFF — you are responsible for TCPA compliance");
      window.setTimeout(() => setMessage(""), 3500);
    } catch {
      setMessage("❌ Failed to save quiet hours");
      window.setTimeout(() => setMessage(""), 3000);
    }
    setSavingQuietHours(false);
  };

  // ── Team handlers ──
  const handleJoinTeam = async () => {
    if (!userId || !teamJoinCode.trim()) return;
    setTeamLoading(true);
    const result = await joinTeamByCode(userId, teamJoinCode.trim().toUpperCase());
    if (result.success) {
      const refreshed = await fetchProfile(userId);
      if (refreshed) {
        setCurrentUser(profileToAccount(refreshed));
        if (refreshed.manager_id) {
          const mgr = await fetchProfile(refreshed.manager_id);
          if (mgr) setTeamManagerName(`${mgr.first_name} ${mgr.last_name}`);
        }
      }
      setTeamJoinCode("");
      setMessage("✅ Joined team successfully!");
    } else {
      setMessage(`❌ ${result.error || "Failed to join team"}`);
    }
    setTeamLoading(false);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleLeaveTeam = async () => {
    if (!userId) return;
    setTeamLoading(true);
    await leaveTeam(userId);
    const refreshed = await fetchProfile(userId);
    if (refreshed) setCurrentUser(profileToAccount(refreshed));
    setTeamManagerName("");
    setMessage("✅ Left team");
    setTeamLoading(false);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleViewTeamMember = async (memberId: string) => {
    setSelectedTeamMemberId(memberId);
    setTeamLoading(true);

    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) { setTeamLoading(false); return; }

    const [memberContacts, memberCampaigns, memberConvs] = await Promise.all([
      fetchTeamMemberContacts(memberId),
      fetchTeamMemberCampaigns(memberId),
      fetchTeamMemberConversations(memberId),
    ]);

    setTeamMemberDetail({
      profile: member,
      contacts: memberContacts.map(contactToRecord),
      campaigns: memberCampaigns.map(campaignToRecord),
      conversations: memberConvs.map((conv) => convToRecord(conv, [])),
    });
    setTeamLoading(false);
  };

  const handleTeamAddFunds = async (memberId: string) => {
    if (!userId) return;
    const amount = parseFloat(teamAddFundsAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("❌ Enter a valid amount");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    // Deduct from manager's wallet, add to team member's wallet
    const managerBalance = currentUser?.walletBalance || 0;
    if (managerBalance < amount) {
      setMessage("❌ Insufficient funds in your wallet");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;

    const memberEntry: UsageHistoryItem = {
      id: `team_fund_${Date.now()}`, type: "fund_add", amount,
      description: `Funds from manager ${currentUser?.firstName || ""}`,
      createdAt: new Date().toISOString(), status: "succeeded",
    };

    const managerEntry: UsageHistoryItem = {
      id: `team_send_${Date.now()}`, type: "charge", amount,
      description: `Funds sent to ${member.firstName} ${member.lastName}`,
      createdAt: new Date().toISOString(), status: "succeeded",
    };

    // Update member
    await updateProfile(memberId, {
      wallet_balance: Number(((member.walletBalance || 0) + amount).toFixed(2)),
      usage_history: addUsageEntry(member.usageHistory || [], memberEntry),
    });

    // Deduct from manager
    await persistProfile({
      wallet_balance: Number((managerBalance - amount).toFixed(2)),
      usage_history: addUsageEntry(currentUser?.usageHistory || [], managerEntry),
    });

    // Refresh
    const refreshedMembers = await fetchTeamMembers(userId);
    setTeamMembers(refreshedMembers.map(profileToAccount));
    if (teamMemberDetail && teamMemberDetail.profile.id === memberId) {
      const updated = refreshedMembers.find((m) => m.id === memberId);
      if (updated) setTeamMemberDetail({ ...teamMemberDetail, profile: profileToAccount(updated) });
    }

    setMessage(`✅ $${amount.toFixed(2)} sent to ${member.firstName}`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleBillingTransfer = async () => {
    if (!userId || !billingTransferMemberId) return;
    const amount = parseFloat(billingTransferAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setMessage("❌ Enter a valid amount (min $1)");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    const managerBalance = currentUser?.walletBalance || 0;
    if (managerBalance < amount) {
      setMessage("❌ Insufficient funds in your wallet");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }
    const member = teamMembers.find((m) => m.id === billingTransferMemberId);
    if (!member) { setMessage("❌ Agent not found"); window.setTimeout(() => setMessage(""), 2500); return; }

    const memberEntry: UsageHistoryItem = {
      id: `team_fund_${Date.now()}`, type: "fund_add", amount,
      description: `Funds from manager ${currentUser?.firstName || ""}`,
      createdAt: new Date().toISOString(), status: "succeeded",
    };
    const managerEntry: UsageHistoryItem = {
      id: `team_send_${Date.now()}`, type: "charge", amount,
      description: `Funds sent to ${member.firstName} ${member.lastName}`,
      createdAt: new Date().toISOString(), status: "succeeded",
    };

    await updateProfile(billingTransferMemberId, {
      wallet_balance: Number(((member.walletBalance || 0) + amount).toFixed(2)),
      usage_history: addUsageEntry(member.usageHistory || [], memberEntry),
    });
    await persistProfile({
      wallet_balance: Number((managerBalance - amount).toFixed(2)),
      usage_history: addUsageEntry(currentUser?.usageHistory || [], managerEntry),
    });

    const refreshedMembers = await fetchTeamMembers(userId);
    setTeamMembers(refreshedMembers.map(profileToAccount));
    setBillingTransferAmount("");
    setBillingTransferMemberId("");
    setMessage(`✅ $${amount.toFixed(2)} sent to ${member.firstName} ${member.lastName}`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  // ── Template handlers ──
  const handleSaveTemplate = async () => {
    if (!userId || !newTemplateName.trim() || !newTemplateBody.trim()) {
      setMessage("❌ Name and body required"); window.setTimeout(() => setMessage(""), 2500); return;
    }
    const t = await insertTemplate({ user_id: userId, name: newTemplateName.trim(), body: newTemplateBody.trim(), category: newTemplateCategory });
    if (t) { setTemplates((prev) => [t, ...prev]); setNewTemplateName(""); setNewTemplateBody(""); setMessage("✅ Template saved"); }
    else setMessage("❌ Failed to save template");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const ok = await deleteTemplate(id);
    if (ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editingTemplateId === id) setEditingTemplateId(null);
    }
  };

  const handleStartEditTemplate = (tpl: MessageTemplate) => {
    setEditingTemplateId(tpl.id);
    setEditingTemplateName(tpl.name);
    setEditingTemplateBody(tpl.body);
    setEditingTemplateCategory(tpl.category);
  };

  const handleCancelEditTemplate = () => {
    setEditingTemplateId(null);
    setEditingTemplateName("");
    setEditingTemplateBody("");
    setEditingTemplateCategory("general");
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !editingTemplateName.trim() || !editingTemplateBody.trim()) return;
    const updated = await updateTemplate(editingTemplateId, {
      name: editingTemplateName.trim(),
      body: editingTemplateBody.trim(),
      category: editingTemplateCategory,
    });
    if (updated) {
      setTemplates((prev) => prev.map((t) => (t.id === editingTemplateId ? updated : t)));
      handleCancelEditTemplate();
      setMessage("✅ Template updated");
    } else {
      setMessage("❌ Failed to update template");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleCopyTemplateBody = (tpl: MessageTemplate) => {
    navigator.clipboard.writeText(tpl.body).then(() => {
      setCopiedTemplateId(tpl.id);
      window.setTimeout(() => setCopiedTemplateId(null), 1500);
    });
  };

  const handleUseTemplate = (body: string) => {
    setComposerText(body);
    setShowTemplateManager(false);
  };

  // ── Scheduled message handlers ──
  const handleScheduleMessage = async () => {
    if (!userId || !selectedConversation || !composerText.trim() || !scheduleDate || !scheduleTime) {
      setMessage("❌ Fill in message, date, and time"); window.setTimeout(() => setMessage(""), 2500); return;
    }
    const contact = contacts.find((c) => c.id === selectedConversation.contactId);
    if (!contact) return;
    const fromNumber = convFromNumber || currentUser?.ownedNumbers?.[0]?.number || "";
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const sm = await insertScheduledMessage({
      user_id: userId, contact_id: contact.id, body: composerText.trim(),
      from_number: fromNumber,
      scheduled_at: scheduledAt, status: "pending",
    });
    if (sm) {
      setScheduledMessages((prev) => [...prev, sm]);
      setComposerText(""); setShowScheduleModal(false); setScheduleDate(""); setScheduleTime("");
      setMessage(`✅ Message scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    } else setMessage("❌ Failed to schedule message");
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleCancelScheduled = async (id: string) => {
    const ok = await cancelScheduledMessage(id);
    if (ok) setScheduledMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "cancelled" as const } : m));
  };

  // Pull a contact off any workflows they're currently enrolled in. Cancels
  // every pending workflow-scheduled message for those contacts — i.e.,
  // scheduled_messages where status='pending' AND cancel_on_reply=true (the
  // flag that workflow enrollment always sets). Returns how many drip steps
  // we actually stopped so the caller can message the user.
  const handleCancelWorkflow = async (contactIds: string[]): Promise<number> => {
    if (!userId || contactIds.length === 0) return 0;
    const pendingIds = scheduledMessages
      .filter((m) => m.status === "pending" && m.cancel_on_reply && contactIds.includes(m.contact_id))
      .map((m) => m.id);
    if (pendingIds.length === 0) return 0;

    // Optimistic update first so the UI reflects instantly; reconcile after.
    setScheduledMessages((prev) => prev.map((m) =>
      pendingIds.includes(m.id) ? { ...m, status: "cancelled" as const } : m
    ));

    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled" })
      .in("id", pendingIds);
    if (error) {
      // Roll back the optimistic state if the DB rejected it.
      setScheduledMessages((prev) => prev.map((m) =>
        pendingIds.includes(m.id) ? { ...m, status: "pending" as const } : m
      ));
      setMessage(`❌ Failed to cancel workflow: ${error.message}`);
      window.setTimeout(() => setMessage(""), 3000);
      return 0;
    }

    // Clear the campaign tag on those contacts so the campaign card's
    // enrolled count drops and the Contacts table no longer shows them
    // as assigned to that campaign.
    await supabase
      .from("contacts")
      .update({ campaign: "" })
      .in("id", contactIds);
    const idSet = new Set(contactIds);
    setContacts((prev) => prev.map((c) => idSet.has(c.id) ? { ...c, campaign: "" } : c));

    return pendingIds.length;
  };

  // Add one contact or a bulk selection of conversations to a workflow
  // (campaign). Every step is written to scheduled_messages with
  // cancel_on_reply so the drip halts the instant the lead texts back.
  const handleAddToWorkflow = async () => {
    if (!userId || !workflowCampaignId) return;
    const campaign = campaigns.find((c) => c.id === workflowCampaignId);
    if (!campaign) {
      setMessage("❌ Campaign not found");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    // Figure out which conversations/contacts we're enrolling.
    // - Bulk mode: every conversation in selectedConvIds (from the sidebar)
    // - Single mode: just the open conversation
    type Target = { conv: ConversationRecord; contact: ContactRecord };
    const targets: Target[] = [];
    if (workflowBulkMode) {
      for (const convId of selectedConvIds) {
        const conv = conversations.find((c) => c.id === convId);
        if (!conv) continue;
        const contact = contacts.find((c) => c.id === conv.contactId);
        if (!contact) continue;
        targets.push({ conv, contact });
      }
    } else if (selectedConversation) {
      const contact = contacts.find((c) => c.id === selectedConversation.contactId);
      if (contact) targets.push({ conv: selectedConversation, contact });
    }

    if (targets.length === 0) {
      setMessage("❌ No contacts selected");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const steps = (campaign.steps && campaign.steps.length > 0)
      ? campaign.steps
      : [{ id: "1", message: campaign.message || "", delayMinutes: 0 }];

    const personalizeFor = (text: string, contact: ContactRecord) => {
      const tokenMap: Record<string, string> = {
        "{firstName}": contact.firstName || "",
        "{lastName}": contact.lastName || "",
        "{phone}": contact.phone || "",
        "{email}": contact.email || "",
        "{city}": contact.city || "",
        "{state}": contact.state || "",
        "{address}": contact.address || "",
        "{zip}": contact.zip || "",
        "{leadSource}": contact.leadSource || "",
        "{quote}": contact.quote || "",
        "{policyId}": contact.policyId || "",
        "{timeline}": contact.timeline || "",
        "{householdSize}": contact.householdSize || "",
        "{dateOfBirth}": contact.dateOfBirth || "",
        "{age}": contact.age || "",
        "{notes}": contact.notes || "",
      };
      let out = text;
      for (const [tag, val] of Object.entries(tokenMap)) {
        out = out.split(tag).join(val);
      }
      return out;
    };

    const fallbackFrom = campaign.selectedNumbers?.[0] || currentUser?.ownedNumbers?.[0]?.number || "";
    const rowsToInsert: Array<Record<string, unknown>> = [];
    const skippedNoFromNumber: string[] = [];

    for (const { conv, contact } of targets) {
      // "Use current number" keeps the thread on whichever 10DLC line the
      // contact already talks to. Falls back to the campaign default if
      // that conversation doesn't have one pinned yet.
      const fromNumber = workflowUseCurrentNumber
        ? (conv.fromNumber || fallbackFrom)
        : fallbackFrom;
      if (!fromNumber) {
        skippedNoFromNumber.push(`${contact.firstName} ${contact.lastName}`.trim() || contact.phone);
        continue;
      }
      let cumulativeDelay = 0;
      for (const step of steps) {
        cumulativeDelay += Math.max(0, Number(step.delayMinutes) || 0);
        const scheduledAt = new Date(Date.now() + cumulativeDelay * 60_000).toISOString();
        rowsToInsert.push({
          user_id: userId,
          contact_id: contact.id,
          body: personalizeFor(step.message || "", contact),
          from_number: fromNumber,
          scheduled_at: scheduledAt,
          status: "pending",
          campaign_id: workflowCampaignId,
          cancel_on_reply: true,
        });
      }
    }

    if (rowsToInsert.length === 0) {
      setMessage("❌ No from number available. Buy a number first.");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    setWorkflowSaving(true);
    try {
      // Chunk inserts so a 1000-contact bulk enrollment doesn't overshoot
      // Supabase's single-statement size.
      const INSERT_CHUNK = 500;
      const allInserted: ScheduledMessage[] = [];
      for (let i = 0; i < rowsToInsert.length; i += INSERT_CHUNK) {
        const slice = rowsToInsert.slice(i, i + INSERT_CHUNK);
        const { data, error } = await supabase
          .from("scheduled_messages")
          .insert(slice)
          .select();
        if (error) {
          setMessage(`❌ ${error.message}`);
          window.setTimeout(() => setMessage(""), 3500);
          setWorkflowSaving(false);
          return;
        }
        if (data) allInserted.push(...(data as ScheduledMessage[]));
      }

      // Tag each enrolled contact with the campaign name for reporting.
      if (campaign.name && targets.length > 0) {
        const contactIds = targets.map((t) => t.contact.id);
        await supabase
          .from("contacts")
          .update({ campaign: campaign.name })
          .in("id", contactIds);
        const idSet = new Set(contactIds);
        setContacts((prev) => prev.map((c) => idSet.has(c.id) ? { ...c, campaign: campaign.name } : c));
      }

      if (allInserted.length > 0) {
        setScheduledMessages((prev) => [...prev, ...allInserted]);
      }

      const enrolledCount = targets.length - skippedNoFromNumber.length;
      const skippedNote = skippedNoFromNumber.length > 0
        ? ` (${skippedNoFromNumber.length} skipped — no from number)`
        : "";
      setMessage(
        workflowBulkMode
          ? `✅ Added ${enrolledCount} contact${enrolledCount === 1 ? "" : "s"} to "${campaign.name}" — ${steps.length}-step drip queued${skippedNote}. Auto-stops per contact when they reply.`
          : `✅ Added to "${campaign.name}" — ${steps.length} step${steps.length > 1 ? "s" : ""} queued. Will auto-stop when they reply.`
      );
      window.setTimeout(() => setMessage(""), 4500);

      setShowAddToWorkflow(false);
      setWorkflowCampaignId("");
      setWorkflowUseCurrentNumber(true);
      if (workflowBulkMode) {
        setSelectedConvIds(new Set());
        setConvSelectMode(false);
        setWorkflowBulkMode(false);
      }
    } finally {
      setWorkflowSaving(false);
    }
  };

  // ── Quick reply handlers ──
  const handleAddQuickReply = () => {
    if (!newQrLabel.trim() || !newQrBody.trim()) return;
    const qr: QuickReply = { id: `qr_${Date.now()}`, label: newQrLabel.trim(), body: newQrBody.trim() };
    setQuickReplies((prev) => [...prev, qr]);
    setNewQrLabel(""); setNewQrBody("");
  };

  const handleDeleteQuickReply = (id: string) => {
    setQuickReplies((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUseQuickReply = (body: string) => {
    setComposerText(body);
    setShowQuickReplies(false);
  };

  // ── CSV Export ──
  const handleExportCSV = () => {
    if (contacts.length === 0) { setMessage("❌ No contacts to export"); window.setTimeout(() => setMessage(""), 2500); return; }
    const headers = ["First Name","Last Name","Phone","Email","City","State","Address","Zip","Tags","DNC","Campaign","Lead Source","Notes"];
    const rows = contacts.map((c) => [
      c.firstName, c.lastName, c.phone, c.email || "", c.city || "", c.state || "",
      c.address || "", c.zip || "", (c.tags || []).join(";"), c.dnc ? "Yes" : "No",
      c.campaign || "", c.leadSource || "", (c.notes || "").replace(/,/g, " "),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setMessage("✅ Contacts exported"); window.setTimeout(() => setMessage(""), 2500);
  };

  // ── Analytics computed ──
  const analytics = useMemo(() => {
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0);
    const totalReplies = campaigns.reduce((sum, c) => sum + c.replies, 0);
    const deliveryRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent * 100).toFixed(1) : "0.0";
    const replyRate = totalSent > 0 ? (totalReplies / totalSent * 100).toFixed(1) : "0.0";
    const totalSpent = (currentUser?.usageHistory || []).filter((u) => u.type === "charge").reduce((s, u) => s + u.amount, 0);
    const totalFunded = (currentUser?.usageHistory || []).filter((u) => u.type === "fund_add" || u.type === "credit_add").reduce((s, u) => s + u.amount, 0);

    // Campaign performance by name
    const campaignStats = campaigns.filter((c) => c.status === "Completed").map((c) => ({
      name: c.name, sent: c.sent, failed: c.failed, replies: c.replies,
      deliveryRate: c.sent > 0 ? (((c.sent - c.failed) / c.sent) * 100).toFixed(1) : "0",
      replyRate: c.sent > 0 ? ((c.replies / c.sent) * 100).toFixed(1) : "0",
    }));

    // Messages over time (last 7 days from usage history)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const dailyCounts = last7.map((day) => ({
      date: day,
      count: (currentUser?.usageHistory || []).filter((u) => u.type === "charge" && u.createdAt?.startsWith(day) && u.description?.startsWith("SMS")).length,
      spent: (currentUser?.usageHistory || []).filter((u) => u.type === "charge" && u.createdAt?.startsWith(day)).reduce((s, u) => s + u.amount, 0),
    }));

    return { totalSent, totalFailed, totalReplies, deliveryRate, replyRate, totalSpent, totalFunded, campaignStats, dailyCounts };
  }, [campaigns, currentUser]);

  // Initialize a2p step from saved registration state
  useEffect(() => {
    if (!currentUser?.a2pRegistration) { setA2pStep(0); return; }
    const reg = currentUser.a2pRegistration;
    if (reg.status === "completed" || reg.status === "campaign_approved") setA2pStep(5);
    else if (reg.status === "campaign_pending") setA2pStep(4);
    else if (reg.status === "brand_approved") setA2pStep(3);
    else if (reg.status === "brand_pending") setA2pStep(2);
    else if (reg.status === "brand_failed" || reg.status === "campaign_failed") setA2pStep(0);
    else setA2pStep(0);
  }, [currentUser?.a2pRegistration?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // 10DLC automated registration via Telnyx
  const handleA2pRegister = async () => {
    if (!currentUser) return;
    setA2pLoading(true);
    try {
      const res = await authFetch("/api/register-10dlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          action: "register_brand",
          businessName: a2pForm.businessName,
          businessType: a2pForm.businessType,
          ein: a2pForm.ein,
          businessAddress: a2pForm.businessAddress,
          businessCity: a2pForm.businessCity,
          businessState: a2pForm.businessState,
          businessZip: a2pForm.businessZip,
          website: a2pForm.website,
          hasWebsite: a2pForm.hasWebsite,
          buildPage: a2pForm.buildPage,
          businessDescription: a2pForm.businessDescription,
          contactEmail: a2pForm.contactEmail || currentUser.email,
          contactPhone: a2pForm.contactPhone || currentUser.phone,
        }),
      });
      const data = await res.json();
      if (!data.success) { setMessage("❌ " + (data.error || "Brand registration failed")); setA2pLoading(false); return; }

      if (data.nextAction === "create_campaign") {
        setMessage("Brand approved! Creating campaign...");
        setA2pStep(3);
        await handleA2pCreateCampaign();
      } else {
        setMessage("✅ Brand submitted! Approval can take a few minutes to a few hours. Click 'Check Status' to see if it's approved.");
        setA2pStep(2);
      }
    } catch { setMessage("❌ Registration failed. Please try again."); }
    setA2pLoading(false);
  };

  const handleA2pCreateCampaign = async () => {
    if (!currentUser) return;
    setA2pLoading(true);
    try {
      const res = await authFetch("/api/register-10dlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "create_campaign" }),
      });
      const data = await res.json();
      if (!data.success) { setMessage("❌ " + (data.error || "Campaign creation failed")); setA2pLoading(false); return; }

      setMessage("Campaign created! Waiting for approval...");
      setA2pStep(4);

      // Poll for campaign approval
      await handleA2pCheckCampaign();
    } catch { setMessage("❌ Campaign creation failed."); }
    setA2pLoading(false);
  };

  const handleA2pCheckBrand = async () => {
    if (!currentUser) return;
    setA2pLoading(true);
    try {
      const res = await authFetch("/api/register-10dlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, action: "create_campaign" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ Brand approved! Campaign created. Waiting for campaign approval...");
        setA2pStep(4);
        await handleA2pCheckCampaign();
      } else if (data.brandStatus === "FAILED" || data.brandStatus === "REGISTRATION_FAILED") {
        setMessage("❌ Brand registration was rejected. Please fix the issues and try again.");
        setA2pStep(0);
      } else {
        setMessage("⏳ Brand is still pending approval. Try again in a few minutes.");
      }
    } catch { setMessage("❌ Could not check status."); }
    setA2pLoading(false);
  };

  const handleA2pCheckCampaign = async () => {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const res = await authFetch("/api/register-10dlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser!.id, action: "check_campaign" }),
      });
      const data = await res.json();
      if (data.completed) {
        setMessage("✅ 10DLC registration complete! You can now send messages.");
        setA2pStep(5);
        // Refresh profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (p) setCurrentUser(profileToAccount(p as Profile));
        }
        return;
      }
      if (data.campaignStatus === "TCR_ACCEPTED") {
        setMessage("Campaign approved! Assigning numbers...");
        setA2pStep(5);
        // Refresh profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (p) setCurrentUser(profileToAccount(p as Profile));
        }
        return;
      }
      if (data.campaignStatus === "TCR_FAILED") { setMessage("❌ " + (data.error || "Campaign failed.")); setA2pStep(0); return; }
    }
    setMessage("⏳ Campaign is still processing. Check back shortly.");
  };

  const personalizationFields = [
    { tag: "{firstName}", label: "First Name" },
    { tag: "{lastName}", label: "Last Name" },
    { tag: "{phone}", label: "Phone" },
    { tag: "{email}", label: "Email" },
    { tag: "{address}", label: "Address" },
    { tag: "{city}", label: "City" },
    { tag: "{state}", label: "State" },
    { tag: "{zip}", label: "Zip Code" },
    { tag: "{age}", label: "Age" },
    { tag: "{dateOfBirth}", label: "Date of Birth" },
    { tag: "{householdSize}", label: "Household Size" },
    { tag: "{leadSource}", label: "Lead Source" },
    { tag: "{quote}", label: "Quote" },
    { tag: "{policyId}", label: "Policy ID" },
    { tag: "{timeline}", label: "Timeline" },
    { tag: "{notes}", label: "Notes" },
  ];

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const insertField = (tag: string) => {
    const textarea = campaignTextareaRef.current;
    const stepId = newCampaignForm.steps[activeStepIndex]?.id;
    if (!stepId) return;

    if (!textarea) {
      setNewCampaignForm((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId ? { ...s, message: s.message + tag } : s
        ),
      }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newCampaignForm.steps[activeStepIndex].message;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setNewCampaignForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, message: newText } : s
      ),
    }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    });
  };

  const handleAddStep = () => {
    setNewCampaignForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        { id: `step_${Date.now()}`, message: "", delayMinutes: 60 },
      ],
    }));
    setActiveStepIndex(newCampaignForm.steps.length);
  };

  const handleRemoveStep = (stepIndex: number) => {
    if (newCampaignForm.steps.length <= 1) return;
    setNewCampaignForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== stepIndex),
    }));
    setActiveStepIndex((prev) => Math.min(prev, newCampaignForm.steps.length - 2));
  };

  const handleCreateCampaign = async () => {
    if (!userId) return;
    if (!newCampaignForm.name.trim()) {
      setMessage("❌ Campaign name is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    if (newCampaignForm.steps.every((s) => !s.message.trim())) {
      setMessage("❌ At least one message step is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    // Map the UI's tri-state override to nullable DB columns. "inherit" sends
    // null on all three so the backend falls back to the profile setting.
    const qhMode = newCampaignForm.quietHoursMode || "inherit";
    const qhEnabled = qhMode === "inherit" ? null : qhMode === "on";
    const qhStart = qhMode === "on" ? (newCampaignForm.quietHoursStartHour ?? 21) : null;
    const qhEnd = qhMode === "on" ? (newCampaignForm.quietHoursEndHour ?? 8) : null;

    const result = await dbInsertCampaign({
      user_id: userId, name: newCampaignForm.name.trim(),
      audience: 0, sent: 0, replies: 0, failed: 0, status: "Draft",
      message: newCampaignForm.steps[0]?.message.trim() || "",
      steps: newCampaignForm.steps,
      selected_numbers: newCampaignForm.selectedNumbers,
      quiet_hours_enabled: qhEnabled,
      quiet_hours_start_hour: qhStart,
      quiet_hours_end_hour: qhEnd,
      logs: [],
    });

    if (result) {
      setCampaigns((prev) => [campaignToRecord(result), ...prev]);
      setNewCampaignForm({
        name: "", selectedNumbers: [],
        steps: [{ id: `step_${Date.now()}`, message: "", delayMinutes: 0 }],
        quietHoursMode: "inherit",
        quietHoursStartHour: 21,
        quietHoursEndHour: 8,
      });
      setActiveStepIndex(0);
      setMessage("✅ Campaign saved — upload a CSV to assign contacts, then send");
    } else {
      setMessage("❌ Failed to create campaign");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleEditCampaign = (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    const steps = campaign.steps && campaign.steps.length > 0
      ? campaign.steps
      : [{ id: `step_${Date.now()}`, message: campaign.message || "", delayMinutes: 0 }];
    setEditCampaignForm({
      name: campaign.name,
      steps,
      selectedNumbers: campaign.selectedNumbers || [],
    });
    setEditStepIndex(0);
    setEditingCampaignId(campaignId);
  };

  const handleSaveEditCampaign = async () => {
    if (!editingCampaignId || !userId) return;
    if (!editCampaignForm.name.trim()) {
      setMessage("❌ Campaign name is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    if (editCampaignForm.steps.every((s) => !s.message.trim())) {
      setMessage("❌ At least one message step is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const updated = await dbUpdateCampaign(editingCampaignId, {
      name: editCampaignForm.name.trim(),
      message: editCampaignForm.steps[0]?.message.trim() || "",
      steps: editCampaignForm.steps,
      selected_numbers: editCampaignForm.selectedNumbers,
    });

    if (updated) {
      setCampaigns((prev) => prev.map((c) =>
        c.id === editingCampaignId
          ? { ...c, name: editCampaignForm.name.trim(), message: editCampaignForm.steps[0]?.message.trim(), steps: editCampaignForm.steps, selectedNumbers: editCampaignForm.selectedNumbers }
          : c
      ));
      setEditingCampaignId(null);
      setMessage("✅ Campaign updated");
    } else {
      setMessage("❌ Failed to update campaign");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedContactIds.size} selected contact${selectedContactIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    setDeletingBulk(true);
    let deleted = 0;
    for (const id of selectedContactIds) {
      const ok = await dbDeleteContact(id);
      if (ok) deleted++;
    }
    setContacts((prev) => prev.filter((c) => !selectedContactIds.has(c.id)));
    setSelectedContactIds(new Set());
    setDeletingBulk(false);
    setMessage(`✅ Deleted ${deleted} contact${deleted !== 1 ? "s" : ""}`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleSearchNumbers = async () => {
    if (!requireSubscription()) return;
    setSearchingNumbers(true);
    setAvailableNumbers([]);

    try {
      const res = await fetch("/api/search-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCode: numberSearch.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setAvailableNumbers(data.numbers || []);
        if (data.numbers?.length === 0) {
          setMessage("No numbers found for that area code. Try another.");
          window.setTimeout(() => setMessage(""), 3000);
        }
      } else {
        setMessage(`❌ ${data.error || "Search failed"}`);
        window.setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Could not connect to SMS service");
      window.setTimeout(() => setMessage(""), 3000);
    }

    setSearchingNumbers(false);
  };

  const handleBuyNumber = async (phoneNumber: string, displayNumber: string) => {
    if (!requireSubscription()) return;
    if (!require10DLCApproved()) return;
    if (!currentUser || !userId) return;

    const walletBalance = currentUser.walletBalance || 0;
    if (walletBalance < 1.5) {
      setMessage("❌ Add at least $1.50 to your wallet first");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    setBuyingNumber(phoneNumber);

    try {
      const res = await authFetch("/api/buy-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, userId }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(`❌ ${data.error || "Failed to buy number"}`);
        window.setTimeout(() => setMessage(""), 3000);
        setBuyingNumber(null);
        return;
      }

      const newNumber: OwnedNumber = {
        id: data.sid || `num_${Date.now()}`,
        number: data.number,
        alias: `Sales Line ${((currentUser.ownedNumbers?.length || 0) + 1).toString()}`,
      };

      const purchaseEntry: UsageHistoryItem = {
        id: `number_${Date.now()}`, type: "number_purchase", amount: 1.5,
        description: `Purchased number ${data.number}`,
        createdAt: new Date().toISOString(), status: "succeeded",
      };

      await persistProfile({
        wallet_balance: Number((walletBalance - 1.5).toFixed(2)),
        owned_numbers: addOwnedNumber(currentUser.ownedNumbers || [], newNumber),
        usage_history: addUsageEntry(currentUser.usageHistory || [], purchaseEntry),
      });

      // Remove purchased number from available list
      setAvailableNumbers((prev) => prev.filter((n) => n.raw !== phoneNumber));
      if (data.campaignAssigned) {
        setMessage(`✅ ${data.number} purchased and assigned to your 10DLC campaign`);
      } else if (data.campaignAssignmentError) {
        setMessage(`✅ ${data.number} purchased. Campaign assignment pending — check back shortly.`);
      } else {
        setMessage(`✅ Number ${data.number} purchased`);
      }
      window.setTimeout(() => setMessage(""), 3500);
    } catch {
      setMessage("❌ Could not connect to SMS service");
      window.setTimeout(() => setMessage(""), 3000);
    }

    setBuyingNumber(null);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setComposerText("");
    // Default the reply-from number to whatever this conversation was started on,
    // so the user never has to remember which of their lines the thread is on.
    const conv = conversations.find((c) => c.id === conversationId);
    setConvFromNumber(conv?.fromNumber || "");

    setConversations((prev) =>
      prev.map((c) => c.id === conversationId ? { ...c, unread: 0 } : c)
    );
    await dbUpdateConversation(conversationId, { unread: 0 });
  };

  const handleSendConversationMessage = async () => {
    if (!requireSubscription()) return;
    if (!selectedConversation || !composerText.trim() || !currentUser) {
      setMessage("❌ Type a message first");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const body = composerText.trim();
    const now = new Date().toISOString();

    // Get the contact's phone and a from number
    const contact = contacts.find((c) => c.id === selectedConversation.contactId);
    const fromNumber = convFromNumber || currentUser.ownedNumbers?.[0]?.number;

    if (!contact?.phone) {
      setMessage("❌ Contact has no phone number");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    if (!fromNumber) {
      setMessage("❌ Buy a phone number first before sending messages");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Check wallet balance
    const cost = currentUser.plan.messageCost || 0.012;
    if ((currentUser.walletBalance || 0) < cost) {
      setMessage("❌ Insufficient funds. Add funds to your wallet.");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    setComposerText("");

    // Send via Telnyx — include the current Supabase session so the API
    // can verify the caller and their ownership of the `from` number.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ to: contact.phone, from: fromNumber, body }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage(`❌ ${data.error || "Failed to send"}`);
        window.setTimeout(() => setMessage(""), 3000);
        return;
      }
    } catch {
      setMessage("❌ Could not connect to SMS service");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Save to DB
    const dbMsg = await insertMessage({
      conversation_id: selectedConversation.id,
      direction: "outbound", body, status: "sent",
      from_number: fromNumber,
    });

    if (dbMsg) {
      const newMsg: ConversationMessage = messageToRecord(dbMsg);
      // Lock the conversation to this from_number the first time it's set, so
      // future replies (and the badge in the conv list) always match.
      const shouldLockFromNumber = !selectedConversation.fromNumber && fromNumber;
      setConversations((prev) => {
        const updated = prev.map((c) => c.id !== selectedConversation.id ? c : {
          ...c, preview: body, lastMessageAt: now,
          // Sending a reply clears the unread badge — the last message is
          // now outbound so there's nothing new waiting for the agent.
          unread: 0,
          fromNumber: c.fromNumber || fromNumber,
          // Manual send clears the "AI skipped" chip — if the user is
          // engaging directly, the decline filter shouldn't keep warning.
          aiSkippedReason: null,
          messages: [...c.messages, newMsg],
        });
        // Re-sort so the freshly-active conversation stays at the top.
        return updated.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
      });
      const convUpdate: Record<string, unknown> = { preview: body, last_message_at: now, unread: 0, ai_skipped_reason: null };
      if (shouldLockFromNumber) convUpdate.from_number = fromNumber;
      await dbUpdateConversation(selectedConversation.id, convUpdate);
    }

    // Deduct message cost
    const chargeEntry: UsageHistoryItem = {
      id: `msg_${Date.now()}`, type: "charge", amount: cost,
      description: `SMS to ${contact.phone}`,
      createdAt: now, status: "succeeded",
    };
    const newBal = Number(((currentUser.walletBalance || 0) - cost).toFixed(2));
    await persistProfile({
      wallet_balance: newBal,
      usage_history: addUsageEntry(currentUser.usageHistory || [], chargeEntry),
    });

    // Check if auto-recharge should trigger
    checkAutoRecharge(newBal);

    setMessage("✅ Message sent");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleOpenContactConversation = async (contactId: string) => {
    if (!userId) return;

    // Check if a conversation already exists for this contact
    const existing = conversations.find((c) => c.contactId === contactId);
    if (existing) {
      setSelectedConversationId(existing.id);
      setActiveTab("conversations");
      return;
    }

    // Create a new conversation
    const now = new Date().toISOString();
    const newConv = await insertConversation({
      user_id: userId,
      contact_id: contactId,
      preview: "",
      unread: 0,
      last_message_at: now,
      starred: false,
    });

    if (newConv) {
      const record: ConversationRecord = convToRecord(newConv, []);
      setConversations((prev) => [record, ...prev]);
      setSelectedConversationId(newConv.id);
      setActiveTab("conversations");
    } else {
      setMessage("❌ Could not create conversation");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleUpdateSelectedContactField = async (
    field: keyof ContactRecord,
    value: string
  ) => {
    if (!selectedContact) return;

    setContacts((prev) =>
      prev.map((c) => c.id === selectedContact.id ? { ...c, [field]: value } : c)
    );

    // Map camelCase field to snake_case for DB
    const fieldMap: Record<string, string> = {
      firstName: "first_name", lastName: "last_name", dateOfBirth: "date_of_birth",
      leadSource: "lead_source", policyId: "policy_id", householdSize: "household_size",
    };
    const dbField = fieldMap[field] || field;
    await dbUpdateContact(selectedContact.id, { [dbField]: value });
  };

  const handleUpdateContactField = async (
    contactId: string,
    field: keyof ContactRecord,
    value: string | string[]
  ) => {
    setContacts((prev) =>
      prev.map((c) => c.id === contactId ? { ...c, [field]: value } : c)
    );
    const fieldMap: Record<string, string> = {
      firstName: "first_name", lastName: "last_name", dateOfBirth: "date_of_birth",
      leadSource: "lead_source", policyId: "policy_id", householdSize: "household_size",
    };
    const dbField = fieldMap[field] || field;
    await dbUpdateContact(contactId, { [dbField]: value });
  };

  // ---------- AI Reply ----------

  const handleAiSuggest = async () => {
    if (!selectedConversationId || !userId) return;
    setAiLoading(true);
    setAiSuggestedReply("");
    try {
      const conv = conversations.find((c) => c.id === selectedConversationId);
      const res = await authFetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          conversationId: selectedConversationId,
          contactId: conv?.contactId || null,
          sendReply: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "AI failed"}`);
        window.setTimeout(() => setMessage(""), 4000);
      } else {
        setAiSuggestedReply(data.reply);
      }
    } catch {
      setMessage("❌ Failed to generate AI reply");
      window.setTimeout(() => setMessage(""), 3000);
    }
    setAiLoading(false);
  };

  const handleAiSendReply = async () => {
    if (!selectedConversationId || !userId || !aiSuggestedReply) return;
    setAiLoading(true);
    try {
      const conv = conversations.find((c) => c.id === selectedConversationId);
      const res = await authFetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          conversationId: selectedConversationId,
          contactId: conv?.contactId || null,
          sendReply: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "Failed to send AI reply"}`);
        window.setTimeout(() => setMessage(""), 4000);
      } else {
        setMessage(`✅ AI reply sent — charged $${data.cost}`);
        window.setTimeout(() => setMessage(""), 3000);
        setAiSuggestedReply("");
        // Refresh messages for this conversation
        if (selectedConversationId) {
          const msgs = await fetchMessages(selectedConversationId);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversationId
                ? { ...c, messages: msgs.map(messageToRecord), preview: data.reply?.slice(0, 100) || c.preview, lastMessageAt: new Date().toISOString() }
                : c
            )
          );
        }
        // Update wallet
        if (typeof data.newBalance === "number") {
          setCurrentUser((prev) => prev ? { ...prev, walletBalance: data.newBalance } : prev);
        }
      }
    } catch {
      setMessage("❌ Failed to send AI reply");
      window.setTimeout(() => setMessage(""), 3000);
    }
    setAiLoading(false);
  };

  // ---------- Tag library ----------
  // The library is an array of {name, color} on the user's profile. It's the
  // single source of truth for tag definitions (color + sort order); contacts
  // still store tags as plain strings on `tags`, joined by name.

  const persistTagLibrary = async (next: { name: string; color: string }[]) => {
    if (!userId) return;
    setCurrentUser((prev) => (prev ? { ...prev, tagLibrary: next } : prev));
    await updateProfile(userId, { tag_library: next });
  };

  const handleCreateTag = async (rawName: string, color: string) => {
    const name = rawName.trim();
    if (!name) return;
    const lib = currentUser?.tagLibrary || [];
    if (lib.some((t) => t.name.trim().toLowerCase() === name.toLowerCase())) {
      setMessage(`⚠️ Tag "${name}" already exists`);
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    await persistTagLibrary([...lib, { name, color }]);
    setMessage(`✅ Tag "${name}" created`);
    window.setTimeout(() => setMessage(""), 2000);
  };

  const handleUpdateTagColor = async (name: string, color: string) => {
    const lib = currentUser?.tagLibrary || [];
    const next = lib.map((t) => (t.name === name ? { ...t, color } : t));
    await persistTagLibrary(next);
  };

  const handleRenameTag = async (oldName: string, newRawName: string) => {
    const newName = newRawName.trim();
    if (!newName || newName === oldName) return;
    const lib = currentUser?.tagLibrary || [];
    if (lib.some((t) => t.name.trim().toLowerCase() === newName.toLowerCase())) {
      setMessage(`⚠️ Tag "${newName}" already exists`);
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    const nextLib = lib.map((t) => (t.name === oldName ? { ...t, name: newName } : t));
    await persistTagLibrary(nextLib);
    // Update every contact that had the old name. Done in parallel.
    const affected = contacts.filter((c) => (c.tags || []).includes(oldName));
    setContacts((prev) => prev.map((c) => (
      (c.tags || []).includes(oldName)
        ? { ...c, tags: (c.tags || []).map((t) => (t === oldName ? newName : t)) }
        : c
    )));
    await Promise.all(affected.map((c) => dbUpdateContact(c.id, {
      tags: (c.tags || []).map((t) => (t === oldName ? newName : t)),
    })));
    // Keep filter selection working through the rename.
    setTagFilter((prev) => prev.map((t) => (t === oldName ? newName : t)));
  };

  const handleDeleteTag = async (name: string) => {
    if (!window.confirm(`Delete the "${name}" tag? It will be removed from every contact that has it.`)) return;
    const lib = currentUser?.tagLibrary || [];
    await persistTagLibrary(lib.filter((t) => t.name !== name));
    const affected = contacts.filter((c) => (c.tags || []).includes(name));
    setContacts((prev) => prev.map((c) => (
      (c.tags || []).includes(name)
        ? { ...c, tags: (c.tags || []).filter((t) => t !== name) }
        : c
    )));
    await Promise.all(affected.map((c) => dbUpdateContact(c.id, {
      tags: (c.tags || []).filter((t) => t !== name),
    })));
    setTagFilter((prev) => prev.filter((t) => t !== name));
    setMessage(`✅ Tag "${name}" deleted`);
    window.setTimeout(() => setMessage(""), 2000);
  };

  const handleAddContact = async () => {
    if (!userId) return;
    if (!addContactForm.firstName.trim() || !addContactForm.phone.trim()) {
      setMessage("❌ First name and phone are required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const result = await dbInsertContact({
      user_id: userId,
      first_name: addContactForm.firstName.trim(),
      last_name: addContactForm.lastName.trim(),
      phone: addContactForm.phone.trim(),
      email: addContactForm.email.trim(),
      city: addContactForm.city.trim(),
      state: addContactForm.state.trim(),
      tags: [], notes: "", dnc: false, campaign: "", address: "", zip: "",
      lead_source: "", quote: "", policy_id: "", timeline: "",
      household_size: "", date_of_birth: "", age: "",
    });

    if (result) {
      setContacts((prev) => [contactToRecord(result), ...prev]);
      setAddContactForm({ firstName: "", lastName: "", phone: "", email: "", city: "", state: "" });
      setShowAddContact(false);
      setMessage("✅ Contact added");
    } else {
      setMessage("❌ Failed to add contact");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleDeleteContact = async (id: string) => {
    const ok = await dbDeleteContact(id);
    if (ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setMessage("✅ Contact deleted");
    } else {
      setMessage("❌ Failed to delete contact");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleToggleDNC = async (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact || !userId) return;
    const newDnc = !contact.dnc;
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, dnc: newDnc } : c));
    await dbUpdateContact(id, { dnc: newDnc });

    // Log compliance event
    const event: ComplianceEventRecord = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: newDnc ? "dnc_added" : "dnc_removed",
      contactPhone: contact.phone,
      contactName: `${contact.firstName} ${contact.lastName}`.trim(),
      method: "manual",
      timestamp: new Date().toISOString(),
      userId,
    };
    const currentLog = currentUser?.complianceLog || [];
    const newLog = [event, ...currentLog].slice(0, 10000);
    await persistProfile({ compliance_log: newLog });
  };

  const handleAssignCampaign = async (contactId: string, campaignName: string) => {
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, campaign: campaignName } : c));
    await dbUpdateContact(contactId, { campaign: campaignName });
  };

  const handleBulkAssignCampaign = async (campaignName: string) => {
    if (selectedContactIds.size === 0) return;
    const ids = Array.from(selectedContactIds);
    setContacts((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, campaign: campaignName } : c));
    for (const id of ids) {
      await dbUpdateContact(id, { campaign: campaignName });
    }

    // If the target is a multi-step workflow, actually enroll the contacts
    // by scheduling their drip steps (not just tagging the campaign field).
    // This lets users put existing contacts onto a workflow without having
    // to re-upload them via CSV.
    const campaign = campaignName
      ? campaigns.find((c) => c.name === campaignName)
      : null;
    const steps = campaign?.steps && campaign.steps.length > 0
      ? campaign.steps
      : (campaign?.message ? [{ id: "1", message: campaign.message, delayMinutes: 0 }] : []);

    let enrolledCount = 0;
    let skippedCount = 0;
    if (campaign && steps.length > 0 && userId) {
      const fallbackFrom = campaign.selectedNumbers?.[0]
        || currentUser?.ownedNumbers?.[0]?.number
        || "";

      const personalizeFor = (text: string, contact: ContactRecord) => {
        const tokenMap: Record<string, string> = {
          "{firstName}": contact.firstName || "",
          "{lastName}": contact.lastName || "",
          "{phone}": contact.phone || "",
          "{email}": contact.email || "",
          "{city}": contact.city || "",
          "{state}": contact.state || "",
          "{address}": contact.address || "",
          "{zip}": contact.zip || "",
          "{leadSource}": contact.leadSource || "",
          "{quote}": contact.quote || "",
          "{policyId}": contact.policyId || "",
          "{timeline}": contact.timeline || "",
          "{householdSize}": contact.householdSize || "",
          "{dateOfBirth}": contact.dateOfBirth || "",
          "{age}": contact.age || "",
          "{notes}": contact.notes || "",
        };
        let out = text;
        for (const [tag, val] of Object.entries(tokenMap)) {
          out = out.split(tag).join(val);
        }
        return out;
      };

      const rowsToInsert: Array<Record<string, unknown>> = [];
      for (const cid of ids) {
        const contact = contacts.find((c) => c.id === cid);
        if (!contact || contact.dnc) { skippedCount++; continue; }
        const conv = conversations.find((cv) => cv.contactId === cid);
        const fromNumber = conv?.fromNumber || fallbackFrom;
        if (!fromNumber) { skippedCount++; continue; }
        let cumulativeDelay = 0;
        for (const step of steps) {
          cumulativeDelay += Math.max(0, Number(step.delayMinutes) || 0);
          const scheduledAt = new Date(Date.now() + cumulativeDelay * 60_000).toISOString();
          rowsToInsert.push({
            user_id: userId,
            contact_id: contact.id,
            body: personalizeFor(step.message || "", contact),
            from_number: fromNumber,
            scheduled_at: scheduledAt,
            status: "pending",
            campaign_id: campaign.id,
            cancel_on_reply: true,
          });
        }
        enrolledCount++;
      }

      if (rowsToInsert.length > 0) {
        const INSERT_CHUNK = 500;
        const allInserted: ScheduledMessage[] = [];
        for (let i = 0; i < rowsToInsert.length; i += INSERT_CHUNK) {
          const slice = rowsToInsert.slice(i, i + INSERT_CHUNK);
          const { data, error } = await supabase
            .from("scheduled_messages")
            .insert(slice)
            .select();
          if (error) break;
          if (data) allInserted.push(...(data as ScheduledMessage[]));
        }
        if (allInserted.length > 0) {
          setScheduledMessages((prev) => [...prev, ...allInserted]);
        }
      }
    }

    setSelectedContactIds(new Set());
    if (campaign && steps.length > 0) {
      const skippedNote = skippedCount > 0 ? ` (${skippedCount} skipped — DNC or no number)` : "";
      setMessage(`✅ Enrolled ${enrolledCount} contact${enrolledCount !== 1 ? "s" : ""} in "${campaign.name}" — ${steps.length}-step drip queued${skippedNote}. Stops per contact when they reply.`);
    } else {
      setMessage(`✅ Assigned ${ids.length} contact${ids.length !== 1 ? "s" : ""} to ${campaignName || "no campaign"}`);
    }
    window.setTimeout(() => setMessage(""), 4500);
  };

  const handleDeleteCampaign = async (id: string) => {
    const ok = await dbDeleteCampaign(id);
    if (ok) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      setMessage("✅ Campaign deleted");
    } else {
      setMessage("❌ Failed to delete campaign");
    }
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleLaunchCampaign = async (campaignId: string) => {
    if (!requireSubscription()) return;
    // Prevent double-fire: if this campaign is already in-flight (button
    // clicked twice, CSV auto-launch + manual launch, etc.) bail immediately.
    // The server-side idempotency guard is the real safety net, but stopping
    // here avoids a confusing 409 error reaching the user.
    if (launchingCampaignId === campaignId) return;
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign || !currentUser || !userId) return;
    if (campaign.status === "Sending" || campaign.status === "Completed") {
      setMessage(`❌ Campaign is already ${campaign.status.toLowerCase()}`);
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    const ownedNumbers = currentUser.ownedNumbers || [];
    if (ownedNumbers.length === 0) {
      setMessage("❌ Buy a phone number first before launching a campaign");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Use campaign's stored selected numbers, or fall back to all owned numbers
    const fromNumbers = campaign.selectedNumbers && campaign.selectedNumbers.length > 0
      ? campaign.selectedNumbers
      : ownedNumbers.map((n) => n.number);

    // Audience = contacts assigned to this campaign, or all non-DNC if none assigned
    const campaignContacts = contacts.filter((c) => !c.dnc && c.campaign === campaign.name);
    const hasCampaignContacts = campaignContacts.length > 0;
    const audience = hasCampaignContacts ? campaignContacts.length : contacts.filter((c) => !c.dnc).length;

    if (audience === 0) {
      setMessage("❌ No eligible contacts for this campaign");
      window.setTimeout(() => setMessage(""), 3000);
      return;
    }

    const steps = campaign.steps && campaign.steps.length > 0 ? campaign.steps : [{ id: "1", message: campaign.message || "", delayMinutes: 0 }];
    const totalMessages = audience * steps.length;
    const cost = totalMessages * (currentUser.plan.messageCost || 0.012);
    const walletBalance = currentUser.walletBalance || 0;

    if (walletBalance < cost) {
      setMessage(`❌ Insufficient funds. Need ${formatCurrency(cost)} for ${totalMessages} messages (${audience} contacts × ${steps.length} step${steps.length > 1 ? "s" : ""})`);
      window.setTimeout(() => setMessage(""), 3500);
      return;
    }

    setLaunchingCampaignId(campaignId);

    // NOTE: wallet charge moved to the server — send-campaign debits the
    // balance atomically as each chunk sends, so the dashboard ticks the
    // wallet down live and we never overcharge if the send halts early.

    // Optimistic UI only — do NOT write "Sending" to the DB here.
    // The server atomically flips Draft/Scheduled/Paused → Sending as its
    // idempotency guard. If we pre-set the DB status the guard will always
    // see "Sending" and reject every launch with a 409.
    setCampaigns((prev) => prev.map((c) =>
      c.id === campaignId ? { ...c, status: "Sending" as const, audience } : c
    ));

    setMessage(`✅ Campaign launched — sending ${steps.length} step${steps.length > 1 ? "s" : ""} to ${audience} contacts...`);

    // Send each step via send-campaign API
    try {
      let totalSent = 0;
      let totalFailed = 0;

      for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
        const step = steps[stepIdx];

        // Before each step, re-check the campaign's status so a pause while
        // waiting between steps actually stops the next step from firing.
        const { data: liveCampaign } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();
        if (liveCampaign?.status === "Paused") {
          setMessage(`⏸ Campaign paused — stopped before step ${stepIdx + 1}/${steps.length}`);
          break;
        }

        // Wait for delay (skip delay for first step)
        if (stepIdx > 0 && step.delayMinutes > 0) {
          setMessage(`⏳ Step ${stepIdx + 1}/${steps.length} — waiting ${step.delayMinutes} minute${step.delayMinutes !== 1 ? "s" : ""}...`);
          await new Promise((resolve) => setTimeout(resolve, step.delayMinutes * 60 * 1000));
        }

        setMessage(`📤 Sending step ${stepIdx + 1}/${steps.length}...`);

        const res = await authFetch("/api/send-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            userId,
            fromNumbers,
            messageTemplate: step.message,
            campaignName: hasCampaignContacts ? campaign.name : undefined,
            stepIndex: stepIdx,
            totalSteps: steps.length,
          }),
        });

        const data = await res.json();
        if (data.success) {
          totalSent += data.sent;
          totalFailed += data.failed;
          if (data.paused) {
            // User hit pause mid-step — stop the outer loop too.
            setMessage(`⏸ Campaign paused — ${totalSent} sent before stop`);
            setCampaigns((prev) => prev.map((c) =>
              c.id === campaignId ? {
                ...c, status: "Paused" as const,
                sent: totalSent, failed: totalFailed, audience,
              } : c
            ));
            setLaunchingCampaignId(null);
            window.setTimeout(() => setMessage(""), 4000);
            return;
          }
        } else {
          setMessage(`❌ Step ${stepIdx + 1} error: ${data.error}`);
          break;
        }
      }

      // If the outer loop broke on pause, reflect that status instead of Completed.
      const { data: finalCampaign } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaignId)
        .single();
      const finalStatus: "Completed" | "Paused" =
        finalCampaign?.status === "Paused" ? "Paused" : "Completed";
      setCampaigns((prev) => prev.map((c) =>
        c.id === campaignId ? {
          ...c, status: finalStatus,
          sent: totalSent, failed: totalFailed, audience,
        } : c
      ));
      if (finalStatus === "Completed") {
        setMessage(`✅ Campaign complete — ${totalSent} sent, ${totalFailed} failed across ${steps.length} step${steps.length > 1 ? "s" : ""}`);
      }
    } catch {
      setMessage("❌ Could not connect to SMS service");
    }

    setLaunchingCampaignId(null);
    window.setTimeout(() => setMessage(""), 4000);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    await dbUpdateCampaign(campaignId, { status: "Paused" });
    setCampaigns((prev) => prev.map((c) =>
      c.id === campaignId ? { ...c, status: "Paused" as const } : c
    ));
    setMessage("⏸ Pausing campaign — remaining messages will stop within a few seconds");
    window.setTimeout(() => setMessage(""), 3500);
  };

  const handleScheduleCampaign = async () => {
    if (!scheduleCampaignId || !campaignScheduleDate || !campaignScheduleTime) {
      setMessage("❌ Select a date and time to schedule");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const scheduledAt = new Date(`${campaignScheduleDate}T${campaignScheduleTime}`);
    if (scheduledAt.getTime() <= Date.now()) {
      setMessage("❌ Schedule time must be in the future");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    // Store the schedule on the campaign (update status to indicate scheduled)
    const campaign = campaigns.find((c) => c.id === scheduleCampaignId);
    if (!campaign) return;

    await dbUpdateCampaign(scheduleCampaignId, {
      status: "Scheduled" as Campaign["status"],
      scheduled_at: scheduledAt.toISOString(),
    } as Partial<Campaign>);

    setCampaigns((prev) =>
      prev.map((c) => c.id === scheduleCampaignId ? { ...c, status: "Scheduled" as const, scheduledAt: scheduledAt.toISOString() } : c)
    );

    setScheduleCampaignId(null);
    setCampaignScheduleDate("");
    setCampaignScheduleTime("");

    const dateStr = scheduledAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    setMessage(`✅ Campaign "${campaign.name}" scheduled for ${dateStr}`);
    window.setTimeout(() => setMessage(""), 4000);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedFileName = file.name;

    // Keep the raw text around so we can persist it on the audit row (and
    // re-download it later from the Upload CSV history). Skip the storage
    // copy for files >5MB — not worth bloating the DB row.
    const rawReader = new FileReader();
    let rawText: string | null = null;
    rawReader.onload = () => {
      const t = typeof rawReader.result === "string" ? rawReader.result : "";
      if (t && t.length <= 5_000_000) rawText = t;
    };
    rawReader.readAsText(file);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data.length) {
          setMessage("❌ No rows found in CSV");
          window.setTimeout(() => setMessage(""), 2500);
          return;
        }

        const totalRows = results.data.length;

        const rows = results.data
          .map((row) => ({
            user_id: userId,
            first_name: row["First Name"] || row["firstName"] || row["first_name"] || "",
            last_name: row["Last Name"] || row["lastName"] || row["last_name"] || "",
            phone: row["Phone"] || row["phone"] || row["Phone Number"] || row["phone_number"] || "",
            email: row["Email"] || row["email"] || "",
            city: row["City"] || row["city"] || "",
            state: row["State"] || row["state"] || "",
            address: row["Address"] || row["address"] || "",
            zip: row["Zip"] || row["zip"] || row["ZIP"] || "",
            lead_source: row["Lead Source"] || row["leadSource"] || row["lead_source"] || "",
            tags: [] as string[], notes: "", dnc: false,
            campaign: csvCampaignId ? (campaigns.find((c) => c.id === csvCampaignId)?.name || "") : "",
            quote: "", policy_id: "", timeline: "", household_size: "",
            date_of_birth: "", age: "",
          }))
          .filter((c) => c.first_name || c.phone);

        const invalidCount = totalRows - rows.length;

        // Deduplicate: check against existing contacts by phone number
        const existingPhones = new Set(
          contacts.map((c) => c.phone.replace(/\D/g, "")).filter(Boolean)
        );
        const csvPhoneSeen = new Set<string>();
        const deduped: typeof rows = [];
        let dupeCount = 0;

        for (const row of rows) {
          const normalized = row.phone.replace(/\D/g, "");
          if (!normalized) { deduped.push(row); continue; } // no phone, keep it
          if (existingPhones.has(normalized) || csvPhoneSeen.has(normalized)) {
            dupeCount++;
            continue;
          }
          csvPhoneSeen.add(normalized);
          deduped.push(row);
        }

        // Persist an audit row to csv_uploads so this upload shows up in the
        // Upload CSV history tab. We do this whether or not any contacts
        // actually land — the user still wants to see the attempt.
        const recordUpload = async (successCount: number) => {
          const payload = {
            user_id: userId,
            file_name: uploadedFileName,
            uploaded_at: new Date().toISOString(),
            total_rows: totalRows,
            success: successCount,
            duplicates: dupeCount,
            invalid: invalidCount,
            tcpa_violations: 0,
            dnc_complainers: 0,
            validation_used: "Internal DNC" as string | null,
            charged: null as number | null,
            file_content: rawText,
          };
          const { data: inserted } = await supabase
            .from("csv_uploads")
            .insert(payload)
            .select()
            .single();
          const rec: CSVUploadRecord = inserted
            ? {
                id: inserted.id as string,
                fileName: inserted.file_name as string,
                date: inserted.uploaded_at as string,
                totalRows: inserted.total_rows as number,
                success: inserted.success as number,
                duplicates: inserted.duplicates as number,
                invalid: inserted.invalid as number,
                validationUsed: (inserted.validation_used as string | null) || null,
                charged: (inserted.charged as number | null) ?? null,
                tcpaViolations: (inserted.tcpa_violations as number) || 0,
                dncComplainers: (inserted.dnc_complainers as number) || 0,
              }
            : {
                id: `upload_${Date.now()}`,
                fileName: uploadedFileName,
                date: payload.uploaded_at,
                totalRows,
                success: successCount,
                duplicates: dupeCount,
                invalid: invalidCount,
                validationUsed: "Internal DNC",
                charged: null,
                tcpaViolations: 0,
                dncComplainers: 0,
              };
          setCsvUploadHistory((prev) => [rec, ...prev]);
        };

        if (deduped.length === 0) {
          await recordUpload(0);
          setMessage(`❌ All ${dupeCount} contacts already exist (duplicate phone numbers)`);
          window.setTimeout(() => setMessage(""), 3000);
          return;
        }

        // Batch insert
        const { data, error } = await supabase.from("contacts").insert(deduped).select();
        if (error || !data) {
          await recordUpload(0);
          setMessage("❌ Failed to import contacts");
          window.setTimeout(() => setMessage(""), 2500);
          return;
        }

        const imported = (data as Contact[]).map(contactToRecord);
        setContacts((prev) => [...imported, ...prev]);
        await recordUpload(imported.length);
        const dupeMsg = dupeCount > 0 ? ` (${dupeCount} duplicates skipped)` : "";
        setMessage(`✅ Imported ${imported.length} contacts${dupeMsg}`);
        window.setTimeout(() => setMessage(""), 3000);
      },
      error: () => {
        setMessage("❌ Failed to parse CSV");
        window.setTimeout(() => setMessage(""), 2500);
      },
    });

    e.target.value = "";
  };

  // ── CSV Upload Wizard Handlers ──
  const handleCSVFileSelect = (file: File) => {
    setCsvFileName(file.name);
    // Read the raw text alongside parsing so we can re-serve it from the
    // history table. Only keep if it's under ~5MB — beyond that we'd bloat
    // the DB row and it's rarely worth storing anyway.
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (text && text.length <= 5_000_000) setCsvRawText(text);
      else setCsvRawText("");
    };
    reader.onerror = () => setCsvRawText("");
    reader.readAsText(file);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          setMessage("❌ No rows found in CSV");
          window.setTimeout(() => setMessage(""), 2500);
          setCsvFileName("");
          return;
        }
        setCsvRawData(results.data);
        // Hide columns that are never useful for SMS — keeps the mapping
        // table focused on things the user actually might want to map.
        const EXCLUDED_CSV_HEADERS = new Set([
          "contactid", "flagged", "address2", "leadstatus", "addeddate",
          "contactowner", "spousename", "medicationtaken", "highbloodpressure",
          "diabetes", "children", "tobaccouse", "lastresultcode",
        ]);
        const normalize = (s: string) =>
          s.toLowerCase().trim().replace(/[_\-\s]+/g, "");
        const headers = Object.keys(results.data[0]).filter(
          (h) => !EXCLUDED_CSV_HEADERS.has(normalize(h))
        );
        const mappings: CSVColumnMapping[] = headers.map((header) => ({
          csvHeader: header,
          preview: results.data.slice(0, 2).map((row) => row[header] || ""),
          mappedTo: autoDetectMapping(header),
        }));
        setCsvColumnMappings(mappings);
      },
      error: () => {
        setMessage("❌ Failed to parse CSV file");
        window.setTimeout(() => setMessage(""), 2500);
        setCsvFileName("");
      },
    });
  };

  const handleCSVWizardSubmit = async () => {
    if (!userId || csvUploading) return;
    setCsvUploading(true);

    // Build mapping: contact field → csv header
    const fieldToHeader: Record<string, string> = {};
    for (const col of csvColumnMappings) {
      if (col.mappedTo) fieldToHeader[col.mappedTo] = col.csvHeader;
    }

    const campaignName = csvCampaignId ? (campaigns.find((c) => c.id === csvCampaignId)?.name || "") : "";

    const rows = csvRawData
      .map((row) => ({
        user_id: userId,
        first_name: fieldToHeader.first_name ? (row[fieldToHeader.first_name] || "") : "",
        last_name: fieldToHeader.last_name ? (row[fieldToHeader.last_name] || "") : "",
        phone: fieldToHeader.phone ? (row[fieldToHeader.phone] || "") : "",
        email: fieldToHeader.email ? (row[fieldToHeader.email] || "") : "",
        city: fieldToHeader.city ? (row[fieldToHeader.city] || "") : "",
        state: fieldToHeader.state ? (row[fieldToHeader.state] || "") : "",
        address: fieldToHeader.address ? (row[fieldToHeader.address] || "") : "",
        zip: fieldToHeader.zip ? (row[fieldToHeader.zip] || "") : "",
        lead_source: fieldToHeader.lead_source ? (row[fieldToHeader.lead_source] || "") : "",
        date_of_birth: fieldToHeader.date_of_birth ? (row[fieldToHeader.date_of_birth] || "") : "",
        age: fieldToHeader.age ? (row[fieldToHeader.age] || "") : "",
        quote: fieldToHeader.quote ? (row[fieldToHeader.quote] || "") : "",
        policy_id: fieldToHeader.policy_id ? (row[fieldToHeader.policy_id] || "") : "",
        timeline: fieldToHeader.timeline ? (row[fieldToHeader.timeline] || "") : "",
        household_size: fieldToHeader.household_size ? (row[fieldToHeader.household_size] || "") : "",
        notes: fieldToHeader.notes ? (row[fieldToHeader.notes] || "") : "",
        tags: csvUploadTags.length > 0 ? csvUploadTags : (fieldToHeader.tags ? [row[fieldToHeader.tags] || ""].filter(Boolean) : []),
        dnc: false,
        campaign: campaignName,
      }))
      .filter((c) => c.phone.replace(/\D/g, "").length >= 10); // Must have a valid 10+ digit phone

    const invalidCount = csvRawData.length - rows.length;

    // Internal DNC scrub — pulls every phone this user has ever flagged as DNC
    // (auto-flagged from STOP / UNSUBSCRIBE replies, or manually marked). Any
    // incoming row matching one of those numbers is dropped before import so
    // we don't re-text people who opted out. Required for TCPA compliance.
    // Paginated to break past Supabase's 1000-row cap on big DNC lists.
    const dncPhones = new Set<string>();
    try {
      const DNC_PAGE = 1000;
      for (let page = 0; page < 50; page++) {
        const fromIdx = page * DNC_PAGE;
        const toIdx = fromIdx + DNC_PAGE - 1;
        const { data: dncRows, error: dncErr } = await supabase
          .from("contacts")
          .select("phone")
          .eq("user_id", userId)
          .eq("dnc", true)
          .range(fromIdx, toIdx);
        if (dncErr || !dncRows || dncRows.length === 0) break;
        for (const r of dncRows as Array<{ phone: string | null }>) {
          const d = (r.phone || "").replace(/\D/g, "");
          const norm = d.startsWith("1") ? d.slice(1) : d;
          if (norm) dncPhones.add(norm);
        }
        if (dncRows.length < DNC_PAGE) break;
      }
    } catch {
      // If the DNC fetch fails we'd rather keep the upload working than block
      // it entirely — we'll just skip the scrub for this run.
    }

    let dncRemoved = 0;
    const afterDnc = rows.filter((row) => {
      const d = row.phone.replace(/\D/g, "");
      const norm = d.startsWith("1") ? d.slice(1) : d;
      if (norm && dncPhones.has(norm)) {
        dncRemoved++;
        return false;
      }
      return true;
    });

    // Dedup (runs on the post-DNC list so dedupe counts don't double-count
    // rows we already dropped for DNC).
    //
    // Previously this only deduped against the in-memory `contacts` state
    // array, which is paginated — so a user with 50k contacts would happily
    // re-import any phone not currently rendered. We now ask the DB directly
    // via `check_existing_phones`, in chunks of 1000, so dedup is accurate
    // regardless of how much of the contact list is loaded client-side.
    let deduped = afterDnc;
    let dupeCount = 0;
    if (csvIgnoreDuplicates) {
      // Normalize each incoming phone to last-10 digits — matches the SQL
      // side so formatting differences between CSV and stored rows don't
      // cause false misses.
      const csvLast10ByRow = afterDnc.map((row) => {
        const d = row.phone.replace(/\D/g, "");
        const last10 = d.length >= 10 ? d.slice(-10) : "";
        return last10;
      });

      // Collect the unique set we need to check against the DB. Skip rows
      // with unparseable phones (length < 10) — those stay in the import.
      const uniqueCsvLast10 = Array.from(
        new Set(csvLast10ByRow.filter((p) => p.length === 10))
      );

      // Chunked RPC — 1000 per call keeps the request payload small and
      // lets the functional index short-circuit each call to an indexed
      // lookup.
      const existingLast10 = new Set<string>();
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < uniqueCsvLast10.length; i += CHUNK_SIZE) {
        const chunk = uniqueCsvLast10.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase.rpc("check_existing_phones", {
          p_user_id: userId,
          p_phones_last10: chunk,
        });
        if (error) {
          // Fail open — if the dedup RPC errors we'd rather let the import
          // through than block it. Duplicates will just land as extra rows.
          console.warn("check_existing_phones failed:", error.message);
          break;
        }
        if (Array.isArray(data)) {
          for (const row of data as Array<string | { check_existing_phones?: string }>) {
            const v = typeof row === "string" ? row : row?.check_existing_phones;
            if (v) existingLast10.add(v);
          }
        }
      }

      // Also dedup within the CSV itself so two rows with the same phone
      // don't both land.
      const csvPhoneSeen = new Set<string>();
      deduped = [];
      for (let idx = 0; idx < afterDnc.length; idx++) {
        const row = afterDnc[idx];
        const last10 = csvLast10ByRow[idx];
        if (!last10) { deduped.push(row); continue; }
        if (existingLast10.has(last10) || csvPhoneSeen.has(last10)) {
          dupeCount++;
          continue;
        }
        csvPhoneSeen.add(last10);
        deduped.push(row);
      }
    }

    // Persist an upload record to Supabase so the history survives refreshes.
    // Returns the DB id so the in-memory record lines up with what's stored.
    const persistUploadRecord = async (args: {
      success: number;
      charged: number | null;
    }): Promise<CSVUploadRecord> => {
      const payload = {
        user_id: userId,
        file_name: csvFileName,
        uploaded_at: new Date().toISOString(),
        total_rows: csvRawData.length,
        success: args.success,
        duplicates: dupeCount,
        invalid: invalidCount,
        tcpa_violations: 0,
        dnc_complainers: dncRemoved,
        // Always ran an internal DNC scrub during this upload. When we plug in
        // an external registry (DNC.com / Contact Center Compliance), we'll
        // append that provider's name here too, e.g. "Internal + DNC.com".
        validation_used: "Internal DNC" as string | null,
        charged: args.charged,
        file_content: csvRawText || null,
      };
      const { data, error } = await supabase
        .from("csv_uploads")
        .insert(payload)
        .select()
        .single();
      if (error || !data) {
        // Fall back to a local-only record so the UI still reflects the upload.
        return {
          id: `upload_${Date.now()}`,
          fileName: csvFileName,
          date: payload.uploaded_at,
          totalRows: csvRawData.length,
          success: args.success,
          duplicates: dupeCount,
          invalid: invalidCount,
          validationUsed: "Internal DNC",
          charged: args.charged,
          tcpaViolations: 0,
          dncComplainers: dncRemoved,
          fileContent: csvRawText || null,
        };
      }
      return {
        id: data.id as string,
        fileName: data.file_name as string,
        date: data.uploaded_at as string,
        totalRows: data.total_rows as number,
        success: data.success as number,
        duplicates: data.duplicates as number,
        invalid: data.invalid as number,
        validationUsed: (data.validation_used as string | null) || null,
        charged: (data.charged as number | null) ?? null,
        tcpaViolations: (data.tcpa_violations as number) || 0,
        dncComplainers: (data.dnc_complainers as number) || 0,
        fileContent: (data.file_content as string | null) || null,
      };
    };

    if (deduped.length === 0) {
      const record = await persistUploadRecord({ success: 0, charged: null });
      setCsvUploadHistory((prev) => [record, ...prev]);
      const parts = [
        `${dupeCount} duplicates`,
        `${invalidCount} invalid`,
        ...(dncRemoved > 0 ? [`${dncRemoved} on DNC`] : []),
      ];
      setMessage(`❌ No new contacts to import (${parts.join(", ")})`);
      window.setTimeout(() => setMessage(""), 3500);
      setCsvUploading(false);
      resetCSVWizard();
      return;
    }

    // Batch insert in parallel chunks. Previously this was sequential
    // chunks of 500 — a 10k CSV sat on 20 round trips (~4-6 s). Now we fire
    // batches in waves of PARALLELISM at a time, each of BATCH_SIZE rows,
    // so 10k rows collapses to ~4 round-trips' worth of wall time.
    const BATCH_SIZE = 1000;
    const PARALLELISM = 4;
    const batches: typeof deduped[] = [];
    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      batches.push(deduped.slice(i, i + BATCH_SIZE));
    }

    const importedAll: ContactRecord[] = [];
    let totalImported = 0;
    for (let w = 0; w < batches.length; w += PARALLELISM) {
      const wave = batches.slice(w, w + PARALLELISM);
      const results = await Promise.all(
        wave.map((chunk) => supabase.from("contacts").insert(chunk).select())
      );
      for (const { data, error } of results) {
        if (!error && data) {
          const imported = (data as Contact[]).map(contactToRecord);
          importedAll.push(...imported);
          totalImported += imported.length;
        }
      }
      // Show progress mid-upload for larger files so the wizard doesn't
      // look frozen on a 10k import.
      if (deduped.length > 2000) {
        setMessage(`📥 Imported ${totalImported.toLocaleString()} of ${deduped.length.toLocaleString()}...`);
      }
    }
    // Single state update at the end — one React re-render instead of N.
    if (importedAll.length > 0) {
      setContacts((prev) => [...importedAll, ...prev]);
    }

    const record = await persistUploadRecord({ success: totalImported, charged: null });
    setCsvUploadHistory((prev) => [record, ...prev]);

    // If a campaign was selected, send it to the imported contacts
    if (csvCampaignId && totalImported > 0 && currentUser) {
      const campaign = campaigns.find((c) => c.id === csvCampaignId);
      if (campaign) {
        const ownedNumbers = currentUser.ownedNumbers || [];
        if (ownedNumbers.length === 0) {
          setMessage(`✅ Imported ${totalImported.toLocaleString()} contacts — but no phone number to send from. Buy a number first.`);
          window.setTimeout(() => setMessage(""), 5000);
          setCsvUploading(false);
          resetCSVWizard();
          return;
        }

        const fromNumbers = campaign.selectedNumbers && campaign.selectedNumbers.length > 0
          ? campaign.selectedNumbers
          : ownedNumbers.map((n) => n.number);

        const steps = campaign.steps && campaign.steps.length > 0
          ? campaign.steps
          : [{ id: "1", message: campaign.message || "", delayMinutes: 0 }];

        const totalMessages = totalImported * steps.length;
        const cost = totalMessages * (currentUser.plan.messageCost || 0.012);
        const walletBalance = currentUser.walletBalance || 0;

        if (walletBalance < cost) {
          setMessage(`✅ Imported ${totalImported.toLocaleString()} contacts — but insufficient funds to send. Need ${formatCurrency(cost)} for ${totalMessages} messages.`);
          window.setTimeout(() => setMessage(""), 5000);
          setCsvUploading(false);
          resetCSVWizard();
          return;
        }

        // NOTE: We no longer charge the wallet up front. send-campaign now
        // decrements the balance atomically as each chunk of messages is
        // actually sent, so the user sees their balance tick down live and
        // doesn't get double-charged for sends that never went through.

        // Optimistic UI only — do NOT pre-set "Sending" in the DB.
        // The server atomically flips Draft → Sending as its idempotency guard.
        // Pre-writing Sending here breaks the guard and causes every launch to
        // return 409 without sending anything.
        setCampaigns((prev) => prev.map((c) =>
          c.id === csvCampaignId ? { ...c, status: "Sending" as const, audience: totalImported } : c
        ));

        setMessage(`✅ Imported ${totalImported.toLocaleString()} contacts — sending campaign "${campaign.name}"...`);

        try {
          let totalSent = 0;
          let totalFailed = 0;

          for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
            const step = steps[stepIdx];
            if (stepIdx > 0 && step.delayMinutes > 0) {
              setMessage(`⏳ Step ${stepIdx + 1}/${steps.length} — waiting ${step.delayMinutes} minute${step.delayMinutes !== 1 ? "s" : ""}...`);
              await new Promise((resolve) => setTimeout(resolve, step.delayMinutes * 60 * 1000));
            }

            setMessage(`📤 Sending step ${stepIdx + 1}/${steps.length} to ${totalImported} contacts...`);

            const res = await authFetch("/api/send-campaign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaignId: csvCampaignId,
                userId,
                fromNumbers,
                messageTemplate: step.message,
                campaignName: campaign.name,
                stepIndex: stepIdx,
                totalSteps: steps.length,
              }),
            });

            const data = await res.json();
            if (data.success) {
              totalSent += data.sent;
              totalFailed += data.failed;
            } else {
              setMessage(`❌ Step ${stepIdx + 1} error: ${data.error}`);
              break;
            }
          }

          setCampaigns((prev) => prev.map((c) =>
            c.id === csvCampaignId ? {
              ...c, status: "Completed" as const,
              sent: (c.sent || 0) + totalSent, failed: (c.failed || 0) + totalFailed, audience: (c.audience || 0) + totalImported,
            } : c
          ));
          await dbUpdateCampaign(csvCampaignId, { status: "Completed", sent: totalSent, failed: totalFailed, audience: totalImported });
          setMessage(`✅ Done — ${totalSent} sent, ${totalFailed} failed across ${steps.length} step${steps.length > 1 ? "s" : ""}`);
          // Re-read the latest wallet (send-campaign has been debiting it
          // chunk by chunk) and trigger auto-recharge if it's below threshold.
          const { data: fresh } = await supabase
            .from("profiles")
            .select("wallet_balance")
            .eq("id", userId)
            .single();
          if (fresh) checkAutoRecharge(Number(fresh.wallet_balance) || 0);
        } catch {
          setMessage("❌ Could not connect to SMS service");
        }

        window.setTimeout(() => setMessage(""), 5000);
        setCsvUploading(false);
        resetCSVWizard();
        return;
      }
    }

    setMessage(`✅ Imported ${totalImported.toLocaleString()} contacts${dupeCount > 0 ? ` (${dupeCount} duplicates skipped)` : ""}${invalidCount > 0 ? ` (${invalidCount} invalid)` : ""}${dncRemoved > 0 ? ` (${dncRemoved} on DNC)` : ""}`);
    window.setTimeout(() => setMessage(""), 4000);
    setCsvUploading(false);
    resetCSVWizard();
  };

  const resetCSVWizard = () => {
    setCsvUploadStep(1);
    setCsvRawData([]);
    setCsvRawText("");
    setCsvFileName("");
    setCsvColumnMappings([]);
    setCsvCampaignId("");
    setCsvUploadTags([]);
    setCsvTagInput("");
  };

  // Download handler for the CSV upload history. Pulls file_content on demand
  // (it's excluded from the initial list-load to keep it fast) and triggers
  // a browser download. Gracefully degrades when file_content was too big to
  // persist at upload time.
  const handleDownloadUpload = async (rec: CSVUploadRecord) => {
    try {
      let content = rec.fileContent;
      if (!content) {
        const { data } = await supabase
          .from("csv_uploads")
          .select("file_content")
          .eq("id", rec.id)
          .single();
        content = (data?.file_content as string | null) || "";
      }
      if (!content) {
        setMessage("⚠️ Original file isn't available for download (was too large to store).");
        window.setTimeout(() => setMessage(""), 3500);
        return;
      }
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = rec.fileName || "upload.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMessage("❌ Could not download file");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  // Remove an upload entry from history (keeps imported contacts — this only
  // clears the audit row in csv_uploads).
  const handleDeleteUploadRecord = async (rec: CSVUploadRecord) => {
    const prev = csvUploadHistory;
    setCsvUploadHistory((curr) => curr.filter((r) => r.id !== rec.id));
    const { error } = await supabase.from("csv_uploads").delete().eq("id", rec.id);
    if (error) {
      // Roll back the optimistic update on failure.
      setCsvUploadHistory(prev);
      setMessage("❌ Could not remove record");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendConversationMessage();
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-screen-2xl items-center justify-center px-8 py-10">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-zinc-300">
            Loading dashboard...
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-screen-2xl items-center justify-center px-8 py-10">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-zinc-300">
            Redirecting...
          </div>
        </div>
      </main>
    );
  }

  // Admin-granted free subs unlock paid features without a Stripe subscription.
  const isSubscribed =
    currentUser.freeSubscription === true ||
    currentUser.subscriptionStatus === "active" ||
    currentUser.subscriptionStatus === "canceling";

  const a2pStatus = currentUser.a2pRegistration?.status;
  const is10DLCApproved = a2pStatus === "completed" || a2pStatus === "campaign_approved";

  const requireSubscription = () => {
    if (isSubscribed) return true;
    if (demoMode) {
      setMessage("🔒 This feature is disabled in demo mode. Subscribe to unlock full access.");
      window.setTimeout(() => setMessage(""), 4000);
      return false;
    }
    setMessage("❌ Please subscribe and add a payment method before using paid features. Go to the Billing tab.");
    window.setTimeout(() => setMessage(""), 4000);
    return false;
  };

  const require10DLCApproved = () => {
    if (is10DLCApproved) return true;
    if (demoMode) return true;
    setMessage("🔒 Complete 10DLC registration and wait for carrier approval before purchasing numbers.");
    window.setTimeout(() => setMessage(""), 5000);
    setActiveTab("settings");
    setSettingsSubTab("10dlc");
    return false;
  };

  // ── Paywall Gate ── show subscription wall before accessing the platform
  if (!isSubscribed && !demoMode) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-screen-xl flex-col items-center justify-center px-6 py-16">
          <Logo size="xl" />

          <h1 className="mt-8 text-center text-4xl font-bold tracking-tight md:text-5xl">
            Welcome to Text2Sale
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-400">
            The #1 mass texting CRM for insurance agents and sales teams. Subscribe to unlock the full platform — manage contacts, launch campaigns, send texts, and close more deals.
          </p>

          <div className="mt-10 grid w-full max-w-md gap-4">
            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              className="w-full rounded-2xl bg-violet-600 px-8 py-5 text-xl font-bold shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 hover:shadow-violet-600/30"
            >
              Subscribe — {formatCurrency(currentUser.plan.price)}/month
            </button>

            {/* Demo Tour Button */}
            <button
              onClick={() => setDemoMode(true)}
              className="w-full rounded-2xl border border-zinc-700 px-8 py-4 text-lg font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
            >
              👀 Take a Tour (Demo Preview)
            </button>
          </div>

          {/* Feature highlights */}
          <div className="mt-14 grid w-full max-w-3xl gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="text-3xl">📱</div>
              <h3 className="mt-3 text-lg font-bold">Mass Texting</h3>
              <p className="mt-2 text-sm text-zinc-400">Upload CSV lists and blast campaigns to thousands of leads instantly.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="text-3xl">📊</div>
              <h3 className="mt-3 text-lg font-bold">CRM Dashboard</h3>
              <p className="mt-2 text-sm text-zinc-400">Track contacts, conversations, delivery rates, and reply rates all in one place.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <div className="text-3xl">🔢</div>
              <h3 className="mt-3 text-lg font-bold">Local Numbers</h3>
              <p className="mt-2 text-sm text-zinc-400">Purchase local phone numbers to boost trust and deliverability.</p>
            </div>
          </div>

          <div className="mt-6 w-full max-w-3xl rounded-2xl border border-emerald-800/40 bg-emerald-950/20 px-6 py-4 text-center text-emerald-300">
            <span className="text-lg font-semibold">💰 Bulk Discount:</span>
            <span className="ml-2 text-zinc-300">Save 10% when you add $100+ to your wallet &middot; 15% off $500+</span>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-zinc-800 px-6 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              Logout
            </button>
          </div>

          {/* Toast message */}
          {message && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-zinc-800 px-6 py-4 text-sm shadow-xl border border-zinc-700">
              {message}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─── Command Palette commands ───────────────────────────────────────
  // The master list of navigable actions the palette exposes. Keep this
  // close to the return so setters/handlers are in scope.
  const paletteCommands: Command[] = [
    // Navigation
    { id: "nav-overview",      section: "Go to",    label: "Overview",        hint: "Stats, sparklines, AI insights", onRun: () => setActiveTab("overview"),      icon: <span className="text-base">📊</span> },
    { id: "nav-conversations", section: "Go to",    label: "Conversations",   hint: "All inbox threads",              onRun: () => setActiveTab("conversations"), icon: <span className="text-base">💬</span> },
    { id: "nav-campaigns",     section: "Go to",    label: "Campaigns",       hint: "Launch or review campaigns",     onRun: () => setActiveTab("campaigns"),     icon: <span className="text-base">🚀</span> },
    { id: "nav-contacts",      section: "Go to",    label: "Contacts",        hint: "Browse and tag your list",       onRun: () => setActiveTab("contacts"),      icon: <span className="text-base">👥</span> },
    { id: "nav-appointments",  section: "Go to",    label: "Appointments",    hint: "Calendar & bookings",            onRun: () => setActiveTab("appointments"),  icon: <span className="text-base">📅</span> },
    { id: "nav-upload",        section: "Go to",    label: "Upload CSV",      hint: "Import leads in bulk",           onRun: () => setActiveTab("upload"),        icon: <span className="text-base">📤</span> },
    { id: "nav-templates",     section: "Go to",    label: "Templates",       hint: "Quick replies & canned messages", onRun: () => setActiveTab("templates"),    icon: <span className="text-base">📝</span> },
    { id: "nav-settings",      section: "Go to",    label: "Settings",        hint: "Billing, numbers, AI, team",     onRun: () => setActiveTab("settings"),      icon: <span className="text-base">⚙️</span> },
    { id: "nav-learn",         section: "Go to",    label: "Learn",           hint: "Tutorials & tips",               onRun: () => setActiveTab("learn"),         icon: <span className="text-base">📖</span> },

    // Settings sub-pages
    { id: "set-billing",    section: "Settings",  label: "Billing & Wallet",      onRun: () => { setActiveTab("settings"); setSettingsSubTab("billing"); },     icon: <span className="text-base">💳</span> },
    { id: "set-numbers",    section: "Settings",  label: "Phone Numbers",         hint: "View deliverability, buy more", onRun: () => { setActiveTab("settings"); setSettingsSubTab("numbers"); },     icon: <span className="text-base">📱</span> },
    { id: "set-ai",         section: "Settings",  label: "AI Assistant",          hint: "Auto-reply, tone, instructions", onRun: () => { setActiveTab("settings"); setSettingsSubTab("ai"); },           icon: <span className="text-base">🤖</span> },
    { id: "set-10dlc",      section: "Settings",  label: "10DLC Registration",    onRun: () => { setActiveTab("settings"); setSettingsSubTab("10dlc"); },       icon: <span className="text-base">✅</span> },
    { id: "set-biz",        section: "Settings",  label: "Business Page",         onRun: () => { setActiveTab("settings"); setSettingsSubTab("biz-page"); },    icon: <span className="text-base">🌐</span> },
    { id: "set-team",       section: "Settings",  label: "Team Members",          onRun: () => { setActiveTab("settings"); setSettingsSubTab("team"); },        icon: <span className="text-base">👥</span> },
    { id: "set-integrations", section: "Settings", label: "Integrations",         hint: "Lead vendor webhooks",         onRun: () => { setActiveTab("settings"); setSettingsSubTab("integrations"); }, icon: <span className="text-base">🔗</span> },
    { id: "set-activity",   section: "Settings",  label: "Activity Log",          onRun: () => { setActiveTab("settings"); setSettingsSubTab("activity"); },    icon: <span className="text-base">📋</span> },

    // Actions
    { id: "act-addfunds-25",  section: "Actions", label: "Add $25 to wallet",     onRun: () => handleAddFunds(25),  icon: <span className="text-base">💵</span> },
    { id: "act-addfunds-50",  section: "Actions", label: "Add $50 to wallet",     onRun: () => handleAddFunds(50),  icon: <span className="text-base">💵</span> },
    { id: "act-addfunds-100", section: "Actions", label: "Add $100 to wallet",    onRun: () => handleAddFunds(100), icon: <span className="text-base">💵</span> },
    { id: "act-unread",       section: "Actions", label: "Show unread conversations", onRun: () => { setActiveTab("conversations"); setConvShowUnread(true); setConvShowRecents(false); setConvShowArchived(false); setConvShowWorking(false); }, icon: <span className="text-base">🔥</span> },
    { id: "act-buy-number",   section: "Actions", label: "Buy a phone number",    onRun: () => { setActiveTab("settings"); setSettingsSubTab("numbers"); }, icon: <span className="text-base">➕</span> },
    { id: "act-toggle-theme", section: "Actions", label: `Switch to ${themeMode === "dark" ? "light" : "dark"} mode`, onRun: () => { const next = themeMode === "dark" ? "light" : "dark"; setThemeMode(next); try { window.localStorage.setItem("t2s_theme", next); } catch {} }, icon: <span className="text-base">{themeMode === "dark" ? "☀️" : "🌙"}</span> },
    ...(currentUser?.role === "admin" ? [{ id: "act-admin", section: "Actions", label: "Open Admin Portal", onRun: () => router.push("/admin"), icon: <span className="text-base">🛡️</span> } as Command] : []),
    { id: "act-logout", section: "Actions", label: "Log out", onRun: () => handleLogout(), icon: <span className="text-base">🚪</span> },
  ];

  return (
    <main className={`min-h-screen transition-colors duration-300 ${themeMode === "light" ? "t2s-light bg-gray-50 text-zinc-900" : "bg-zinc-950 text-white"}`}>
      {/* Demo Mode Banner */}
      {demoMode && !isSubscribed && (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-gradient-to-r from-violet-700 to-violet-600 px-6 py-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-lg">👀</span>
            <span className="font-bold">Demo Mode</span>
            <span className="text-sm opacity-80">— You&apos;re previewing the platform. Subscribe to unlock all features.</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSubscribe}
              className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-violet-700 hover:bg-zinc-100 transition"
            >
              Subscribe Now — {formatCurrency(currentUser.plan.price)}/mo
            </button>
            <button
              onClick={() => setDemoMode(false)}
              className="rounded-xl border border-white/30 px-5 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {/* Impersonation Banner */}
      {impersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-600 px-6 py-3 text-black shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-lg">👁️</span>
            <span className="font-bold">Viewing as: {impersonatingUserName}</span>
            <span className="text-sm opacity-80">— You are in read-only impersonation mode</span>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="rounded-xl bg-black px-5 py-2 text-sm font-bold text-white hover:bg-zinc-800 transition"
          >
            ← Back to Admin
          </button>
        </div>
      )}
      <div className="mx-auto max-w-screen-2xl px-6 py-8 lg:px-8">
        {/* ─── Premium top bar ─────────────────────────────────────────
            Compact row with logo, glass-style search trigger that opens
            the command palette, and a cluster of avatar/theme/logout
            actions. Works on all breakpoints. */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden h-6 w-px bg-zinc-800 sm:block" />
            {impersonating && (
              <span className="hidden rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300 sm:inline-block">
                Viewing {impersonatingUserName}
              </span>
            )}
            {/* Live status pulse */}
            <div className="hidden items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-400 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              </span>
              <span>Live</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400 transition hover:border-violet-500/40 hover:bg-zinc-900 hover:text-white"
              title="Search (⌘K)"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="hidden sm:inline">Search or jump…</span>
              <kbd className="hidden rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline">⌘K</kbd>
            </button>

            {/* Wallet chip */}
            <button
              onClick={() => { setActiveTab("settings"); setSettingsSubTab("billing"); }}
              className="hidden items-center gap-2 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-500/40 sm:flex"
              title="Billing & wallet"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M20 12v4H6a2 2 0 0 0 0 4h14v-4"/><circle cx="16" cy="14" r="1"/>
              </svg>
              <span className="tabular-nums">{formatCurrency(currentUser.walletBalance || 0)}</span>
            </button>

            <button
              onClick={() => {
                const next = themeMode === "dark" ? "light" : "dark";
                setThemeMode(next);
                try { window.localStorage.setItem("t2s_theme", next); } catch { /* ignore */ }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-lg transition hover:border-zinc-700 hover:bg-zinc-900"
              title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {themeMode === "dark" ? "☀️" : "🌙"}
            </button>

            {currentUser.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white md:inline-flex"
              >
                Admin
              </button>
            )}

            {/* Avatar menu (logout) */}
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-sm transition hover:border-red-500/40 hover:bg-red-500/10"
              title="Log out"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
                {(currentUser.firstName?.[0] || "?").toUpperCase()}{(currentUser.lastName?.[0] || "").toUpperCase()}
              </span>
              <svg className="h-4 w-4 text-zinc-500 transition group-hover:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Hero welcome block ─────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })} · {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </div>
            <h1 className="mt-1.5 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Welcome back, {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() + currentUser.firstName.slice(1) : "there"}
            </h1>
            <p className="mt-2 text-[15px] text-zinc-400 italic">
              &ldquo;{dailyQuote}&rdquo;
            </p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          {(() => {
            // Badge count must match the Unread tab filter — only count leads
            // who actually texted back (inbound exists) and aren't DNC.
            // Otherwise the badge shows "10" while the tab lists nothing.
            const totalUnread = conversationsWithContacts.reduce((sum, c) => {
              if (!c.unread || c.unread <= 0) return sum;
              if (c.contact?.dnc) return sum;
              if (!c.messages.some((m) => m.direction === "inbound")) return sum;
              return sum + c.unread;
            }, 0);
            return ([
              { id: "overview", label: "Overview" },
              { id: "conversations", label: "Conversations" },
              { id: "campaigns", label: "Campaigns" },
              { id: "contacts", label: "Contacts" },
              { id: "appointments", label: "Appointments" },
              { id: "upload", label: "Upload CSV" },
              { id: "templates", label: "Templates" },
              { id: "settings", label: "Settings" },
              { id: "learn", label: "📖 Learn" },
            ] as { id: DashboardTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {tab.label}
                {tab.id === "conversations" && totalUnread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
            ));
          })()}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* ═══════════════ HERO METRIC ROW ═══════════════
                Four gradient stat cards with embedded sparklines. Each
                card links to the relevant deep-dive view. The sparkline
                renders the last 7 days of the metric, giving instant
                pattern recognition without clicking into analytics. */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* Wallet */}
              <button
                onClick={() => { setActiveTab("settings"); setSettingsSubTab("billing"); }}
                className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 p-6 text-left transition hover:border-emerald-400/40 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition group-hover:bg-emerald-500/20"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Wallet</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M20 12v4H6a2 2 0 0 0 0 4h14v-4"/><circle cx="16" cy="14" r="1"/></svg>
                  </span>
                </div>
                <div className="mt-3 text-4xl font-bold tabular-nums text-white">
                  {formatCurrency(currentUser.walletBalance || 0)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{currentUser.credits || 0} credits · Plan: {currentUser.plan.name}</div>
              </button>

              {/* Delivery rate + sparkline */}
              <div className="group relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-zinc-900 to-zinc-950 p-6">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">Delivery</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tabular-nums text-white">{deliveryRate.toFixed(1)}</span>
                  <span className="text-lg font-semibold text-sky-400">%</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-xs text-zinc-500">{totalSent.toLocaleString()} sent · {totalFailed.toLocaleString()} failed</span>
                  <Sparkline values={last7.delivered} width={70} height={24} stroke="#38bdf8" fill="rgba(56,189,248,0.18)" />
                </div>
              </div>

              {/* Reply rate + sparkline */}
              <div className="group relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 p-6">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Reply Rate</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tabular-nums text-white">{replyRate.toFixed(1)}</span>
                  <span className="text-lg font-semibold text-amber-400">%</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-xs text-zinc-500">{totalReplies.toLocaleString()} replies</span>
                  <Sparkline values={last7.replies} width={70} height={24} stroke="#fbbf24" fill="rgba(251,191,36,0.2)" />
                </div>
              </div>

              {/* Contacts · Numbers */}
              <button
                onClick={() => setActiveTab("contacts")}
                className="group relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-950 p-6 text-left transition hover:border-violet-400/40 hover:shadow-[0_0_30px_rgba(167,139,250,0.15)]"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-violet-500/20"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Your Book</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-white">{contacts.length.toLocaleString()}</span>
                  <span className="text-sm text-zinc-500">contacts</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{currentUser.ownedNumbers?.length || 0} number{currentUser.ownedNumbers?.length === 1 ? "" : "s"}</span>
                  <span>·</span>
                  <span>{contacts.filter(c => c.dnc).length} DNC</span>
                </div>
              </button>
            </div>

            {/* ═══════════════ SPEED-TO-LEAD SLA ROW ═══════════════
                Left: AI-style insight card that adapts to the current
                state of the user's sales motion. Right: hot-leads
                call-to-action that pulses when there's work to do. */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* AI Insight card */}
              <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-fuchsia-500/5 via-zinc-900 to-zinc-950 p-6 md:col-span-2">
                <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">TextAlot AI</span>
                      <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-bold text-fuchsia-300">BETA</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-semibold text-white">
                      {(() => {
                        // Adaptive insight based on current state. Investors love
                        // seeing the product "think" about them; we derive a
                        // targeted nudge from the same data already on screen.
                        if (firstReplyStats.hotLeads > 0) return `${firstReplyStats.hotLeads} hot lead${firstReplyStats.hotLeads === 1 ? "" : "s"} just replied — close them fast.`;
                        if (replyRate > 0 && replyRate < 5) return "Your reply rate is low. Try shorter opening messages and personalization.";
                        if (totalSent === 0) return "You haven't launched a campaign yet. Upload a CSV and try a welcome blast.";
                        if (deliveryRate < 85 && totalSent > 50) return "Delivery rate is under 85% — verify your 10DLC status and from-numbers.";
                        if (firstReplyStats.repliedCount > 0 && firstReplyStats.avgMinutes > 60) return `Avg reply time is ${(firstReplyStats.avgMinutes / 60).toFixed(1)}h. Fast follow-ups 3× your close rate.`;
                        return "You're on a roll. Keep the texts warm and personal — momentum sells.";
                      })()}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {(() => {
                        if (firstReplyStats.hotLeads > 0) return "Unread inbound messages from the last hour — the fastest reply wins the sale.";
                        if (replyRate > 0 && replyRate < 5) return "Top performers see 12-18% reply rates. Shorten your opener to one sentence with a question.";
                        if (totalSent === 0) return "Go to Upload CSV → tag your list → launch a campaign from the Campaigns tab.";
                        if (deliveryRate < 85 && totalSent > 50) return "Unverified brands and flagged numbers fail silently. Check Settings → 10DLC.";
                        return "Keep the momentum — every reply compounds when your list is warm.";
                      })()}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {firstReplyStats.hotLeads > 0 && (
                        <button
                          onClick={() => { setActiveTab("conversations"); setConvShowUnread(true); setConvShowRecents(false); setConvShowArchived(false); setConvShowWorking(false); }}
                          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-violet-500/50"
                        >
                          Open Hot Leads →
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab("campaigns")}
                        className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                      >
                        Launch Campaign
                      </button>
                      <button
                        onClick={() => setActiveTab("templates")}
                        className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                      >
                        Browse Templates
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hot Leads pulse card */}
              <button
                onClick={() => { setActiveTab("conversations"); setConvShowUnread(true); setConvShowRecents(false); setConvShowArchived(false); setConvShowWorking(false); }}
                className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition ${
                  firstReplyStats.hotLeads > 0
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-zinc-950 shadow-[0_0_40px_rgba(245,158,11,0.15)] hover:shadow-[0_0_50px_rgba(245,158,11,0.3)]"
                    : "border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 hover:border-zinc-700"
                }`}
              >
                {firstReplyStats.hotLeads > 0 && (
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl"></div>
                )}
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${firstReplyStats.hotLeads > 0 ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-500"}`}>
                    {firstReplyStats.hotLeads > 0 ? (
                      <span className="text-base animate-pulse">🔥</span>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {firstReplyStats.hotLeads > 0 ? "Hot Leads" : "All Quiet"}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className={`text-5xl font-bold tabular-nums ${firstReplyStats.hotLeads > 0 ? "text-amber-400" : "text-zinc-600"}`}>
                    {firstReplyStats.hotLeads}
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {firstReplyStats.hotLeads > 0 ? (
                    <>Unread replies in the last hour · <span className="text-amber-300">click to call</span></>
                  ) : (
                    "No unread inbound in the last hour"
                  )}
                </div>
                {firstReplyStats.repliedCount > 0 && (
                  <div className="mt-4 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
                    Avg first-reply time:{" "}
                    <span className="font-semibold text-cyan-400">
                      {firstReplyStats.avgMinutes >= 60
                        ? `${(firstReplyStats.avgMinutes / 60).toFixed(1)}h`
                        : `${firstReplyStats.avgMinutes.toFixed(0)}m`}
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* ═══════════════ PERFORMANCE + QUICK ACTIONS ═══════════════ */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              {/* Performance Snapshot with activity sparkline */}
              <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Performance Snapshot</h2>
                    <p className="text-xs text-zinc-500">Last 7 days of outbound &amp; inbound activity</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    </span>
                    Live
                  </span>
                </div>

                {/* Inline sparkline overlay */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">7-day sent</div>
                      <div className="mt-1 text-3xl font-bold tabular-nums text-white">
                        {last7.sent.reduce((a, b) => a + b, 0).toLocaleString()}
                      </div>
                    </div>
                    <Sparkline values={last7.sent} width={180} height={44} stroke="#a78bfa" fill="rgba(167,139,250,0.2)" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Sent</div>
                      <div className="mt-1 text-xl font-bold tabular-nums">{totalSent.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Replies</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-emerald-400">{totalReplies.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Failed</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-red-400">{totalFailed.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Current Plan</div>
                    <div className="mt-1 text-lg font-bold">{currentUser.plan.name}</div>
                    <div className="text-xs text-zinc-500">
                      {formatCurrency(currentUser.plan.price)}/mo · {formatCurrency(currentUser.plan.messageCost)}/msg
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveTab("settings"); setSettingsSubTab("billing"); }}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-violet-500/40 hover:text-white"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Quick Actions — premium tile grid */}
              <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Quick Actions</h2>
                  <button
                    onClick={() => setPaletteOpen(true)}
                    className="hidden items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-500 transition hover:text-zinc-300 sm:flex"
                  >
                    <kbd>⌘</kbd><kbd>K</kbd>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab("conversations")}
                    className="group rounded-2xl border border-zinc-800 bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4 text-left shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/40"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div className="text-sm font-semibold text-white">Inbox</div>
                    <div className="text-[11px] text-violet-100/80">Reply to leads</div>
                  </button>
                  <button
                    onClick={() => setActiveTab("campaigns")}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-800/60"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-violet-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </div>
                    <div className="text-sm font-semibold text-white">Launch</div>
                    <div className="text-[11px] text-zinc-500">New campaign</div>
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-800/60"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-sky-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div className="text-sm font-semibold text-white">Upload</div>
                    <div className="text-[11px] text-zinc-500">CSV of leads</div>
                  </button>
                  <button
                    onClick={() => { setActiveTab("settings"); setSettingsSubTab("numbers"); }}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-800/60"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div className="text-sm font-semibold text-white">Numbers</div>
                    <div className="text-[11px] text-zinc-500">Buy or view</div>
                  </button>
                  <button
                    onClick={() => handleAddFunds(50)}
                    className="group col-span-2 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 p-4 text-left transition hover:border-emerald-400/40"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-emerald-300">Add $50 to wallet</div>
                        <div className="text-[11px] text-emerald-300/70">Instant via Stripe</div>
                      </div>
                      <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Spending & Campaign Performance */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Spending History */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xl font-bold">Spending Summary</h2>
                {(() => {
                  const history = currentUser.usageHistory || [];
                  const deposits = history.filter((h) => h.type === "fund_add" || h.type === "credit_add").reduce((s, h) => s + h.amount, 0);
                  const msgCharges = history.filter((h) => h.type === "charge" && h.description?.includes("Campaign")).reduce((s, h) => s + h.amount, 0);
                  const numCharges = history.filter((h) => h.type === "number_purchase" || (h.type === "charge" && h.description?.includes("number"))).reduce((s, h) => s + h.amount, 0);
                  const otherCharges = history.filter((h) => h.type === "charge" && !h.description?.includes("Campaign") && !h.description?.includes("number")).reduce((s, h) => s + h.amount, 0);
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between rounded-2xl bg-zinc-800 px-5 py-3">
                        <span className="text-sm text-zinc-400">Total Deposited</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(deposits)}</span>
                      </div>
                      <div className="flex justify-between rounded-2xl bg-zinc-800 px-5 py-3">
                        <span className="text-sm text-zinc-400">Campaign Spending</span>
                        <span className="font-bold text-red-400">{formatCurrency(msgCharges)}</span>
                      </div>
                      <div className="flex justify-between rounded-2xl bg-zinc-800 px-5 py-3">
                        <span className="text-sm text-zinc-400">Number Fees</span>
                        <span className="font-bold text-amber-400">{formatCurrency(numCharges)}</span>
                      </div>
                      {otherCharges > 0 && (
                        <div className="flex justify-between rounded-2xl bg-zinc-800 px-5 py-3">
                          <span className="text-sm text-zinc-400">Other Charges</span>
                          <span className="font-bold text-zinc-300">{formatCurrency(otherCharges)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Per-Campaign Performance */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xl font-bold">Campaign Performance</h2>
                {userCampaigns.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">No campaigns yet</div>
                ) : (
                  <div className="max-h-64 space-y-3 overflow-y-auto">
                    {userCampaigns.map((c) => {
                      const total = c.sent + c.failed;
                      const rate = total > 0 ? ((c.sent / total) * 100).toFixed(0) : "—";
                      const rr = c.sent > 0 ? ((c.replies / c.sent) * 100).toFixed(0) : "—";
                      return (
                        <div key={c.id} className="rounded-2xl bg-zinc-800 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{c.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              c.status === "Completed" ? "bg-emerald-900 text-emerald-300" :
                              c.status === "Sending" ? "bg-sky-900 text-sky-300" : "bg-zinc-700 text-zinc-400"
                            }`}>{c.status}</span>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                            <span>{c.sent} sent</span>
                            <span className="text-red-400">{c.failed} failed</span>
                            <span className="text-emerald-400">{c.replies} replies</span>
                            <span>Delivery: {rate}%</span>
                            <span>Reply: {rr}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Referral & Team Code Card */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-bold">Refer & Earn $50</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Share your code with others. When they sign up and deposit $50, you <span className="font-semibold text-emerald-400">both get $50 free</span> added to your wallets.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-mono text-lg font-bold tracking-wider">
                    {currentUser.referralCode || "—"}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.referralCode || "");
                      setMessage("✅ Referral code copied!");
                      window.setTimeout(() => setMessage(""), 2000);
                    }}
                    className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700"
                  >
                    Copy
                  </button>
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  {(currentUser.role === "manager" || currentUser.role === "admin")
                    ? "This code also works as your team join code."
                    : "Give this code to friends when they sign up."}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-bold">Join a Team</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {currentUser.managerId
                    ? `You're on ${teamManagerName || "a manager"}'s team. Your manager can view your dashboard and add funds.`
                    : "Enter a manager's referral code to join their team. They'll be able to view your dashboard and send you funds."}
                </p>
                {currentUser.managerId ? (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 px-5 py-3">
                      <span className="text-sm text-emerald-400">Team: {teamManagerName || "Loading..."}</span>
                    </div>
                    <button
                      onClick={handleLeaveTeam}
                      disabled={teamLoading}
                      className="rounded-2xl border border-red-700 px-5 py-3 text-sm text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    >
                      Leave
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      value={teamJoinCode}
                      onChange={(e) => setTeamJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter team code (e.g. T2S-ABC123)"
                      className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-mono text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                    />
                    <button
                      onClick={handleJoinTeam}
                      disabled={teamLoading || !teamJoinCode.trim()}
                      className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      {teamLoading ? "..." : "Join"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* 7-Day Activity — dual-series gradient bar chart. Violet bars
                  are sent SMS; emerald pills on top are inbound replies so
                  you can see engagement at a glance. */}
              <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-bold">7-Day Activity</h2>
                    <p className="text-xs text-zinc-500">SMS sent & replies received</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="inline-block h-2 w-2 rounded-sm bg-gradient-to-t from-violet-600 to-fuchsia-400" />
                      Sent
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
                      Replies
                    </span>
                  </div>
                </div>

                {(() => {
                  const rows = analytics.dailyCounts.map((d, i) => ({
                    ...d,
                    replies: last7.replies[i] || 0,
                  }));
                  const maxVal = Math.max(
                    ...rows.map((r) => Math.max(r.count, r.replies)),
                    1
                  );
                  return (
                    <div className="relative h-44 w-full">
                      {/* Gridlines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-px bg-zinc-800/80" />
                        ))}
                      </div>
                      {/* Bars */}
                      <div className="relative flex h-full items-end gap-2 px-1">
                        {rows.map((d) => {
                          const sentH = Math.round((d.count / maxVal) * 150);
                          const replyH = Math.round((d.replies / maxVal) * 150);
                          const isToday = d.date === new Date().toISOString().slice(0, 10);
                          return (
                            <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                              <div className="flex h-[160px] w-full items-end justify-center gap-0.5">
                                <div
                                  className="w-3 rounded-t-md bg-gradient-to-t from-violet-600 via-violet-500 to-fuchsia-400 shadow-[0_0_10px_rgba(167,139,250,0.4)] transition-all group-hover:from-violet-500 group-hover:to-fuchsia-300"
                                  style={{ height: `${Math.max(sentH, d.count > 0 ? 4 : 2)}px` }}
                                  title={`${d.count} sent`}
                                />
                                <div
                                  className="w-3 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)] transition-all group-hover:from-emerald-500 group-hover:to-emerald-200"
                                  style={{ height: `${Math.max(replyH, d.replies > 0 ? 4 : 2)}px` }}
                                  title={`${d.replies} replies`}
                                />
                              </div>
                              <div className={`text-[10px] font-semibold tabular-nums ${isToday ? "text-violet-300" : "text-zinc-400"}`}>
                                {d.count}
                              </div>
                              <div className={`text-[9px] tabular-nums ${isToday ? "text-fuchsia-300 font-semibold" : "text-zinc-500"}`}>
                                {d.date.slice(5)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 flex justify-between border-t border-zinc-800 pt-3 text-xs">
                  <span className="text-zinc-400">
                    Total spent: <span className="font-semibold text-rose-300">{formatCurrency(analytics.totalSpent)}</span>
                  </span>
                  <span className="text-zinc-400">
                    Total funded: <span className="font-semibold text-emerald-300">{formatCurrency(analytics.totalFunded)}</span>
                  </span>
                </div>
              </div>

              {/* Campaign Performance — shows ALL campaigns with activity, not
                  just Completed ones. Live campaigns get a pulsing indicator. */}
              <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Campaign Performance</h2>
                    <p className="text-xs text-zinc-500">Top {Math.min(6, campaigns.filter((c) => c.sent > 0).length)} campaigns by send volume</p>
                  </div>
                </div>
                {(() => {
                  const active = campaigns
                    .filter((c) => c.sent > 0)
                    .sort((a, b) => b.sent - a.sent)
                    .slice(0, 6);
                  if (active.length === 0) {
                    return (
                      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 text-center">
                        <div className="text-3xl">📣</div>
                        <p className="mt-2 text-sm font-semibold text-zinc-300">Ready to send your first blast?</p>
                        <p className="mt-1 text-xs text-zinc-500">Launch a campaign and metrics appear here in real time.</p>
                        <button
                          onClick={() => setActiveTab("campaigns")}
                          className="mt-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 hover:brightness-110"
                        >
                          Create Campaign
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {active.map((c) => {
                        const deliv = c.sent > 0 ? ((c.sent - c.failed) / c.sent) * 100 : 0;
                        const reply = c.sent > 0 ? (c.replies / c.sent) * 100 : 0;
                        const isLive = c.status === "Sending" || c.status === "Scheduled";
                        return (
                          <div key={c.id || c.name} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 transition hover:border-violet-500/40">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {isLive && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                  </span>
                                )}
                                <span className="truncate text-sm font-semibold text-white">{c.name}</span>
                                {c.status && (
                                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                    c.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" :
                                    c.status === "Sending" ? "bg-violet-500/15 text-violet-300" :
                                    c.status === "Scheduled" ? "bg-sky-500/15 text-sky-300" :
                                    c.status === "Paused" ? "bg-amber-500/15 text-amber-300" :
                                    "bg-zinc-700 text-zinc-300"
                                  }`}>
                                    {c.status}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-300">{c.sent}<span className="text-zinc-500 font-normal"> sent</span></span>
                            </div>
                            <div className="mt-2 flex gap-4 text-xs tabular-nums">
                              <span className="text-emerald-400">{deliv.toFixed(1)}% delivered</span>
                              <span className="text-amber-400">{reply.toFixed(1)}% replied</span>
                              {c.failed > 0 && <span className="text-rose-400">{c.failed} failed</span>}
                            </div>
                            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${deliv}%` }} />
                              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${Math.min(reply, 100 - deliv)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Scheduled Messages */}
            {scheduledMessages.filter((m) => m.status === "pending").length > 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-bold mb-4">Scheduled Messages</h2>
                <div className="space-y-2">
                  {scheduledMessages.filter((m) => m.status === "pending").map((sm) => {
                    const contact = contacts.find((c) => c.id === sm.contact_id);
                    return (
                      <div key={sm.id} className="flex items-center justify-between rounded-xl bg-zinc-800 p-3">
                        <div>
                          <span className="text-sm font-medium">{contact ? `${contact.firstName} ${contact.lastName}` : "Unknown"}</span>
                          <span className="ml-2 text-xs text-zinc-400">{new Date(sm.scheduled_at).toLocaleString()}</span>
                          <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">{sm.body}</div>
                        </div>
                        <button onClick={() => handleCancelScheduled(sm.id)}
                          className="rounded-xl border border-red-700 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/30">
                          Cancel
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "conversations" && (
          <div className={`grid min-h-[85vh] gap-4 ${showConvContactPanel ? "xl:grid-cols-[300px_minmax(0,1fr)_340px]" : "xl:grid-cols-[300px_minmax(0,1fr)]"}`}>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-4">
                <div className="flex flex-col gap-3">
                  <h2 className="text-2xl font-bold">Chats</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tabs behave like radio buttons — exactly one is
                        always active. Clicking the active tab is a no-op
                        (no accidental toggle-off that made the filter
                        appear to "not work"). "All" is the default state
                        that shows every non-archived, non-DNC convo. */}
                    {(() => {
                      const selectTab = (tab: "all" | "unread" | "recents" | "working" | "archived") => {
                        setConvShowAll(tab === "all");
                        setConvShowUnread(tab === "unread");
                        setConvShowRecents(tab === "recents");
                        setConvShowWorking(tab === "working");
                        setConvShowArchived(tab === "archived");
                        if (tab !== "all") setConvSelectMode(false);
                      };
                      const activeTab =
                        convShowUnread ? "unread"
                        : convShowRecents ? "recents"
                        : convShowWorking ? "working"
                        : convShowArchived ? "archived"
                        : "all";
                      return (
                        <>
                          <button
                            onClick={() => selectTab("all")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${activeTab === "all" ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => selectTab("unread")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${activeTab === "unread" ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                            title="Conversations with unopened inbound messages"
                          >
                            Unread
                          </button>
                          <button
                            onClick={() => selectTab("recents")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${activeTab === "recents" ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                          >
                            Recents
                          </button>
                          <button
                            onClick={() => selectTab("working")}
                            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium ${activeTab === "working" ? "bg-emerald-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                            title="Show only leads you're actively working"
                          >
                            Working
                            {workingLeadConvIds.size > 0 && (
                              <span className={`rounded-full px-1.5 text-[10px] ${activeTab === "working" ? "bg-emerald-800 text-emerald-100" : "bg-zinc-800 text-emerald-400"}`}>
                                {workingLeadConvIds.size}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => { setConvSelectMode((v) => !v); setSelectedConvIds(new Set()); }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${convSelectMode ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                          >
                            {convSelectMode ? "Cancel" : "Select"}
                          </button>
                          <button
                            onClick={() => selectTab("archived")}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${activeTab === "archived" ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                          >
                            {activeTab === "archived" ? "Active" : "Archived"}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {convSelectMode && selectedConvIds.size > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setWorkflowBulkMode(true);
                          setWorkflowCampaignId("");
                          setWorkflowUseCurrentNumber(true);
                          setShowAddToWorkflow(true);
                        }}
                        className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-medium hover:from-violet-500 hover:to-fuchsia-500"
                        title="Add selected contacts to a workflow — stops for each when they reply"
                      >
                        Workflow ({selectedConvIds.size})
                      </button>
                      {/* Bulk cancel workflow — only shows when at least one of the
                          selected conversations has pending workflow steps. */}
                      {(() => {
                        const selectedContactIds = Array.from(selectedConvIds)
                          .map((cid) => conversations.find((c) => c.id === cid)?.contactId)
                          .filter((x): x is string => Boolean(x));
                        const anyPending = scheduledMessages.some(
                          (m) => m.status === "pending" && m.cancel_on_reply && selectedContactIds.includes(m.contact_id)
                        );
                        if (!anyPending) return null;
                        return (
                          <button
                            onClick={async () => {
                              const count = await handleCancelWorkflow(selectedContactIds);
                              if (count > 0) {
                                setMessage(`✅ Cancelled ${count} pending workflow step${count === 1 ? "" : "s"} across ${selectedContactIds.length} contact${selectedContactIds.length === 1 ? "" : "s"}.`);
                                window.setTimeout(() => setMessage(""), 3500);
                                setSelectedConvIds(new Set());
                                setConvSelectMode(false);
                              }
                            }}
                            className="flex-1 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-900/50"
                            title="Cancel pending workflow steps for selected contacts"
                          >
                            Cancel Workflow
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => {
                          setArchivedConvIds((prev) => {
                            const next = new Set(prev);
                            for (const id of selectedConvIds) {
                              if (convShowArchived) next.delete(id); else next.add(id);
                            }
                            return next;
                          });
                          setSelectedConvIds(new Set());
                          setConvSelectMode(false);
                        }}
                        className="flex-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        {convShowArchived ? `Unarchive ${selectedConvIds.size}` : `Archive ${selectedConvIds.size}`}
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        // Select all visible
                        setSelectedConvIds(new Set(filteredConversations.map((c) => c.id)));
                      }}
                      className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                    >
                      Select All ({filteredConversations.length})
                    </button>
                  </div>
                )}
              </div>

              <input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder={convShowAll ? "Search messages..." : "Search conversations..."}
                className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
              />

              {/* Quick actions for the Working tab — lets the user reset
                  the whole pinned set if they over-pinned by mistake,
                  without having to open each conversation one by one. */}
              {convShowWorking && workingLeadConvIds.size > 0 && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-xs">
                  <span className="text-emerald-300">
                    {workingLeadConvIds.size} pinned lead{workingLeadConvIds.size === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm("Clear all pinned Working Leads?")) {
                        setWorkingLeadConvIds(new Set());
                        setMessage("Cleared all Working Lead pins");
                        window.setTimeout(() => setMessage(""), 2000);
                      }
                    }}
                    className="rounded-lg border border-emerald-700/60 px-2 py-1 text-emerald-300 hover:bg-emerald-900/40"
                    title="Unpin every Working Lead"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {convShowAll ? (
                <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                  {activeSendingCampaigns.length > 0 && (
                    <div className="rounded-2xl border border-amber-700/50 bg-amber-900/20 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        Actively sending
                      </div>
                      <div className="mt-2 space-y-1">
                        {activeSendingCampaigns.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="truncate text-amber-100">{c.name}</span>
                            <span className="shrink-0 text-amber-300/70">
                              {c.sent}/{c.audience}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allSentMessages.map((msg) => {
                    const statusColor =
                      msg.status === "failed" ? "text-red-400"
                      : msg.status === "delivered" ? "text-emerald-400"
                      : "text-amber-300";
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setConvShowAll(false);
                          handleSelectConversation(msg.conversationId);
                        }}
                        className="cursor-pointer rounded-2xl bg-zinc-800/70 p-3 hover:bg-zinc-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-white">
                                {msg.contactName}
                              </span>
                              {msg.contactPhone && (
                                <span className="shrink-0 text-[11px] text-zinc-500">
                                  {msg.contactPhone}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                              {msg.body}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[10px] font-medium uppercase ${statusColor}`}>
                                {displayMessageStatus(msg.status)}
                              </span>
                              {/* Subtle colored star shows WHICH line this
                                  message went out on — color matches the
                                  line's chip in the number picker. Hover to
                                  see the full number. */}
                              {msg.fromNumber && (currentUser?.ownedNumbers?.length || 0) > 1 && (
                                <span
                                  className={`text-[11px] leading-none ${getNumberColor(msg.fromNumber).replace(/bg-[^\s]+|ring-[^\s]+/g, "").trim()}`}
                                  title={`Sent from ${msg.fromNumber}`}
                                  aria-label={`Sent from ${msg.fromNumber}`}
                                >
                                  ★
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-[10px] text-zinc-500">
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {allSentMessages.length === 0 && activeSendingCampaigns.length === 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                      No messages sent yet.
                    </div>
                  )}
                </div>
              ) : (
              <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                {filteredConversations.map((conversation) => {
                  const contact = conversation.contact;
                  const active = conversation.id === selectedConversation?.id;
                  const isSelected = selectedConvIds.has(conversation.id);
                  const temp = computeTemperature(conversation.messages, contact?.dnc);

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        if (convSelectMode) {
                          setSelectedConvIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(conversation.id)) next.delete(conversation.id); else next.add(conversation.id);
                            return next;
                          });
                        } else {
                          handleSelectConversation(conversation.id);
                        }
                      }}
                      className={`w-full cursor-pointer rounded-2xl p-4 text-left transition ${
                        isSelected
                          ? "bg-violet-600/40 ring-1 ring-violet-400"
                          : active
                          ? "bg-violet-600/30 ring-1 ring-violet-500"
                          : "bg-zinc-800/70 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${isSelected ? "bg-violet-600" : "bg-zinc-700"}`}>
                          {convSelectMode ? (isSelected ? "✓" : "") : getInitials(contact?.firstName, contact?.lastName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {/* Clickable pin toggle — tap the star to pin
                                  or unpin right from the sidebar, no need
                                  to open the conversation. stopPropagation
                                  prevents the row click from also firing. */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkingLeadConvIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(conversation.id)) next.delete(conversation.id);
                                    else next.add(conversation.id);
                                    return next;
                                  });
                                }}
                                className={`text-sm transition ${
                                  workingLeadConvIds.has(conversation.id)
                                    ? "text-emerald-400 hover:text-emerald-300"
                                    : "text-zinc-600 hover:text-emerald-400"
                                }`}
                                title={workingLeadConvIds.has(conversation.id) ? "Pinned as Working Lead — click to unpin" : "Pin as Working Lead"}
                                aria-label="Toggle Working Lead"
                              >
                                {workingLeadConvIds.has(conversation.id) ? "★" : "☆"}
                              </button>
                              <div className="truncate font-semibold text-white">
                                {contact
                                  ? `${contact.firstName} ${contact.lastName}`
                                  : "Unknown Contact"}
                              </div>
                              {/* Lead temperature — warm/hot/blazing indicator */}
                              {(temp.tier === "hot" || temp.tier === "blazing" || temp.tier === "warm") && (
                                <span
                                  title={`Lead Temperature: ${temp.label} (${temp.score}/100)`}
                                  className={`shrink-0 ${temp.tier === "blazing" ? "animate-pulse" : ""}`}
                                >
                                  {temp.emoji}
                                </span>
                              )}
                              {/* Colored star — identifies which of the user's
                                  lines this thread is on. Color matches the
                                  line's chip in the number picker. */}
                              {conversation.fromNumber && (currentUser?.ownedNumbers?.length || 0) > 1 && (
                                <span
                                  className={`shrink-0 text-sm leading-none ${getNumberColor(conversation.fromNumber).replace(/bg-[^\s]+|ring-[^\s]+/g, "").trim()}`}
                                  title={`On ${conversation.fromNumber}`}
                                  aria-label={`On ${conversation.fromNumber}`}
                                >
                                  ★
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {formatTime(conversation.lastMessageAt)}
                            </div>
                          </div>

                          <div className="mt-1 truncate text-sm text-zinc-400">
                            {conversation.preview}
                          </div>

                        </div>

                        {conversation.unread > 0 && (
                          <div className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-violet-500 px-2 text-xs font-semibold text-white">
                            {conversation.unread}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredConversations.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    {convShowArchived
                      ? "No archived conversations."
                      : convShowWorking
                        ? "No working leads yet. Open a conversation and tap \"Working Lead\" to pin it here."
                        : "No conversations found."}
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="flex h-[90vh] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              {selectedConversation ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-zinc-800 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                        {selectedContact ? getInitials(selectedContact.firstName, selectedContact.lastName) : "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-white">
                            {selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : "Unknown Contact"}
                          </div>
                          {selectedConversation && (() => {
                            const temp = computeTemperature(selectedConversation.messages, selectedContact?.dnc);
                            if (temp.tier === "cold" && temp.score === 0) return null;
                            return <TempBadge temp={temp} size="md" />;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>{selectedContact?.phone || "No contact linked"}</span>
                          {selectedContact?.state && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400" title={`Based on state: ${selectedContact.state}`}>
                              {(() => {
                                const s = (selectedContact.state || "").toUpperCase().trim();
                                const eastern = ["CT","DE","FL","GA","IN","KY","ME","MD","MA","MI","NH","NJ","NY","NC","OH","PA","RI","SC","VT","VA","WV","DC"];
                                const central = ["AL","AR","IL","IA","KS","LA","MN","MS","MO","NE","ND","OK","SD","TN","TX","WI"];
                                const mountain = ["AZ","CO","ID","MT","NM","UT","WY"];
                                const pacific = ["CA","NV","OR","WA"];
                                if (eastern.includes(s)) return "EST";
                                if (central.includes(s)) return "CST";
                                if (mountain.includes(s)) return "MST";
                                if (pacific.includes(s)) return "PST";
                                if (s === "AK") return "AKST";
                                if (s === "HI") return "HST";
                                return s;
                              })()}
                            </span>
                          )}
                          {/* Smart Send Window — best time to text this contact */}
                          {(() => {
                            const sw = computeSendWindow(selectedConversation?.messages, selectedContact?.state);
                            if (!sw) return null;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  sw.isInsideWindow
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-zinc-700 bg-zinc-800 text-zinc-400"
                                }`}
                                title={`${sw.reason} · Suggested: ${sw.suggestedLabel} local`}
                              >
                                {sw.isInsideWindow ? (
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                  </span>
                                ) : (
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                )}
                                {sw.isInsideWindow ? "Prime time" : `Best ~${sw.suggestedLabel}`}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {selectedContact?.dnc && (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                          DNC
                        </span>
                      )}
                      {currentUser?.ownedNumbers && currentUser.ownedNumbers.length > 0 && (() => {
                        const activeNumber =
                          convFromNumber ||
                          selectedConversation?.fromNumber ||
                          currentUser.ownedNumbers[0]?.number ||
                          "";
                        const color = getNumberColor(activeNumber);
                        // Single line — no dropdown needed.
                        if (currentUser.ownedNumbers.length === 1) {
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ring-1 ring-inset ${color}`}
                              title="Sending from"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              From {activeNumber}
                            </span>
                          );
                        }
                        // Multi-line — show the current number as a color pill,
                        // with a subtle dropdown to change it if needed.
                        return (
                          <div className="relative">
                            <select
                              value={activeNumber}
                              onChange={(e) => setConvFromNumber(e.target.value)}
                              className={`cursor-pointer appearance-none rounded-xl border-0 py-2 pl-7 pr-8 text-xs font-medium ring-1 ring-inset hover:brightness-110 focus:outline-none ${color}`}
                              title="This conversation's number — click to change"
                            >
                              {currentUser.ownedNumbers.map((n) => (
                                <option key={n.number} value={n.number} className="bg-zinc-900 text-white">
                                  From {n.number}
                                </option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute left-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current" />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">▼</span>
                          </div>
                        );
                      })()}
                      {/* Per-conversation AI toggle — auto-reply only in THIS conversation */}
                      {currentUser.aiPlan && (
                        <button
                          onClick={async () => {
                            if (!selectedConversation) return;
                            const next = !selectedConversation.aiEnabled;
                            setConversations((prev) =>
                              prev.map((c) => c.id === selectedConversation.id ? { ...c, aiEnabled: next, aiSkippedReason: next ? null : c.aiSkippedReason } : c)
                            );
                            await dbUpdateConversation(selectedConversation.id, {
                              ai_enabled: next,
                              // Clear any stale "skipped" flag when re-enabling — user is
                              // explicitly saying "take the wheel here".
                              ...(next ? { ai_skipped_reason: null } : {}),
                            });
                            setMessage(next ? "AI ON for this conversation" : "AI OFF for this conversation");
                            window.setTimeout(() => setMessage(""), 2000);

                            // If toggling ON and the lead's message is the last thing in
                            // the thread, fire an immediate AI reply — otherwise the user
                            // has to wait for the next inbound to see anything happen.
                            if (next && currentUser?.id) {
                              const msgs = selectedConversation.messages || [];
                              const lastMsg = msgs[msgs.length - 1];
                              if (lastMsg && lastMsg.direction === "inbound") {
                                try {
                                  const res = await authFetch("/api/ai-reply", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      userId: currentUser.id,
                                      conversationId: selectedConversation.id,
                                      contactId: selectedConversation.contactId,
                                      sendReply: true,
                                    }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (res.ok && data?.success !== false) {
                                    setMessage("AI replying…");
                                    window.setTimeout(() => setMessage(""), 2500);
                                  } else if (data?.error) {
                                    setMessage(`AI error: ${data.error}`);
                                    window.setTimeout(() => setMessage(""), 4000);
                                  }
                                } catch {
                                  // Non-fatal — the AI will still fire on the next inbound.
                                }
                              }
                            }
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                            selectedConversation?.aiEnabled
                              ? "bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/50"
                              : "border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                          }`}
                          title={selectedConversation?.aiEnabled ? "AI is ON for this chat — click to turn off" : "Turn on AI for this chat only"}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          AI
                        </button>
                      )}
                      {/* "AI skipped" chip — tells the user the AI made a
                          deliberate choice not to reply (e.g. the lead said
                          "NO" to the first outreach). Otherwise the AI toggle
                          being ON but silent looks like the AI is broken.
                          Clears automatically when the lead sends a new
                          message or the toggle is re-enabled. */}
                      {currentUser.aiPlan && selectedConversation?.aiSkippedReason === "decline_response" && (
                        <div
                          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-600/10 px-3 py-2 text-xs font-medium text-amber-300"
                          title="AI skipped this reply because the lead sounded like a hard no. Click the AI button to force a reply anyway."
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                          AI skipped — looks like a decline
                        </div>
                      )}
                      {/* Full AI toggle — auto-reply to ALL conversations */}
                      {currentUser.aiPlan && (
                        <button
                          onClick={async () => {
                            const next = !currentUser.aiAutoReply;
                            await persistProfile({ ai_auto_reply: next });
                            setCurrentUser((prev) => prev ? { ...prev, aiAutoReply: next } : prev);
                            setMessage(next ? "Full AI ON — replying to all conversations" : "Full AI OFF");
                            window.setTimeout(() => setMessage(""), 2500);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                            currentUser.aiAutoReply
                              ? "bg-cyan-600/20 text-cyan-400 ring-1 ring-cyan-500/50"
                              : "border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                          }`}
                          title={currentUser.aiAutoReply ? "Full AI is ON for ALL chats — click to turn off" : "Turn on Full AI for all conversations"}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                          </svg>
                          Full AI
                        </button>
                      )}
                      {/* Agent toggle — proactive follow-ups for this conversation */}
                      {currentUser.agentPlan && (
                        <button
                          onClick={async () => {
                            if (!selectedConversation) return;
                            const next = !selectedConversation.agentEnabled;
                            setConversations((prev) =>
                              prev.map((c) => c.id === selectedConversation.id ? { ...c, agentEnabled: next } : c)
                            );
                            await dbUpdateConversation(selectedConversation.id, { agent_enabled: next });
                            setMessage(next ? "Agent ON — will follow up automatically" : "Agent OFF");
                            window.setTimeout(() => setMessage(""), 2500);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                            selectedConversation?.agentEnabled
                              ? "bg-amber-600/20 text-amber-400 ring-1 ring-amber-500/50"
                              : "border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                          }`}
                          title={selectedConversation?.agentEnabled ? "Agent is ON — will auto follow-up if lead goes silent" : "Turn on Agent — it'll follow up automatically when the lead goes quiet"}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          </svg>
                          Agent
                        </button>
                      )}
                      {/* Add to Workflow — drop this contact into a drip that
                          auto-stops the second they reply. */}
                      <button
                        onClick={() => {
                          setWorkflowCampaignId("");
                          setWorkflowUseCurrentNumber(true);
                          setShowAddToWorkflow(true);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 hover:border-violet-500 hover:text-violet-300"
                        title="Add this contact to a workflow drip. Stops the moment they reply."
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
                        </svg>
                        Workflow
                      </button>
                      {/* Schedule Follow-up — drops a Google Calendar event for
                          this lead onto the rep's primary calendar. Only shown
                          when Calendar is connected; otherwise this would open
                          a modal that only errored on submit. */}
                      {currentUser?.googleCalendarConnected && (
                        <button
                          onClick={() => {
                            // Default to tomorrow at 10:00 local — a reasonable
                            // follow-up slot with almost no typing required.
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const yyyy = tomorrow.getFullYear();
                            const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
                            const dd = String(tomorrow.getDate()).padStart(2, "0");
                            setFollowUpDate(`${yyyy}-${mm}-${dd}`);
                            setFollowUpTime("10:00");
                            setFollowUpTitle("");
                            setFollowUpError("");
                            setShowFollowUpModal(true);
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 hover:border-emerald-500 hover:text-emerald-300"
                          title="Add a follow-up event for this lead to your Google Calendar."
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          Follow-up
                        </button>
                      )}
                      {/* Cancel Workflow — only visible when this contact has
                          pending drip steps queued. One click yanks them off
                          every workflow they're enrolled in. */}
                      {selectedConversation && scheduledMessages.some(
                        (m) => m.status === "pending" && m.cancel_on_reply && m.contact_id === selectedConversation.contactId
                      ) && (
                        <button
                          onClick={async () => {
                            if (!selectedConversation) return;
                            const count = await handleCancelWorkflow([selectedConversation.contactId]);
                            if (count > 0) {
                              setMessage(`✅ Cancelled ${count} pending workflow step${count === 1 ? "" : "s"} for this contact.`);
                              window.setTimeout(() => setMessage(""), 3500);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-sm text-amber-300 hover:bg-amber-900/50"
                          title="Cancel all pending workflow steps for this contact."
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel Workflow
                        </button>
                      )}
                      {/* Working Lead pin — flag this conversation as one
                          the user is actively working so they can jump back
                          to it fast via the "Working" tab in the sidebar. */}
                      {selectedConversation && (() => {
                        const isWorking = workingLeadConvIds.has(selectedConversation.id);
                        return (
                          <button
                            onClick={() => {
                              setWorkingLeadConvIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(selectedConversation.id)) next.delete(selectedConversation.id);
                                else next.add(selectedConversation.id);
                                return next;
                              });
                              setMessage(isWorking ? "Removed from Working Leads" : "✅ Marked as Working Lead");
                              window.setTimeout(() => setMessage(""), 2000);
                            }}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                              isWorking
                                ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/50"
                                : "border border-zinc-700 text-zinc-500 hover:text-emerald-300 hover:bg-zinc-800"
                            }`}
                            title={isWorking ? "This lead is pinned as working — click to unpin" : "Pin as a lead you're actively working"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                            {isWorking ? "Working" : "Working Lead"}
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => {
                          if (selectedConversation) {
                            setArchivedConvIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(selectedConversation.id)) next.delete(selectedConversation.id);
                              else next.add(selectedConversation.id);
                              return next;
                            });
                            setSelectedConversationId("");
                          }
                        }}
                        className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                        title="Archive conversation"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => setShowConvContactPanel((v) => !v)}
                        className={`rounded-xl border px-3 py-2 text-sm hover:bg-zinc-800 ${showConvContactPanel ? "border-violet-500 text-violet-300" : "border-zinc-700"}`}
                      >
                        {showConvContactPanel ? "Hide Info" : "More"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-zinc-950/40 px-5 py-6">
                    <div className="mb-6 text-center text-sm text-zinc-500">
                      {formatConversationDay(selectedConversation.lastMessageAt)}
                    </div>

                    <div className="space-y-5">
                      {selectedConversation.messages
                        .filter((item) => !convFromNumber || item.direction === "inbound" || item.fromNumber === convFromNumber || !item.fromNumber)
                        .map((item) => {
                          // Only score inbound messages — outbound keeps the
                          // signature violet→fuchsia gradient so the thread
                          // still reads "my reply" vs "their reply" at a glance.
                          const sent = item.direction === "inbound" ? analyzeSentiment(item.body) : null;
                          const inboundClasses =
                            sent && sent.tier !== "neutral"
                              ? `${sent.bgClass} text-zinc-100 border ${sent.borderClass} ring-1 ${sent.ringClass}`
                              : "bg-zinc-800 text-zinc-100";
                          return (
                            <div
                              key={item.id}
                              className={`flex ${
                                item.direction === "outbound" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div className="max-w-[72%]">
                                <div
                                  title={sent && sent.matched.length > 0 ? `Matched: ${sent.matched.join(", ")}` : undefined}
                                  className={`rounded-3xl px-5 py-4 text-[15px] leading-7 shadow-lg transition-all ${
                                    item.direction === "outbound"
                                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                                      : inboundClasses
                                  }`}
                                >
                                  {item.body}
                                </div>

                                <div
                                  className={`mt-2 flex items-center gap-2 text-xs text-zinc-500 ${
                                    item.direction === "outbound"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  {sent && sent.tier !== "neutral" && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] font-semibold">
                                      <span>{sent.emoji}</span>
                                      <span className="tracking-wide text-zinc-300">{sent.label}</span>
                                    </span>
                                  )}
                                  <span>{formatTime(item.createdAt)}</span>
                                  {item.direction === "outbound" && (
                                    <span>• {displayMessageStatus(item.status)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {/* Sentinel for auto-scroll to latest message */}
                    <div ref={convMessagesEndRef} />
                  </div>

                  <div className="border-t border-zinc-800 px-5 py-4">
                    {showTemplates && (
                      <div className="mb-3 max-h-60 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-800 p-3 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="text-xs font-semibold text-zinc-400">Templates — click to use</div>
                          <button onClick={() => setShowTemplateManager(true)} className="text-xs text-violet-400 hover:text-violet-300">Manage</button>
                        </div>
                        {templates.length > 0 && templates.map((tpl) => {
                          const preview = tpl.body.replace("{firstName}", selectedContact?.firstName || "there");
                          return (
                            <button key={tpl.id} onClick={() => handleUseTemplate(preview)}
                              className="w-full rounded-xl bg-zinc-700/60 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-700">
                              <span className="text-[10px] text-violet-400 block mb-0.5">{tpl.name}</span>{preview}
                            </button>
                          );
                        })}
                        {messageTemplates.map((tpl, i) => {
                          const preview = tpl.replace("{firstName}", selectedContact?.firstName || "there");
                          return (
                            <button key={`default-${i}`} onClick={() => { setComposerText(preview); setShowTemplates(false); }}
                              className="w-full rounded-xl bg-zinc-700/60 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-700">
                              <span className="text-[10px] text-zinc-500 block mb-0.5">Default</span>{preview}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {showQuickReplies && (
                      <div className="mb-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-3 space-y-2">
                        <div className="text-xs font-semibold text-zinc-400 px-1">Quick Replies</div>
                        <div className="flex flex-wrap gap-2">
                          {quickReplies.map((qr) => (
                            <button key={qr.id} onClick={() => handleUseQuickReply(qr.body)}
                              className="rounded-full bg-violet-600/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-600/50">
                              {qr.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Replies — sentiment-aware suggestions based on the
                        last inbound message. Only shows when composer is empty
                        and there's at least one inbound to react to. */}
                    {composerText.length === 0 && (() => {
                      const msgs = selectedConversation?.messages || [];
                      const lastInbound = [...msgs].reverse().find((m) => m.direction === "inbound");
                      if (!lastInbound) return null;
                      const sent: Sentiment = analyzeSentiment(lastInbound.body);
                      const replies = suggestReplies(sent, selectedContact?.firstName);
                      return (
                        <SmartReplies
                          suggestions={replies}
                          sentiment={sent}
                          onPick={(t) => setComposerText(t)}
                          className="mb-3"
                        />
                      );
                    })()}

                    {/* Send-window warning — if it's outside prime hours in the
                        contact's local timezone, nudge but don't block. */}
                    {composerText.length > 0 && (() => {
                      const sw = computeSendWindow(selectedConversation?.messages, selectedContact?.state);
                      if (!sw || sw.isInsideWindow) return null;
                      // Only warn if it's actually late/early — outside 8am-9pm
                      const nowLocalRaw = sw.contactLocalTimeLabel.match(/^(\d+)(?::\d+)?(am|pm)/i);
                      if (!nowLocalRaw) return null;
                      let h = parseInt(nowLocalRaw[1], 10);
                      const isPm = nowLocalRaw[2].toLowerCase() === "pm";
                      if (h === 12) h = isPm ? 12 : 0;
                      else if (isPm) h += 12;
                      const isLateOrEarly = h < 8 || h >= 21;
                      if (!isLateOrEarly) return null;
                      return (
                        <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <span>
                            It's <b>{sw.contactLocalTimeLabel}</b> for this contact. Better window opens around <b>{sw.suggestedLabel}</b>.
                          </span>
                        </div>
                      );
                    })()}

                    {composerText.length > 0 && (() => {
                      // Preview uses the SANITIZED body — same transform the
                      // server runs before hitting Telnyx — so the segment /
                      // cost counters match what the user actually pays. A
                      // single curly apostrophe would otherwise force UCS-2
                      // (70 char/seg) and silently 2-3× the bill.
                      const effective = sanitizeForSms(composerText);
                      const len = effective.length;
                      const hasUnicode = hasNonGsmChars(effective);
                      const segLimit = hasUnicode ? 70 : 160;
                      const segments = Math.max(1, Math.ceil(len / segLimit));
                      const remaining = segments * segLimit - len;
                      const cost = segments * (currentUser.plan.messageCost || 0.012);
                      return (
                        <div className="mb-2">
                          <div className="flex items-center gap-5 text-xs text-zinc-500">
                            <span>{len} / {segments * segLimit} chars</span>
                            <span className={segments > 3 ? "text-amber-400 font-medium" : segments > 1 ? "text-zinc-400" : ""}>
                              {segments} segment{segments > 1 ? "s" : ""}
                            </span>
                            <span>{remaining} chars left in segment</span>
                            <span>Cost: {formatCurrency(cost)}</span>
                            {hasUnicode && <span className="text-amber-400">Unicode detected (70 char/seg)</span>}
                          </div>
                          <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-800">
                            <div className={`h-1 rounded-full transition-all ${remaining < 20 ? "bg-amber-500" : "bg-violet-500"}`}
                              style={{ width: `${Math.min(100, ((len % segLimit) / segLimit) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="Insert text here ... (Enter to send, Shift+Enter for newline)"
                        className="h-16 w-full resize-none bg-transparent px-2 py-1.5 text-white outline-none placeholder:text-zinc-500"
                      />

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setShowTemplates((v) => !v); setShowQuickReplies(false); }}
                            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                            Templates
                          </button>
                          <button onClick={() => { setShowQuickReplies((v) => !v); setShowTemplates(false); }}
                            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                            Quick
                          </button>
                          {currentUser?.aiPlan && (
                            <button
                              onClick={handleAiSuggest}
                              disabled={aiLoading}
                              className="rounded-xl border border-cyan-700 bg-cyan-950/30 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-900/40 disabled:opacity-50"
                              title="Generate AI-suggested reply"
                            >
                              {aiLoading ? "Thinking..." : "AI Reply"}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowScheduleModal(true)}
                            className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800" title="Schedule for later">
                            Schedule
                          </button>
                          <button
                            onClick={handleSendConversationMessage}
                            disabled={!selectedContact}
                            title={!selectedContact ? "No contact linked to this conversation" : undefined}
                            className="rounded-2xl bg-violet-600 px-6 py-3 font-medium hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                      {/* AI Suggestion panel */}
                      {aiSuggestedReply && (
                        <div className="mt-3 rounded-2xl border border-cyan-800 bg-cyan-950/30 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wide text-cyan-400">AI Suggested Reply</span>
                            <span className="text-xs text-cyan-600">$0.025 per AI message</span>
                          </div>
                          <p className="mb-3 text-sm text-cyan-100">{aiSuggestedReply}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleAiSendReply}
                              disabled={aiLoading}
                              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                            >
                              {aiLoading ? "Sending..." : "Send AI Reply"}
                            </button>
                            <button
                              onClick={() => {
                                setComposerText(aiSuggestedReply);
                                setAiSuggestedReply("");
                              }}
                              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-900/40"
                            >
                              Edit First
                            </button>
                            <button
                              onClick={handleAiSuggest}
                              disabled={aiLoading}
                              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                            >
                              Regenerate
                            </button>
                            <button
                              onClick={() => setAiSuggestedReply("")}
                              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-zinc-500">
                  Select a conversation
                </div>
              )}
            </div>

            {showConvContactPanel && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              {selectedContact ? (
                <div className="max-h-[80vh] overflow-y-auto pr-1">
                  <div className="mb-5 flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div className="min-w-0">
                      <div className="truncate text-xl font-bold">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Contact details and notes
                      </div>
                    </div>
                    {/* Close button inside the panel — the toolbar "More"
                        button can get clipped on narrow widths, so the
                        panel needs its own way to close itself. */}
                    <button
                      onClick={() => setShowConvContactPanel(false)}
                      className="shrink-0 rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:border-violet-500 hover:bg-zinc-800 hover:text-violet-300"
                      title="Close contact panel"
                      aria-label="Close contact panel"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">First name</label>
                      <input
                        value={selectedContact.firstName || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("firstName", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Last name</label>
                      <input
                        value={selectedContact.lastName || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("lastName", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Email</label>
                      <input
                        value={selectedContact.email || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("email", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Phone Number</label>
                      <input
                        value={selectedContact.phone || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("phone", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Tags</label>
                      {/* Current tags */}
                      <div className="mb-2 flex flex-wrap gap-2">
                        {(selectedContact.tags || []).map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            className="flex items-center gap-1 rounded-full bg-violet-900/50 px-3 py-1 text-xs font-medium text-violet-300"
                          >
                            {tag}
                            <button
                              onClick={async () => {
                                const newTags = (selectedContact.tags || []).filter((_, i) => i !== idx);
                                setContacts((prev) =>
                                  prev.map((c) => c.id === selectedContact.id ? { ...c, tags: newTags } : c)
                                );
                                await dbUpdateContact(selectedContact.id, { tags: newTags });
                              }}
                              className="ml-0.5 text-violet-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {(selectedContact.tags || []).length === 0 && (
                          <span className="text-xs text-zinc-500">No tags</span>
                        )}
                      </div>
                      {/* Add tag input */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && newTagInput.trim()) {
                                e.preventDefault();
                                const tag = newTagInput.trim();
                                if ((selectedContact.tags || []).includes(tag)) {
                                  setNewTagInput("");
                                  return;
                                }
                                const newTags = [...(selectedContact.tags || []), tag];
                                setContacts((prev) =>
                                  prev.map((c) => c.id === selectedContact.id ? { ...c, tags: newTags } : c)
                                );
                                await dbUpdateContact(selectedContact.id, { tags: newTags });
                                setNewTagInput("");
                              }
                            }}
                            placeholder="Type a tag and press Enter"
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm"
                            list="existing-tags"
                          />
                          <datalist id="existing-tags">
                            {allTags
                              .filter((t) => !(selectedContact.tags || []).includes(t))
                              .map((t) => (
                                <option key={t} value={t} />
                              ))}
                          </datalist>
                        </div>
                        <button
                          onClick={async () => {
                            if (!newTagInput.trim()) return;
                            const tag = newTagInput.trim();
                            if ((selectedContact.tags || []).includes(tag)) {
                              setNewTagInput("");
                              return;
                            }
                            const newTags = [...(selectedContact.tags || []), tag];
                            setContacts((prev) =>
                              prev.map((c) => c.id === selectedContact.id ? { ...c, tags: newTags } : c)
                            );
                            await dbUpdateContact(selectedContact.id, { tags: newTags });
                            setNewTagInput("");
                          }}
                          className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm hover:bg-violet-700"
                        >
                          Add
                        </button>
                      </div>
                      {/* Quick-add existing tags */}
                      {allTags.filter((t) => !(selectedContact.tags || []).includes(t)).length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Quick add:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {allTags
                              .filter((t) => !(selectedContact.tags || []).includes(t))
                              .slice(0, 10)
                              .map((tag) => (
                                <button
                                  key={tag}
                                  onClick={async () => {
                                    const newTags = [...(selectedContact.tags || []), tag];
                                    setContacts((prev) =>
                                      prev.map((c) => c.id === selectedContact.id ? { ...c, tags: newTags } : c)
                                    );
                                    await dbUpdateContact(selectedContact.id, { tags: newTags });
                                  }}
                                  className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] text-zinc-400 hover:border-violet-600 hover:bg-violet-900/30 hover:text-violet-300"
                                >
                                  + {tag}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Date of birth</label>
                      <input
                        value={selectedContact.dateOfBirth || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("dateOfBirth", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Age</label>
                      <input
                        value={selectedContact.age || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("age", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Address</label>
                      <input
                        value={selectedContact.address || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("address", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">City</label>
                      <input
                        value={selectedContact.city || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("city", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">State</label>
                      <input
                        value={selectedContact.state || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("state", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Zip code</label>
                      <input
                        value={selectedContact.zip || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("zip", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Lead source</label>
                      <input
                        value={selectedContact.leadSource || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("leadSource", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Quote</label>
                      <input
                        value={selectedContact.quote || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("quote", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Policy ID</label>
                      <input
                        value={selectedContact.policyId || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("policyId", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Timeline</label>
                      <input
                        value={selectedContact.timeline || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("timeline", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Household size</label>
                      <input
                        value={selectedContact.householdSize || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("householdSize", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm text-zinc-400">Notes</label>
                      <textarea
                        value={selectedContact.notes || ""}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("notes", e.target.value)
                        }
                        className="h-32 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  No contact selected
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="grid gap-8 xl:grid-cols-[2.2fr_1fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              <h2 className="text-3xl font-bold">Create Campaign</h2>

              <div className="mt-6 space-y-5">
                <input
                  placeholder="Campaign name"
                  value={newCampaignForm.name}
                  onChange={(e) =>
                    setNewCampaignForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-base"
                />

                {/* Multi-step message builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-zinc-200">Message Steps</div>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-700"
                    >
                      + Add Step
                    </button>
                  </div>

                  {/* Step tabs */}
                  <div className="flex flex-wrap gap-2">
                    {newCampaignForm.steps.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStepIndex(idx)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                          activeStepIndex === idx
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Step {idx + 1}
                        {idx > 0 && (
                          <span className="text-zinc-500">({step.delayMinutes}m delay)</span>
                        )}
                        {newCampaignForm.steps.length > 1 && (
                          <span
                            onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
                            className="ml-1 text-zinc-500 hover:text-red-400 text-base"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Active step editor */}
                  {newCampaignForm.steps[activeStepIndex] && (
                    <div className="space-y-4">
                      {activeStepIndex > 0 && (
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-zinc-400">Delay before this step:</label>
                          <select
                            value={newCampaignForm.steps[activeStepIndex].delayMinutes}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setNewCampaignForm((prev) => ({
                                ...prev,
                                steps: prev.steps.map((s, i) =>
                                  i === activeStepIndex ? { ...s, delayMinutes: val } : s
                                ),
                              }));
                            }}
                            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm"
                          >
                            <option value={1}>1 minute</option>
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={1440}>1 day</option>
                            <option value={2880}>2 days</option>
                            <option value={4320}>3 days</option>
                            <option value={10080}>7 days</option>
                          </select>
                        </div>
                      )}

                      <textarea
                        ref={campaignTextareaRef}
                        placeholder={`Write message for step ${activeStepIndex + 1}...`}
                        value={newCampaignForm.steps[activeStepIndex].message}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewCampaignForm((prev) => ({
                            ...prev,
                            steps: prev.steps.map((s, i) =>
                              i === activeStepIndex ? { ...s, message: val } : s
                            ),
                          }));
                        }}
                        className="h-44 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-base"
                      />

                      {(() => {
                        // Same server-side sanitizer so the campaign builder
                        // preview matches what Telnyx actually bills per seg.
                        const rawMsg = newCampaignForm.steps[activeStepIndex].message;
                        if (rawMsg.length === 0) return null;
                        const msg = sanitizeForSms(rawMsg);
                        const len = msg.length;
                        const hasUnicode = hasNonGsmChars(msg);
                        const segLimit = hasUnicode ? 70 : 160;
                        const segments = Math.max(1, Math.ceil(len / segLimit));
                        const remaining = segments * segLimit - len;
                        return (
                          <div className="text-xs text-zinc-500 space-y-1">
                            <div className="flex gap-4">
                              <span>{len} chars</span>
                              <span className={segments > 3 ? "text-amber-400 font-medium" : ""}>{segments} segment{segments > 1 ? "s" : ""}</span>
                              <span>{remaining} remaining</span>
                              {hasUnicode && <span className="text-amber-400">Unicode (70/seg)</span>}
                            </div>
                            <div className="h-1 w-full rounded-full bg-zinc-800">
                              <div className={`h-1 rounded-full transition-all ${remaining < 20 ? "bg-amber-500" : "bg-violet-500"}`}
                                style={{ width: `${Math.min(100, ((len % segLimit) / segLimit) * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <button
                    type="button"
                    onClick={() => setShowFieldPicker(!showFieldPicker)}
                    className="flex items-center gap-2 text-base font-medium text-violet-400 hover:text-violet-300"
                  >
                    <span>{showFieldPicker ? "▾" : "▸"}</span>
                    Insert Personalization Field
                  </button>
                  {showFieldPicker && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {personalizationFields.map((field) => (
                        <button
                          key={field.tag}
                          type="button"
                          onClick={() => insertField(field.tag)}
                          className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-violet-600 hover:bg-violet-950/40 hover:text-violet-300 transition"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-zinc-500">
                    Tags like <code className="text-violet-400">{"{firstName}"}</code> are replaced with each contact&apos;s data when sent
                  </div>
                </div>

                {(currentUser.ownedNumbers || []).length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                    <div className="text-base font-semibold text-zinc-200 mb-3">
                      Send from numbers <span className="text-zinc-500 font-normal text-sm">(selected numbers rotate per message)</span>
                    </div>
                    <div className="space-y-2">
                      {(currentUser.ownedNumbers || []).map((num) => {
                        const isSelected = newCampaignForm.selectedNumbers.includes(num.number);
                        return (
                          <button
                            key={num.id}
                            type="button"
                            onClick={() => {
                              setNewCampaignForm((prev) => ({
                                ...prev,
                                selectedNumbers: isSelected
                                  ? prev.selectedNumbers.filter((n) => n !== num.number)
                                  : [...prev.selectedNumbers, num.number],
                              }));
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-5 py-3.5 text-left text-base transition ${
                              isSelected
                                ? "border border-violet-600 bg-violet-950/40 text-white"
                                : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                                isSelected ? "bg-violet-600 border-violet-600" : "border-zinc-600"
                              }`}>
                                {isSelected && <span className="text-sm text-white">✓</span>}
                              </div>
                              <span className="font-mono text-base">{num.number}</span>
                            </div>
                            <span className="text-sm text-zinc-500">{num.alias}</span>
                          </button>
                        );
                      })}
                    </div>
                    {newCampaignForm.selectedNumbers.length === 0 && (
                      <div className="mt-2 text-sm text-zinc-500">
                        No numbers selected — all owned numbers will be used
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-base text-zinc-400">
                  <div>{newCampaignForm.steps.length} message step{newCampaignForm.steps.length > 1 ? "s" : ""}</div>
                  {newCampaignForm.selectedNumbers.length > 0 && (
                    <div className="mt-1">
                      Sending from: {newCampaignForm.selectedNumbers.length} number{newCampaignForm.selectedNumbers.length !== 1 ? "s" : ""} (rotating)
                    </div>
                  )}
                </div>

                {/* Per-campaign quiet hours override. Defaults to inherit so
                    users don't need to think about it unless they need to. */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-zinc-200">Quiet Hours</div>
                      <div className="mt-1 text-sm text-zinc-500">
                        Control the send window for this campaign. Inherit uses your Settings default.
                      </div>
                    </div>
                    <select
                      value={newCampaignForm.quietHoursMode || "inherit"}
                      onChange={(e) =>
                        setNewCampaignForm((prev) => ({
                          ...prev,
                          quietHoursMode: e.target.value as "inherit" | "on" | "off",
                        }))
                      }
                      className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm"
                    >
                      <option value="inherit">Use profile default</option>
                      <option value="on">Custom (on)</option>
                      <option value="off">Off for this campaign</option>
                    </select>
                  </div>

                  {newCampaignForm.quietHoursMode === "on" && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">Blocked from</label>
                        <select
                          value={newCampaignForm.quietHoursStartHour ?? 21}
                          onChange={(e) =>
                            setNewCampaignForm((prev) => ({
                              ...prev,
                              quietHoursStartHour: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>
                              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">Blocked until</label>
                        <select
                          value={newCampaignForm.quietHoursEndHour ?? 8}
                          onChange={(e) =>
                            setNewCampaignForm((prev) => ({
                              ...prev,
                              quietHoursEndHour: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>
                              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {newCampaignForm.quietHoursMode === "off" && (
                    <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200">
                      Quiet hours are OFF for this campaign. You&apos;re responsible for TCPA compliance.
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateCampaign}
                  className="w-full rounded-2xl bg-violet-600 py-4 text-lg font-semibold hover:bg-violet-700"
                >
                  Save Campaign
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-bold">Campaigns</h2>
                <input
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  placeholder="Search..."
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm outline-none placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-4">
                {filteredCampaigns.map((campaign) => {
                  const isLaunching = launchingCampaignId === campaign.id;
                  const isEditing = editingCampaignId === campaign.id;
                  const canLaunch = campaign.status === "Draft" || campaign.status === "Paused";
                  const statusColor =
                    campaign.status === "Completed" ? "text-emerald-400" :
                    campaign.status === "Sending" ? "text-amber-400" :
                    campaign.status === "Paused" ? "text-zinc-400" :
                    campaign.status === "Draft" ? "text-sky-400" :
                    "text-zinc-400";

                  if (isEditing) {
                    return (
                      <div key={campaign.id} className="rounded-2xl border border-violet-700 bg-zinc-800/80 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Edit Campaign</h3>
                          <button
                            onClick={() => setEditingCampaignId(null)}
                            className="text-sm text-zinc-500 hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>

                        <input
                          placeholder="Campaign name"
                          value={editCampaignForm.name}
                          onChange={(e) => setEditCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3"
                        />

                        {/* Step tabs */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {editCampaignForm.steps.map((step, idx) => (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => setEditStepIndex(idx)}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                editStepIndex === idx
                                  ? "bg-violet-600 text-white"
                                  : "bg-zinc-900 text-zinc-400 hover:text-white"
                              }`}
                            >
                              Step {idx + 1}
                              {idx > 0 && <span className="text-zinc-500">({step.delayMinutes}m)</span>}
                              {editCampaignForm.steps.length > 1 && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (editCampaignForm.steps.length <= 1) return;
                                    setEditCampaignForm((prev) => ({
                                      ...prev,
                                      steps: prev.steps.filter((_, i) => i !== idx),
                                    }));
                                    setEditStepIndex((prev) => Math.min(prev, editCampaignForm.steps.length - 2));
                                  }}
                                  className="ml-1 text-zinc-500 hover:text-red-400"
                                >×</span>
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setEditCampaignForm((prev) => ({
                                ...prev,
                                steps: [...prev.steps, { id: `step_${Date.now()}`, message: "", delayMinutes: 60 }],
                              }));
                              setEditStepIndex(editCampaignForm.steps.length);
                            }}
                            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300"
                          >
                            + Add Step
                          </button>
                        </div>

                        {/* Active step editor */}
                        {editCampaignForm.steps[editStepIndex] && (
                          <div className="space-y-3">
                            {editStepIndex > 0 && (
                              <div className="flex items-center gap-3">
                                <label className="text-sm text-zinc-400">Delay:</label>
                                <select
                                  value={editCampaignForm.steps[editStepIndex].delayMinutes}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setEditCampaignForm((prev) => ({
                                      ...prev,
                                      steps: prev.steps.map((s, i) =>
                                        i === editStepIndex ? { ...s, delayMinutes: val } : s
                                      ),
                                    }));
                                  }}
                                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                                >
                                  <option value={1}>1 min</option>
                                  <option value={5}>5 min</option>
                                  <option value={15}>15 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={60}>1 hour</option>
                                  <option value={120}>2 hours</option>
                                  <option value={240}>4 hours</option>
                                  <option value={480}>8 hours</option>
                                  <option value={1440}>1 day</option>
                                  <option value={2880}>2 days</option>
                                  <option value={4320}>3 days</option>
                                  <option value={10080}>7 days</option>
                                </select>
                              </div>
                            )}
                            <textarea
                              placeholder={`Message for step ${editStepIndex + 1}...`}
                              value={editCampaignForm.steps[editStepIndex].message}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditCampaignForm((prev) => ({
                                  ...prev,
                                  steps: prev.steps.map((s, i) =>
                                    i === editStepIndex ? { ...s, message: val } : s
                                  ),
                                }));
                              }}
                              className="h-28 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm"
                            />
                          </div>
                        )}

                        {/* Number selection */}
                        {(currentUser.ownedNumbers || []).length > 0 && (
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                            <div className="text-xs font-medium text-zinc-400 mb-2">Send from numbers</div>
                            <div className="flex flex-wrap gap-2">
                              {(currentUser.ownedNumbers || []).map((num) => {
                                const isSelected = editCampaignForm.selectedNumbers.includes(num.number);
                                return (
                                  <button
                                    key={num.id}
                                    type="button"
                                    onClick={() => {
                                      setEditCampaignForm((prev) => ({
                                        ...prev,
                                        selectedNumbers: isSelected
                                          ? prev.selectedNumbers.filter((n) => n !== num.number)
                                          : [...prev.selectedNumbers, num.number],
                                      }));
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-mono transition ${
                                      isSelected
                                        ? "border border-violet-600 bg-violet-950/40 text-white"
                                        : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                                    }`}
                                  >
                                    {isSelected ? "✓ " : ""}{num.number}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEditCampaign}
                            className="flex-1 rounded-2xl bg-violet-600 py-3 font-medium hover:bg-violet-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingCampaignId(null)}
                            className="rounded-2xl border border-zinc-700 px-5 py-3 hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={campaign.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-semibold truncate">{campaign.name}</div>
                          <div className={`text-sm font-medium ${statusColor}`}>
                            {isLaunching ? "Sending…" : campaign.status === "Draft" ? "Ready" : campaign.status}
                          </div>
                          {campaign.message && (
                            <div className="mt-1 truncate text-xs text-zinc-500">{campaign.message}</div>
                          )}
                          {campaign.steps && campaign.steps.length > 1 && (
                            <div className="mt-1 text-xs text-violet-400">
                              {campaign.steps.length} message steps
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                            {Math.max(
                              campaign.audience || 0,
                              contacts.filter((c) => !c.dnc && c.campaign === campaign.name).length
                            )} contacts
                          </span>
                          <button
                            onClick={() => handleEditCampaign(campaign.id)}
                            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                          >
                            Edit
                          </button>
                          {canLaunch && (
                            <span className="text-xs text-zinc-500 italic">Upload CSV to send</span>
                          )}
                          {(campaign.status === "Sending" || isLaunching) && (
                            <button
                              onClick={() => handlePauseCampaign(campaign.id)}
                              className="rounded-xl border border-amber-700 bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-900/50"
                            >
                              ⏸ Pause
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="rounded-xl px-3 py-2 text-sm text-zinc-500 hover:bg-red-900/40 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {(campaign.status === "Sending" || isLaunching) && campaign.audience > 0 && (() => {
                        // Live progress bar driven by the 2s campaign poller.
                        // Percent accounts for both sent and failed so a stuck
                        // chunk of rejects doesn't make the bar look frozen.
                        const processed = (campaign.sent || 0) + (campaign.failed || 0);
                        const pct = Math.min(100, Math.round((processed / campaign.audience) * 100));
                        return (
                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-sky-300">
                                Sending… {processed.toLocaleString()} / {campaign.audience.toLocaleString()}
                              </span>
                              <span className="text-zinc-400">{pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-zinc-900 p-4">
                          <div className="text-xs text-zinc-400">Sent</div>
                          <div className="mt-1 text-xl font-bold">{campaign.sent}</div>
                        </div>
                        <div className="rounded-2xl bg-zinc-900 p-4">
                          <div className="text-xs text-zinc-400">Replies</div>
                          <div className="mt-1 text-xl font-bold text-emerald-400">
                            {campaign.replies}
                            {campaign.sent > 0 && (
                              <span className="ml-1 text-xs text-zinc-400">
                                ({((campaign.replies / campaign.sent) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-zinc-900 p-4">
                          <div className="text-xs text-zinc-400">Failed</div>
                          <div className="mt-1 text-xl font-bold text-red-400">
                            {campaign.failed}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCampaigns.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    {campaignSearch ? "No campaigns match your search." : "No campaigns yet. Create one above, then use it when uploading a CSV."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Contacts</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {contacts.length} total · {contacts.filter(c => !c.dnc).length} active · {contacts.filter(c => c.dnc).length} DNC
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
                />
                <select
                  value={dncFilter}
                  onChange={(e) => setDncFilter(e.target.value as "all" | "active" | "dnc")}
                  className="rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="dnc">DNC Only</option>
                </select>
                <select
                  value={lastContactedFilter}
                  onChange={(e) => setLastContactedFilter(e.target.value as "any" | "today" | "7d" | "30d" | "never")}
                  className="rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm"
                >
                  <option value="any">Last Contacted</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="never">Never</option>
                </select>
                <button
                  onClick={() => setShowAddContact((v) => !v)}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm hover:bg-violet-700"
                >
                  + Add Contact
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={csvCampaignId}
                    onChange={(e) => setCsvCampaignId(e.target.value)}
                    className="rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800"
                  >
                    Import CSV
                  </button>
                  <button onClick={handleExportCSV}
                    className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800">
                    Export CSV
                  </button>
                </div>
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                {selectedContactIds.size > 0 && (
                  <>
                    <select
                      onChange={(e) => {
                        if (e.target.value !== "") {
                          handleBulkAssignCampaign(e.target.value === "__none__" ? "" : e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="rounded-2xl border border-violet-700 bg-violet-950/30 px-3 py-3 text-sm text-violet-300"
                    >
                      <option value="" disabled>Assign {selectedContactIds.size} to campaign...</option>
                      <option value="__none__">— Remove from campaign —</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      onChange={async (e) => {
                        if (e.target.value === "") return;
                        let tag = e.target.value;
                        if (tag === "__new__") {
                          const input = window.prompt("Enter new tag name:");
                          if (!input || !input.trim()) { e.target.value = ""; return; }
                          tag = input.trim();
                        }
                        const ids = Array.from(selectedContactIds);
                        for (const id of ids) {
                          const c = contacts.find((ct) => ct.id === id);
                          if (!c) continue;
                          const currentTags = c.tags || [];
                          if (currentTags.includes(tag)) continue;
                          const newTags = [...currentTags, tag];
                          await dbUpdateContact(id, { tags: newTags });
                        }
                        // Refresh contacts
                        if (userId) {
                          const fresh = await dbFetchContacts(userId);
                          setContacts(fresh.map(contactToRecord));
                        }
                        setMessage(`✅ Tagged ${ids.length} contacts with "${tag}"`);
                        window.setTimeout(() => setMessage(""), 3000);
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="rounded-2xl border border-amber-700 bg-amber-950/30 px-3 py-3 text-sm text-amber-300"
                    >
                      <option value="" disabled>Tag {selectedContactIds.size} contacts...</option>
                      {allTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__new__">+ Create new tag...</option>
                    </select>
                    {/* Cancel Workflow — only shown when at least one of the
                        selected contacts has a pending workflow step queued. */}
                    {(() => {
                      const ids = Array.from(selectedContactIds);
                      const anyPending = scheduledMessages.some(
                        (m) => m.status === "pending" && m.cancel_on_reply && ids.includes(m.contact_id)
                      );
                      if (!anyPending) return null;
                      return (
                        <button
                          onClick={async () => {
                            const count = await handleCancelWorkflow(ids);
                            if (count > 0) {
                              setMessage(`✅ Cancelled ${count} pending workflow step${count === 1 ? "" : "s"} across ${ids.length} contact${ids.length === 1 ? "" : "s"}.`);
                              window.setTimeout(() => setMessage(""), 3500);
                              setSelectedContactIds(new Set());
                            }
                          }}
                          className="rounded-2xl border border-amber-700 bg-amber-900/30 px-5 py-3 text-sm font-medium text-amber-300 hover:bg-amber-900/50"
                          title="Cancel pending workflow steps for selected contacts"
                        >
                          Cancel Workflow
                        </button>
                      );
                    })()}
                    <button
                      onClick={handleBulkDelete}
                      disabled={deletingBulk}
                      className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingBulk ? "Deleting..." : `Delete ${selectedContactIds.size}`}
                    </button>
                  </>
                )}
                <button
                  onClick={async () => {
                    if (!userId) return;
                    const fresh = await dbFetchContacts(userId);
                    setContacts(fresh.map(contactToRecord));
                    setMessage("✅ Contacts refreshed");
                    window.setTimeout(() => setMessage(""), 2500);
                  }}
                  className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800"
                >
                  Refresh
                </button>
              </div>
            </div>

            {showAddContact && (
              <div className="mb-6 rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                <h3 className="mb-4 font-semibold">Add Contact</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    placeholder="First name *"
                    value={addContactForm.firstName}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                  <input
                    placeholder="Last name"
                    value={addContactForm.lastName}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                  <input
                    placeholder="Phone *"
                    value={addContactForm.phone}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, phone: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                  <input
                    placeholder="Email"
                    value={addContactForm.email}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                  <input
                    placeholder="City"
                    value={addContactForm.city}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, city: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                  <input
                    placeholder="State"
                    value={addContactForm.state}
                    onChange={(e) => setAddContactForm((p) => ({ ...p, state: e.target.value }))}
                    className="rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-3 text-sm outline-none placeholder:text-zinc-400"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={handleAddContact} className="rounded-xl bg-violet-600 px-5 py-2 text-sm hover:bg-violet-700">Save</button>
                  <button onClick={() => setShowAddContact(false)} className="rounded-xl border border-zinc-600 px-5 py-2 text-sm hover:bg-zinc-700">Cancel</button>
                </div>
              </div>
            )}

            {/* Tag manager — collapsible CRUD over tag library */}
            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-800/40">
              <button
                onClick={() => setShowTagManager((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Manage Tags</span>
                  <span className="text-xs text-zinc-500">
                    {(currentUser?.tagLibrary || []).length} defined
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{showTagManager ? "Hide" : "Show"}</span>
              </button>
              {showTagManager && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-3">
                  {/* Existing library tags */}
                  {(currentUser?.tagLibrary || []).length > 0 && (
                    <div className="space-y-2">
                      {(currentUser?.tagLibrary || []).map((t) => {
                        const style = TAG_COLORS[t.color] || TAG_COLORS[DEFAULT_TAG_COLOR];
                        const usage = contacts.filter((c) => (c.tags || []).includes(t.name)).length;
                        return (
                          <div key={t.name} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}>
                              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                              {t.name}
                            </span>
                            <span className="text-xs text-zinc-500">{usage} contact{usage !== 1 ? "s" : ""}</span>
                            <div className="ml-auto flex items-center gap-1">
                              {TAG_COLOR_KEYS.map((c) => (
                                <button
                                  key={c}
                                  title={c}
                                  onClick={() => handleUpdateTagColor(t.name, c)}
                                  className={`h-5 w-5 rounded-full ${TAG_COLORS[c].dot} ${t.color === c ? "ring-2 ring-white" : "ring-1 ring-zinc-700 hover:ring-zinc-500"}`}
                                />
                              ))}
                              <button
                                onClick={() => {
                                  const next = window.prompt(`Rename tag "${t.name}" to:`, t.name);
                                  if (next && next.trim() && next.trim() !== t.name) handleRenameTag(t.name, next.trim());
                                }}
                                className="ml-2 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteTag(t.name)}
                                className="rounded-lg border border-red-900 bg-red-950/40 px-2 py-1 text-xs text-red-300 hover:bg-red-900/40"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Create new tag */}
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                    <input
                      placeholder="New tag name (e.g. Sold, Appointment, Broke)"
                      value={tagManagerName}
                      onChange={(e) => setTagManagerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateTag(tagManagerName, tagManagerColor);
                          setTagManagerName("");
                        }
                      }}
                      className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
                    />
                    <div className="flex items-center gap-1">
                      {TAG_COLOR_KEYS.map((c) => (
                        <button
                          key={c}
                          title={c}
                          onClick={() => setTagManagerColor(c)}
                          className={`h-6 w-6 rounded-full ${TAG_COLORS[c].dot} ${tagManagerColor === c ? "ring-2 ring-white" : "ring-1 ring-zinc-700 hover:ring-zinc-500"}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        handleCreateTag(tagManagerName, tagManagerColor);
                        setTagManagerName("");
                      }}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-700"
                    >
                      + Create Tag
                    </button>
                  </div>

                  {(currentUser?.tagLibrary || []).length === 0 && (
                    <p className="text-xs text-zinc-500">
                      No tags yet. Common tags to start: <span className="text-zinc-300">Sold</span>, <span className="text-zinc-300">Appointment</span>, <span className="text-zinc-300">Broke</span>, <span className="text-zinc-300">Follow Up</span>, <span className="text-zinc-300">Not Interested</span>.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tag filter bar */}
            {allTags.length > 0 && (
              <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Filter by Tags</span>
                  {tagFilter.length > 0 && (
                    <button onClick={() => setTagFilter([])} className="text-xs text-violet-400 hover:text-violet-300">
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const active = tagFilter.includes(tag);
                    const style = getTagStyle(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          setTagFilter((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ring-1 ${
                          active
                            ? `${style.bg} ${style.text} ${style.ring} ring-2`
                            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 ring-transparent"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                        {tag}
                        <span className="ml-1 text-[10px] text-zinc-400">
                          ({contacts.filter((c) => (c.tags || []).includes(tag)).length})
                        </span>
                      </button>
                    );
                  })}
                </div>
                {tagFilter.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Showing {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""} matching {tagFilter.length > 1 ? "all selected tags" : `"${tagFilter[0]}"`}
                  </div>
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_minmax(100px,1.2fr)_90px_80px_60px] bg-zinc-800 px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <div>
                  <input
                    type="checkbox"
                    checked={filteredContacts.length > 0 && filteredContacts.every((c) => selectedContactIds.has(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
                      } else {
                        setSelectedContactIds(new Set());
                      }
                    }}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                  />
                </div>
                <div>Name</div>
                <div>Phone</div>
                <div>Email</div>
                <div>Location</div>
                <div>Tags</div>
                <div>Campaign</div>
                <div>Status</div>
                <div></div>
              </div>

              <div className="divide-y divide-zinc-800">
                {pagedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_minmax(100px,1.2fr)_90px_80px_60px] items-center px-5 py-4 text-sm text-zinc-200 hover:bg-zinc-800/50"
                  >
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedContactIds.has(contact.id)}
                        onChange={(e) => {
                          setSelectedContactIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(contact.id);
                            else next.delete(contact.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="cursor-pointer font-medium text-violet-300 hover:text-violet-200 hover:underline"
                        onClick={() => handleOpenContactConversation(contact.id)}
                        title="Open conversation"
                      >
                        {contact.firstName} {contact.lastName}
                      </div>
                      <button
                        onClick={() => setViewContactId(contact.id)}
                        className="rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                        title="View contact details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    </div>
                    <div className="font-mono text-xs text-zinc-300">{contact.phone}</div>
                    <div className="truncate text-zinc-400">{contact.email || "—"}</div>
                    <div className="text-zinc-400">
                      {[contact.city, contact.state].filter(Boolean).join(", ") || "—"}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags || []).length > 0 ? (
                        (contact.tags || []).slice(0, 3).map((tag) => {
                          const style = getTagStyle(tag);
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {tag}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                      {(contact.tags || []).length > 3 && (
                        <span className="text-[10px] text-zinc-500">+{(contact.tags || []).length - 3}</span>
                      )}
                    </div>
                    <div>
                      <select
                        value={contact.campaign || ""}
                        onChange={(e) => handleAssignCampaign(contact.id, e.target.value)}
                        className="w-full truncate rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none"
                      >
                        <option value="">None</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <button
                        onClick={() => handleToggleDNC(contact.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          contact.dnc
                            ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            : "bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/80"
                        }`}
                      >
                        {contact.dnc ? "DNC" : "Active"}
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-red-900/40 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {filteredContacts.length === 0 && (
                  <div className="px-5 py-8 text-center text-zinc-500">
                    {contactSearch ? "No contacts match your search." : "No contacts yet. Import a CSV or add manually."}
                  </div>
                )}
              </div>

              {/* Pagination — only shown when there's more than one page */}
              {filteredContacts.length > CONTACTS_PER_PAGE && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/60 px-5 py-3 text-xs text-zinc-400">
                  <div>
                    Showing{" "}
                    <span className="font-medium text-zinc-200">
                      {contactPage * CONTACTS_PER_PAGE + 1}
                      –
                      {Math.min((contactPage + 1) * CONTACTS_PER_PAGE, filteredContacts.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-zinc-200">{filteredContacts.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setContactPage(0)}
                      disabled={contactPage === 0}
                      className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      « First
                    </button>
                    <button
                      onClick={() => setContactPage((p) => Math.max(0, p - 1))}
                      disabled={contactPage === 0}
                      className="rounded-lg border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 text-zinc-300">
                      Page {contactPage + 1} of {contactPageCount}
                    </span>
                    <button
                      onClick={() => setContactPage((p) => Math.min(contactPageCount - 1, p + 1))}
                      disabled={contactPage >= contactPageCount - 1}
                      className="rounded-lg border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => setContactPage(contactPageCount - 1)}
                      disabled={contactPage >= contactPageCount - 1}
                      className="rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Last »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ APPOINTMENTS ═══════════════ */}
        {activeTab === "appointments" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Appointments</h1>
                  <p className="mt-1 text-sm text-zinc-400">Manage your scheduled calls and meetings</p>
                </div>
                <button
                  onClick={() => setShowNewAppointment(true)}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700"
                >
                  + New Appointment
                </button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              {(["upcoming", "past", "cancelled"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAppointmentFilter(f)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
                    appointmentFilter === f
                      ? "bg-violet-600 text-white"
                      : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* New appointment form */}
            {showNewAppointment && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="mb-4 text-lg font-bold">Schedule New Appointment</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">Contact</label>
                    <select
                      value={newAptForm.contactId}
                      onChange={(e) => setNewAptForm((p) => ({ ...p, contactId: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    >
                      <option value="">Select contact...</option>
                      {contacts.filter((c) => !c.dnc).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} — {c.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">Title</label>
                    <input
                      value={newAptForm.title}
                      onChange={(e) => setNewAptForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">Date</label>
                    <input
                      type="date"
                      value={newAptForm.date}
                      onChange={(e) => setNewAptForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">Time</label>
                    <input
                      type="time"
                      value={newAptForm.time}
                      onChange={(e) => setNewAptForm((p) => ({ ...p, time: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500">Notes</label>
                    <textarea
                      value={newAptForm.notes}
                      onChange={(e) => setNewAptForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional notes..."
                      className="h-20 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      if (!userId || !newAptForm.date || !newAptForm.time) {
                        setMessage("Date and time are required");
                        window.setTimeout(() => setMessage(""), 2500);
                        return;
                      }
                      try {
                        const res = await authFetch("/api/appointments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId,
                            contactId: newAptForm.contactId || null,
                            date: newAptForm.date,
                            time: newAptForm.time + ":00",
                            title: newAptForm.title || "Appointment",
                            notes: newAptForm.notes,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setMessage(`Error: ${data.error}`);
                        } else {
                          setAppointments((prev) => [...prev, data.appointment]);
                          setShowNewAppointment(false);
                          setNewAptForm({ contactId: "", date: "", time: "", title: "Appointment", notes: "" });
                          setMessage("Appointment created!");
                        }
                      } catch {
                        setMessage("Failed to create appointment");
                      }
                      window.setTimeout(() => setMessage(""), 3000);
                    }}
                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewAppointment(false)}
                    className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Appointments list */}
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const filtered = appointments.filter((a) => {
                if (appointmentFilter === "cancelled") return a.status === "cancelled";
                if (appointmentFilter === "past") return a.date < today || a.status === "completed" || a.status === "no_show";
                return a.date >= today && a.status === "confirmed";
              });

              if (filtered.length === 0) {
                return (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">
                    <p className="text-zinc-500">
                      {appointmentFilter === "upcoming"
                        ? "No upcoming appointments. When AI books a call with a customer, it'll appear here."
                        : `No ${appointmentFilter} appointments.`}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filtered.map((apt) => {
                    const [h, m] = (apt.time || "00:00").split(":").map(Number);
                    const ampm = h >= 12 ? "PM" : "AM";
                    const h12 = h % 12 || 12;
                    const timeDisplay = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                    const dateDisplay = new Date(apt.date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    });
                    const contactName = apt.contacts
                      ? `${apt.contacts.first_name || ""} ${apt.contacts.last_name || ""}`.trim() || "Unknown"
                      : contacts.find((c) => c.id === apt.contact_id)
                        ? `${contacts.find((c) => c.id === apt.contact_id)!.firstName} ${contacts.find((c) => c.id === apt.contact_id)!.lastName}`.trim()
                        : "No contact";

                    return (
                      <div key={apt.id} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                        {/* Date badge */}
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-violet-900/40 text-center">
                          <span className="text-lg font-bold text-violet-300">
                            {new Date(apt.date + "T12:00:00").getDate()}
                          </span>
                          <span className="text-[10px] font-medium uppercase text-violet-400">
                            {new Date(apt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="font-semibold text-white">{apt.title}</div>
                          <div className="text-sm text-zinc-400">
                            {dateDisplay} at {timeDisplay} — {apt.duration_minutes}min
                          </div>
                          <div className="text-sm text-zinc-500">
                            {contactName}
                            {apt.contacts?.phone ? ` (${apt.contacts.phone})` : ""}
                          </div>
                          {apt.notes && (
                            <div className="mt-1 text-xs text-zinc-600">{apt.notes}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {apt.status === "confirmed" && apt.date >= today && (
                            <>
                              <button
                                onClick={async () => {
                                  await authFetch("/api/appointments", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: apt.id, status: "completed" }),
                                  });
                                  setAppointments((prev) =>
                                    prev.map((a) => a.id === apt.id ? { ...a, status: "completed" } : a)
                                  );
                                  setMessage("Marked as completed");
                                  window.setTimeout(() => setMessage(""), 2000);
                                }}
                                className="rounded-lg bg-emerald-900/50 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-800/50"
                              >
                                Complete
                              </button>
                              <button
                                onClick={async () => {
                                  await authFetch("/api/appointments", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: apt.id, status: "no_show" }),
                                  });
                                  setAppointments((prev) =>
                                    prev.map((a) => a.id === apt.id ? { ...a, status: "no_show" } : a)
                                  );
                                  setMessage("Marked as no-show");
                                  window.setTimeout(() => setMessage(""), 2000);
                                }}
                                className="rounded-lg bg-amber-900/50 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-800/50"
                              >
                                No Show
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Cancel this appointment?")) return;
                                  await authFetch("/api/appointments", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: apt.id, status: "cancelled" }),
                                  });
                                  setAppointments((prev) =>
                                    prev.map((a) => a.id === apt.id ? { ...a, status: "cancelled" } : a)
                                  );
                                  setMessage("Appointment cancelled");
                                  window.setTimeout(() => setMessage(""), 2000);
                                }}
                                className="rounded-lg bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-800/50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {apt.status !== "confirmed" && (
                            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                              apt.status === "completed" ? "bg-emerald-900/40 text-emerald-300"
                              : apt.status === "no_show" ? "bg-amber-900/40 text-amber-300"
                              : "bg-red-900/40 text-red-300"
                            }`}>
                              {apt.status === "no_show" ? "No Show" : apt.status}
                            </span>
                          )}
                          {apt.reminder_sent && (
                            <span className="text-xs text-zinc-600" title="Reminder sent">
                              Reminded
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══════════════ UPLOAD CSV ═══════════════ */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            {/* Upload Wizard */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              {/* Stepper Header */}
              <div className="mb-8 flex items-center justify-center gap-4">
                {[
                  { step: 1, label: "Select CSV file" },
                  { step: 2, label: "Map Columns" },
                  { step: 3, label: "Configure" },
                ].map(({ step, label }, i) => (
                  <React.Fragment key={step}>
                    {i > 0 && <span className="text-zinc-600">›</span>}
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        csvUploadStep === step ? "bg-violet-600 text-white" : csvUploadStep > step ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-400"
                      }`}>{csvUploadStep > step ? "✓" : step}</div>
                      <span className={`text-sm font-medium ${csvUploadStep === step ? "text-violet-300" : csvUploadStep > step ? "text-emerald-300" : "text-zinc-500"}`}>{label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1: Select CSV File */}
              {csvUploadStep === 1 && (
                <div className="mx-auto max-w-xl">
                  <div
                    onClick={() => csvUploadRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.name.endsWith(".csv")) {
                        handleCSVFileSelect(file);
                      }
                    }}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-800/50 p-16 text-center transition hover:border-violet-500 hover:bg-zinc-800"
                  >
                    <div className="text-5xl mb-4">📄</div>
                    <div className="text-lg font-medium">Drag & drop your CSV file here</div>
                    <div className="mt-2 text-sm text-zinc-400">or click to browse</div>
                    <button className="mt-6 rounded-2xl bg-violet-600 px-8 py-3 text-sm font-medium hover:bg-violet-700">
                      Select CSV File
                    </button>
                  </div>
                  <input
                    ref={csvUploadRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCSVFileSelect(file);
                      e.target.value = "";
                    }}
                  />
                  {csvFileName && (
                    <div className="mt-4 rounded-2xl bg-zinc-800 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📄</span>
                        <div>
                          <div className="font-medium">{csvFileName}</div>
                          <div className="text-sm text-emerald-400">{csvRawData.length.toLocaleString()} leads found</div>
                        </div>
                      </div>
                      <button onClick={() => { setCsvFileName(""); setCsvRawData([]); }} className="text-sm text-zinc-400 hover:text-red-400">Remove</button>
                    </div>
                  )}
                  {csvRawData.length > 0 && (
                    <div className="mt-6 flex justify-end">
                      <button onClick={() => setCsvUploadStep(2)} className="rounded-2xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700">
                        Next ›
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {csvUploadStep === 2 && (
                <div>
                  <div className="mb-6 text-center text-emerald-400 font-medium">
                    Total Leads Found: {csvRawData.length.toLocaleString()}
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-zinc-700">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Column Header from File</th>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Preview</th>
                          <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Contact Fields</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-700">
                        {csvColumnMappings.map((col, i) => (
                          <tr key={i} className="hover:bg-zinc-800/50">
                            <td className="px-6 py-4 font-medium">{col.csvHeader}</td>
                            <td className="px-6 py-4 text-zinc-400">
                              {col.preview.filter(Boolean).slice(0, 2).map((v, j) => (
                                <div key={j} className="truncate max-w-[200px]">{v}</div>
                              ))}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <select
                                value={col.mappedTo}
                                onChange={(e) => {
                                  setCsvColumnMappings((prev) =>
                                    prev.map((c, idx) => idx === i ? { ...c, mappedTo: e.target.value } : c)
                                  );
                                }}
                                className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm"
                              >
                                {CSV_CONTACT_FIELDS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex justify-between">
                    <button onClick={() => setCsvUploadStep(1)} className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm hover:bg-zinc-800">
                      ‹ Back
                    </button>
                    <button
                      onClick={() => {
                        const phoneCol = csvColumnMappings.find((c) => c.mappedTo === "phone");
                        if (!phoneCol) {
                          setMessage("❌ You must map one column to Phone Number — pick the column that has the actual mobile/cell number");
                          window.setTimeout(() => setMessage(""), 4000);
                          return;
                        }
                        const phoneHasValues = csvRawData.some((row) => {
                          const val = String(row[phoneCol.csvHeader] || "").replace(/\D/g, "");
                          return val.length >= 10;
                        });
                        if (!phoneHasValues) {
                          setMessage(`❌ Column "${phoneCol.csvHeader}" has no valid phone numbers — pick a different column`);
                          window.setTimeout(() => setMessage(""), 4000);
                          return;
                        }
                        setCsvUploadStep(3);
                      }}
                      className="rounded-2xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700"
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Configure */}
              {csvUploadStep === 3 && (
                <div className="mx-auto max-w-xl space-y-6">
                  <div className="text-center text-emerald-400 font-medium">
                    Total Leads Found: {csvRawData.length.toLocaleString()}
                  </div>

                  <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-zinc-500 w-24">File name</span>
                      <span className="font-medium">{csvFileName}</span>
                    </div>
                  </div>

                  {/* Ignore Duplicates Toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                    <div>
                      <div className="font-medium">Ignore Duplicates</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Skip contacts with phone numbers already in your list</div>
                    </div>
                    <button
                      onClick={() => setCsvIgnoreDuplicates(!csvIgnoreDuplicates)}
                      className={`relative h-7 w-12 rounded-full transition ${csvIgnoreDuplicates ? "bg-violet-600" : "bg-zinc-600"}`}
                    >
                      <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${csvIgnoreDuplicates ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>

                  {/* Campaign Selection */}
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">Send Campaign</label>
                    <select
                      value={csvCampaignId}
                      onChange={(e) => setCsvCampaignId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-sm"
                    >
                      <option value="">Import only (no campaign)</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {csvCampaignId && (() => {
                      const selected = campaigns.find((c) => c.id === csvCampaignId);
                      if (!selected) return null;
                      const steps = selected.steps && selected.steps.length > 0 ? selected.steps : [{ message: selected.message || "" }];
                      return (
                        <div className="mt-3 rounded-xl bg-zinc-900 p-3 text-xs text-zinc-400">
                          <div className="font-medium text-zinc-300 mb-1">{selected.name}</div>
                          <div className="truncate">{steps[0].message}</div>
                          {steps.length > 1 && <div className="mt-1 text-violet-400">{steps.length} message steps</div>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tags */}
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {csvUploadTags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 rounded-full bg-violet-900/40 px-3 py-1 text-xs text-violet-300">
                          {tag}
                          <button onClick={() => setCsvUploadTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-red-400">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={csvTagInput}
                        onChange={(e) => setCsvTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && csvTagInput.trim()) {
                            setCsvUploadTags((prev) => [...prev, csvTagInput.trim()]);
                            setCsvTagInput("");
                          }
                        }}
                        placeholder="Add a tag..."
                        className="flex-1 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm"
                      />
                      <button
                        onClick={() => {
                          if (csvTagInput.trim()) {
                            setCsvUploadTags((prev) => [...prev, csvTagInput.trim()]);
                            setCsvTagInput("");
                          }
                        }}
                        className="rounded-xl bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600"
                      >+ Tag</button>
                    </div>
                  </div>

                  {/* Consent Notice */}
                  <div className="rounded-2xl border border-zinc-700/50 bg-zinc-950/50 p-4 text-center text-xs text-zinc-500">
                    * By uploading a list, you certify that you have received Opt-In consent to message everyone in the list.
                  </div>

                  <div className="flex justify-between">
                    <button onClick={() => setCsvUploadStep(2)} className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm hover:bg-zinc-800">
                      ‹ Back
                    </button>
                    <button
                      onClick={handleCSVWizardSubmit}
                      disabled={csvUploading}
                      className="rounded-2xl bg-violet-600 px-10 py-3.5 font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      {csvUploading ? (csvCampaignId ? "Importing & Sending..." : "Uploading...") : (csvCampaignId ? "Import & Send Campaign ›" : "Import Contacts ›")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Upload History — empty placeholder so the user knows where
                past uploads will appear once they happen. */}
            {csvUploadHistory.length === 0 && (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
                <div className="mb-2 text-sm font-medium text-zinc-300">Upload history</div>
                <p className="text-xs text-zinc-500">
                  Your past CSV uploads and their success / duplicate / invalid counts will appear here.
                </p>
              </div>
            )}
            {csvUploadHistory.length > 0 && (() => {
              const q = csvHistorySearch.trim().toLowerCase();
              const filtered = q
                ? csvUploadHistory.filter((r) => r.fileName.toLowerCase().includes(q))
                : csvUploadHistory;
              return (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
                  {/* Header row with Upload CSV button + quick search */}
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => {
                        resetCSVWizard();
                        // The wizard step is already 1 after reset, but scroll the
                        // file-picker into view so the click feels connected.
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload CSV
                    </button>

                    <div className="relative sm:w-80">
                      <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        value={csvHistorySearch}
                        onChange={(e) => setCsvHistorySearch(e.target.value)}
                        placeholder="Quick search"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                    <table className="w-full min-w-[1100px] text-sm">
                      <thead className="bg-zinc-800/80">
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">File Name</th>
                          <th className="px-5 py-4">Validation<br />Used</th>
                          <th className="px-5 py-4">Charged</th>
                          <th className="px-5 py-4 text-right">Count</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                              No uploads match &quot;{csvHistorySearch}&quot;.
                            </td>
                          </tr>
                        ) : filtered.map((rec) => {
                          const d = new Date(rec.date);
                          const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
                          const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          return (
                            <tr key={rec.id} className="hover:bg-zinc-800/40">
                              <td className="whitespace-nowrap px-5 py-4 text-zinc-300">
                                <div>{dateStr}</div>
                                <div className="text-xs text-zinc-500">{timeStr}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  <span className="font-medium text-zinc-100">{rec.fileName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center rounded-md bg-zinc-700/80 px-2 py-0.5 text-xs font-medium text-zinc-200">
                                  {rec.validationUsed || "N/A"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center rounded-md bg-zinc-700/80 px-2 py-0.5 text-xs font-medium text-zinc-200">
                                  {rec.charged == null ? "N/A" : `$${rec.charged.toFixed(2)}`}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-right text-zinc-200">
                                {rec.totalRows.toLocaleString()}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                                    Success: {rec.success.toLocaleString()}
                                  </span>
                                  {rec.duplicates > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/30">
                                      Duplicate: {rec.duplicates.toLocaleString()}
                                    </span>
                                  )}
                                  {rec.invalid > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/30">
                                      Invalid Number: {rec.invalid.toLocaleString()}
                                    </span>
                                  )}
                                  {rec.tcpaViolations ? (
                                    <span className="inline-flex items-center rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/30">
                                      TCPA: {rec.tcpaViolations.toLocaleString()}
                                    </span>
                                  ) : null}
                                  {rec.dncComplainers ? (
                                    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                                      DNC Removed: {rec.dncComplainers.toLocaleString()}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleDownloadUpload(rec)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-violet-500 hover:text-white"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUploadRecord(rec)}
                                    title="Remove from history"
                                    className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:border-red-500/60 hover:text-red-400"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      <path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {filtered.length.toLocaleString()} of {csvUploadHistory.length.toLocaleString()} upload{csvUploadHistory.length === 1 ? "" : "s"}
                      {csvHistoryHasMore ? " loaded" : ""}
                    </span>
                    {csvHistoryHasMore && !q && (
                      <button
                        onClick={handleLoadMoreCsvHistory}
                        disabled={csvHistoryLoadingMore}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-violet-500 hover:text-white disabled:opacity-50"
                      >
                        {csvHistoryLoadingMore ? "Loading..." : "Load more"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══════════════ TEMPLATES ═══════════════ */}
        {activeTab === "templates" && (() => {
          const TEMPLATE_CATEGORIES = [
            { value: "general",      label: "General",       color: "bg-zinc-700 text-zinc-300" },
            { value: "quick-reply",  label: "Quick Reply",   color: "bg-sky-900/60 text-sky-300" },
            { value: "follow-up",    label: "Follow Up",     color: "bg-violet-900/60 text-violet-300" },
            { value: "greeting",     label: "Greeting",      color: "bg-emerald-900/60 text-emerald-300" },
            { value: "closing",      label: "Closing",       color: "bg-amber-900/60 text-amber-300" },
            { value: "appointment",  label: "Appointment",   color: "bg-rose-900/60 text-rose-300" },
          ];
          const catColor = (val: string) =>
            TEMPLATE_CATEGORIES.find((c) => c.value === val)?.color ?? "bg-zinc-700 text-zinc-300";
          const catLabel = (val: string) =>
            TEMPLATE_CATEGORIES.find((c) => c.value === val)?.label ?? val;

          const filtered = templates.filter((t) => {
            const matchesSearch =
              !templateSearch ||
              t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
              t.body.toLowerCase().includes(templateSearch.toLowerCase());
            const matchesCat =
              templateCategoryFilter === "all" || t.category === templateCategoryFilter;
            return matchesSearch && matchesCat;
          });

          const isEditing = !!editingTemplateId;

          return (
            <div className="space-y-6">
              {/* ── Page header ── */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    Reusable messages for conversations, campaigns, and quick replies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-400">
                    {templates.length} saved
                  </span>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-5">
                {/* ── Left: Create / Edit form ── */}
                <div className="xl:col-span-2">
                  <div className="sticky top-6 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-xl">
                    {/* Form header */}
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isEditing ? "bg-amber-500/20" : "bg-violet-600/20"}`}>
                          {isEditing ? (
                            <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          )}
                        </div>
                        <h2 className="text-lg font-bold">
                          {isEditing ? "Edit Template" : "New Template"}
                        </h2>
                      </div>
                      {isEditing && (
                        <button
                          onClick={handleCancelEditTemplate}
                          className="rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
                          Template Name
                        </label>
                        <input
                          value={isEditing ? editingTemplateName : newTemplateName}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTemplateName(e.target.value)
                              : setNewTemplateName(e.target.value)
                          }
                          placeholder="e.g. Welcome Message, Follow Up #1"
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">
                          Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {TEMPLATE_CATEGORIES.map((cat) => {
                            const active =
                              (isEditing ? editingTemplateCategory : newTemplateCategory) === cat.value;
                            return (
                              <button
                                key={cat.value}
                                onClick={() =>
                                  isEditing
                                    ? setEditingTemplateCategory(cat.value)
                                    : setNewTemplateCategory(cat.value)
                                }
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                  active
                                    ? cat.color + " ring-1 ring-white/20"
                                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Body */}
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                            Message Body
                          </label>
                          <span className={`text-[10px] tabular-nums ${
                            (isEditing ? editingTemplateBody : newTemplateBody).length > 160
                              ? "text-amber-400"
                              : "text-zinc-600"
                          }`}>
                            {(isEditing ? editingTemplateBody : newTemplateBody).length} chars
                          </span>
                        </div>
                        <textarea
                          value={isEditing ? editingTemplateBody : newTemplateBody}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTemplateBody(e.target.value)
                              : setNewTemplateBody(e.target.value)
                          }
                          rows={5}
                          placeholder={"Hi {firstName}, this is {agentName}..."}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition resize-none"
                        />
                      </div>

                      {/* Variable chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {["{firstName}", "{lastName}", "{city}", "{state}", "{agentName}"].map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              if (isEditing) setEditingTemplateBody((b) => b + v);
                              else setNewTemplateBody((b) => b + v);
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-mono text-violet-400 hover:border-violet-500/50 hover:bg-zinc-700 transition"
                            title={`Insert ${v}`}
                          >
                            {v}
                          </button>
                        ))}
                        <span className="self-center text-[10px] text-zinc-600">click to insert</span>
                      </div>

                      {/* Save button */}
                      {isEditing ? (
                        <button
                          onClick={handleUpdateTemplate}
                          disabled={!editingTemplateName.trim() || !editingTemplateBody.trim()}
                          className="w-full rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 transition"
                        >
                          Save Changes
                        </button>
                      ) : (
                        <button
                          onClick={handleSaveTemplate}
                          disabled={!newTemplateName.trim() || !newTemplateBody.trim()}
                          className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 transition"
                        >
                          Save Template
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Right: Template list ── */}
                <div className="xl:col-span-3 space-y-4">
                  {/* Search + filter */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500 transition"
                      />
                    </div>
                    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
                      <button
                        onClick={() => setTemplateCategoryFilter("all")}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                          templateCategoryFilter === "all"
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        All
                      </button>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setTemplateCategoryFilter(cat.value)}
                          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                            templateCategoryFilter === cat.value
                              ? "bg-zinc-700 text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cards */}
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800">
                        <svg className="h-6 w-6 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        {templateSearch || templateCategoryFilter !== "all"
                          ? "No templates match your search"
                          : "No templates yet"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {templateSearch || templateCategoryFilter !== "all"
                          ? "Try a different search or category"
                          : "Create your first template using the form on the left"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((tpl) => {
                        const isBeingEdited = editingTemplateId === tpl.id;
                        return (
                          <div
                            key={tpl.id}
                            className={`group rounded-3xl border transition-all ${
                              isBeingEdited
                                ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]"
                                : "border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 hover:border-zinc-700"
                            }`}
                          >
                            <div className="p-5">
                              {/* Card header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate font-semibold text-white">{tpl.name}</span>
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${catColor(tpl.category)}`}>
                                      {catLabel(tpl.category)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-zinc-600">
                                    {tpl.body.length} chars · saved {new Date(tpl.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                {/* Action buttons */}
                                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={() => handleCopyTemplateBody(tpl)}
                                    title="Copy to clipboard"
                                    className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:border-zinc-600 hover:text-white transition"
                                  >
                                    {copiedTemplateId === tpl.id ? (
                                      <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    ) : (
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleStartEditTemplate(tpl)}
                                    title="Edit template"
                                    className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTemplate(tpl.id)}
                                    title="Delete template"
                                    className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:border-red-500/50 hover:text-red-400 transition"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                      <path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {/* Body preview */}
                              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                                {tpl.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Settings sub-navigation */}
            <div className="flex items-center gap-1 rounded-2xl bg-zinc-900 p-1.5 border border-zinc-800">
              {([
                { id: "billing", label: "💳 Billing" },
                { id: "numbers", label: "📱 Numbers" },
                { id: "team", label: "👥 Team" },
                { id: "activity", label: "📋 Activity" },
                { id: "opt-out", label: "🚫 Opt-Out / DNC" },
                { id: "10dlc", label: "✅ 10DLC" },
                { id: "biz-page", label: "🌐 Biz Page" },
                { id: "ai", label: "🤖 AI" },
                { id: "suggestions", label: "💡 Suggestions" },
                { id: "integrations", label: "🔗 Integrations" },
              ] as { id: SettingsSubTab; label: string }[]).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSettingsSubTab(sub.id)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    settingsSubTab === sub.id
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

        {settingsSubTab === "numbers" && (
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Buy a Number</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Search by area code to find available numbers.
                </p>

                {!isSubscribed && (
                  <div className="mt-4 rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-200/80">
                    Subscribe first before purchasing phone numbers.
                  </div>
                )}

                {isSubscribed && !is10DLCApproved && (
                  <div className="mt-4 rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-200/90">
                    <div className="font-semibold">🔒 10DLC approval required</div>
                    <p className="mt-1 text-amber-200/70">
                      Carriers require every business to be registered and approved before sending A2P SMS. Finish 10DLC registration first — approval takes 1–3 business days.
                    </p>
                    <button
                      onClick={() => { setActiveTab("settings"); setSettingsSubTab("10dlc"); }}
                      className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition"
                    >
                      {a2pStatus === "not_started" || !a2pStatus ? "Start 10DLC Registration" :
                       a2pStatus === "brand_pending" ? "Brand Registration Pending — View Status" :
                       a2pStatus === "campaign_pending" ? "Campaign Pending Approval — View Status" :
                       a2pStatus === "brand_approved" ? "Brand Approved — Finish Registration" :
                       "View 10DLC Status"}
                    </button>
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <input
                    value={numberSearch}
                    onChange={(e) => setNumberSearch(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="Area code (e.g. 305)"
                    className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchNumbers()}
                  />
                  <button
                    onClick={handleSearchNumbers}
                    disabled={searchingNumbers}
                    className="rounded-2xl bg-violet-600 px-6 py-3 font-medium hover:bg-violet-700 disabled:opacity-50 transition"
                  >
                    {searchingNumbers ? "Searching..." : "Search"}
                  </button>
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Wallet: {formatCurrency(currentUser.walletBalance || 0)} · $1.50 per number + $1.00/mo each
                </div>
              </div>

              {availableNumbers.length > 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">Available Numbers</h3>
                  <p className="mt-1 text-xs text-zinc-400">{availableNumbers.length} numbers found — click to buy</p>

                  <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                    {availableNumbers.map((num) => (
                      <button
                        key={num.raw}
                        onClick={() => handleBuyNumber(num.raw, num.display)}
                        disabled={buyingNumber === num.raw || (currentUser.walletBalance || 0) < 1.5 || !is10DLCApproved}
                        className="w-full flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/60 px-5 py-4 text-left hover:bg-zinc-700/60 hover:border-violet-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div>
                          <div className="font-mono text-lg font-semibold">{num.display}</div>
                          {(num.locality || num.region) && (
                            <div className="text-xs text-zinc-400">
                              {[num.locality, num.region].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-violet-400">
                          {buyingNumber === num.raw ? "Buying..." : "$1.50"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Owned Numbers</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {(currentUser.ownedNumbers || []).length} number{(currentUser.ownedNumbers || []).length !== 1 ? "s" : ""} · Rotated automatically across campaigns
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(currentUser.ownedNumbers || []).map((item) => {
                  const digits = item.number.replace(/\D/g, "");
                  const key = digits.startsWith("1") ? digits.slice(1) : digits;
                  const stats = deliverability[key];

                  // "Received receipts" is delivered + failed — i.e. what
                  // Telnyx has confirmed one way or the other. If that's 0,
                  // we haven't learned anything yet, so don't paint it red.
                  const receipts = stats ? stats.delivered + stats.failed : 0;
                  const pct = receipts > 0
                    ? Math.round((stats!.delivered / receipts) * 1000) / 10
                    : null;

                  let state: "good" | "watch" | "bad" | "pending" | "idle";
                  if (!stats || stats.total === 0) state = "idle";
                  else if (pct === null) state = "pending";
                  else if (pct >= 90) state = "good";
                  else if (pct >= 70) state = "watch";
                  else state = "bad";

                  const palette = {
                    good:    { pill: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20", bar: "bg-emerald-400", dot: "bg-emerald-400", label: `${pct}% delivered` },
                    watch:   { pill: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",       bar: "bg-amber-400",   dot: "bg-amber-400",   label: `${pct}% delivered` },
                    bad:     { pill: "bg-red-500/10 text-red-300 ring-1 ring-red-500/20",             bar: "bg-red-400",     dot: "bg-red-400",     label: `${pct}% delivered` },
                    pending: { pill: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20",             bar: "bg-sky-400/60",  dot: "bg-sky-400",     label: "Awaiting receipts" },
                    idle:    { pill: "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700",                bar: "bg-zinc-700",    dot: "bg-zinc-500",    label: "No sends yet" },
                  }[state];

                  const barPct = state === "pending" ? 100 : (pct ?? 0);

                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 transition hover:border-zinc-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">{item.alias}</span>
                          </div>
                          <div className="mt-1 font-mono text-lg text-zinc-100">{item.number}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteOwnedNumber(item)}
                          disabled={deletingNumberId === item.id}
                          className="opacity-0 group-hover:opacity-100 transition rounded-lg border border-red-900/40 bg-red-950/30 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-900/40 disabled:opacity-40"
                          title="Permanently release this number"
                        >
                          {deletingNumberId === item.id ? "Releasing…" : "Release"}
                        </button>
                      </div>

                      <div className={`mt-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${palette.pill}`}>
                        {palette.label}
                      </div>

                      <div className="mt-3">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-950 ring-1 ring-zinc-800/60">
                          <div
                            className={`h-full ${palette.bar} transition-all duration-500`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10.5px] text-zinc-500">
                          <span>Last 30 days</span>
                          {stats && stats.total > 0 && (
                            <span className="tabular-nums">
                              {stats.total.toLocaleString()} sent
                              {stats.delivered > 0 && <> · <span className="text-emerald-400">{stats.delivered.toLocaleString()} delivered</span></>}
                              {stats.failed > 0 && <> · <span className="text-red-400">{stats.failed.toLocaleString()} failed</span></>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(currentUser.ownedNumbers || []).length === 0 && (
                  <div className="sm:col-span-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center text-zinc-500">
                    No phone numbers yet. Search and buy one above to get started.
                  </div>
                )}
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-zinc-600">
                Deliverability is computed from Telnyx delivery receipts. If a number shows &quot;Awaiting receipts&quot; for a long time, verify that your Telnyx Messaging Profile has a webhook URL pointing to <span className="font-mono text-zinc-500">/api/sms-status</span>.
              </p>
            </div>
          </div>
        )}

        {settingsSubTab === "billing" && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Subscription Section */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Subscription</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Plan</div>
                    <div className="mt-2 text-2xl font-bold">{currentUser.plan.name}</div>
                    <div className="mt-2 text-zinc-400">
                      {formatCurrency(currentUser.plan.price)} / month
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Status</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                        currentUser.subscriptionStatus === "active" ? "bg-green-500" :
                        currentUser.subscriptionStatus === "canceling" ? "bg-yellow-500" :
                        currentUser.subscriptionStatus === "past_due" ? "bg-red-500" :
                        "bg-zinc-500"
                      }`} />
                      <span className="text-lg font-semibold capitalize">
                        {currentUser.subscriptionStatus === "canceling"
                          ? "Canceling (active until period end)"
                          : currentUser.subscriptionStatus || "Inactive"}
                      </span>
                    </div>
                  </div>

                  {!isSubscribed && (
                    <>
                      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-200/80">
                        Subscribe to unlock sending messages, buying numbers, and adding funds.
                      </div>
                      <button
                        onClick={handleSubscribe}
                        className="w-full rounded-2xl bg-violet-600 px-5 py-4 text-lg font-semibold hover:bg-violet-700"
                      >
                        Subscribe — {formatCurrency(currentUser.plan.price)}/month
                      </button>
                    </>
                  )}

                  {currentUser.subscriptionStatus === "active" && (
                    <button
                      onClick={handleCancelSubscription}
                      className="w-full rounded-2xl border border-red-800 px-5 py-3 text-red-400 hover:bg-red-950/50"
                    >
                      Cancel Subscription
                    </button>
                  )}

                  {currentUser.subscriptionStatus === "canceling" && (
                    <div className="rounded-2xl border border-yellow-800/40 bg-yellow-950/20 p-4 text-sm text-yellow-200/80">
                      Your subscription will remain active until the end of the current billing period.
                    </div>
                  )}

                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Message Cost</div>
                    <div className="mt-2 text-2xl font-bold">
                      {formatCurrency(currentUser.plan.messageCost)}
                    </div>
                    <div className="mt-2 text-zinc-400">Per outbound text segment</div>
                  </div>
                </div>
              </div>

              {/* Payment Method / Manage Billing */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Payment Method</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Manage your saved card, update payment details, and view invoices through the Stripe billing portal.
                </p>

                {isSubscribed ? (
                  <button
                    onClick={handleManageBilling}
                    className="mt-5 w-full rounded-2xl border border-zinc-700 px-5 py-4 font-medium hover:bg-zinc-800 transition"
                  >
                    Manage Payment Method & Invoices
                  </button>
                ) : (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
                    Subscribe to save your card and manage billing.
                  </div>
                )}

                <div className="mt-4 text-xs text-zinc-500">
                  Your card details are stored securely by Stripe. They never touch our servers.
                </div>
              </div>
            </div>

            {/* Wallet & Add Funds Section */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Wallet Balance</h2>
                <div className="mt-4 text-5xl font-bold text-green-400">
                  {formatCurrency(currentUser.walletBalance || 0)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <div className="text-xs text-zinc-500">Messages Available</div>
                    <div className="mt-1 text-2xl font-bold text-violet-400">
                      {Math.floor((currentUser.walletBalance || 0) / (currentUser.plan.messageCost || 0.012)).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-zinc-800 p-4">
                    <div className="text-xs text-zinc-500">Cost Per Message</div>
                    <div className="mt-1 text-2xl font-bold">
                      {formatCurrency(currentUser.plan.messageCost)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  Your balance decreases automatically as messages are sent from campaigns and conversations.
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Add Funds</h2>

                {!isSubscribed && (
                  <div className="mt-4 rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-200/80">
                    Subscribe first to add funds to your wallet.
                  </div>
                )}

                {/* Discount tiers */}
                <div className="mt-5 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                  <div className="text-sm font-semibold text-emerald-300">Bulk Discounts</div>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-400">
                    <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-emerald-300">$100+ = 10% off</span>
                    <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-emerald-300">$500+ = 15% off</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAddFunds(20)}
                    disabled={!isSubscribed}
                    className="rounded-2xl border border-zinc-700 px-4 py-4 font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    $20
                  </button>
                  <button
                    onClick={() => handleAddFunds(50)}
                    disabled={!isSubscribed}
                    className="rounded-2xl border border-zinc-700 px-4 py-4 font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    $50
                  </button>
                  <button
                    onClick={() => handleAddFunds(100)}
                    disabled={!isSubscribed}
                    className="flex flex-col items-center rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-4 py-4 font-medium hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>$100</span>
                    <span className="text-[10px] text-emerald-400">Pay $90</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAddFunds(250)}
                    disabled={!isSubscribed}
                    className="flex flex-col items-center rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-4 py-4 font-medium hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>$250</span>
                    <span className="text-[10px] text-emerald-400">Pay $225 — Save $25</span>
                  </button>
                  <button
                    onClick={() => handleAddFunds(500)}
                    disabled={!isSubscribed}
                    className="flex flex-col items-center rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-4 py-4 font-medium hover:bg-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>$500</span>
                    <span className="text-[10px] text-emerald-400">Pay $425 — Save $75</span>
                  </button>
                </div>

                <div className="mt-4 flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      value={customFundAmount}
                      onChange={(e) => setCustomFundAmount(e.target.value)}
                      placeholder="Custom amount"
                      min="20"
                      step="1"
                      disabled={!isSubscribed}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-4 pl-8 pr-4 text-white outline-none placeholder:text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amt = parseFloat(customFundAmount);
                      if (!amt || amt < 20) {
                        setMessage("❌ Minimum amount is $20");
                        window.setTimeout(() => setMessage(""), 2500);
                        return;
                      }
                      handleAddFunds(amt);
                    }}
                    disabled={!isSubscribed || !customFundAmount}
                    className="rounded-2xl bg-violet-600 px-6 py-4 font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add Funds
                  </button>
                </div>

                {customFundAmount && parseFloat(customFundAmount) >= 20 && (() => {
                  const amt = parseFloat(customFundAmount);
                  const disc = getDiscount(amt);
                  const msgCost = currentUser.plan.messageCost || 0.012;
                  return (
                    <div className="mt-2 text-xs text-zinc-400">
                      {disc.percent > 0 ? (
                        <span>
                          <span className="line-through text-zinc-600">${amt.toFixed(2)}</span>{" "}
                          <span className="text-emerald-400 font-semibold">${disc.discounted.toFixed(2)}</span>{" "}
                          <span className="text-emerald-400">({disc.percent}% off)</span>{" "}
                          = ~{Math.floor(amt / msgCost).toLocaleString()} messages
                        </span>
                      ) : (
                        <span>${amt.toFixed(2)} = ~{Math.floor(amt / msgCost).toLocaleString()} messages</span>
                      )}
                    </div>
                  );
                })()}

                <div className="mt-4 text-xs text-zinc-500">
                  Payments are securely processed via Stripe. Minimum $20.
                </div>
              </div>

              {/* Auto Recharge */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Auto Recharge</h2>
                    <p className="mt-1 text-sm text-zinc-500">Automatically add funds when your balance gets low.</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newEnabled = !autoRechargeEnabled;
                      setAutoRechargeEnabled(newEnabled);
                      const amt = parseFloat(autoRechargeAmount) || 20;
                      const thresh = parseFloat(autoRechargeThreshold) || 1;
                      await persistProfile({
                        auto_recharge: { enabled: newEnabled, threshold: thresh, amount: Math.max(amt, 20) },
                      });
                      setMessage(newEnabled ? "✅ Auto recharge enabled" : "Auto recharge disabled");
                      window.setTimeout(() => setMessage(""), 2500);
                    }}
                    disabled={!isSubscribed}
                    className={`relative h-8 w-14 rounded-full transition disabled:opacity-40 ${autoRechargeEnabled ? "bg-emerald-600" : "bg-zinc-600"}`}
                  >
                    <div className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${autoRechargeEnabled ? "left-[30px]" : "left-1"}`} />
                  </button>
                </div>

                {autoRechargeEnabled && (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm text-zinc-400">Recharge when balance falls below</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                          <input
                            type="number"
                            value={autoRechargeThreshold}
                            onChange={(e) => setAutoRechargeThreshold(e.target.value)}
                            min="1"
                            step="1"
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-3 pl-8 pr-4 text-white outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="mb-2 block text-sm text-zinc-400">Recharge amount</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                          <input
                            type="number"
                            value={autoRechargeAmount}
                            onChange={(e) => setAutoRechargeAmount(e.target.value)}
                            min="20"
                            step="1"
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-3 pl-8 pr-4 text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const amt = parseFloat(autoRechargeAmount);
                        const thresh = parseFloat(autoRechargeThreshold);
                        if (!amt || amt < 20) {
                          setMessage("❌ Minimum recharge amount is $20");
                          window.setTimeout(() => setMessage(""), 2500);
                          return;
                        }
                        if (!thresh || thresh < 0) {
                          setMessage("❌ Threshold must be $0 or more");
                          window.setTimeout(() => setMessage(""), 2500);
                          return;
                        }
                        await persistProfile({
                          auto_recharge: { enabled: true, threshold: thresh, amount: amt },
                        });
                        setMessage("✅ Auto recharge settings saved");
                        window.setTimeout(() => setMessage(""), 2500);
                      }}
                      className="w-full rounded-2xl bg-emerald-700 py-3 font-medium hover:bg-emerald-600"
                    >
                      Save Settings
                    </button>

                    <div className="rounded-2xl bg-zinc-800/60 p-4 text-xs text-zinc-400">
                      When your balance drops below <span className="text-white font-medium">${autoRechargeThreshold || "1"}</span>, we&apos;ll automatically charge your card on file <span className="text-white font-medium">${autoRechargeAmount || "20"}</span> and add it to your wallet.
                    </div>
                  </div>
                )}
              </div>

              {/* Manager Transfer Funds */}
              {(currentUser.role === "manager" || currentUser.role === "admin") && teamMembers.length > 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h2 className="text-2xl font-bold">Transfer Funds to Agent</h2>
                  <p className="mt-1 text-sm text-zinc-500">Send funds from your wallet to a team member.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Select Agent</label>
                      <select
                        value={billingTransferMemberId}
                        onChange={(e) => setBillingTransferMemberId(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-white outline-none"
                      >
                        <option value="">Choose a team member...</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.firstName} {m.lastName} — ${(m.walletBalance || 0).toFixed(2)} balance
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Amount</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                          <input
                            type="number"
                            value={billingTransferAmount}
                            onChange={(e) => setBillingTransferAmount(e.target.value)}
                            placeholder="Enter amount"
                            min="1"
                            step="1"
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-4 pl-8 pr-4 text-white outline-none placeholder:text-zinc-500"
                          />
                        </div>
                        <button
                          onClick={handleBillingTransfer}
                          disabled={!billingTransferMemberId || !billingTransferAmount}
                          className="rounded-2xl bg-emerald-600 px-6 py-4 font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Transfer
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/60 px-4 py-3 text-sm">
                      <span className="text-zinc-400">Your wallet:</span>
                      <span className="font-semibold text-emerald-400">${(currentUser.walletBalance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {settingsSubTab === "opt-out" && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column — Keywords & Behavior */}
            <div className="space-y-6">
              {/* Opt-Out Keywords */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Opt-Out Keywords</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  When a contact replies with any of these words, they will be automatically opted out.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {optOutSettings.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-sm text-red-300"
                    >
                      {kw}
                      <button
                        onClick={() =>
                          setOptOutSettings((prev) => ({
                            ...prev,
                            keywords: prev.keywords.filter((k) => k !== kw),
                          }))
                        }
                        className="ml-1 text-red-500 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    placeholder="Add keyword..."
                    value={optOutNewKeyword}
                    onChange={(e) => setOptOutNewKeyword(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && optOutNewKeyword.trim()) {
                        setOptOutSettings((prev) => ({
                          ...prev,
                          keywords: [...prev.keywords, optOutNewKeyword.trim()],
                        }));
                        setOptOutNewKeyword("");
                      }
                    }}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (optOutNewKeyword.trim()) {
                        setOptOutSettings((prev) => ({
                          ...prev,
                          keywords: [...prev.keywords, optOutNewKeyword.trim()],
                        }));
                        setOptOutNewKeyword("");
                      }
                    }}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Opt-In Keywords */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Opt-In Keywords</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  When an opted-out contact replies with any of these words, they will be re-subscribed.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {optOutSettings.optInKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1.5 rounded-lg border border-green-800/50 bg-green-950/30 px-3 py-1.5 text-sm text-green-300"
                    >
                      {kw}
                      <button
                        onClick={() =>
                          setOptOutSettings((prev) => ({
                            ...prev,
                            optInKeywords: prev.optInKeywords.filter((k) => k !== kw),
                          }))
                        }
                        className="ml-1 text-green-500 hover:text-green-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    placeholder="Add keyword..."
                    value={optInNewKeyword}
                    onChange={(e) => setOptInNewKeyword(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && optInNewKeyword.trim()) {
                        setOptOutSettings((prev) => ({
                          ...prev,
                          optInKeywords: [...prev.optInKeywords, optInNewKeyword.trim()],
                        }));
                        setOptInNewKeyword("");
                      }
                    }}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (optInNewKeyword.trim()) {
                        setOptOutSettings((prev) => ({
                          ...prev,
                          optInKeywords: [...prev.optInKeywords, optInNewKeyword.trim()],
                        }));
                        setOptInNewKeyword("");
                      }
                    }}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Behavior</h2>

                <div className="mt-5 space-y-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optOutSettings.autoMarkDnc}
                      onChange={(e) =>
                        setOptOutSettings((prev) => ({ ...prev, autoMarkDnc: e.target.checked }))
                      }
                      className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="font-medium">Auto-mark as DNC</div>
                      <div className="text-sm text-zinc-400">
                        Automatically flag the contact as Do-Not-Contact when they opt out. They won&apos;t receive any future campaign messages.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optOutSettings.confirmOptOut}
                      onChange={(e) =>
                        setOptOutSettings((prev) => ({ ...prev, confirmOptOut: e.target.checked }))
                      }
                      className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="font-medium">Send confirmation reply</div>
                      <div className="text-sm text-zinc-400">
                        Automatically send a reply confirming the opt-out or opt-in. Required by TCPA compliance.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optOutSettings.includeCompanyName}
                      onChange={(e) =>
                        setOptOutSettings((prev) => ({ ...prev, includeCompanyName: e.target.checked }))
                      }
                      className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className="font-medium">Include company name</div>
                      <div className="text-sm text-zinc-400">
                        Append your company name to opt-out/opt-in replies for branding.
                      </div>
                    </div>
                  </label>

                  {optOutSettings.includeCompanyName && (
                    <input
                      placeholder="Your company name"
                      value={optOutSettings.companyName}
                      onChange={(e) =>
                        setOptOutSettings((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column — Auto-Reply Messages & Preview */}
            <div className="space-y-6">
              {/* Opt-Out Auto-Reply */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Opt-Out Reply Message</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Sent automatically when a contact opts out.
                </p>
                <textarea
                  value={optOutSettings.autoReplyMessage}
                  onChange={(e) =>
                    setOptOutSettings((prev) => ({ ...prev, autoReplyMessage: e.target.value }))
                  }
                  className="mt-4 h-28 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm"
                />
              </div>

              {/* Opt-In Auto-Reply */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Opt-In Reply Message</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Sent automatically when a contact re-subscribes.
                </p>
                <textarea
                  value={optOutSettings.optInReplyMessage}
                  onChange={(e) =>
                    setOptOutSettings((prev) => ({ ...prev, optInReplyMessage: e.target.value }))
                  }
                  className="mt-4 h-28 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm"
                />
              </div>

              {/* Live Preview */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Preview</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  This is what your contacts will see when they opt out or opt back in.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="text-xs font-semibold text-red-400 mb-2">OPT-OUT SCENARIO</div>
                    <div className="flex flex-col gap-2">
                      <div className="self-end rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm max-w-[80%]">
                        Hi John! We have a great rate for you...
                      </div>
                      <div className="self-start rounded-2xl rounded-bl-sm bg-zinc-700 px-4 py-2 text-sm max-w-[80%]">
                        {optOutSettings.keywords[0] || "STOP"}
                      </div>
                      {optOutSettings.confirmOptOut && (
                        <div className="self-end rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm max-w-[80%]">
                          {optOutSettings.autoReplyMessage}
                          {optOutSettings.includeCompanyName && optOutSettings.companyName
                            ? ` — ${optOutSettings.companyName}`
                            : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="text-xs font-semibold text-green-400 mb-2">OPT-IN SCENARIO</div>
                    <div className="flex flex-col gap-2">
                      <div className="self-start rounded-2xl rounded-bl-sm bg-zinc-700 px-4 py-2 text-sm max-w-[80%]">
                        {optOutSettings.optInKeywords[0] || "START"}
                      </div>
                      {optOutSettings.confirmOptOut && (
                        <div className="self-end rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm max-w-[80%]">
                          {optOutSettings.optInReplyMessage}
                          {optOutSettings.includeCompanyName && optOutSettings.companyName
                            ? ` — ${optOutSettings.companyName}`
                            : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiet Hours — TCPA */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Quiet Hours</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Block outbound messages during a contact&apos;s local nighttime window
                      (based on their state). TCPA recommends 8 AM – 9 PM local time.
                      Campaigns will auto-defer blocked contacts to the next open window.
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-3">
                    <span className="text-sm text-zinc-300">
                      {quietHoursEnabled ? "On" : "Off"}
                    </span>
                    <input
                      type="checkbox"
                      checked={quietHoursEnabled}
                      onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="relative h-7 w-12 rounded-full bg-zinc-700 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-zinc-300 after:transition peer-checked:bg-violet-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white"></span>
                  </label>
                </div>

                {quietHoursEnabled ? (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">
                        Blocked from (evening start)
                      </label>
                      <select
                        value={quietHoursStartHour}
                        onChange={(e) => setQuietHoursStartHour(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">
                        Blocked until (morning end)
                      </label>
                      <select
                        value={quietHoursEndHour}
                        onChange={(e) => setQuietHoursEndHour(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
                    <strong>⚠️ Quiet hours are disabled.</strong> You are responsible for
                    TCPA compliance, including avoiding calls/texts to consumers before
                    8 AM or after 9 PM in their local time. Violations can trigger fines
                    up to $1,500 per message.
                  </div>
                )}

                <button
                  onClick={handleSaveQuietHours}
                  disabled={savingQuietHours}
                  className="mt-5 w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
                >
                  {savingQuietHours ? "Saving..." : "Save Quiet Hours"}
                </button>
              </div>

              {/* TCPA Compliance Note */}
              <div className="rounded-3xl border border-yellow-800/40 bg-yellow-950/20 p-6">
                <h3 className="text-lg font-bold text-yellow-300">TCPA Compliance</h3>
                <ul className="mt-3 space-y-2 text-sm text-yellow-200/80">
                  <li>• You must honor all opt-out requests immediately</li>
                  <li>• STOP, UNSUBSCRIBE, CANCEL, END, and QUIT are federally required keywords</li>
                  <li>• You must send a one-time confirmation after opting out</li>
                  <li>• Do not send any further messages to opted-out contacts</li>
                  <li>• Keep records of all opt-out requests for compliance</li>
                  <li>• Do not message consumers before 8 AM or after 9 PM in their local time</li>
                </ul>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveOptOut}
                disabled={savingOptOut}
                className="w-full rounded-2xl bg-violet-600 py-4 text-lg font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {savingOptOut ? "Saving..." : "Save Opt-Out Settings"}
              </button>
            </div>

            {/* Compliance Audit Log — full width below the 2-column grid */}
            <div className="col-span-2 mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Compliance Audit Log</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Track all opt-in, opt-out, and DNC events with timestamps for TCPA compliance records.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                    {(currentUser.complianceLog || []).length} events
                  </span>
                  {(currentUser.complianceLog || []).length > 0 && (
                    <button
                      onClick={() => {
                        const log = currentUser.complianceLog || [];
                        const csv = ["Timestamp,Type,Contact Name,Phone,Method,Keyword"]
                          .concat(log.map((e) =>
                            `${new Date(e.timestamp).toISOString()},${e.type},${e.contactName},${e.contactPhone},${e.method},${e.keyword || ""}`
                          )).join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `compliance-log-${new Date().toISOString().split("T")[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
              </div>

              {(currentUser.complianceLog || []).length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
                  No compliance events recorded yet. Events are logged automatically when contacts are added to or removed from the DNC list, and when opt-out/opt-in keywords are received via SMS.
                </div>
              ) : (
                <div className="max-h-96 overflow-auto rounded-2xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">Keyword</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(currentUser.complianceLog || []).slice(0, 100).map((event) => (
                        <tr key={event.id} className="hover:bg-zinc-800/50">
                          <td className="px-4 py-3 text-zinc-400">
                            {new Date(event.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                              event.type === "opt_out" || event.type === "dnc_added" ? "bg-red-900 text-red-300" :
                              event.type === "opt_in" || event.type === "dnc_removed" ? "bg-emerald-900 text-emerald-300" :
                              "bg-sky-900 text-sky-300"
                            }`}>
                              {event.type === "opt_out" ? "Opt-Out" : event.type === "opt_in" ? "Opt-In" :
                               event.type === "dnc_added" ? "DNC Added" : event.type === "dnc_removed" ? "DNC Removed" : "Consent"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{event.contactName || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs">{event.contactPhone}</td>
                          <td className="px-4 py-3 text-zinc-400">
                            {event.method === "sms_keyword" ? "SMS" : event.method === "manual" ? "Manual" : event.method === "csv_import" ? "CSV" : event.method}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500">{event.keyword || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {settingsSubTab === "activity" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Recent Activity</h2>

            <div className="mt-5 space-y-4">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium">{item.description}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {item.type.includes("add") || item.type === "fund_add"
                      ? `+${formatCurrency(item.amount)}`
                      : `-${formatCurrency(item.amount)}`}
                  </div>
                </div>
              ))}

              {recentActivity.length === 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {settingsSubTab === "team" && (
          <div className="space-y-8">
            {/* Manager view — team overview */}
            {(currentUser.role === "manager" || currentUser.role === "admin") && (
              <>
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Your Team</h2>
                      <p className="mt-1 text-sm text-zinc-400">Manage your team members, view their dashboards, and add funds.</p>
                    </div>
                    <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 px-5 py-3">
                      <div className="text-xs text-amber-400">Team Join Code</div>
                      <div className="mt-1 font-mono text-lg font-bold text-white">{currentUser.referralCode || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
                  {/* Team member list */}
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                    <h3 className="mb-4 text-lg font-bold">Members ({teamMembers.length})</h3>
                    <div className="max-h-[500px] space-y-3 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => handleViewTeamMember(member.id)}
                          className={`cursor-pointer rounded-2xl p-4 transition ${
                            selectedTeamMemberId === member.id
                              ? "border border-violet-600 bg-violet-900/30"
                              : "bg-zinc-800 hover:bg-zinc-700"
                          }`}
                        >
                          <div className="font-semibold">{member.firstName} {member.lastName}</div>
                          <div className="text-sm text-zinc-400">{member.email}</div>
                          <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                            <span>Balance: ${member.walletBalance?.toFixed(2) || "0.00"}</span>
                            <span className={member.paused ? "text-red-400" : "text-emerald-400"}>
                              {member.paused ? "PAUSED" : "ACTIVE"}
                            </span>
                          </div>
                        </div>
                      ))}

                      {teamMembers.length === 0 && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                          No team members yet. Share your team code above to invite people.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team member detail */}
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                    {teamLoading && selectedTeamMemberId && (
                      <div className="py-20 text-center text-zinc-400">Loading member data...</div>
                    )}

                    {!teamLoading && teamMemberDetail ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold">{teamMemberDetail.profile.firstName} {teamMemberDetail.profile.lastName}</h3>
                            <div className="text-sm text-zinc-400">{teamMemberDetail.profile.email}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => router.push(`/dashboard?impersonate=${teamMemberDetail.profile.id}`)}
                              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium hover:bg-violet-700"
                            >
                              View as User
                            </button>
                            <div className={`rounded-full px-3 py-1 text-xs ${
                              teamMemberDetail.profile.paused ? "bg-red-900 text-red-300" : "bg-emerald-900 text-emerald-300"
                            }`}>
                              {teamMemberDetail.profile.paused ? "PAUSED" : "ACTIVE"}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                          <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                            <div className="text-2xl font-bold">${teamMemberDetail.profile.walletBalance?.toFixed(2) || "0.00"}</div>
                            <div className="mt-1 text-xs text-zinc-500">Wallet</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                            <div className="text-2xl font-bold text-violet-400">{teamMemberDetail.contacts.length}</div>
                            <div className="mt-1 text-xs text-zinc-500">Contacts</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                            <div className="text-2xl font-bold text-sky-400">{teamMemberDetail.campaigns.length}</div>
                            <div className="mt-1 text-xs text-zinc-500">Campaigns</div>
                          </div>
                          <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-400">
                              {teamMemberDetail.campaigns.reduce((s, c) => s + (c.sent || 0), 0)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">Messages Sent</div>
                          </div>
                        </div>

                        {/* Add funds */}
                        <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-4">
                          <div className="mb-3 text-sm font-medium">Add Funds to Member</div>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                              <input
                                type="number"
                                value={teamAddFundsAmount}
                                onChange={(e) => setTeamAddFundsAmount(e.target.value)}
                                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-3 pl-8 pr-4"
                                min="1"
                                step="1"
                              />
                            </div>
                            <button
                              onClick={() => handleTeamAddFunds(teamMemberDetail.profile.id)}
                              className="rounded-2xl bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-700"
                            >
                              Send Funds
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-zinc-500">
                            Your wallet: ${currentUser.walletBalance?.toFixed(2) || "0.00"} — funds will be deducted from your balance.
                          </div>
                        </div>

                        {/* Campaigns list */}
                        <div>
                          <h4 className="mb-3 text-sm font-medium text-zinc-300">Campaigns</h4>
                          <div className="max-h-48 space-y-2 overflow-y-auto">
                            {teamMemberDetail.campaigns.map((c) => (
                              <div key={c.id} className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-sm">
                                <span className="font-medium">{c.name}</span>
                                <div className="flex gap-4 text-xs text-zinc-400">
                                  <span>{c.sent} sent</span>
                                  <span>{c.failed} failed</span>
                                  <span className={`rounded-full px-2 py-0.5 ${
                                    c.status === "Completed" ? "bg-emerald-900 text-emerald-300" :
                                    c.status === "Sending" ? "bg-sky-900 text-sky-300" :
                                    "bg-zinc-700 text-zinc-300"
                                  }`}>{c.status}</span>
                                </div>
                              </div>
                            ))}
                            {teamMemberDetail.campaigns.length === 0 && (
                              <div className="text-sm text-zinc-500">No campaigns yet.</div>
                            )}
                          </div>
                        </div>

                        {/* Recent contacts */}
                        <div>
                          <h4 className="mb-3 text-sm font-medium text-zinc-300">Contacts ({teamMemberDetail.contacts.length})</h4>
                          <div className="max-h-48 space-y-2 overflow-y-auto">
                            {teamMemberDetail.contacts.slice(0, 20).map((c) => (
                              <div key={c.id} className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 text-sm">
                                <span>{c.firstName} {c.lastName}</span>
                                <span className="text-xs text-zinc-400">{c.phone}</span>
                              </div>
                            ))}
                            {teamMemberDetail.contacts.length > 20 && (
                              <div className="text-xs text-zinc-500 text-center">...and {teamMemberDetail.contacts.length - 20} more</div>
                            )}
                            {teamMemberDetail.contacts.length === 0 && (
                              <div className="text-sm text-zinc-500">No contacts yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : !teamLoading && (
                      <div className="py-20 text-center text-zinc-500">Select a team member to view their dashboard</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Regular user view — join/leave team */}
            {currentUser.role === "user" && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Team</h2>

                {currentUser.managerId ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-5">
                      <div className="text-sm text-emerald-400">You are on a team</div>
                      <div className="mt-2 text-lg font-bold">Manager: {teamManagerName || "Loading..."}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Your manager can view your dashboard, campaigns, and contacts. They can also add funds to your wallet.
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveTeam}
                      disabled={teamLoading}
                      className="rounded-2xl border border-red-700 px-6 py-3 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    >
                      {teamLoading ? "Leaving..." : "Leave Team"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <p className="text-sm text-zinc-400">
                      Join a team by entering the team code provided by your manager.
                      Your manager will be able to view your dashboard and add funds to your wallet.
                    </p>
                    <div className="flex gap-3">
                      <input
                        value={teamJoinCode}
                        onChange={(e) => setTeamJoinCode(e.target.value.toUpperCase())}
                        placeholder="Enter team code (e.g. T2S-ABC123)"
                        className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                      />
                      <button
                        onClick={handleJoinTeam}
                        disabled={teamLoading || !teamJoinCode.trim()}
                        className="rounded-2xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700 disabled:opacity-50"
                      >
                        {teamLoading ? "Joining..." : "Join Team"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 10DLC A2P Registration Tab ── */}
        {settingsSubTab === "10dlc" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">10DLC A2P Registration</h2>
            <p className="text-zinc-400">
              US carriers require 10DLC registration for business text messaging. Enter your business details below and we&apos;ll handle the rest automatically.
            </p>

            {/* Status Banner */}
            {currentUser?.a2pRegistration && currentUser.a2pRegistration.status !== "not_started" && (
              <div className={`rounded-2xl border p-4 ${
                currentUser.a2pRegistration.status === "completed" || currentUser.a2pRegistration.status === "campaign_approved"
                  ? "border-emerald-700 bg-emerald-950/50"
                  : currentUser.a2pRegistration.status === "brand_failed" || currentUser.a2pRegistration.status === "campaign_failed"
                  ? "border-red-700 bg-red-950/50"
                  : "border-yellow-700 bg-yellow-950/50"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    currentUser.a2pRegistration.status === "completed" || currentUser.a2pRegistration.status === "campaign_approved" ? "bg-emerald-500" :
                    currentUser.a2pRegistration.status === "brand_failed" || currentUser.a2pRegistration.status === "campaign_failed" ? "bg-red-500" :
                    "bg-yellow-500 animate-pulse"
                  }`} />
                  <div>
                    <p className="font-medium">
                      {currentUser.a2pRegistration.status === "completed" || currentUser.a2pRegistration.status === "campaign_approved" ? "Registration Complete" :
                       currentUser.a2pRegistration.status === "brand_pending" ? "Brand Registration Pending" :
                       currentUser.a2pRegistration.status === "brand_approved" ? "Brand Approved — Creating Campaign" :
                       currentUser.a2pRegistration.status === "campaign_pending" ? "Campaign Pending Approval" :
                       currentUser.a2pRegistration.status === "brand_failed" ? "Brand Registration Failed" :
                       currentUser.a2pRegistration.status === "campaign_failed" ? "Campaign Registration Failed" :
                       "Processing..."}
                    </p>
                    {currentUser.a2pRegistration.businessName && (
                      <p className="text-sm text-zinc-400">Business: {currentUser.a2pRegistration.businessName} | EIN: {currentUser.a2pRegistration.ein}</p>
                    )}
                    {(currentUser.a2pRegistration.status === "brand_failed" || currentUser.a2pRegistration.status === "campaign_failed") &&
                     currentUser.a2pRegistration.errors?.length > 0 && (
                      <p className="mt-1 text-sm text-red-400">{currentUser.a2pRegistration.errors.join(", ")}</p>
                    )}
                  </div>
                </div>
                {(currentUser.a2pRegistration.status === "campaign_pending" || currentUser.a2pRegistration.status === "brand_pending") && (
                  <button
                    onClick={currentUser.a2pRegistration.status === "campaign_pending" ? handleA2pCheckCampaign : handleA2pCheckBrand}
                    disabled={a2pLoading}
                    className="mt-3 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {a2pLoading ? "Checking..." : "Check Status"}
                  </button>
                )}
              </div>
            )}

            {/* Registration Form - show if not started, failed, or no registration */}
            {(!currentUser?.a2pRegistration || currentUser.a2pRegistration.status === "not_started" ||
              currentUser.a2pRegistration.status === "brand_failed" || currentUser.a2pRegistration.status === "campaign_failed") && (
              <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-lg font-semibold">Business Information</h3>
                <p className="text-sm text-zinc-400">Enter your business details. We&apos;ll register your brand, create a messaging campaign, and assign your phone numbers automatically.</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Business Name *</label>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="Acme Marketing LLC"
                      value={a2pForm.businessName}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">EIN (Employer ID Number) *</label>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="12-3456789"
                      value={a2pForm.ein}
                      onChange={(e) => setA2pForm({ ...a2pForm, ein: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-zinc-400">EIN Certificate (CP-575 or EIN verification letter)</label>
                    <EinCertificateUpload
                      userId={userId}
                      certificate={currentUser?.a2pRegistration ? {
                        path: currentUser.a2pRegistration.einCertificatePath || null,
                        name: currentUser.a2pRegistration.einCertificateName || null,
                        uploadedAt: currentUser.a2pRegistration.einCertificateUploadedAt || null,
                      } : null}
                      onUploaded={(info) => {
                        setCurrentUser((prev) => {
                          if (!prev) return prev;
                          const prevReg = prev.a2pRegistration || {
                            status: "not_started" as const,
                            customerProfileSid: null, trustProductSid: null, brandRegistrationSid: null, brandStatus: null,
                            messagingServiceSid: null, campaignSid: null, campaignStatus: null,
                            businessName: "", businessType: "llc" as const, ein: "",
                            businessAddress: "", businessCity: "", businessState: "", businessZip: "", businessCountry: "US",
                            website: "",
                            contactFirstName: "", contactLastName: "", contactEmail: "", contactPhone: "",
                            useCase: "", description: "", sampleMessages: [], messageFlow: "",
                            optInMessage: "", optOutMessage: "", helpMessage: "",
                            hasEmbeddedLinks: false, hasEmbeddedPhone: false,
                            errors: [], updatedAt: new Date().toISOString(),
                          };
                          return {
                            ...prev,
                            a2pRegistration: {
                              ...prevReg,
                              einCertificatePath: info.path,
                              einCertificateName: info.name,
                              einCertificateType: info.type,
                              einCertificateUploadedAt: info.uploadedAt,
                            },
                          };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Business Type</label>
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      value={a2pForm.businessType}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessType: e.target.value as typeof a2pForm.businessType })}
                    >
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="partnership">Partnership</option>
                      <option value="sole_proprietor">Sole Proprietor</option>
                      <option value="non_profit">Non-Profit</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-zinc-400">
                      Do you have a business website? *
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setA2pForm({ ...a2pForm, hasWebsite: "yes", buildPage: false })}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          a2pForm.hasWebsite === "yes"
                            ? "border-violet-500 bg-violet-600/20 text-violet-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        Yes, I have a website
                      </button>
                      <button
                        type="button"
                        onClick={() => setA2pForm({ ...a2pForm, hasWebsite: "no", website: "" })}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          a2pForm.hasWebsite === "no"
                            ? "border-violet-500 bg-violet-600/20 text-violet-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        No, I don&apos;t have one
                      </button>
                    </div>
                  </div>

                  {a2pForm.hasWebsite === "yes" && (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm text-zinc-400">Website URL *</label>
                      <input
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                        placeholder="https://yourbusiness.com"
                        value={a2pForm.website}
                        onChange={(e) => setA2pForm({ ...a2pForm, website: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        A Facebook Business page, LinkedIn company page, or Google Business Profile URL also works.
                      </p>
                    </div>
                  )}

                  {a2pForm.hasWebsite === "no" && (
                    <div className="md:col-span-2 rounded-2xl border border-violet-800/40 bg-violet-950/20 p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={a2pForm.buildPage}
                          onChange={(e) => setA2pForm({ ...a2pForm, buildPage: e.target.checked })}
                          className="mt-1 h-5 w-5 flex-shrink-0 accent-violet-600"
                        />
                        <div>
                          <div className="font-medium text-violet-300">
                            Build me a free business page
                          </div>
                          <div className="mt-1 text-sm text-zinc-400">
                            We&apos;ll auto-generate a professional business page at{" "}
                            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-violet-300">
                              text2sale.com/biz/
                              {a2pForm.businessName
                                ? a2pForm.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                                : "your-business"}
                            </code>{" "}
                            with your business info, contact details, and SMS opt-in disclosures. Required for 10DLC
                            approval — takes a few seconds.
                          </div>
                        </div>
                      </label>
                      {a2pForm.buildPage && (
                        <div className="mt-4">
                          <label className="mb-1 block text-sm text-zinc-400">
                            Short description of your business (optional)
                          </label>
                          <textarea
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                            rows={3}
                            placeholder="We help families find affordable health insurance plans tailored to their needs..."
                            value={a2pForm.businessDescription}
                            onChange={(e) => setA2pForm({ ...a2pForm, businessDescription: e.target.value })}
                          />
                          <p className="mt-1 text-xs text-zinc-500">
                            Leave blank to use a default description. You can edit your page anytime.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h4 className="mt-4 font-medium text-zinc-300">Business Address</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="Street Address"
                      value={a2pForm.businessAddress}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="City"
                      value={a2pForm.businessCity}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessCity: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      value={a2pForm.businessState}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessState: e.target.value })}
                    >
                      <option value="">Select State</option>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="ZIP"
                      value={a2pForm.businessZip}
                      onChange={(e) => setA2pForm({ ...a2pForm, businessZip: e.target.value })}
                    />
                  </div>
                </div>

                <h4 className="mt-4 font-medium text-zinc-300">Contact Information</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Contact Email</label>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="email@example.com"
                      value={a2pForm.contactEmail}
                      onChange={(e) => setA2pForm({ ...a2pForm, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Contact Phone</label>
                    <input
                      type="tel"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none"
                      placeholder="(555) 123-4567"
                      value={a2pForm.contactPhone}
                      onChange={(e) => setA2pForm({ ...a2pForm, contactPhone: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  onClick={handleA2pRegister}
                  disabled={
                    a2pLoading ||
                    !a2pForm.businessName ||
                    !a2pForm.ein ||
                    (a2pForm.hasWebsite === "yes" && !a2pForm.website) ||
                    (a2pForm.hasWebsite === "no" && !a2pForm.buildPage)
                  }
                  className="mt-4 w-full rounded-2xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700 disabled:opacity-50"
                >
                  {a2pLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Registering...
                    </span>
                  ) : "Register & Start Sending"}
                </button>
              </div>
            )}

            {/* Completed State */}
            {(currentUser?.a2pRegistration?.status === "completed" || currentUser?.a2pRegistration?.status === "campaign_approved") && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="mb-2 text-lg font-semibold">Registration Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-zinc-400">Business:</span> {currentUser.a2pRegistration.businessName}</div>
                  <div><span className="text-zinc-400">EIN:</span> {currentUser.a2pRegistration.ein}</div>
                  <div><span className="text-zinc-400">Campaign:</span> {currentUser.a2pRegistration.useCase}</div>
                  <div><span className="text-zinc-400">Status:</span> <span className="text-emerald-400">Active</span></div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium text-zinc-300">EIN Certificate</div>
                  <EinCertificateUpload
                    userId={userId}
                    certificate={{
                      path: currentUser.a2pRegistration.einCertificatePath || null,
                      name: currentUser.a2pRegistration.einCertificateName || null,
                      uploadedAt: currentUser.a2pRegistration.einCertificateUploadedAt || null,
                    }}
                    onUploaded={(info) => {
                      setCurrentUser((prev) => prev && prev.a2pRegistration ? {
                        ...prev,
                        a2pRegistration: {
                          ...prev.a2pRegistration,
                          einCertificatePath: info.path,
                          einCertificateName: info.name,
                          einCertificateType: info.type,
                          einCertificateUploadedAt: info.uploadedAt,
                        },
                      } : prev);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Phone Numbers */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="mb-3 text-lg font-semibold">Your Phone Numbers</h3>
              {currentUser?.ownedNumbers && currentUser.ownedNumbers.length > 0 ? (
                <div className="space-y-2">
                  {currentUser.ownedNumbers.map((num) => (
                    <div key={num.id} className="flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono">{num.number}</span>
                      <span className="text-sm text-zinc-400">{num.alias}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No phone numbers yet. Purchase numbers from Settings &gt; Numbers.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ BUSINESS PAGE EDITOR ═══════════════ */}
        {settingsSubTab === "biz-page" && (
          <BizPageEditor
            slug={currentUser.businessSlug || ""}
            description={currentUser.businessDescription || ""}
            logoUrl={currentUser.businessLogoUrl || ""}
            onSave={async (updates) => {
              await persistProfile({
                business_slug: updates.slug || null,
                business_description: updates.description || null,
                business_logo_url: updates.logoUrl || null,
              });
              setMessage("✅ Business page updated.");
              window.setTimeout(() => setMessage(""), 3000);
            }}
          />
        )}

        {settingsSubTab === "ai" && (
          <div className="space-y-6">
            {/* AI Plan status */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">🤖 AI Auto-Reply</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Let AI respond to your customers automatically or generate suggested replies on demand.
                  </p>
                </div>
                <div className={`rounded-full px-4 py-1.5 text-sm font-semibold ${currentUser.aiPlan ? "bg-cyan-900/50 text-cyan-300" : "bg-zinc-800 text-zinc-400"}`}>
                  {currentUser.aiPlan ? "AI Plan Active" : "Not Subscribed"}
                </div>
              </div>

              {!currentUser.aiPlan && (
                <div className="mt-6 rounded-2xl border border-cyan-800 bg-gradient-to-br from-cyan-950/50 to-zinc-900 p-6">
                  <h3 className="text-lg font-bold text-cyan-200">Upgrade to Text2Sale + AI</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> AI-powered reply suggestions</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Full auto-reply mode</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Customizable AI instructions</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Appointment booking via AI</div>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Context-aware responses</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Reads full conversation history</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> Uses contact details for personalization</div>
                      <div className="flex items-center gap-2"><span className="text-cyan-400">✓</span> $0.025 per AI reply (cheaper than competitors)</div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">What industry are you in?</label>
                      <select
                        value={currentUser.industry || ""}
                        onChange={(e) => setCurrentUser((prev) => prev ? { ...prev, industry: e.target.value } : prev)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
                      >
                        <option value="">Select your industry...</option>
                        <option value="health_insurance">Health Insurance</option>
                        <option value="life_insurance">Life Insurance</option>
                        <option value="auto_insurance">Auto Insurance</option>
                        <option value="home_insurance">Home / Property Insurance</option>
                        <option value="medicare">Medicare</option>
                        <option value="real_estate">Real Estate</option>
                        <option value="solar">Solar Energy</option>
                        <option value="roofing">Roofing / Home Services</option>
                        <option value="financial_services">Financial Services</option>
                        <option value="auto_dealer">Auto Dealership</option>
                        <option value="debt_settlement">Debt Settlement / Credit Repair</option>
                        <option value="legal">Legal Services</option>
                        <option value="other">Other</option>
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">The AI will be trained as a top producer in your industry — handling objections, rebuttals, and closing like the best in the business.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-white">$59.99<span className="text-base font-normal text-zinc-400">/mo</span></div>
                      <button
                        onClick={async () => {
                          if (!currentUser.industry) {
                            setMessage("❌ Please select your industry first");
                            window.setTimeout(() => setMessage(""), 3000);
                            return;
                          }
                          await persistProfile({ ai_plan: true, industry: currentUser.industry });
                          setMessage("✅ AI plan activated! Your AI is trained for " + (currentUser.industry || "").replace(/_/g, " ") + ".");
                          window.setTimeout(() => setMessage(""), 4000);
                        }}
                        className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
                      >
                        Activate AI Plan
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">AI messages billed at $0.025 each from wallet. Regular SMS stays at $0.012.</p>
                </div>
              )}
            </div>

            {/* AI Configuration (only when plan is active) */}
            {currentUser.aiPlan && (
              <>
                {/* Auto-Reply Toggle */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Auto-Reply</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        When enabled, AI will automatically respond to every inbound message. You can always use the manual &quot;AI Reply&quot; button in conversations regardless of this setting.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !currentUser.aiAutoReply;
                        await persistProfile({ ai_auto_reply: next });
                        setMessage(next ? "✅ Auto-reply enabled — AI will now respond to incoming messages" : "Auto-reply disabled");
                        window.setTimeout(() => setMessage(""), 3000);
                      }}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${currentUser.aiAutoReply ? "bg-cyan-600" : "bg-zinc-700"}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${currentUser.aiAutoReply ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                  </div>
                  {currentUser.aiAutoReply && (
                    <div className="mt-3 rounded-xl bg-cyan-900/20 px-4 py-3 text-sm text-cyan-300">
                      <strong>Active</strong> — AI is responding to inbound messages. Each AI reply costs $0.025 from your wallet. Opt-out keywords (STOP, etc.) are handled before AI and won&apos;t trigger an AI response.
                    </div>
                  )}
                </div>

                {/* Industry Selector */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">Your Industry</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    The AI is trained as a top producer in your industry — it knows how to handle objections, rebuttals, and close deals using proven sales frameworks.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <select
                      value={currentUser.industry || ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setCurrentUser((prev) => prev ? { ...prev, industry: val } : prev);
                        await persistProfile({ industry: val });
                        setMessage("✅ Industry updated — AI is now trained for " + val.replace(/_/g, " "));
                        window.setTimeout(() => setMessage(""), 3000);
                      }}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
                    >
                      <option value="">Select your industry...</option>
                      <option value="health_insurance">Health Insurance</option>
                      <option value="life_insurance">Life Insurance</option>
                      <option value="auto_insurance">Auto Insurance</option>
                      <option value="home_insurance">Home / Property Insurance</option>
                      <option value="medicare">Medicare</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="solar">Solar Energy</option>
                      <option value="roofing">Roofing / Home Services</option>
                      <option value="financial_services">Financial Services</option>
                      <option value="auto_dealer">Auto Dealership</option>
                      <option value="debt_settlement">Debt Settlement / Credit Repair</option>
                      <option value="legal">Legal Services</option>
                      <option value="other">Other</option>
                    </select>
                    {currentUser.industry && (
                      <span className="rounded-full bg-cyan-900/40 px-3 py-1.5 text-xs font-medium text-cyan-300">
                        {currentUser.industry.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Instructions */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">AI Instructions</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Tell the AI who you are, what you sell, and how you want it to respond. The more context you give, the better the replies.
                  </p>
                  <textarea
                    value={currentUser.aiInstructions || ""}
                    onChange={(e) => setCurrentUser((prev) => prev ? { ...prev, aiInstructions: e.target.value } : prev)}
                    placeholder={`Example:\nI'm an insurance agent in South Florida. I sell auto, home, and life insurance.\nAlways try to book a phone call or appointment.\nBe friendly and casual but professional.\nIf they ask about pricing, say I'll prepare a custom quote.\nMy available hours are Mon-Fri 9am-6pm EST.\nDon't be pushy — if they say no, thank them and move on.`}
                    className="mt-4 h-48 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{(currentUser.aiInstructions || "").length} characters</span>
                    <button
                      onClick={async () => {
                        await persistProfile({ ai_instructions: currentUser.aiInstructions || "" });
                        setMessage("✅ AI instructions saved");
                        window.setTimeout(() => setMessage(""), 2500);
                      }}
                      className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700"
                    >
                      Save Instructions
                    </button>
                  </div>
                </div>

                {/* AI Pricing Info */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">AI Pricing</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold text-white">$0.012</div>
                      <div className="mt-1 text-xs text-zinc-400">Regular SMS</div>
                    </div>
                    <div className="rounded-2xl bg-cyan-900/30 p-4 text-center">
                      <div className="text-2xl font-bold text-cyan-300">$0.025</div>
                      <div className="mt-1 text-xs text-cyan-400">AI-generated reply</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold text-white">$59.99</div>
                      <div className="mt-1 text-xs text-zinc-400">Monthly AI plan</div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-zinc-500">
                    AI replies are charged from your wallet balance. Regular SMS messages still cost $0.012. All charges appear in your Activity log.
                  </p>
                </div>

                {/* Google Calendar Integration */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">Google Calendar Integration</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Connect your Google Calendar so AI-booked appointments automatically appear on your calendar.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    {currentUser?.googleCalendarConnected ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/40 px-3 py-1 text-sm font-medium text-green-400 ring-1 ring-green-500/30">
                          <span className="h-2 w-2 rounded-full bg-green-400" />
                          Connected
                        </span>
                        <button
                          className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900/40"
                          onClick={async () => {
                            try {
                              // The disconnect endpoint authenticates with a
                              // Bearer token — without it, Supabase auth.getUser
                              // fails and the route returns 401. Previously
                              // this fetch had no Authorization header, which
                              // is why Disconnect always said "failed".
                              const { data: { session } } = await supabase.auth.getSession();
                              const token = session?.access_token;
                              if (!token) {
                                setMessage("❌ Please sign in again to disconnect.");
                                window.setTimeout(() => setMessage(""), 3000);
                                return;
                              }
                              const res = await fetch("/api/google-calendar/disconnect", {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) {
                                setCurrentUser((prev) => prev ? { ...prev, googleCalendarConnected: false } as typeof prev : prev);
                                setMessage("✅ Google Calendar disconnected.");
                                window.setTimeout(() => setMessage(""), 3000);
                              } else {
                                const data = await res.json().catch(() => ({}));
                                setMessage(`❌ ${data?.error || `Failed to disconnect (HTTP ${res.status}).`}`);
                                window.setTimeout(() => setMessage(""), 4000);
                              }
                            } catch (err) {
                              const m = err instanceof Error ? err.message : "Failed to disconnect Google Calendar.";
                              setMessage(`❌ ${m}`);
                              window.setTimeout(() => setMessage(""), 3000);
                            }
                          }}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        className="rounded-xl border border-zinc-600 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100"
                        onClick={async () => {
                          // Supabase keeps the session in localStorage, so a
                          // plain navigation won't carry it. Pull the access
                          // token here and hand it to the OAuth-init route.
                          try {
                            const { data } = await supabase.auth.getSession();
                            const token = data.session?.access_token;
                            if (!token) {
                              setMessage("❌ You need to sign in again before connecting Google Calendar.");
                              window.setTimeout(() => setMessage(""), 3500);
                              return;
                            }
                            window.location.href = `/api/google-calendar/auth?token=${encodeURIComponent(token)}`;
                          } catch {
                            setMessage("❌ Could not start Google Calendar connect");
                            window.setTimeout(() => setMessage(""), 3000);
                          }
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Connect Google Calendar
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Hours for AI Booking */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="text-lg font-bold">Available Hours</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Set when the AI can book appointments. Customers will only be offered slots during these hours.
                  </p>
                  {(() => {
                    const hours = (currentUser as unknown as { availableHours?: { enabled: boolean; timezone: string; slots: Record<string, { enabled: boolean; start: string; end: string }>; slotDuration: number; bufferMinutes: number; maxDaysOut: number } })?.availableHours || {
                      enabled: true, timezone: "America/New_York",
                      slots: {
                        monday: { enabled: true, start: "09:00", end: "18:00" },
                        tuesday: { enabled: true, start: "09:00", end: "18:00" },
                        wednesday: { enabled: true, start: "09:00", end: "18:00" },
                        thursday: { enabled: true, start: "09:00", end: "18:00" },
                        friday: { enabled: true, start: "09:00", end: "18:00" },
                        saturday: { enabled: false, start: "10:00", end: "14:00" },
                        sunday: { enabled: false, start: "10:00", end: "14:00" },
                      },
                      slotDuration: 30, bufferMinutes: 15, maxDaysOut: 14,
                    };
                    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

                    const updateHours = async (updated: typeof hours) => {
                      setCurrentUser((prev) => prev ? { ...prev, availableHours: updated } as typeof prev : prev);
                      await persistProfile({ available_hours: updated });
                    };

                    return (
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-zinc-400">Timezone</label>
                          <select
                            value={hours.timezone}
                            onChange={(e) => updateHours({ ...hours, timezone: e.target.value })}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                          >
                            <option value="America/New_York">Eastern (ET)</option>
                            <option value="America/Chicago">Central (CT)</option>
                            <option value="America/Denver">Mountain (MT)</option>
                            <option value="America/Los_Angeles">Pacific (PT)</option>
                          </select>

                          <label className="text-sm text-zinc-400">Slot length</label>
                          <select
                            value={hours.slotDuration}
                            onChange={(e) => updateHours({ ...hours, slotDuration: Number(e.target.value) })}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                          >
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </select>

                          <label className="text-sm text-zinc-400">Book up to</label>
                          <select
                            value={hours.maxDaysOut}
                            onChange={(e) => updateHours({ ...hours, maxDaysOut: Number(e.target.value) })}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                          >
                            <option value={7}>1 week out</option>
                            <option value={14}>2 weeks out</option>
                            <option value={21}>3 weeks out</option>
                            <option value={30}>1 month out</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          {days.map((day) => {
                            const slot = hours.slots[day] || { enabled: false, start: "09:00", end: "17:00" };
                            return (
                              <div key={day} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3">
                                <button
                                  onClick={() => {
                                    const updated = { ...hours, slots: { ...hours.slots, [day]: { ...slot, enabled: !slot.enabled } } };
                                    updateHours(updated);
                                  }}
                                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${slot.enabled ? "bg-violet-600" : "bg-zinc-700"}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${slot.enabled ? "translate-x-5" : "translate-x-1"}`} />
                                </button>
                                <span className={`w-24 text-sm font-medium capitalize ${slot.enabled ? "text-white" : "text-zinc-500"}`}>
                                  {day}
                                </span>
                                {slot.enabled && (
                                  <>
                                    <input
                                      type="time"
                                      value={slot.start}
                                      onChange={(e) => {
                                        const updated = { ...hours, slots: { ...hours.slots, [day]: { ...slot, start: e.target.value } } };
                                        updateHours(updated);
                                      }}
                                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
                                    />
                                    <span className="text-zinc-500">to</span>
                                    <input
                                      type="time"
                                      value={slot.end}
                                      onChange={(e) => {
                                        const updated = { ...hours, slots: { ...hours.slots, [day]: { ...slot, end: e.target.value } } };
                                        updateHours(updated);
                                      }}
                                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deactivate */}
                <div className="rounded-3xl border border-red-900/50 bg-zinc-900 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-red-300">Deactivate AI Plan</h3>
                      <p className="mt-1 text-sm text-zinc-400">Turn off AI features. You can reactivate anytime.</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Deactivate AI plan? Auto-reply will be disabled and the AI Reply button will be hidden.")) return;
                        await persistProfile({ ai_plan: false, ai_auto_reply: false });
                        setMessage("AI plan deactivated");
                        window.setTimeout(() => setMessage(""), 3000);
                      }}
                      className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300 hover:bg-red-900/50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

          </div>
        )}

        {settingsSubTab === "suggestions" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">💡 Share Your Ideas</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Have a feature idea, improvement, or something you wish Text2Sale could do? Let us know! We read every suggestion and do our best to build what our users need.
              </p>
              <div className="mt-5 space-y-4">
                <select
                  id="suggestion-category"
                  defaultValue=""
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white"
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="new_feature">New Feature</option>
                  <option value="improvement">Improvement to Existing Feature</option>
                  <option value="ai">AI / Auto-Reply</option>
                  <option value="campaigns">Campaigns</option>
                  <option value="contacts">Contacts / CRM</option>
                  <option value="ui">Design / UI</option>
                  <option value="integrations">Integrations</option>
                  <option value="bug">Bug Report</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  id="suggestion-text"
                  placeholder="Describe your idea or suggestion in detail..."
                  className="h-40 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-sm text-white placeholder:text-zinc-500"
                />
                <button
                  onClick={async () => {
                    const textEl = document.getElementById("suggestion-text") as HTMLTextAreaElement;
                    const catEl = document.getElementById("suggestion-category") as HTMLSelectElement;
                    const text = textEl?.value?.trim();
                    const category = catEl?.value;
                    if (!text) {
                      setMessage("❌ Please describe your idea");
                      window.setTimeout(() => setMessage(""), 3000);
                      return;
                    }
                    try {
                      const res = await fetch("/api/suggestions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: currentUser?.id,
                          userName: `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim(),
                          userEmail: currentUser?.email,
                          category: category || "other",
                          text,
                        }),
                      });
                      if (res.ok) {
                        textEl.value = "";
                        catEl.value = "";
                        setMessage("✅ Thank you! Your suggestion has been submitted. We review every one!");
                        window.setTimeout(() => setMessage(""), 5000);
                      } else {
                        setMessage("❌ Failed to submit. Please try again.");
                        window.setTimeout(() => setMessage(""), 3000);
                      }
                    } catch {
                      setMessage("❌ Failed to submit. Please try again.");
                      window.setTimeout(() => setMessage(""), 3000);
                    }
                  }}
                  className="w-full rounded-2xl bg-violet-600 py-4 text-base font-semibold hover:bg-violet-700"
                >
                  Submit Suggestion
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              <div className="font-medium text-zinc-300 mb-2">What happens next?</div>
              <ul className="space-y-1.5">
                <li>• Our team reviews every suggestion personally</li>
                <li>• Popular requests get prioritized for development</li>
                <li>• We&apos;ll notify you if your feature gets built</li>
              </ul>
            </div>
          </div>
        )}

        {/* ═══════════════ INTEGRATIONS ═══════════════ */}
        {settingsSubTab === "integrations" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Integrations</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Connect your lead vendors. Give the Integration Link to any vendor so new leads are delivered straight into your Contacts in real time.
                </p>
              </div>
              <button
                onClick={async () => {
                  // Lazy-load integrations on first open
                  if (!integrationsLoaded) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    if (token) {
                      const res = await fetch("/api/integrations", {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        const json = await res.json();
                        setIntegrations(json.integrations || []);
                      }
                      setIntegrationsLoaded(true);
                    }
                  }
                  setEditingIntegration(null);
                  setIntegrationName("");
                  setIntegrationCampaignId("");
                  setIntegrationAutoSms(false);
                  setShowIntegrationModal(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create new integration
              </button>
            </div>

            {/* Load integrations when tab is opened */}
            {!integrationsLoaded && (() => {
              supabase.auth.getSession().then(({ data: { session } }) => {
                const token = session?.access_token;
                if (token) {
                  fetch("/api/integrations", {
                    headers: { Authorization: `Bearer ${token}` },
                  }).then(r => r.json()).then(json => {
                    setIntegrations(json.integrations || []);
                    setIntegrationsLoaded(true);
                  }).catch(() => setIntegrationsLoaded(true));
                }
              });
              return null;
            })()}

            {/* Grid of integration cards */}
            {integrationsLoaded && integrations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 p-12 text-center">
                <div className="text-4xl mb-3">🔗</div>
                <p className="text-zinc-300 font-medium">No integrations yet</p>
                <p className="mt-1 text-sm text-zinc-500">Click &quot;Create new integration&quot; to generate your first webhook link.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {integrations.map((intg) => {
                  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/integrations/inbound/${intg.token}`;
                  const campaignName = intg.campaigns?.name || (intg.campaign_id ? "Campaign" : "None");
                  return (
                    <div key={intg.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white leading-snug">{intg.name}</h3>
                        <div className="flex gap-1 shrink-0">
                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingIntegration(intg);
                              setIntegrationName(intg.name);
                              setIntegrationCampaignId(intg.campaign_id || "");
                              setIntegrationAutoSms(intg.auto_sms);
                              setShowIntegrationModal(true);
                            }}
                            className="rounded-lg border border-zinc-600 p-1.5 text-zinc-400 hover:border-violet-500 hover:text-violet-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete "${intg.name}"? This will break any CRM sending leads to this link.`)) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              const token = session?.access_token;
                              if (!token) return;
                              const res = await fetch(`/api/integrations/${intg.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) {
                                setIntegrations(prev => prev.filter(i => i.id !== intg.id));
                              }
                            }}
                            className="rounded-lg border border-zinc-600 p-1.5 text-zinc-400 hover:border-red-500 hover:text-red-400"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex gap-4 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                          </svg>
                          Workflow: <span className="text-zinc-300">{campaignName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                          </svg>
                          Type: <span className="text-zinc-300">Workflow</span>
                        </div>
                      </div>

                      {/* Token */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Token</p>
                        <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(intg.token).then(() => {
                                setCopiedIntegrationId(`token-${intg.id}`);
                                window.setTimeout(() => setCopiedIntegrationId(null), 2000);
                              });
                            }}
                            className="shrink-0 text-zinc-400 hover:text-white"
                            title="Copy token"
                          >
                            {copiedIntegrationId === `token-${intg.id}` ? (
                              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                              </svg>
                            )}
                          </button>
                          <span className="truncate text-xs text-zinc-300 font-mono">{intg.token}</span>
                        </div>
                      </div>

                      {/* Integration link */}
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Integration Link</p>
                        <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(webhookUrl).then(() => {
                                setCopiedIntegrationId(intg.id);
                                window.setTimeout(() => setCopiedIntegrationId(null), 2000);
                              });
                            }}
                            className="shrink-0 text-zinc-400 hover:text-white"
                            title="Copy link"
                          >
                            {copiedIntegrationId === intg.id ? (
                              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                              </svg>
                            )}
                          </button>
                          <span className="truncate text-xs text-zinc-300 font-mono">{webhookUrl}</span>
                        </div>
                      </div>

                      {/* Auto SMS badge */}
                      {intg.auto_sms && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                          </svg>
                          Auto-SMS on lead receipt
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* How to use callout */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              <div className="font-medium text-zinc-300 mb-2">How to connect a lead vendor</div>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Click <span className="text-white">Create new integration</span> above and give it a name (e.g. &quot;Health leads — Vendor A&quot;)</li>
                <li>Copy the <span className="text-white">Integration Link</span> from the card</li>
                <li>Send that link to your lead vendor and ask them to post new leads to it as a webhook (every vendor&apos;s setup is slightly different — they&apos;ll know what to do with a webhook URL)</li>
                <li>Ask them to send a test lead — it will appear instantly in your Contacts</li>
              </ol>
            </div>
          </div>
        )}

        {/* ═══════════════ LEARN / TUTORIAL ═══════════════ */}
        {activeTab === "learn" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              <h1 className="text-3xl font-bold">📖 How to Use Text2Sale</h1>
              <p className="mt-2 text-zinc-400">Step-by-step guide to get you up and running. Click each section to expand.</p>
            </div>

            {/* Tutorial sections */}
            {[
              {
                id: "getting-started",
                title: "1. Getting Started",
                icon: "🚀",
                steps: [
                  {
                    title: "Subscribe to a Plan",
                    description: "Go to the Settings tab and click on 💳 Billing. Subscribe to the Text2Sale Package ($35/month) to unlock all features including sending messages, buying numbers, and adding funds.",
                    tip: "Your subscription gives you access to the platform. Message costs are separate and come from your wallet balance.",
                  },
                  {
                    title: "Add Funds to Your Wallet",
                    description: "In the 💳 Billing tab, scroll down to Add Funds. Choose a preset amount ($20, $50, $100, $250, $500) or enter a custom amount. Minimum is $20. You can also enable Auto Recharge to automatically top up when your balance gets low.",
                    tip: "Bulk discounts: $100+ gets 10% off, $500+ gets 15% off!",
                  },
                  {
                    title: "Register for 10DLC (Required)",
                    description: "Go to Settings > ✅ 10DLC and fill out the registration form with your business details (business name, EIN, address, etc.). This is required by carriers to send text messages. Your brand will be reviewed and approved, then a campaign will be created.",
                    tip: "Make sure your EIN is exactly 9 digits (XX-XXXXXXX format). Use your official business name as registered with the IRS.",
                  },
                  {
                    title: "Buy a Phone Number",
                    description: "Go to Settings > 📱 Numbers. Enter an area code (e.g., 954, 214) and search for available numbers. Click Buy to purchase a number for $1.50/month. This is the number your messages will be sent from.",
                    tip: "You can buy multiple numbers to rotate between when sending campaigns, which helps with deliverability.",
                  },
                ],
              },
              {
                id: "importing-contacts",
                title: "2. Importing Contacts",
                icon: "📋",
                steps: [
                  {
                    title: "Prepare Your CSV File",
                    description: "Create a CSV file with columns like First Name, Last Name, Phone, Email, City, State, Address, Zip. The phone number is the most important field — it should be a 10-digit US number.",
                    tip: "Make sure your CSV has headers in the first row. Common formats like 'Phone', 'phone', 'Phone Number' are all auto-detected.",
                  },
                  {
                    title: "Upload Your CSV",
                    description: "Go to the Upload CSV tab. Drag and drop your file or click to browse. The system will parse your file and show you how many leads were found.",
                    tip: "Files are processed entirely in your browser — your data never leaves until you click import.",
                  },
                  {
                    title: "Map Your Columns",
                    description: "On Step 2, match each column from your CSV to the correct contact field (First Name, Phone, Email, etc.). The system auto-detects common column names, but you can adjust the mapping manually.",
                    tip: "You must map at least one column to proceed. Phone is the most critical field for sending messages.",
                  },
                  {
                    title: "Configure & Send",
                    description: "On Step 3, toggle 'Ignore Duplicates' to skip contacts already in your list. Choose a campaign from the 'Send Campaign' dropdown to immediately send messages to the imported contacts. Add tags to organize your contacts.",
                    tip: "If you select a campaign, the button changes to 'Import & Send Campaign' and will blast all imported contacts with that campaign immediately after import.",
                  },
                ],
              },
              {
                id: "creating-campaigns",
                title: "3. Creating Campaigns",
                icon: "📢",
                steps: [
                  {
                    title: "Create a New Campaign",
                    description: "Go to the Campaigns tab. Enter a campaign name and write your message in Step 1. You can use personalization fields like {firstName}, {lastName}, {city}, {state} which get replaced with each contact's actual data.",
                    tip: "Keep your first message short and personal. Include a clear call-to-action and always mention your business name for compliance.",
                  },
                  {
                    title: "Add Follow-Up Steps",
                    description: "Click '+ Add Step' to add follow-up messages. Each step can have a delay (1 minute to 7 days). This lets you create drip sequences — e.g., initial message, then a follow-up 1 day later if they don't reply.",
                    tip: "Multi-step campaigns are powerful for follow-ups. Space them out (1-3 days between steps) to avoid overwhelming contacts.",
                  },
                  {
                    title: "Select Your Numbers",
                    description: "Choose which phone numbers to send from. If you have multiple numbers, selected numbers will rotate per message to improve deliverability. If none are selected, all your numbers will be used.",
                    tip: "Using multiple numbers helps distribute your sending volume and reduces the chance of carrier filtering.",
                  },
                  {
                    title: "Save Your Campaign",
                    description: "Click 'Save Campaign' to save your message template. Campaigns are used when you upload a CSV — you'll select the campaign from a dropdown during import, and it will blast all the new contacts.",
                    tip: "You can edit campaigns anytime by clicking the Edit button on any saved campaign.",
                  },
                ],
              },
              {
                id: "conversations",
                title: "4. Conversations & Messaging",
                icon: "💬",
                steps: [
                  {
                    title: "View Your Conversations",
                    description: "Go to the Conversations tab to see all your text conversations. The sidebar shows each contact with a preview of the last message. Unread conversations are highlighted. Click any conversation to open it.",
                    tip: "Use the search bar at the top to quickly find a specific contact by name or phone number.",
                  },
                  {
                    title: "Send Individual Messages",
                    description: "Click on a conversation to open it. Type your message in the text box at the bottom and press Enter or click Send. Messages cost $0.012 each and are deducted from your wallet balance.",
                    tip: "Press Shift+Enter for a new line without sending. Use the template button to insert saved message templates.",
                  },
                  {
                    title: "Switch Between Numbers",
                    description: "Each conversation is automatically pinned to the number it started on — you'll see a colored pill in the conversation list showing which of your lines it's on. Inside a conversation, the colored pill in the header shows (and lets you change) the number you're replying from.",
                    tip: "Useful if you have different numbers for different purposes (sales, support, etc.). You rarely need to change it manually — the app picks the right one for each thread.",
                  },
                  {
                    title: "Quick Replies & Templates",
                    description: "Go to the Templates tab to create reusable message templates. Give each template a name and message body. In conversations, click the template icon to quickly insert a saved template.",
                    tip: "Templates save time when you're sending similar messages repeatedly. Use personalization fields in templates too!",
                  },
                ],
              },
              {
                id: "contacts-management",
                title: "5. Managing Contacts",
                icon: "👥",
                steps: [
                  {
                    title: "View & Search Contacts",
                    description: "The Contacts tab shows all your contacts with their name, phone, email, tags, and status. Use the search bar to find contacts. Filter by status (Active, DNC) or by last contacted date.",
                    tip: "The contact count at the top shows total, active, and DNC (Do Not Call) numbers at a glance.",
                  },
                  {
                    title: "Add Individual Contacts",
                    description: "Click '+ Add Contact' to manually add a contact. Fill in their first name, last name, phone number, email, and any other details. The phone number is required for messaging.",
                    tip: "You can also add contacts directly from the Conversations tab when someone new texts you.",
                  },
                  {
                    title: "Bulk Actions",
                    description: "Select multiple contacts using the checkboxes, then use the bulk action dropdown to: assign them to a campaign, add/remove tags, mark as DNC, export selected, or delete them.",
                    tip: "Use 'Select All' to quickly select all visible contacts. Be careful with bulk delete — it cannot be undone!",
                  },
                  {
                    title: "DNC (Do Not Call) Management",
                    description: "When a contact replies STOP, they're automatically marked as DNC and won't receive any more messages. You can also manually toggle DNC status. Go to Settings > 🚫 Opt-Out / DNC to manage opt-out settings and keywords.",
                    tip: "DNC compliance is critical. Never message someone who has opted out — it can result in fines and carrier penalties.",
                  },
                ],
              },
              {
                id: "team-management",
                title: "6. Team Management",
                icon: "🏢",
                steps: [
                  {
                    title: "Generate Your Team Code",
                    description: "Go to Settings > 👥 Team. Your unique team code is displayed at the top. Share this code with your agents so they can join your team during signup or from their settings.",
                    tip: "As a manager, you can view your agents' dashboards, contacts, and campaigns. You can also add funds to their wallets.",
                  },
                  {
                    title: "Agent Joins Your Team",
                    description: "Your agent signs up for their own Text2Sale account, then goes to Settings > 👥 Team and enters your team code to join. Once joined, they appear in your team member list.",
                    tip: "Each agent has their own separate contacts, campaigns, and conversations. You just get oversight and can transfer funds.",
                  },
                  {
                    title: "Transfer Funds to Agents",
                    description: "In the 💳 Billing tab, scroll down to 'Transfer Funds to Agent'. Select the agent from the dropdown, enter an amount, and click Transfer. The funds move from your wallet to theirs instantly.",
                    tip: "You can also add funds directly from the Team tab by clicking on an agent and using the Add Funds button.",
                  },
                ],
              },
              {
                id: "billing-wallet",
                title: "7. Billing & Auto Recharge",
                icon: "💰",
                steps: [
                  {
                    title: "Understanding Costs",
                    description: "Standard Plan: $39.99/month. AI Plan: $59.99/month (includes all AI features). SMS messages: $0.012 each. AI-generated replies: $0.025 each. Phone numbers: $1.50/month each. All costs are deducted from your wallet balance automatically.",
                    tip: "At $0.012 per SMS, $20 gets you about 1,666 messages. AI replies cost $0.025 each — still cheaper than most competitors!",
                  },
                  {
                    title: "Auto Recharge",
                    description: "In the 💳 Billing tab, find the Auto Recharge section. Toggle it on, set a threshold (e.g., $1) and a recharge amount (minimum $20). When your balance drops below the threshold, your card on file is automatically charged.",
                    tip: "This ensures you never run out of funds mid-campaign. Set the threshold to at least $1 and recharge to $50+ for peace of mind.",
                  },
                  {
                    title: "Usage History",
                    description: "Scroll down on the Billing tab to see your complete usage history — every charge, top-up, auto recharge, and transfer is logged with the date, amount, and status.",
                    tip: "Use the filter to search for specific transaction types. Export your history for accounting purposes.",
                  },
                ],
              },
              {
                id: "ai-features",
                title: "8. AI Auto-Reply & Full AI Mode",
                icon: "🤖",
                steps: [
                  {
                    title: "Activate the AI Plan",
                    description: "Go to Settings > 🤖 AI and click 'Activate AI Plan'. You'll be asked to select your industry (Health Insurance, Life Insurance, Real Estate, etc.). The AI is trained as a top producer in your industry — it knows how to handle objections, rebuttals, and close deals using proven sales frameworks like SPIN Selling and the Sandler Method.",
                    tip: "The AI plan costs $59.99/month. Each AI-generated reply costs $0.025 from your wallet (regular SMS is $0.012).",
                  },
                  {
                    title: "Per-Conversation AI (AI Button)",
                    description: "In any conversation, click the violet 'AI' button in the header. This turns on AI auto-reply for JUST that one conversation. The AI will automatically respond to incoming messages in that thread only. Great for handling individual leads while you manually manage others.",
                    tip: "Use this when you upload a CSV and want the AI to handle replies from specific contacts while you focus on warm leads.",
                  },
                  {
                    title: "Full AI Mode (Full AI Button)",
                    description: "Click the cyan 'Full AI' button in the conversation header to turn on auto-reply for ALL conversations. Every incoming message across every conversation will get an AI response. This is the 'set it and forget it' mode.",
                    tip: "Full AI mode is perfect for after-hours coverage or when you're running large campaigns and want every reply handled instantly.",
                  },
                  {
                    title: "AI Reply Button (Manual)",
                    description: "Even with auto-reply off, you can click the 'AI Reply' button in the composer area to generate a one-time AI suggested reply. Review it, edit if needed, then send. Great for getting help crafting the perfect response.",
                    tip: "The AI reads the full conversation history and your contact's info to craft personalized, context-aware replies.",
                  },
                  {
                    title: "Custom AI Instructions",
                    description: "Go to Settings > 🤖 AI > AI Instructions to customize how the AI responds. Tell it your name, what you sell, your style, and any specific rules. Example: 'Always try to book a phone call. Be friendly but professional. My hours are Mon-Fri 9am-6pm.'",
                    tip: "The more context you give the AI, the better it performs. Include your unique selling points, common objections you face, and your preferred closing style.",
                  },
                  {
                    title: "Change Your Industry",
                    description: "In Settings > 🤖 AI, use the 'Your Industry' dropdown to change your industry at any time. The AI instantly adapts its knowledge, objection handling, and selling tactics to match your new industry.",
                    tip: "Each industry has specialized knowledge — health insurance AI knows about ACA plans, enrollment periods, and subsidies; real estate AI knows about listings, open houses, and mortgage pre-approval.",
                  },
                ],
              },
              {
                id: "appointments",
                title: "9. Appointments & Calendar",
                icon: "📅",
                steps: [
                  {
                    title: "AI Appointment Booking",
                    description: "When AI is enabled and a customer asks to schedule a call or meeting, the AI automatically checks your available hours and books an appointment. It confirms the date and time with the customer via text.",
                    tip: "Set your available hours in Settings > 🤖 AI > Available Hours. Toggle each day on/off and set your start/end times.",
                  },
                  {
                    title: "View & Manage Appointments",
                    description: "Go to the Appointments tab to see all your upcoming, past, and cancelled appointments. You can mark appointments as Completed, No Show, or Cancel them.",
                    tip: "Appointments booked by AI are automatically set to 'confirmed' status. You'll see the contact name, date, time, and title.",
                  },
                  {
                    title: "Google Calendar Integration",
                    description: "Connect your Google Calendar in Settings > 🤖 AI > Google Calendar Integration. Once connected, every appointment booked by the AI (or manually) automatically appears on your Google Calendar.",
                    tip: "You'll need a Google account. Click 'Connect Google Calendar', authorize access, and you're done. Disconnect anytime.",
                  },
                  {
                    title: "Appointment Reminders",
                    description: "Text2Sale automatically sends a reminder text to the customer 24 hours before their appointment. The reminder includes their name, appointment time, and a customizable message.",
                    tip: "Reminders cost $0.012 each (regular SMS rate) and are charged from your wallet. They help reduce no-shows significantly.",
                  },
                ],
              },
              {
                id: "tags",
                title: "10. Tags & Organization",
                icon: "🏷️",
                steps: [
                  {
                    title: "Create Tags",
                    description: "Go to the Contacts tab and click the '🏷️ Manage Tags' section. Create tags like 'Sold', 'Appointment', 'Follow-Up', 'Hot Lead', etc. Pick a color for each tag to make them visually distinct.",
                    tip: "Tags help you organize and filter contacts. Use consistent naming — 'Hot Lead' is better than 'hot', 'Hot!', 'HOT LEAD' etc.",
                  },
                  {
                    title: "Tag Contacts",
                    description: "On each contact's row, click the '+' button to add tags. You can also bulk-tag contacts by selecting multiple and using the bulk actions dropdown. Tags appear as colored chips on each contact.",
                    tip: "Combine tags with search to quickly find contacts — e.g., search by tag 'Hot Lead' to see all your hottest prospects.",
                  },
                ],
              },
              {
                id: "suggestions",
                title: "11. Feature Suggestions",
                icon: "💡",
                steps: [
                  {
                    title: "Submit Ideas",
                    description: "Go to Settings > 💡 Suggestions to submit feature ideas, improvement requests, or bug reports. Pick a category, describe your idea, and submit. Our team reads every suggestion.",
                    tip: "The more detail you provide, the better we can understand and build what you need. Popular requests get prioritized!",
                  },
                ],
              },
              {
                id: "compliance",
                title: "12. Compliance & Best Practices",
                icon: "✅",
                steps: [
                  {
                    title: "10DLC Registration",
                    description: "10DLC (10-digit long code) registration is required by all US carriers. You register your brand (business) and campaign (use case) through Telnyx. This process takes 1-5 business days for approval.",
                    tip: "Without 10DLC registration, your messages will be filtered or blocked by carriers. Always register before sending.",
                  },
                  {
                    title: "Opt-In Consent",
                    description: "You must have consent from every contact before messaging them. This means they filled out a form, signed up on your website, or otherwise gave you permission to text them. Keep records of consent.",
                    tip: "Add an opt-in form on your website with clear disclosure language about what messages they'll receive and how to opt out.",
                  },
                  {
                    title: "Required Message Elements",
                    description: "Every campaign should include: your business name, what the message is about, and how to opt out (reply STOP). For the first message to a new contact, always include all three.",
                    tip: "Example: 'Hi {firstName}, this is Jamie from Text2Sale. I wanted to reach out about... Reply STOP to opt out.'",
                  },
                  {
                    title: "Handling Opt-Outs",
                    description: "When someone replies STOP, UNSUBSCRIBE, CANCEL, END, or QUIT, Text2Sale automatically marks them as DNC and sends a confirmation. They will not receive any more messages from you.",
                    tip: "Never manually remove someone's DNC status unless they explicitly re-opt in. Violating opt-out requests can result in legal action.",
                  },
                ],
              },
            ].map((section) => (
              <div key={section.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <button
                  onClick={() => setLearnSection(learnSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-800/50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{section.icon}</span>
                    <h2 className="text-xl font-bold">{section.title}</h2>
                  </div>
                  <span className={`text-2xl text-zinc-500 transition-transform ${learnSection === section.id ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>

                {learnSection === section.id && (
                  <div className="border-t border-zinc-800 p-6 space-y-6">
                    {section.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">
                            {idx + 1}
                          </div>
                          {idx < section.steps.length - 1 && (
                            <div className="mt-2 w-0.5 flex-1 bg-zinc-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <h3 className="text-lg font-semibold">{step.title}</h3>
                          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                          {step.tip && (
                            <div className="mt-3 rounded-xl bg-violet-950/30 border border-violet-800/30 px-4 py-3 text-xs text-violet-300">
                              💡 <span className="font-semibold">Tip:</span> {step.tip}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Links */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => { setActiveTab("settings"); setSettingsSubTab("billing"); }}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left hover:border-violet-600 transition"
                >
                  <span className="text-2xl">💳</span>
                  <div>
                    <div className="font-medium">Add Funds</div>
                    <div className="text-xs text-zinc-500">Top up your wallet</div>
                  </div>
                </button>
                <button
                  onClick={() => { setActiveTab("settings"); setSettingsSubTab("numbers"); }}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left hover:border-violet-600 transition"
                >
                  <span className="text-2xl">📱</span>
                  <div>
                    <div className="font-medium">Buy Number</div>
                    <div className="text-xs text-zinc-500">Get a sending number</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("campaigns")}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left hover:border-violet-600 transition"
                >
                  <span className="text-2xl">📢</span>
                  <div>
                    <div className="font-medium">Create Campaign</div>
                    <div className="text-xs text-zinc-500">Write your message</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-left hover:border-violet-600 transition"
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <div className="font-medium">Upload CSV</div>
                    <div className="text-xs text-zinc-500">Import & send</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Schedule Follow-up Modal ──
          Lightweight "drop an event on my calendar for this lead" flow.
          Intentionally thinner than the appointments booking: no conflict
          check, no appointment row — just a Google Calendar event. */}
      {showFollowUpModal && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Schedule Follow-up</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Adds a reminder event to your Google Calendar for{" "}
              <span className="text-emerald-300">
                {selectedContact?.firstName || "this lead"}
                {selectedContact?.lastName ? ` ${selectedContact.lastName}` : ""}
              </span>.
            </p>
            <div className="mt-5 grid gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Time</label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Title (optional)</label>
                <input
                  type="text"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder={`Follow-up — ${selectedContact?.firstName || "lead"}`}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            {followUpError && (
              <div className="mt-4 rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-200">
                {followUpError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFollowUpModal(false);
                  setFollowUpError("");
                }}
                className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={!followUpDate || !followUpTime || followUpSubmitting}
                onClick={async () => {
                  if (!selectedConversation || !followUpDate || !followUpTime) return;
                  setFollowUpSubmitting(true);
                  setFollowUpError("");
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    if (!token) {
                      setFollowUpError("Please sign in again to schedule.");
                      return;
                    }
                    const res = await fetch("/api/google-calendar/create-event", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        contactId: selectedConversation.contactId,
                        date: followUpDate,
                        time: followUpTime,
                        title: followUpTitle.trim() || undefined,
                        duration: 30,
                        // Send the browser's IANA zone so Google writes
                        // the event at the wall-clock time the rep
                        // picked. Without this the server treated it
                        // as UTC and EDT picks landed 4 hours early.
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok || !data.success) {
                      if (data?.code === "not_connected") {
                        setFollowUpError(
                          "Google Calendar isn't connected yet. Open Settings → AI & Automation and click Connect Google Calendar."
                        );
                      } else {
                        setFollowUpError(
                          data?.error || `Failed to schedule follow-up (HTTP ${res.status}).`
                        );
                      }
                      return;
                    }
                    setShowFollowUpModal(false);
                    setFollowUpError("");
                    setMessage("✅ Follow-up added to your Google Calendar");
                    window.setTimeout(() => setMessage(""), 3000);
                  } catch (err) {
                    const m = err instanceof Error ? err.message : "Failed to schedule";
                    setFollowUpError(m);
                  } finally {
                    setFollowUpSubmitting(false);
                  }
                }}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {followUpSubmitting ? "Scheduling…" : "Add to Calendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Integration Create / Edit Modal ── */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingIntegration ? "Edit Integration" : "Add Integration"}
              </h3>
              <button onClick={() => setShowIntegrationModal(false)} className="text-zinc-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Name</label>
                <input
                  type="text"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                  placeholder="e.g. Health leads — Vendor A"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Workflow / Campaign */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Select Workflow <span className="text-zinc-500 font-normal">(optional — auto-enroll leads)</span>
                </label>
                <select
                  value={integrationCampaignId}
                  onChange={(e) => setIntegrationCampaignId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Auto SMS toggle */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Auto-SMS on lead receipt</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Immediately send an intro text when a lead comes in</p>
                </div>
                <button
                  onClick={() => setIntegrationAutoSms(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${integrationAutoSms ? "bg-violet-600" : "bg-zinc-600"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${integrationAutoSms ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowIntegrationModal(false)}
                className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={!integrationName.trim() || integrationSaving}
                onClick={async () => {
                  setIntegrationSaving(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    if (!token) return;

                    const payload = {
                      name: integrationName.trim(),
                      campaign_id: integrationCampaignId || null,
                      auto_sms: integrationAutoSms,
                    };

                    if (editingIntegration) {
                      // Update
                      const res = await fetch(`/api/integrations/${editingIntegration.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        setIntegrations(prev => prev.map(i => i.id === editingIntegration.id ? { ...i, ...json.integration } : i));
                        setShowIntegrationModal(false);
                      }
                    } else {
                      // Create
                      const res = await fetch("/api/integrations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        // Re-fetch to get campaign name joined
                        const listRes = await fetch("/api/integrations", {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (listRes.ok) {
                          const listJson = await listRes.json();
                          setIntegrations(listJson.integrations || []);
                        } else {
                          setIntegrations(prev => [json.integration, ...prev]);
                        }
                        setShowIntegrationModal(false);
                      }
                    }
                  } finally {
                    setIntegrationSaving(false);
                  }
                }}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {integrationSaving ? "Saving…" : editingIntegration ? "Save changes" : "Add Integration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Message Modal ── */}
      {/* ── Add to Workflow Modal ── */}
      {showAddToWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold">Add to Workflow</h3>
                {workflowBulkMode && selectedConvIds.size > 0 && (
                  <p className="mt-0.5 text-xs text-violet-300">
                    {selectedConvIds.size} contact{selectedConvIds.size === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowAddToWorkflow(false); setWorkflowBulkMode(false); }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Select an active workflow</label>
                <select
                  value={workflowCampaignId}
                  onChange={(e) => setWorkflowCampaignId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="">Choose a workflow...</option>
                  {campaigns.map((c) => {
                    const stepCount = (c.steps && c.steps.length > 0) ? c.steps.length : 1;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — {stepCount} step{stepCount === 1 ? "" : "s"}
                      </option>
                    );
                  })}
                </select>
                {campaigns.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    You don&apos;t have any campaigns yet. Create one in the Campaigns tab first.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setWorkflowUseCurrentNumber((v) => !v)}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    workflowUseCurrentNumber ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      workflowUseCurrentNumber ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
                <span className="text-zinc-200">Use current number</span>
              </button>
              <p className="-mt-3 text-xs text-zinc-500">
                {workflowUseCurrentNumber
                  ? "Follow-ups go out from the same number this conversation is already on."
                  : "Follow-ups use the workflow's default from number."}
              </p>

              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-xs text-violet-200">
                {workflowBulkMode
                  ? "The drip stops automatically for each contact the moment they text you back."
                  : "The drip stops automatically the moment this lead texts you back."}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-950/60 px-6 py-4">
              <button
                onClick={() => { setShowAddToWorkflow(false); setWorkflowBulkMode(false); }}
                className="rounded-2xl border border-zinc-700 px-5 py-2.5 text-sm hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToWorkflow}
                disabled={!workflowCampaignId || workflowSaving}
                className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {workflowSaving
                  ? "Saving..."
                  : workflowBulkMode
                    ? `Save (${selectedConvIds.size})`
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Schedule Message</h3>
            <p className="text-sm text-zinc-400 mb-4">
              {composerText.trim() ? `"${composerText.slice(0, 60)}${composerText.length > 60 ? "..." : ""}"` : "Type your message first, then schedule."}
            </p>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setShowScheduleModal(false)}
                className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm hover:bg-zinc-800">Cancel</button>
              <button onClick={handleScheduleMessage} disabled={!composerText.trim() || !scheduleDate || !scheduleTime}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Manager Modal ── */}
      {showTemplateManager && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Message Templates</h3>
              <button onClick={() => setShowTemplateManager(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">Close</button>
            </div>

            <div className="mb-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <h4 className="text-sm font-semibold text-zinc-300">Create New Template</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Template name"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none" />
                <select value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none">
                  <option value="general">General</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="marketing">Marketing</option>
                  <option value="appointment">Appointment</option>
                  <option value="greeting">Greeting</option>
                </select>
              </div>
              <textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} rows={3}
                placeholder="Template body... Use {firstName}, {lastName}, etc."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 focus:border-violet-500 focus:outline-none" />
              <button onClick={handleSaveTemplate} disabled={!newTemplateName.trim() || !newTemplateBody.trim()}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50">Save Template</button>
            </div>

            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-zinc-500">No saved templates yet.</p>
              ) : templates.map((tpl) => (
                <div key={tpl.id} className="flex items-start justify-between rounded-xl bg-zinc-800 p-4">
                  <div className="flex-1 mr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tpl.name}</span>
                      <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">{tpl.category}</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">{tpl.body}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { handleUseTemplate(tpl.body); setShowTemplateManager(false); }}
                      className="rounded-lg bg-violet-600/30 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-600/50">Use</button>
                    <button onClick={() => handleDeleteTemplate(tpl.id)}
                      className="rounded-lg bg-red-600/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-600/50">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Detail Modal ── */}
      {viewContact && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{viewContact.firstName} {viewContact.lastName}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    viewContact.dnc ? "bg-red-900 text-red-300" : "bg-emerald-900 text-emerald-300"
                  }`}>
                    {viewContact.dnc ? "DNC" : "Active"}
                  </span>
                  {viewContact.campaign && (
                    <span className="rounded-full bg-violet-900/50 px-3 py-0.5 text-xs text-violet-300">
                      {viewContact.campaign}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setViewContactId(null); setNewTagInput(""); }}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">First Name</label>
                <input
                  value={viewContact.firstName || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "firstName", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Last Name</label>
                <input
                  value={viewContact.lastName || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "lastName", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Phone</label>
                <input
                  value={viewContact.phone || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "phone", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Email</label>
                <input
                  value={viewContact.email || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "email", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Address</label>
                <input
                  value={viewContact.address || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "address", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">City</label>
                <input
                  value={viewContact.city || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "city", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">State</label>
                <input
                  value={viewContact.state || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "state", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Zip Code</label>
                <input
                  value={viewContact.zip || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "zip", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Lead Source</label>
                <input
                  value={viewContact.leadSource || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "leadSource", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Date of Birth</label>
                <input
                  value={viewContact.dateOfBirth || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "dateOfBirth", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Age</label>
                <input
                  value={viewContact.age || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "age", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Household Size</label>
                <input
                  value={viewContact.householdSize || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "householdSize", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Timeline</label>
                <input
                  value={viewContact.timeline || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "timeline", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Quote</label>
                <input
                  value={viewContact.quote || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "quote", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Policy ID</label>
                <input
                  value={viewContact.policyId || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "policyId", e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Campaign</label>
                <select
                  value={viewContact.campaign || ""}
                  onChange={(e) => handleAssignCampaign(viewContact.id, e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                >
                  <option value="">None</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Tags</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {(viewContact.tags || []).map((tag, idx) => {
                    const style = getTagStyle(tag);
                    return (
                      <span
                        key={`${tag}-${idx}`}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                        {tag}
                        <button
                          onClick={async () => {
                            const newTags = (viewContact.tags || []).filter((_, i) => i !== idx);
                            await handleUpdateContactField(viewContact.id, "tags", newTags);
                          }}
                          className={`ml-0.5 ${style.text} hover:text-red-300`}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                  {(viewContact.tags || []).length === 0 && (
                    <span className="text-xs text-zinc-500">No tags</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && newTagInput.trim()) {
                        e.preventDefault();
                        const tag = newTagInput.trim();
                        if ((viewContact.tags || []).includes(tag)) { setNewTagInput(""); return; }
                        await handleUpdateContactField(viewContact.id, "tags", [...(viewContact.tags || []), tag]);
                        setNewTagInput("");
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                    className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm"
                    list="modal-existing-tags"
                  />
                  <datalist id="modal-existing-tags">
                    {allTags.filter((t) => !(viewContact.tags || []).includes(t)).map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <button
                    onClick={async () => {
                      if (!newTagInput.trim()) return;
                      const tag = newTagInput.trim();
                      if ((viewContact.tags || []).includes(tag)) { setNewTagInput(""); return; }
                      await handleUpdateContactField(viewContact.id, "tags", [...(viewContact.tags || []), tag]);
                      setNewTagInput("");
                    }}
                    className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm hover:bg-violet-700"
                  >
                    Add
                  </button>
                </div>
                {allTags.filter((t) => !(viewContact.tags || []).includes(t)).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {allTags.filter((t) => !(viewContact.tags || []).includes(t)).slice(0, 10).map((tag) => {
                      const style = getTagStyle(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleUpdateContactField(viewContact.id, "tags", [...(viewContact.tags || []), tag])}
                          className={`inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] text-zinc-400 hover:${style.bg} hover:${style.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          + {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Notes</label>
                <textarea
                  value={viewContact.notes || ""}
                  onChange={(e) => handleUpdateContactField(viewContact.id, "notes", e.target.value)}
                  className="h-28 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5">
              <div className="flex gap-3">
                <button
                  onClick={() => handleToggleDNC(viewContact.id)}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-medium ${
                    viewContact.dnc
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {viewContact.dnc ? "Remove from DNC" : "Mark as DNC"}
                </button>
                <button
                  onClick={() => { handleDeleteContact(viewContact.id); setViewContactId(null); }}
                  className="rounded-2xl border border-red-700 px-5 py-2.5 text-sm text-red-300 hover:bg-red-900/30"
                >
                  Delete Contact
                </button>
              </div>
              <button
                onClick={() => { setViewContactId(null); setNewTagInput(""); }}
                className="rounded-2xl border border-zinc-700 px-6 py-2.5 text-sm hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Schedule Modal */}
      {scheduleCampaignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
            <h3 className="mb-2 text-xl font-bold">Schedule Campaign</h3>
            <p className="mb-6 text-sm text-zinc-400">
              {campaigns.find((c) => c.id === scheduleCampaignId)?.name || "Campaign"} will automatically launch at the scheduled time.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Date</label>
                <input type="date" value={campaignScheduleDate} onChange={(e) => setCampaignScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Time</label>
                <input type="time" value={campaignScheduleTime} onChange={(e) => setCampaignScheduleTime(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm" />
              </div>
              {campaignScheduleDate && campaignScheduleTime && (
                <div className="rounded-2xl bg-sky-950/30 border border-sky-800/40 px-4 py-3 text-sm text-sky-300">
                  Will launch: {new Date(`${campaignScheduleDate}T${campaignScheduleTime}`).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setScheduleCampaignId(null)} className="flex-1 rounded-2xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800">Cancel</button>
              <button onClick={handleScheduleCampaign} className="flex-1 rounded-2xl bg-sky-600 py-3 text-sm font-semibold hover:bg-sky-700">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
            {/* Progress bar */}
            <div className="mb-6 flex gap-2">
              {["Subscribe", "Buy Number", "Import Contacts", "Send First Campaign"].map((label, i) => (
                <div key={label} className="flex-1">
                  <div className={`h-1.5 rounded-full transition ${i <= onboardingStep ? "bg-violet-500" : "bg-zinc-700"}`} />
                  <div className={`mt-1.5 text-center text-[10px] ${i <= onboardingStep ? "text-violet-400" : "text-zinc-600"}`}>{label}</div>
                </div>
              ))}
            </div>

            {/* Step 0 — Subscribe */}
            {onboardingStep === 0 && (
              <div className="text-center">
                <div className="mb-2 text-3xl">🚀</div>
                <h3 className="mb-2 text-xl font-bold">Welcome to Text2Sale!</h3>
                <p className="mb-6 text-sm text-zinc-400">Start with a subscription to unlock all messaging features.</p>
                <button
                  onClick={() => { handleSubscribe(); setShowOnboarding(false); }}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-700"
                >
                  Subscribe — ${currentUser.plan.price}/mo
                </button>
                <button onClick={() => setShowOnboarding(false)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                  Skip for now
                </button>
              </div>
            )}

            {/* Step 1 — EIN / 10DLC (informational) */}
            {onboardingStep === 1 && (
              <div className="text-center">
                <div className="mb-2 text-3xl">📋</div>
                <h3 className="mb-2 text-xl font-bold">Register Your Business</h3>
                <p className="mb-6 text-sm text-zinc-400">Register your brand with your EIN for higher sending limits. You can do this from the 10DLC tab anytime.</p>
                <button
                  onClick={() => { setActiveTab("settings"); setSettingsSubTab("10dlc"); setShowOnboarding(false); }}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-700"
                >
                  Go to 10DLC Registration
                </button>
                <button onClick={() => setOnboardingStep(2)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                  Skip — do this later
                </button>
              </div>
            )}

            {/* Step 2 — Buy a Number */}
            {onboardingStep === 2 && (
              <div className="text-center">
                <div className="mb-2 text-3xl">📱</div>
                <h3 className="mb-2 text-xl font-bold">Buy a Phone Number</h3>
                <p className="mb-6 text-sm text-zinc-400">You need at least one phone number to send messages. Numbers cost $1.50 to purchase + $1/mo.</p>
                <button
                  onClick={() => { setActiveTab("settings"); setSettingsSubTab("numbers"); setShowOnboarding(false); }}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-700"
                >
                  Buy a Number
                </button>
                <button onClick={() => setOnboardingStep(3)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                  Skip — do this later
                </button>
              </div>
            )}

            {/* Step 3 — Import Contacts */}
            {onboardingStep === 3 && (
              <div className="text-center">
                <div className="mb-2 text-3xl">👥</div>
                <h3 className="mb-2 text-xl font-bold">Import Your Contacts</h3>
                <p className="mb-6 text-sm text-zinc-400">Upload a CSV with your contacts or add them manually from the Contacts tab.</p>
                <button
                  onClick={() => { setActiveTab("contacts"); setShowOnboarding(false); }}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-700"
                >
                  Import Contacts
                </button>
                <button onClick={() => setOnboardingStep(4)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                  Skip — do this later
                </button>
              </div>
            )}

            {/* Step 4 — Send First Campaign */}
            {onboardingStep === 4 && (
              <div className="text-center">
                <div className="mb-2 text-3xl">🎯</div>
                <h3 className="mb-2 text-xl font-bold">Launch Your First Campaign</h3>
                <p className="mb-6 text-sm text-zinc-400">Create a campaign, pick your contacts, write your message, and hit send!</p>
                <button
                  onClick={() => { setActiveTab("campaigns"); setShowOnboarding(false); }}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold hover:bg-violet-700"
                >
                  Create a Campaign
                </button>
                <button onClick={() => setShowOnboarding(false)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
                  Close — I'll explore on my own
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        // z-[60] so the toast floats above modal overlays (which live at z-50).
        // Previously z-40 meant errors fired from inside a modal were hidden
        // behind the overlay and the action looked like it did nothing.
        <div className={`fixed bottom-8 left-8 rounded-2xl px-6 py-4 shadow-2xl text-sm font-medium z-[60] transition-all ${
          message.startsWith("❌")
            ? "bg-red-950 text-red-200 ring-1 ring-red-800"
            : message.startsWith("🌙")
              ? "bg-amber-950 text-amber-200 ring-1 ring-amber-800"
              : "bg-emerald-950 text-emerald-200 ring-1 ring-emerald-800"
        }`}>
          {message}
        </div>
      )}

      {/* ── New Lead Notification ── */}
      {leadNotification && (() => {
        // Auto-dismiss after 6 seconds
        window.setTimeout(() => setLeadNotification(null), 6000);
        return (
          <div
            className="fixed bottom-8 left-8 z-[60] flex items-center gap-3 rounded-2xl bg-violet-900 px-5 py-4 shadow-2xl ring-1 ring-violet-500/50 cursor-pointer"
            onClick={() => { setActiveTab("contacts"); setLeadNotification(null); }}
          >
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-white">{leadNotification}</p>
              <p className="text-xs text-violet-300 mt-0.5">Click to view in Contacts</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setLeadNotification(null); }}
              className="ml-2 text-violet-400 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })()}

      {/* ── Support Chat Widget ── */}
      {!impersonating && (
        <>
          {/* Chat Window */}
          {chatOpen && (() => {
            // Group messages by calendar day so it reads like a real chat
            // history, not a flat list of "hello"s. Each day gets a divider.
            const groups: { label: string; msgs: typeof chatMessages }[] = [];
            const dayLabel = (iso: string) => {
              const d = new Date(iso);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
              if (d.toDateString() === now.toDateString()) return "Today";
              const y = new Date(now); y.setDate(now.getDate() - 1);
              if (d.toDateString() === y.toDateString()) return "Yesterday";
              if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
              return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
            };
            for (const m of chatMessages) {
              const label = dayLabel(m.created_at);
              const last = groups[groups.length - 1];
              if (last && last.label === label) last.msgs.push(m);
              else groups.push({ label, msgs: [m] });
            }
            return (
              <div className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl" style={{ height: "560px" }}>
                {/* Gradient Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-4">
                  {/* Animated blobs */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-fuchsia-400/40 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-400/40 blur-2xl" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg shadow-lg ring-2 ring-white/30 backdrop-blur">
                          💬
                        </div>
                        {/* Online indicator */}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-violet-600" />
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-white">TextAlot Support</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-violet-100/90">
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Online • Replies within minutes
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setChatOpen(false); setChatUnread(0); }}
                      className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                      title="Close"
                      aria-label="Close chat"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950 to-zinc-900/80 p-4">
                  {chatMessages.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-3xl ring-1 ring-violet-500/40">
                        👋
                      </div>
                      <div className="text-sm font-semibold text-white">Hi there! How can we help?</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Ask about billing, campaigns, 10DLC — anything. A real human replies, usually in minutes.
                      </div>
                      {/* Quick-ask chips */}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {[
                          "How do I add credits?",
                          "10DLC status?",
                          "Cancel subscription",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatInput(q)}
                            className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-white"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groups.map((g, gi) => (
                        <div key={`${g.label}-${gi}`} className="space-y-2">
                          <div className="my-2 flex items-center gap-2">
                            <span className="h-px flex-1 bg-zinc-800" />
                            <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                              {g.label}
                            </span>
                            <span className="h-px flex-1 bg-zinc-800" />
                          </div>
                          {g.msgs.map((msg, i) => {
                            const isUser = msg.sender_role === "user";
                            const prev = g.msgs[i - 1];
                            const stacked = prev && prev.sender_role === msg.sender_role;
                            return (
                              <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                                {!isUser && !stacked && (
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-bold text-white ring-2 ring-zinc-950">
                                    S
                                  </div>
                                )}
                                {!isUser && stacked && <div className="w-7 shrink-0" />}
                                <div className="max-w-[78%]">
                                  <div
                                    className={`px-3.5 py-2 text-sm leading-snug shadow-sm ${
                                      isUser
                                        ? "rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                                        : "rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-800/90 text-zinc-100"
                                    }`}
                                  >
                                    {msg.message}
                                  </div>
                                  <div className={`mt-0.5 px-1 text-[10px] ${isUser ? "text-right text-zinc-500" : "text-left text-zinc-500"}`}>
                                    {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 focus-within:border-violet-500">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent py-1 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={!chatInput.trim()}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                        chatInput.trim()
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:brightness-110"
                          : "bg-zinc-800 text-zinc-600"
                      }`}
                      title="Send"
                      aria-label="Send"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1.5 px-1 text-center text-[10px] text-zinc-600">
                    Powered by TextAlot · your messages are private
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Floating Chat Button */}
          <button
            onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) setChatUnread(0); }}
            className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 ${
              chatOpen
                ? "bg-zinc-800 text-white ring-1 ring-zinc-700"
                : "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-violet-500/50"
            }`}
            title={chatOpen ? "Close chat" : "Open support chat"}
            aria-label={chatOpen ? "Close chat" : "Open support chat"}
          >
            {chatOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <>
                <span className="text-2xl">💬</span>
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-zinc-950">
                    {chatUnread}
                  </span>
                )}
                {/* Ambient pulse */}
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-violet-400/30" />
              </>
            )}
          </button>
        </>
      )}

      {/* Command palette (⌘K) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
      />

      {/* Toast notifications — replaces the legacy bottom banner */}
      <Toasts message={message} />
    </main>
  );
}

// ═══════════════════════ BIZ PAGE EDITOR ═══════════════════════
function BizPageEditor({
  slug: initialSlug,
  description: initialDescription,
  logoUrl: initialLogoUrl,
  onSave,
}: {
  slug: string;
  description: string;
  logoUrl: string;
  onSave: (updates: { slug: string; description: string; logoUrl: string }) => Promise<void>;
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const previewUrl = normalizedSlug ? `/biz/${normalizedSlug}` : "";

  const handleSave = async () => {
    setLocalError("");
    if (slug && !normalizedSlug) {
      setLocalError("Slug must contain letters, numbers, or hyphens.");
      return;
    }
    if (normalizedSlug.length > 0 && normalizedSlug.length < 3) {
      setLocalError("Slug must be at least 3 characters.");
      return;
    }
    if (description.length > 500) {
      setLocalError("Description must be 500 characters or fewer.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ slug: normalizedSlug, description: description.trim(), logoUrl: logoUrl.trim() });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">🌐 Your Business Page</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Text2Sale hosts a free public landing page at{" "}
          <code className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-violet-300">text2sale.com/biz/your-slug</code>{" "}
          with an SMS opt-in form. Use this for ads, Instagram bios, QR codes — anywhere you collect leads.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Page Slug</label>
            <div className="flex items-center gap-2">
              <span className="rounded-l-2xl border border-r-0 border-zinc-700 bg-zinc-800/60 px-3 py-3 text-sm text-zinc-500">text2sale.com/biz/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="your-business"
                className="flex-1 rounded-r-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            {normalizedSlug && slug !== normalizedSlug && (
              <p className="mt-1 text-xs text-zinc-500">Will be saved as: <span className="text-violet-400">{normalizedSlug}</span></p>
            )}
            {previewUrl && (
              <p className="mt-2 text-xs text-zinc-500">
                Preview:{" "}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  text2sale.com{previewUrl}
                </a>
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Business Description
              <span className="ml-2 text-xs text-zinc-500">({description.length}/500)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Describe what your business does in 1-2 sentences. This shows on your page and in search results."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Logo URL (optional)</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
            />
            <p className="mt-1 text-xs text-zinc-500">Paste a public URL to your logo. Leave blank if you don&apos;t have one yet.</p>
          </div>

          {localError && (
            <div className="rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {localError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white transition"
              >
                View Live Page ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EIN Certificate Upload ──
function EinCertificateUpload({
  userId,
  certificate,
  onUploaded,
}: {
  userId: string | null;
  certificate: { path: string | null; name: string | null; uploadedAt: string | null } | null;
  onUploaded: (info: { path: string; name: string; type: string; uploadedAt: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!userId) {
      setError("Please wait a moment and try again.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("file", file);
      const res = await authFetch("/api/upload-ein-certificate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Upload failed.");
      } else {
        onUploaded({ path: json.path, name: json.name, type: json.type, uploadedAt: json.uploadedAt });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!userId) return;
    try {
      const res = await authFetch("/api/ein-certificate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, requestingUserId: userId }),
      });
      const json = await res.json();
      if (json.success && json.url) {
        window.open(json.url, "_blank");
      }
    } catch {
      /* ignore */
    }
  };

  const hasCert = !!certificate?.path;

  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-800/60 p-4">
      {hasCert && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-zinc-800 px-3 py-2 text-sm">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-emerald-400">📄</span>
            <div className="min-w-0">
              <div className="truncate text-zinc-200">{certificate?.name}</div>
              {certificate?.uploadedAt && (
                <div className="text-xs text-zinc-500">
                  Uploaded {new Date(certificate.uploadedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="shrink-0 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-600"
          >
            View / Download
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          disabled={uploading}
          className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700 file:cursor-pointer"
        />
        {uploading && <span className="text-xs text-zinc-400">Uploading...</span>}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {hasCert
          ? "Uploading a new file will replace the existing one. "
          : ""}
        PDF, PNG, JPG, or WebP · Max 10MB
      </p>

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}