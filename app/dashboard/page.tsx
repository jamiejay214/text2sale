"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
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
  teamCode?: string;
  managerId?: string | null;
  referralCode?: string;
  a2pRegistration?: A2PRegistration | null;
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
  status: "Draft" | "Sending" | "Completed" | "Paused";
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
};

type ConversationRecord = {
  id: string;
  contactId: string;
  preview: string;
  unread: number;
  lastMessageAt: string;
  starred?: boolean;
  messages: ConversationMessage[];
};

type DashboardTab = "overview" | "conversations" | "campaigns" | "contacts" | "numbers" | "billing" | "opt-out" | "activity" | "team" | "10dlc";

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
    teamCode: p.team_code || "", managerId: p.manager_id, referralCode: p.referral_code || "",
    a2pRegistration: p.a2p_registration || null,
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
  };
}

function convToRecord(c: Conversation, msgs: ConversationMessage[]): ConversationRecord {
  return {
    id: c.id, contactId: c.contact_id, preview: c.preview,
    unread: c.unread, lastMessageAt: c.last_message_at,
    starred: c.starred, messages: msgs,
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

// No more demo data builders — data comes from Supabase

export default function DashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AccountRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [message, setMessage] = useState("");
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>({
    name: "",
    steps: [{ id: `step_${Date.now()}`, message: "", delayMinutes: 0 }],
    selectedNumbers: [],
  });
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
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
  const [composerText, setComposerText] = useState("");
  const [selectedFromNumber, setSelectedFromNumber] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [viewContactId, setViewContactId] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [addContactForm, setAddContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "", city: "", state: "" });
  const [campaignSearch, setCampaignSearch] = useState("");
  const [launchingCampaignId, setLaunchingCampaignId] = useState<string | null>(null);
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
  const [teamManagerName, setTeamManagerName] = useState("");

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

  // CSV Import Wizard state
  const [csvWizardOpen, setCsvWizardOpen] = useState(false);
  const [csvWizardStep, setCsvWizardStep] = useState(1); // 1=upload, 2=map fields, 3=configure
  const [csvRawHeaders, setCsvRawHeaders] = useState<string[]>([]);
  const [csvRawData, setCsvRawData] = useState<Record<string, string>[]>([]);
  const [csvFieldMapping, setCsvFieldMapping] = useState<Record<string, string>>({});
  const [csvWizardCampaignId, setCsvWizardCampaignId] = useState("");
  const [csvWizardTags, setCsvWizardTags] = useState("");
  const [csvWizardAutoSend, setCsvWizardAutoSend] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");

  const CSV_CONTACT_FIELDS = [
    { value: "", label: "— Skip —" },
    { value: "first_name", label: "First Name" },
    { value: "last_name", label: "Last Name" },
    { value: "phone", label: "Phone Number" },
    { value: "email", label: "Email" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "address", label: "Address" },
    { value: "zip", label: "Zip Code" },
    { value: "lead_source", label: "Lead Source" },
    { value: "date_of_birth", label: "Date of Birth" },
    { value: "age", label: "Age" },
    { value: "notes", label: "Notes" },
  ];

  // 10DLC A2P Registration state
  const [a2pStep, setA2pStep] = useState(0); // 0=info, 1=submitting, 2=brand pending, 3=campaign form, 4=campaign pending, 5=done
  const [a2pLoading, setA2pLoading] = useState(false);
  const [a2pForm, setA2pForm] = useState({
    businessName: "", businessType: "llc" as "sole_proprietor" | "partnership" | "corporation" | "llc" | "non_profit",
    ein: "", businessAddress: "", businessCity: "", businessState: "", businessZip: "", businessCountry: "US",
    website: "", contactFirstName: "", contactLastName: "", contactEmail: "", contactPhone: "",
    useCase: "MIXED", description: "", sampleMessage1: "", sampleMessage2: "",
    messageFlow: "End users opt-in by signing up on our website and providing their phone number. They can opt out at any time by replying STOP.",
    optInMessage: "You have opted in to receive messages. Reply STOP to unsubscribe.",
    optOutMessage: "You have been unsubscribed and will no longer receive messages. Reply START to re-subscribe.",
    helpMessage: "Reply HELP for assistance or STOP to unsubscribe. Contact support at our website.",
    hasEmbeddedLinks: true, hasEmbeddedPhone: false,
  });

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

      const uid = session.user.id;
      setUserId(uid);

      const profile = await fetchProfile(uid);
      if (!profile || profile.paused) {
        router.replace("/");
        return;
      }

      setCurrentUser(profileToAccount(profile));
      if (profile.opt_out_settings) setOptOutSettings(profile.opt_out_settings);

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

      // Handle tab redirect (e.g. from Stripe portal return)
      const tabParam = params.get("tab");
      if (tabParam && ["overview","conversations","campaigns","contacts","numbers","billing","opt-out","activity","team","10dlc"].includes(tabParam)) {
        setActiveTab(tabParam as DashboardTab);
        window.history.replaceState({}, "", "/dashboard");
      }

      setMounted(true);
    };

    loadData();
  }, [router]);

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

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
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
  }, [contacts, contactSearch, tagFilter]);

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

  const filteredConversations = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    if (!search) return conversationsWithContacts;

    return conversationsWithContacts.filter((conversation) => {
      const fullName = `${conversation.contact?.firstName || ""} ${conversation.contact?.lastName || ""}`.toLowerCase();
      const phone = conversation.contact?.phone?.toLowerCase() || "";
      const preview = conversation.preview.toLowerCase();
      return (
        fullName.includes(search) || phone.includes(search) || preview.includes(search)
      );
    });
  }, [conversationSearch, conversationsWithContacts]);

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

  const handleAddFunds = async (amount: number) => {
    if (!currentUser || !userId) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!requireSubscription()) return;

    setMessage("Redirecting to payment...");

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
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
    const fromNumber = selectedFromNumber || currentUser?.ownedNumbers?.[0]?.number || "";
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

  // 10DLC is handled through the Telnyx dashboard — no in-app API calls needed

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
      setMessage("✅ Campaign created as draft");
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
    if (!currentUser || !userId) return;

    const walletBalance = currentUser.walletBalance || 0;
    if (walletBalance < 1) {
      setMessage("❌ Add at least $1.00 to your wallet first");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    setBuyingNumber(phoneNumber);

    try {
      const res = await fetch("/api/buy-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
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
        id: `number_${Date.now()}`, type: "number_purchase", amount: 1,
        description: `Purchased number ${data.number}`,
        createdAt: new Date().toISOString(), status: "succeeded",
      };

      await persistProfile({
        wallet_balance: Number((walletBalance - 1).toFixed(2)),
        owned_numbers: addOwnedNumber(currentUser.ownedNumbers || [], newNumber),
        usage_history: addUsageEntry(currentUser.usageHistory || [], purchaseEntry),
      });

      // Remove purchased number from available list
      setAvailableNumbers((prev) => prev.filter((n) => n.raw !== phoneNumber));
      setMessage(`✅ Number ${data.number} purchased`);
      window.setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Could not connect to SMS service");
      window.setTimeout(() => setMessage(""), 3000);
    }

    setBuyingNumber(null);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setComposerText("");

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
    const fromNumber = selectedFromNumber || currentUser.ownedNumbers?.[0]?.number;

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
    });

    if (dbMsg) {
      const newMsg: ConversationMessage = messageToRecord(dbMsg);
      setConversations((prev) =>
        prev.map((c) => c.id !== selectedConversation.id ? c : {
          ...c, preview: body, lastMessageAt: now,
          messages: [...c.messages, newMsg],
        })
      );
      await dbUpdateConversation(selectedConversation.id, {
        preview: body, last_message_at: now,
      });
    }

    // Deduct message cost
    const chargeEntry: UsageHistoryItem = {
      id: `msg_${Date.now()}`, type: "charge", amount: cost,
      description: `SMS to ${contact.phone}`,
      createdAt: now, status: "succeeded",
    };
    await persistProfile({
      wallet_balance: Number(((currentUser.walletBalance || 0) - cost).toFixed(2)),
      usage_history: addUsageEntry(currentUser.usageHistory || [], chargeEntry),
    });

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
    if (!contact) return;
    const newDnc = !contact.dnc;
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, dnc: newDnc } : c));
    await dbUpdateContact(id, { dnc: newDnc });
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

    // Send each step via Telnyx API
    try {
      let totalSent = 0;
      let totalFailed = 0;

      for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
        const step = steps[stepIdx];

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
        } else {
          setMessage(`❌ Step ${stepIdx + 1} error: ${data.error}`);
          break;
        }
      }

      setCampaigns((prev) => prev.map((c) =>
        c.id === campaignId ? {
          ...c, status: "Completed" as const,
          sent: totalSent, failed: totalFailed, audience,
        } : c
      ));
      setMessage(`✅ Campaign complete — ${totalSent} sent, ${totalFailed} failed across ${steps.length} step${steps.length > 1 ? "s" : ""}`);
    } catch {
      setMessage("❌ Could not connect to SMS service");
    }

    setLaunchingCampaignId(null);
    window.setTimeout(() => setMessage(""), 4000);
  };

  // ── CSV Wizard Step 1: Parse file and detect headers ──
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          setMessage("❌ No rows found in CSV");
          window.setTimeout(() => setMessage(""), 2500);
          return;
        }
        const headers = results.meta.fields || [];
        setCsvRawHeaders(headers);
        setCsvRawData(results.data);

        // Auto-map headers to contact fields
        const autoMap: Record<string, string> = {};
        const mappings: [string[], string][] = [
          [["first name", "firstname", "first_name", "fname"], "first_name"],
          [["last name", "lastname", "last_name", "lname"], "last_name"],
          [["phone", "phone number", "phone_number", "phonenumber", "mobile", "cell"], "phone"],
          [["email", "email address", "emailaddress", "e-mail"], "email"],
          [["city", "town"], "city"],
          [["state", "province", "st"], "state"],
          [["address", "street", "street address", "address1"], "address"],
          [["zip", "zipcode", "zip code", "zip_code", "postal", "postal code"], "zip"],
          [["lead source", "leadsource", "lead_source", "source"], "lead_source"],
          [["dob", "date of birth", "dateofbirth", "date_of_birth", "birthday"], "date_of_birth"],
          [["age"], "age"],
          [["notes", "note", "comments"], "notes"],
        ];
        for (const h of headers) {
          const lower = h.toLowerCase().trim();
          for (const [variants, field] of mappings) {
            if (variants.includes(lower)) {
              // Don't double-map
              if (!Object.values(autoMap).includes(field)) {
                autoMap[h] = field;
              }
              break;
            }
          }
        }
        setCsvFieldMapping(autoMap);
        setCsvWizardStep(2);
        setCsvWizardOpen(true);
      },
      error: () => {
        setMessage("❌ Failed to parse CSV");
        window.setTimeout(() => setMessage(""), 2500);
      },
    });

    e.target.value = "";
  };

  // ── CSV Wizard Step 3: Submit — import contacts and optionally launch campaign ──
  const handleCSVWizardSubmit = async () => {
    if (!userId) return;
    setCsvImporting(true);

    const campaignName = csvWizardCampaignId ? (campaigns.find((c) => c.id === csvWizardCampaignId)?.name || "") : "";
    const tagList = csvWizardTags.split(",").map((t) => t.trim()).filter(Boolean);

    const rows = csvRawData
      .map((row) => {
        const mapped: Record<string, string> = {};
        for (const [csvHeader, contactField] of Object.entries(csvFieldMapping)) {
          if (contactField && row[csvHeader]) {
            mapped[contactField] = row[csvHeader];
          }
        }
        return {
          user_id: userId,
          first_name: mapped.first_name || "",
          last_name: mapped.last_name || "",
          phone: mapped.phone || "",
          email: mapped.email || "",
          city: mapped.city || "",
          state: mapped.state || "",
          address: mapped.address || "",
          zip: mapped.zip || "",
          lead_source: mapped.lead_source || "",
          date_of_birth: mapped.date_of_birth || "",
          age: mapped.age || "",
          notes: mapped.notes || "",
          tags: tagList,
          dnc: false,
          campaign: campaignName,
          quote: "", policy_id: "", timeline: "", household_size: "",
        };
      })
      .filter((c) => c.first_name || c.phone);

    if (rows.length === 0) {
      setMessage("❌ No valid contacts found. Make sure Phone or First Name is mapped.");
      window.setTimeout(() => setMessage(""), 3000);
      setCsvImporting(false);
      return;
    }

    // Batch insert
    const { data, error } = await supabase.from("contacts").insert(rows).select();
    if (error || !data) {
      setMessage("❌ Failed to import contacts");
      window.setTimeout(() => setMessage(""), 2500);
      setCsvImporting(false);
      return;
    }

    const imported = (data as Contact[]).map(contactToRecord);
    setContacts((prev) => [...imported, ...prev]);
    setMessage(`✅ Imported ${imported.length} contacts`);
    setCsvImporting(false);
    setCsvWizardOpen(false);

    // Reset wizard state
    setCsvRawHeaders([]);
    setCsvRawData([]);
    setCsvFieldMapping({});
    setCsvWizardCampaignId("");
    setCsvWizardTags("");
    setCsvFileName("");
    setCsvWizardStep(1);

    // Auto-launch campaign if selected
    if (csvWizardAutoSend && csvWizardCampaignId) {
      window.setTimeout(() => {
        handleLaunchCampaign(csvWizardCampaignId);
      }, 500);
    } else {
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

  const isSubscribed = currentUser.subscriptionStatus === "active" || currentUser.subscriptionStatus === "canceling";

  const requireSubscription = () => {
    if (isSubscribed) return true;
    setMessage("❌ Please subscribe and add a payment method before using paid features. Go to the Billing tab.");
    window.setTimeout(() => setMessage(""), 4000);
    return false;
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-screen-2xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-violet-300">
              Text2Sale Dashboard
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Welcome back, {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() + currentUser.firstName.slice(1) : ""}
            </h1>
            <p className="mt-2 text-zinc-400">
              Manage campaigns, contacts, conversations, phone numbers, credits, and billing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
          {[
            "overview",
            "conversations",
            "campaigns",
            "contacts",
            "numbers",
            "billing",
            "opt-out",
            "activity",
            "team",
            "10dlc",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as DashboardTab)}
              className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {tab === "opt-out" ? "Opt-Out" : tab === "10dlc" ? "10DLC Registration" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    onClick={() => setActiveTab("numbers")}
                    className="rounded-2xl border border-zinc-700 px-5 py-4 text-left hover:bg-zinc-800"
                  >
                    Buy Number
                  </button>
                </div>
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
          <div className="grid min-h-[85vh] gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Chats</h2>
                <button className="rounded-xl bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700">
                  Learn
                </button>
              </div>

              <input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Search conversations..."
                className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
              />

              <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                {filteredConversations.map((conversation) => {
                  const contact = conversation.contact;
                  const active = conversation.id === selectedConversation?.id;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`w-full rounded-2xl p-4 text-left transition ${
                        active
                          ? "bg-violet-600/30 ring-1 ring-violet-500"
                          : "bg-zinc-800/70 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                          {getInitials(contact?.firstName, contact?.lastName)}
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
                        </div>

                        {conversation.unread > 0 && (
                          <div className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-violet-500 px-2 text-xs font-semibold text-white">
                            {conversation.unread}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredConversations.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    No conversations found.
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-[85vh] flex-col rounded-3xl border border-zinc-800 bg-zinc-900">
              {selectedConversation && selectedContact ? (
                <>
                  <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                        {getInitials(selectedContact.firstName, selectedContact.lastName)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {selectedContact.firstName} {selectedContact.lastName}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {selectedContact.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedContact.dnc && (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                          DNC
                        </span>
                      )}
                      <button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
                        Call
                      </button>
                      <button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
                        More
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-zinc-950/40 px-5 py-6">
                    <div className="mb-6 text-center text-sm text-zinc-500">
                      {formatConversationDay(selectedConversation.lastMessageAt)}
                    </div>

                    <div className="space-y-5">
                      {selectedConversation.messages.map((item) => (
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

                    <div className="mb-2 flex items-center gap-5 text-xs text-zinc-500">
                      <span>Chars: {composerText.length}</span>
                      <span>Segments: {Math.max(1, Math.ceil(composerText.length / 160 || 1))}</span>
                      <span>
                        Cost:{" "}
                        {formatCurrency(
                          Math.max(1, Math.ceil(composerText.length / 160 || 1)) *
                            (currentUser.plan.messageCost || 0)
                        )}
                      </span>
                    </div>

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="Insert text here ... (Enter to send, Shift+Enter for newline)"
                        className="h-36 w-full resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                      />

                      {/* From number picker */}
                      {currentUser?.ownedNumbers && currentUser.ownedNumbers.length > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-zinc-500">From:</span>
                          <select
                            value={selectedFromNumber || currentUser.ownedNumbers[0]?.number || ""}
                            onChange={(e) => setSelectedFromNumber(e.target.value)}
                            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
                          >
                            {currentUser.ownedNumbers.map((num) => (
                              <option key={num.id} value={num.number}>
                                {num.number} — {num.alias}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                            className="rounded-2xl bg-violet-600 px-6 py-3 font-medium hover:bg-violet-700"
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

                      <div className="text-xs text-zinc-500">
                        Characters: {newCampaignForm.steps[activeStepIndex].message.length} · Segments: {Math.max(1, Math.ceil(newCampaignForm.steps[activeStepIndex].message.length / 160))}
                      </div>
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
                  Save as Draft
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
                            {isLaunching ? "Sending…" : campaign.status}
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
                            <button
                              onClick={() => handleLaunchCampaign(campaign.id)}
                              disabled={isLaunching}
                              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                            >
                              Launch
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
                    {campaignSearch ? "No campaigns match your search." : "No campaigns yet. Create one to get started."}
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
                <button
                  onClick={() => setShowAddContact((v) => !v)}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm hover:bg-violet-700"
                >
                  + Add Contact
                </button>
                <div className="flex items-center gap-2">
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
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFileSelect} />
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

        {activeTab === "numbers" && (
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Buy a Number</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Search by area code to find available numbers.
                </p>

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
                  Wallet: {formatCurrency(currentUser.walletBalance || 0)} · $1.00 per number
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
                        disabled={buyingNumber === num.raw || (currentUser.walletBalance || 0) < 1}
                        className="w-full flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/60 px-5 py-4 text-left hover:bg-zinc-700/60 hover:border-violet-600 transition disabled:opacity-50"
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
                          {buyingNumber === num.raw ? "Buying..." : "$1.00"}
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

        {activeTab === "billing" && (
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

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAddFunds(25)}
                    disabled={!isSubscribed}
                    className="rounded-2xl border border-zinc-700 px-4 py-4 font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    $25
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
                    className="rounded-2xl border border-zinc-700 px-4 py-4 font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    $100
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
                      min="5"
                      step="1"
                      disabled={!isSubscribed}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 py-4 pl-8 pr-4 text-white outline-none placeholder:text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amt = parseFloat(customFundAmount);
                      if (!amt || amt < 5) {
                        setMessage("❌ Minimum amount is $5");
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

                {customFundAmount && parseFloat(customFundAmount) >= 5 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    ${parseFloat(customFundAmount).toFixed(2)} = ~{Math.floor(parseFloat(customFundAmount) / (currentUser.plan.messageCost || 0.012)).toLocaleString()} messages
                  </div>
                )}

                <div className="mt-4 text-xs text-zinc-500">
                  Payments are securely processed via Stripe. Minimum $5.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "opt-out" && (
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
          </div>
        )}

        {activeTab === "activity" && (
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
        {activeTab === "team" && (
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
                          <div className={`rounded-full px-3 py-1 text-xs ${
                            teamMemberDetail.profile.paused ? "bg-red-900 text-red-300" : "bg-emerald-900 text-emerald-300"
                          }`}>
                            {teamMemberDetail.profile.paused ? "PAUSED" : "ACTIVE"}
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
        {activeTab === "10dlc" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">10DLC A2P Registration</h2>
            <p className="text-zinc-400">
              US carriers require 10DLC registration for business text messaging (A2P). This registration is handled
              directly through the Telnyx dashboard to ensure full compliance.
            </p>

            <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="text-lg font-semibold">How to Register</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Log into your Telnyx Dashboard</p>
                    <p className="text-sm text-zinc-400">Go to the Telnyx Mission Control Portal and navigate to Messaging &gt; 10DLC.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Register Your Brand</p>
                    <p className="text-sm text-zinc-400">Provide your business name, EIN, address, and contact information. Brand review typically takes 1-5 business days.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Register Your Campaign</p>
                    <p className="text-sm text-zinc-400">Once your brand is approved, create a campaign describing your messaging use case. Campaign reviews take 10-15 business days.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium">Associate Your Numbers</p>
                    <p className="text-sm text-zinc-400">After campaign approval, link your purchased phone numbers to the campaign. You can then send messages with full carrier compliance.</p>
                  </div>
                </div>
              </div>

              <a
                href="https://portal.telnyx.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-2xl bg-violet-600 px-8 py-3 font-medium hover:bg-violet-700"
              >
                Open Telnyx Dashboard
              </a>
            </div>

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
                <p className="text-sm text-zinc-500">No phone numbers yet. Purchase numbers from the Phone Numbers tab.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Schedule Message Modal ── */}
      {/* ── CSV Import Wizard Modal ── */}
      {csvWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            {/* Header with steps */}
            <div className="border-b border-zinc-800 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Import CSV File</h2>
                <button onClick={() => { setCsvWizardOpen(false); setCsvWizardStep(1); setCsvRawHeaders([]); setCsvRawData([]); setCsvFieldMapping({}); setCsvWizardCampaignId(""); setCsvWizardTags(""); setCsvFileName(""); setCsvWizardAutoSend(false); }}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { num: 1, label: "Select File" },
                  { num: 2, label: "Map Fields" },
                  { num: 3, label: "Configure" },
                ].map((s, i) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      csvWizardStep > s.num ? "bg-emerald-600 text-white" : csvWizardStep === s.num ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500"
                    }`}>{s.num}</div>
                    <span className={`text-sm ${csvWizardStep >= s.num ? "text-white" : "text-zinc-500"}`}>{s.label}</span>
                    {i < 2 && <div className={`h-0.5 w-8 ${csvWizardStep > s.num ? "bg-emerald-600" : "bg-zinc-700"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Map Fields */}
            {csvWizardStep === 2 && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <p className="text-emerald-400 font-semibold mb-4">Total Leads Found: {csvRawData.length.toLocaleString()}</p>

                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-3 gap-4 bg-zinc-800/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <div>Column Header from File</div>
                    <div>Preview</div>
                    <div>Contact Field</div>
                  </div>

                  {/* Table rows */}
                  {csvRawHeaders.map((header) => {
                    const preview = csvRawData.slice(0, 2).map((r) => r[header]).filter(Boolean);
                    return (
                      <div key={header} className="grid grid-cols-3 gap-4 items-center border-t border-zinc-800 px-4 py-3">
                        <div className="text-sm font-medium">{header}</div>
                        <div className="text-xs text-zinc-500 truncate">{preview.join(", ") || "—"}</div>
                        <select
                          value={csvFieldMapping[header] || ""}
                          onChange={(e) => setCsvFieldMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                        >
                          {CSV_CONTACT_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Configure — Campaign + Tags + Auto-send */}
            {csvWizardStep === 3 && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <p className="text-emerald-400 font-semibold">Total Leads Found: {csvRawData.length.toLocaleString()}</p>

                <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
                  <div className="text-xs text-zinc-500 mb-1">File Name</div>
                  <div className="text-sm">{csvFileName}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Assign to Campaign</label>
                    <select
                      value={csvWizardCampaignId}
                      onChange={(e) => setCsvWizardCampaignId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                    >
                      <option value="">No campaign</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Tags (comma separated)</label>
                    <input
                      value={csvWizardTags}
                      onChange={(e) => setCsvWizardTags(e.target.value)}
                      placeholder="e.g. new-lead, facebook, batch-1"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none placeholder:text-zinc-500"
                    />
                  </div>

                  {csvWizardCampaignId && (
                    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                      <input
                        type="checkbox"
                        checked={csvWizardAutoSend}
                        onChange={(e) => setCsvWizardAutoSend(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-600 accent-violet-600"
                      />
                      <div>
                        <div className="text-sm font-medium">Start texting immediately after import</div>
                        <div className="text-xs text-zinc-500">The selected campaign will launch automatically once contacts are imported</div>
                      </div>
                    </label>
                  )}
                </div>

                <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-300">
                  By uploading a list to Text2Sale, you certify that you have received Opt-In consent to message everyone in the list. Proof of Opt-In may be requested for any lead in this upload, if needed.
                </div>

                {/* Field mapping summary */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Field Mapping Summary</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {Object.entries(csvFieldMapping).filter(([, v]) => v).map(([header, field]) => (
                      <div key={header} className="flex justify-between py-1">
                        <span className="text-zinc-400">{header}</span>
                        <span className="text-violet-400">{CSV_CONTACT_FIELDS.find((f) => f.value === field)?.label || field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer with navigation */}
            <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (csvWizardStep === 2) {
                    setCsvWizardOpen(false); setCsvWizardStep(1); setCsvRawHeaders([]); setCsvRawData([]);
                  } else if (csvWizardStep === 3) {
                    setCsvWizardStep(2);
                  }
                }}
                className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm hover:bg-zinc-800 transition"
              >
                &larr; Back
              </button>

              {csvWizardStep === 2 && (
                <button
                  onClick={() => {
                    const hasMapped = Object.values(csvFieldMapping).some((v) => v === "phone" || v === "first_name");
                    if (!hasMapped) {
                      setMessage("❌ Map at least Phone Number or First Name to continue");
                      window.setTimeout(() => setMessage(""), 3000);
                      return;
                    }
                    setCsvWizardStep(3);
                  }}
                  className="rounded-2xl bg-violet-600 px-8 py-3 text-sm font-medium hover:bg-violet-700 transition"
                >
                  Next &rarr;
                </button>
              )}

              {csvWizardStep === 3 && (
                <button
                  onClick={handleCSVWizardSubmit}
                  disabled={csvImporting}
                  className="rounded-2xl bg-violet-600 px-8 py-3 text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {csvImporting ? "Importing..." : csvWizardAutoSend ? "Submit & Send" : "Submit"}
                </button>
              )}
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

      {message && (
        <div className={`fixed bottom-8 right-8 rounded-2xl px-6 py-4 shadow-2xl text-sm font-medium ${
          message.startsWith("❌")
            ? "bg-red-950 text-red-200 ring-1 ring-red-800"
            : "bg-emerald-950 text-emerald-200 ring-1 ring-emerald-800"
        }`}>
          {message}
        </div>
      )}
    </main>
  );
}