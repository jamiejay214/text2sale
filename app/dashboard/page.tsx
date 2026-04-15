"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { logoutUser } from "@/lib/auth";
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
  fetchTemplates, insertTemplate, deleteTemplate,
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
  messages: ConversationMessage[];
};

type DashboardTab = "overview" | "conversations" | "campaigns" | "contacts" | "upload" | "templates" | "settings" | "learn";
type SettingsSubTab = "numbers" | "billing" | "opt-out" | "activity" | "team" | "10dlc" | "biz-page";

type CSVUploadRecord = {
  id: string;
  fileName: string;
  date: string;
  totalRows: number;
  success: number;
  duplicates: number;
  invalid: number;
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
type NewCampaignForm = { name: string; steps: CampaignStep[]; selectedNumbers: string[] };
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

function convToRecord(c: Conversation, msgs: ConversationMessage[]): ConversationRecord {
  return {
    id: c.id, contactId: c.contact_id, preview: c.preview,
    unread: c.unread, lastMessageAt: c.last_message_at,
    starred: c.starred, fromNumber: c.from_number, messages: msgs,
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
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>({
    name: "",
    steps: [{ id: `step_${Date.now()}`, message: "", delayMinutes: 0 }],
    selectedNumbers: [],
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
  const csvUploadRef = useRef<HTMLInputElement>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editCampaignForm, setEditCampaignForm] = useState<NewCampaignForm>({ name: "", steps: [], selectedNumbers: [] });
  const [editStepIndex, setEditStepIndex] = useState(0);
  const [numberSearch, setNumberSearch] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [showConvContactPanel, setShowConvContactPanel] = useState(false);
  const [convShowArchived, setConvShowArchived] = useState(false);
  const [convShowAll, setConvShowAll] = useState(false);
  const [archivedConvIds, setArchivedConvIds] = useState<Set<string>>(new Set());
  const [convSelectMode, setConvSelectMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [composerText, setComposerText] = useState("");
  const [convFromNumber, setConvFromNumber] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
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
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Scheduled messages state
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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

      // Load archived conversation IDs from localStorage
      try {
        const stored = window.localStorage.getItem(`t2s_archived_convs_${uid}`);
        if (stored) setArchivedConvIds(new Set(JSON.parse(stored)));
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

      // Handle tab redirect (e.g. from Stripe portal return / thank-you page)
      const tabParam = params.get("tab");
      const subtabParam = params.get("subtab");
      const validTabs: DashboardTab[] = ["overview","conversations","campaigns","contacts","upload","templates","settings","learn"];
      const validSubtabs: SettingsSubTab[] = ["numbers","billing","opt-out","activity","team","10dlc","biz-page"];
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
            next.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
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

  // All unique tags across contacts
  const viewContact = useMemo(() => {
    if (!viewContactId) return null;
    return contacts.find((c) => c.id === viewContactId) || null;
  }, [viewContactId, contacts]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => (c.tags || []).forEach((t) => { if (t.trim()) tagSet.add(t.trim()); }));
    return Array.from(tagSet).sort();
  }, [contacts]);

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
    return conversations
      .map((conversation) => {
        const contact = contacts.find((item) => item.id === conversation.contactId) || null;
        return {
          ...conversation,
          contact,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
  }, [conversations, contacts]);

  // Persist archived conversation IDs
  useEffect(() => {
    if (userId && archivedConvIds.size >= 0) {
      try { window.localStorage.setItem(`t2s_archived_convs_${userId}`, JSON.stringify([...archivedConvIds])); } catch { /* ignore */ }
    }
  }, [archivedConvIds, userId]);

  const filteredConversations = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    let list = conversationsWithContacts;

    // Filter by archive status
    if (convShowArchived) {
      list = list.filter((c) => archivedConvIds.has(c.id));
    } else {
      list = list.filter((c) => !archivedConvIds.has(c.id));
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
  }, [conversationSearch, conversationsWithContacts, convShowArchived, archivedConvIds]);

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

  const handleManageBilling = async () => {
    if (!userId) return;
    setMessage("Opening billing portal...");
    try {
      const res = await fetch("/api/create-portal", {
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
      const res = await fetch("/api/auto-recharge", {
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
      const res = await fetch("/api/create-checkout", {
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
      const res = await fetch("/api/create-subscription", {
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
      const res = await fetch("/api/cancel-subscription", {
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
    const ok = await deleteTemplate(id);
    if (ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
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
      const res = await fetch("/api/register-10dlc", {
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
      const res = await fetch("/api/register-10dlc", {
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
      const res = await fetch("/api/register-10dlc", {
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
      const res = await fetch("/api/register-10dlc", {
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

    const result = await dbInsertCampaign({
      user_id: userId, name: newCampaignForm.name.trim(),
      audience: 0, sent: 0, replies: 0, failed: 0, status: "Draft",
      message: newCampaignForm.steps[0]?.message.trim() || "",
      steps: newCampaignForm.steps,
      selected_numbers: newCampaignForm.selectedNumbers,
      logs: [],
    });

    if (result) {
      setCampaigns((prev) => [campaignToRecord(result), ...prev]);
      setNewCampaignForm({
        name: "", selectedNumbers: [],
        steps: [{ id: `step_${Date.now()}`, message: "", delayMinutes: 0 }],
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
      const res = await fetch("/api/buy-number", {
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

    // Send via Telnyx
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setConversations((prev) =>
        prev.map((c) => c.id !== selectedConversation.id ? c : {
          ...c, preview: body, lastMessageAt: now,
          fromNumber: c.fromNumber || fromNumber,
          messages: [...c.messages, newMsg],
        })
      );
      const convUpdate: Record<string, unknown> = { preview: body, last_message_at: now };
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
    setSelectedContactIds(new Set());
    setMessage(`✅ Assigned ${ids.length} contact${ids.length !== 1 ? "s" : ""} to ${campaignName || "no campaign"}`);
    window.setTimeout(() => setMessage(""), 3000);
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
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign || !currentUser || !userId) return;

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

    const chargeEntry: UsageHistoryItem = {
      id: `charge_${Date.now()}`, type: "charge", amount: cost,
      description: `Campaign "${campaign.name}" — ${totalMessages} messages (${steps.length} step${steps.length > 1 ? "s" : ""})`,
      createdAt: new Date().toISOString(), status: "succeeded",
    };

    await persistProfile({
      wallet_balance: Number((walletBalance - cost).toFixed(2)),
      usage_history: addUsageEntry(currentUser.usageHistory || [], chargeEntry),
    });
    await dbUpdateCampaign(campaignId, { status: "Sending", audience });
    setCampaigns((prev) => prev.map((c) =>
      c.id === campaignId ? { ...c, status: "Sending" as const, audience } : c
    ));

    setMessage(`✅ Campaign launched — sending ${steps.length} step${steps.length > 1 ? "s" : ""} to ${audience} contacts...`);

    // Send each step via Vonage API
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

        const res = await fetch("/api/send-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            userId,
            fromNumbers,
            messageTemplate: step.message,
            campaignName: hasCampaignContacts ? campaign.name : undefined,
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

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data.length) {
          setMessage("❌ No rows found in CSV");
          window.setTimeout(() => setMessage(""), 2500);
          return;
        }

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

        if (deduped.length === 0) {
          setMessage(`❌ All ${dupeCount} contacts already exist (duplicate phone numbers)`);
          window.setTimeout(() => setMessage(""), 3000);
          return;
        }

        // Batch insert
        const { data, error } = await supabase.from("contacts").insert(deduped).select();
        if (error || !data) {
          setMessage("❌ Failed to import contacts");
          window.setTimeout(() => setMessage(""), 2500);
          return;
        }

        const imported = (data as Contact[]).map(contactToRecord);
        setContacts((prev) => [...imported, ...prev]);
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
        // Build column mappings with auto-detect
        const headers = Object.keys(results.data[0]);
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

    // Dedup
    let deduped = rows;
    let dupeCount = 0;
    if (csvIgnoreDuplicates) {
      const existingPhones = new Set(contacts.map((c) => c.phone.replace(/\D/g, "")).filter(Boolean));
      const csvPhoneSeen = new Set<string>();
      deduped = [];
      for (const row of rows) {
        const normalized = row.phone.replace(/\D/g, "");
        if (!normalized) { deduped.push(row); continue; }
        if (existingPhones.has(normalized) || csvPhoneSeen.has(normalized)) {
          dupeCount++;
          continue;
        }
        csvPhoneSeen.add(normalized);
        deduped.push(row);
      }
    }

    if (deduped.length === 0) {
      const record: CSVUploadRecord = {
        id: `upload_${Date.now()}`, fileName: csvFileName, date: new Date().toISOString(),
        totalRows: csvRawData.length, success: 0, duplicates: dupeCount, invalid: invalidCount,
      };
      setCsvUploadHistory((prev) => [record, ...prev]);
      setMessage(`❌ No new contacts to import (${dupeCount} duplicates, ${invalidCount} invalid)`);
      window.setTimeout(() => setMessage(""), 3000);
      setCsvUploading(false);
      resetCSVWizard();
      return;
    }

    // Batch insert in chunks of 500
    let totalImported = 0;
    for (let i = 0; i < deduped.length; i += 500) {
      const chunk = deduped.slice(i, i + 500);
      const { data, error } = await supabase.from("contacts").insert(chunk).select();
      if (!error && data) {
        const imported = (data as Contact[]).map(contactToRecord);
        setContacts((prev) => [...imported, ...prev]);
        totalImported += imported.length;
      }
    }

    const record: CSVUploadRecord = {
      id: `upload_${Date.now()}`, fileName: csvFileName, date: new Date().toISOString(),
      totalRows: csvRawData.length, success: totalImported, duplicates: dupeCount, invalid: invalidCount,
    };
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

        // Charge wallet
        const chargeEntry: UsageHistoryItem = {
          id: `charge_${Date.now()}`, type: "charge", amount: cost,
          description: `Campaign "${campaign.name}" — ${totalMessages} messages (${steps.length} step${steps.length > 1 ? "s" : ""})`,
          createdAt: new Date().toISOString(), status: "succeeded",
        };
        await persistProfile({
          wallet_balance: Number((walletBalance - cost).toFixed(2)),
          usage_history: addUsageEntry(currentUser.usageHistory || [], chargeEntry),
        });

        await dbUpdateCampaign(csvCampaignId, { status: "Sending", audience: totalImported });
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

            const res = await fetch("/api/send-campaign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaignId: csvCampaignId,
                userId,
                fromNumbers,
                messageTemplate: step.message,
                campaignName: campaign.name,
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
          // Check auto-recharge after campaign send
          checkAutoRecharge(Number((walletBalance - cost).toFixed(2)));
        } catch {
          setMessage("❌ Could not connect to SMS service");
        }

        window.setTimeout(() => setMessage(""), 5000);
        setCsvUploading(false);
        resetCSVWizard();
        return;
      }
    }

    setMessage(`✅ Imported ${totalImported.toLocaleString()} contacts${dupeCount > 0 ? ` (${dupeCount} duplicates skipped)` : ""}${invalidCount > 0 ? ` (${invalidCount} invalid)` : ""}`);
    window.setTimeout(() => setMessage(""), 4000);
    setCsvUploading(false);
    resetCSVWizard();
  };

  const resetCSVWizard = () => {
    setCsvUploadStep(1);
    setCsvRawData([]);
    setCsvFileName("");
    setCsvColumnMappings([]);
    setCsvCampaignId("");
    setCsvUploadTags([]);
    setCsvTagInput("");
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
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              {impersonating && (
                <span className="text-sm uppercase tracking-[0.2em] text-violet-300">
                  Viewing {impersonatingUserName}&apos;s Dashboard
                </span>
              )}
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Welcome back, {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() + currentUser.firstName.slice(1) : ""}
            </h1>
            <p className="mt-2 text-zinc-400 italic">
              &ldquo;{dailyQuote}&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const next = themeMode === "dark" ? "light" : "dark";
                setThemeMode(next);
                try { window.localStorage.setItem("t2s_theme", next); } catch { /* ignore */ }
              }}
              className="rounded-2xl border border-zinc-700 px-4 py-3 hover:bg-zinc-900 text-xl"
              title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {themeMode === "dark" ? "☀️" : "🌙"}
            </button>
            {currentUser.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-2xl border border-zinc-700 px-5 py-3 hover:bg-zinc-900"
              >
                Admin Portal
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-2xl bg-red-600 px-5 py-3 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
          {([
            { id: "overview", label: "Overview" },
            { id: "conversations", label: "Conversations" },
            { id: "campaigns", label: "Campaigns" },
            { id: "contacts", label: "Contacts" },
            { id: "upload", label: "Upload CSV" },
            { id: "templates", label: "Templates" },
            { id: "settings", label: "Settings" },
            { id: "learn", label: "📖 Learn" },
          ] as { id: DashboardTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Wallet Balance</div>
                <div className="mt-3 text-4xl font-bold text-emerald-400">
                  {formatCurrency(currentUser.walletBalance || 0)}
                </div>
                <div className="mt-2 text-xs text-zinc-500">{currentUser.credits} credits</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Delivery Rate</div>
                <div className="mt-3 text-4xl font-bold text-sky-400">
                  {deliveryRate.toFixed(1)}%
                </div>
                <div className="mt-2 text-xs text-zinc-500">{totalSent} sent · {totalFailed} failed</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Reply Rate</div>
                <div className="mt-3 text-4xl font-bold text-amber-400">
                  {replyRate.toFixed(1)}%
                </div>
                <div className="mt-2 text-xs text-zinc-500">{totalReplies} replies</div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Contacts · Numbers</div>
                <div className="mt-3 text-4xl font-bold text-violet-400">
                  {contacts.length} · {currentUser.ownedNumbers?.length || 0}
                </div>
                <div className="mt-2 text-xs text-zinc-500">{contacts.filter(c => c.dnc).length} on DNC list</div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Performance Snapshot</h2>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    Live totals
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Sent</div>
                    <div className="mt-2 text-3xl font-bold">{totalSent}</div>
                  </div>
                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Replies</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-400">
                      {totalReplies}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-zinc-800 p-5">
                    <div className="text-sm text-zinc-400">Failed</div>
                    <div className="mt-2 text-3xl font-bold text-red-400">
                      {totalFailed}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <div className="text-sm text-zinc-400">Current Plan</div>
                  <div className="mt-2 text-2xl font-bold">{currentUser.plan.name}</div>
                  <div className="mt-2 text-zinc-400">
                    {formatCurrency(currentUser.plan.price)} / month •{" "}
                    {formatCurrency(currentUser.plan.messageCost)} per message
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Quick Actions</h2>

                <div className="mt-5 grid gap-3">
                  <button
                    onClick={() => setActiveTab("conversations")}
                    className="rounded-2xl bg-violet-600 px-5 py-4 text-left hover:bg-violet-700"
                  >
                    Open Conversations
                  </button>
                  <button
                    onClick={() => setActiveTab("campaigns")}
                    className="rounded-2xl border border-zinc-700 px-5 py-4 text-left hover:bg-zinc-800"
                  >
                    Create Campaign
                  </button>
                  <button
                    onClick={() => handleAddFunds(25)}
                    className="rounded-2xl border border-zinc-700 px-5 py-4 text-left hover:bg-zinc-800"
                  >
                    Add $25 to Wallet
                  </button>
                  <button
                    onClick={() => { setActiveTab("settings"); setSettingsSubTab("numbers"); }}
                    className="rounded-2xl border border-zinc-700 px-5 py-4 text-left hover:bg-zinc-800"
                  >
                    Buy Number
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
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-bold mb-4">7-Day Activity</h2>
                <div className="flex items-end gap-1 h-40">
                  {analytics.dailyCounts.map((day) => {
                    const maxCount = Math.max(...analytics.dailyCounts.map((d) => d.count), 1);
                    const height = Math.max((day.count / maxCount) * 100, 4);
                    return (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] text-zinc-400">{day.count}</span>
                        <div className="w-full rounded-t-lg bg-violet-600" style={{ height: `${height}%` }} />
                        <span className="text-[9px] text-zinc-500">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between text-xs text-zinc-500">
                  <span>Total spent: {formatCurrency(analytics.totalSpent)}</span>
                  <span>Total funded: {formatCurrency(analytics.totalFunded)}</span>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-xl font-bold mb-4">Campaign Performance</h2>
                {analytics.campaignStats.length === 0 ? (
                  <p className="text-sm text-zinc-500">No completed campaigns yet.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {analytics.campaignStats.map((c) => (
                      <div key={c.name} className="rounded-xl bg-zinc-800 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          <span className="text-xs text-zinc-400">{c.sent} sent</span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs">
                          <span className="text-emerald-400">{c.deliveryRate}% delivered</span>
                          <span className="text-amber-400">{c.replyRate}% replied</span>
                          {c.failed > 0 && <span className="text-red-400">{c.failed} failed</span>}
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-zinc-700">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.deliveryRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Chats</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setConvShowAll((v) => !v); setConvShowArchived(false); setConvSelectMode(false); }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium ${convShowAll ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setConvSelectMode((v) => !v); setSelectedConvIds(new Set()); }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium ${convSelectMode ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                    >
                      {convSelectMode ? "Cancel" : "Select"}
                    </button>
                    <button
                      onClick={() => { setConvShowArchived((v) => !v); setConvShowAll(false); }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium ${convShowArchived ? "bg-violet-600 text-white" : "border border-zinc-700 text-zinc-400 hover:text-white"}`}
                    >
                      {convShowArchived ? "Active" : "Archived"}
                    </button>
                  </div>
                </div>
                {convSelectMode && selectedConvIds.size > 0 && (
                  <div className="mt-3 flex items-center gap-2">
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
                      className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium hover:bg-violet-700"
                    >
                      {convShowArchived ? `Unarchive ${selectedConvIds.size}` : `Archive ${selectedConvIds.size}`}
                    </button>
                    <button
                      onClick={() => {
                        // Select all visible
                        setSelectedConvIds(new Set(filteredConversations.map((c) => c.id)));
                      }}
                      className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                    >
                      All
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
                      : msg.status === "sent" ? "text-zinc-400"
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
                                {msg.status}
                              </span>
                              {msg.fromNumber && (currentUser?.ownedNumbers?.length || 0) > 1 && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${getNumberColor(msg.fromNumber)}`}
                                >
                                  •••{getLastFour(msg.fromNumber)}
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
                            <div className="truncate font-semibold text-white">
                              {contact
                                ? `${contact.firstName} ${contact.lastName}`
                                : "Unknown Contact"}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {formatTime(conversation.lastMessageAt)}
                            </div>
                          </div>

                          <div className="mt-1 truncate text-sm text-zinc-400">
                            {conversation.preview}
                          </div>

                          {/* Which of the user's lines this thread is on —
                              shown only when more than one number is owned. */}
                          {conversation.fromNumber && (currentUser?.ownedNumbers?.length || 0) > 1 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getNumberColor(conversation.fromNumber)}`}
                                title={`On ${conversation.fromNumber}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                •••{getLastFour(conversation.fromNumber)}
                              </span>
                            </div>
                          )}
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
                    {convShowArchived ? "No archived conversations." : "No conversations found."}
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="flex h-[85vh] flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              {selectedConversation ? (
                <>
                  <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                        {selectedContact ? getInitials(selectedContact.firstName, selectedContact.lastName) : "?"}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : "Unknown Contact"}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {selectedContact?.phone || "No contact linked"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                        .map((item) => (
                        <div
                          key={item.id}
                          className={`flex ${
                            item.direction === "outbound" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div className="max-w-[72%]">
                            <div
                              className={`rounded-3xl px-5 py-4 text-[15px] leading-7 shadow-lg ${
                                item.direction === "outbound"
                                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                                  : "bg-zinc-800 text-zinc-100"
                              }`}
                            >
                              {item.body}
                            </div>

                            <div
                              className={`mt-2 text-xs text-zinc-500 ${
                                item.direction === "outbound"
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {formatTime(item.createdAt)}
                              {item.direction === "outbound" && item.status
                                ? ` • ${item.status}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      ))}
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

                    {composerText.length > 0 && (() => {
                      const len = composerText.length;
                      const hasUnicode = /[^\x00-\x7F]/.test(composerText);
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

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="Insert text here ... (Enter to send, Shift+Enter for newline)"
                        className="h-36 w-full resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setShowTemplates((v) => !v); setShowQuickReplies(false); }}
                            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                            Templates
                          </button>
                          <button onClick={() => { setShowQuickReplies((v) => !v); setShowTemplates(false); }}
                            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                            Quick
                          </button>
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
                  <div className="mb-5 border-b border-zinc-800 pb-4">
                    <div className="text-xl font-bold">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Contact details and notes
                    </div>
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
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Create Campaign</h2>

              <div className="mt-5 space-y-4">
                <input
                  placeholder="Campaign name"
                  value={newCampaignForm.name}
                  onChange={(e) =>
                    setNewCampaignForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                />

                {/* Multi-step message builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-300">Message Steps</div>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-700"
                    >
                      + Add Step
                    </button>
                  </div>

                  {/* Step tabs */}
                  <div className="flex flex-wrap gap-1">
                    {newCampaignForm.steps.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStepIndex(idx)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
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
                            className="ml-1 text-zinc-500 hover:text-red-400"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Active step editor */}
                  {newCampaignForm.steps[activeStepIndex] && (
                    <div className="space-y-3">
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
                            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
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
                        className="h-32 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                      />

                      {(() => {
                        const msg = newCampaignForm.steps[activeStepIndex].message;
                        const len = msg.length;
                        if (len === 0) return null;
                        const hasUnicode = /[^\x00-\x7F]/.test(msg);
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

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <button
                    type="button"
                    onClick={() => setShowFieldPicker(!showFieldPicker)}
                    className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"
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
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-violet-600 hover:bg-violet-950/40 hover:text-violet-300 transition"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-zinc-500">
                    Tags like <code className="text-violet-400">{"{firstName}"}</code> are replaced with each contact&apos;s data when sent
                  </div>
                </div>

                {(currentUser.ownedNumbers || []).length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="text-sm font-medium text-zinc-300 mb-3">
                      Send from numbers <span className="text-zinc-500 font-normal">(selected numbers rotate per message)</span>
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
                            className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                              isSelected
                                ? "border border-violet-600 bg-violet-950/40 text-white"
                                : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                                isSelected ? "bg-violet-600 border-violet-600" : "border-zinc-600"
                              }`}>
                                {isSelected && <span className="text-xs text-white">✓</span>}
                              </div>
                              <span className="font-mono">{num.number}</span>
                            </div>
                            <span className="text-xs text-zinc-500">{num.alias}</span>
                          </button>
                        );
                      })}
                    </div>
                    {newCampaignForm.selectedNumbers.length === 0 && (
                      <div className="mt-2 text-xs text-zinc-500">
                        No numbers selected — all owned numbers will be used
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                  <div>{newCampaignForm.steps.length} message step{newCampaignForm.steps.length > 1 ? "s" : ""}</div>
                  {newCampaignForm.selectedNumbers.length > 0 && (
                    <div className="mt-1">
                      Sending from: {newCampaignForm.selectedNumbers.length} number{newCampaignForm.selectedNumbers.length !== 1 ? "s" : ""} (rotating)
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateCampaign}
                  className="w-full rounded-2xl bg-violet-600 py-4 hover:bg-violet-700"
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
                            {campaign.audience} contacts
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
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          setTagFilter((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          active
                            ? "bg-violet-600 text-white ring-1 ring-violet-500"
                            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        }`}
                      >
                        {tag}
                        <span className="ml-1.5 text-[10px] text-zinc-400">
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
                {filteredContacts.map((contact) => (
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
                        (contact.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-violet-900/50 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                            {tag}
                          </span>
                        ))
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
            </div>
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

            {/* Upload History */}
            {csvUploadHistory.length > 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Upload History</h2>
                  <span className="text-sm text-zinc-400">{csvUploadHistory.length} uploads</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Date</th>
                        <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">File Name</th>
                        <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Count</th>
                        <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {csvUploadHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-zinc-800/50">
                          <td className="px-5 py-4 text-zinc-400">{new Date(rec.date).toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">📄</span>
                              <span className="font-medium">{rec.fileName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">{rec.totalRows.toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="text-emerald-400 font-medium">Success: {rec.success}</span>
                              {rec.duplicates > 0 && <span className="text-red-400 font-medium">Duplicate: {rec.duplicates}</span>}
                              {rec.invalid > 0 && <span className="text-zinc-400 font-medium">Invalid: {rec.invalid}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TEMPLATES ═══════════════ */}
        {activeTab === "templates" && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Create Template */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Create Template</h2>
              <p className="mt-1 text-sm text-zinc-500">Save message templates for quick reuse in conversations and campaigns.</p>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm text-zinc-400">Template Name</label>
                    <input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Follow Up, Welcome, Appointment Reminder"
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Category</label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-white outline-none"
                    >
                      <option value="general">General</option>
                      <option value="follow-up">Follow Up</option>
                      <option value="greeting">Greeting</option>
                      <option value="closing">Closing</option>
                      <option value="appointment">Appointment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Message Body</label>
                  <textarea
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    rows={5}
                    placeholder="Type your template message here... Use {firstName}, {lastName}, etc. for personalization."
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-violet-500"
                  />
                </div>

                <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-400">Variables:</span> {"{firstName}"}, {"{lastName}"}, {"{phone}"}, {"{email}"}, {"{city}"}, {"{state}"}
                </div>

                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim() || !newTemplateBody.trim()}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-4 font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
              </div>
            </div>

            {/* Template List */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Templates</h2>
                <span className="text-sm text-zinc-500">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
              </div>

              {templates.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
                  No templates yet. Create your first one to speed up your messaging.
                </div>
              ) : (
                <div className="mt-5 max-h-[500px] space-y-3 overflow-y-auto">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tpl.name}</span>
                          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">{tpl.category}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-red-900/40 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{tpl.body}</div>
                      <div className="mt-2 text-[10px] text-zinc-600">
                        Created {new Date(tpl.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Owned Numbers</h2>
              <p className="mt-1 text-xs text-zinc-400">
                {(currentUser.ownedNumbers || []).length} number{(currentUser.ownedNumbers || []).length !== 1 ? "s" : ""} · All numbers rotate automatically when launching campaigns
              </p>

              <div className="mt-5 space-y-4">
                {(currentUser.ownedNumbers || []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{item.alias}</div>
                        <div className="mt-1 font-mono text-zinc-300">{item.number}</div>
                      </div>
                      <div className="rounded-full bg-emerald-900 px-3 py-1 text-xs text-emerald-300">
                        Active
                      </div>
                    </div>
                  </div>
                ))}

                {(currentUser.ownedNumbers || []).length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    No phone numbers yet. Search and buy one to get started.
                  </div>
                )}
              </div>
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

              {/* TCPA Compliance Note */}
              <div className="rounded-3xl border border-yellow-800/40 bg-yellow-950/20 p-6">
                <h3 className="text-lg font-bold text-yellow-300">TCPA Compliance</h3>
                <ul className="mt-3 space-y-2 text-sm text-yellow-200/80">
                  <li>• You must honor all opt-out requests immediately</li>
                  <li>• STOP, UNSUBSCRIBE, CANCEL, END, and QUIT are federally required keywords</li>
                  <li>• You must send a one-time confirmation after opting out</li>
                  <li>• Do not send any further messages to opted-out contacts</li>
                  <li>• Keep records of all opt-out requests for compliance</li>
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
                    description: "Subscription: $35/month for platform access. Messages: $0.012 per SMS sent. Phone numbers: $1.50/month each. All message costs are deducted from your wallet balance automatically.",
                    tip: "At $0.012 per message, $20 gets you about 1,666 messages. $100 (with 10% discount) gets you about 8,333 messages!",
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
                id: "compliance",
                title: "8. Compliance & Best Practices",
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

      {/* ── Schedule Message Modal ── */}
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
                  {(viewContact.tags || []).map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="flex items-center gap-1 rounded-full bg-violet-900/50 px-3 py-1 text-xs font-medium text-violet-300"
                    >
                      {tag}
                      <button
                        onClick={async () => {
                          const newTags = (viewContact.tags || []).filter((_, i) => i !== idx);
                          await handleUpdateContactField(viewContact.id, "tags", newTags);
                        }}
                        className="ml-0.5 text-violet-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
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
                    {allTags.filter((t) => !(viewContact.tags || []).includes(t)).slice(0, 10).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleUpdateContactField(viewContact.id, "tags", [...(viewContact.tags || []), tag])}
                        className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-[11px] text-zinc-400 hover:border-violet-600 hover:bg-violet-900/30 hover:text-violet-300"
                      >
                        + {tag}
                      </button>
                    ))}
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
        <div className={`fixed bottom-8 left-8 rounded-2xl px-6 py-4 shadow-2xl text-sm font-medium z-40 ${
          message.startsWith("❌")
            ? "bg-red-950 text-red-200 ring-1 ring-red-800"
            : message.startsWith("🌙")
              ? "bg-amber-950 text-amber-200 ring-1 ring-amber-800"
              : "bg-emerald-950 text-emerald-200 ring-1 ring-emerald-800"
        }`}>
          {message}
        </div>
      )}

      {/* ── Support Chat Widget ── */}
      {!impersonating && (
        <>
          {/* Chat Window */}
          {chatOpen && (
            <div className="fixed bottom-24 right-6 z-50 w-[360px] rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl flex flex-col" style={{ height: "480px" }}>
              {/* Header */}
              <div className="flex items-center justify-between rounded-t-2xl bg-violet-600 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">💬</div>
                  <div>
                    <div className="font-bold text-white">Support Chat</div>
                    <div className="text-xs text-violet-200">We typically reply within minutes</div>
                  </div>
                </div>
                <button onClick={() => { setChatOpen(false); setChatUnread(0); }} className="text-white/70 hover:text-white text-xl">✕</button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-sm text-zinc-500 mt-8">
                    <div className="text-3xl mb-2">👋</div>
                    <div>Hi there! How can we help you?</div>
                    <div className="mt-1 text-xs">Send us a message and we&apos;ll get back to you shortly.</div>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender_role === "user"
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    }`}>
                      {msg.sender_role === "admin" && <div className="text-[10px] font-semibold text-violet-400 mb-0.5">Support</div>}
                      <div>{msg.message}</div>
                      <div className={`text-[10px] mt-1 ${msg.sender_role === "user" ? "text-violet-300" : "text-zinc-500"}`}>
                        {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-zinc-700 p-3">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!chatInput.trim()}
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Chat Button */}
          <button
            onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) setChatUnread(0); }}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 shadow-lg hover:bg-violet-700 transition-all hover:scale-105"
          >
            {chatOpen ? (
              <span className="text-xl text-white">✕</span>
            ) : (
              <>
                <span className="text-2xl">💬</span>
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {chatUnread}
                  </span>
                )}
              </>
            )}
          </button>
        </>
      )}
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
      const res = await fetch("/api/upload-ein-certificate", { method: "POST", body: fd });
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
      const res = await fetch("/api/ein-certificate-url", {
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