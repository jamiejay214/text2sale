"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import {
  fetchAllProfiles, fetchAllCampaigns, updateProfile,
  addUsageEntry, fetchProfile, fetchContacts,
} from "@/lib/supabase-data";
import type { Profile, Campaign, UsageHistoryItem, OwnedNumber } from "@/lib/types";
import USMapChart from "@/components/USMapChart";

// Adapter types to keep JSX working with camelCase
type AccountRecord = {
  id: string;
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
  role?: "user" | "admin" | "manager";
  subscriptionStatus?: "active" | "canceling" | "past_due" | "inactive";
  freeSubscription?: boolean;
  aiPlan?: boolean;
  freeAiPlan?: boolean;
  teamCode?: string;
  managerId?: string | null;
  referralCode?: string;
  a2pStatus?: string;
  a2pBusinessName?: string;
  a2pEin?: string;
  einCertificatePath?: string | null;
  einCertificateName?: string | null;
  einCertificateType?: string | null;
  einCertificateUploadedAt?: string | null;
  stripeCustomerId?: string | null;
  totalDeposited?: number;
  contactCount?: number;
};

type CampaignRecord = {
  id: string;
  userId: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: string;
  message: string;
  createdAt: string;
  logs: { id: string; createdAt: string; success: number; failed: number; attempted: number; notes: string }[];
};

type AdminTab = "overview" | "users" | "campaigns" | "analytics" | "transactions" | "numbers" | "support" | "settings";

type SupportThread = {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: { id: string; sender_role: string; message: string; created_at: string }[];
};

type NewUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

function profileToAccount(p: Profile): AccountRecord {
  return {
    id: p.id, role: p.role, firstName: p.first_name, lastName: p.last_name,
    phone: p.phone, email: p.email, credits: p.credits, verified: p.verified,
    paused: p.paused, workflowNote: p.workflow_note,
    usageHistory: p.usage_history || [], plan: p.plan,
    createdAt: p.created_at, walletBalance: Number(p.wallet_balance),
    ownedNumbers: p.owned_numbers || [],
    subscriptionStatus: p.subscription_status || "inactive",
    freeSubscription: p.free_subscription || false,
    aiPlan: p.ai_plan || false,
    freeAiPlan: p.free_ai_plan || false,
    teamCode: p.team_code || "", managerId: p.manager_id, referralCode: p.referral_code || "",
    a2pStatus: p.a2p_registration?.status || "not_started",
    a2pBusinessName: p.a2p_registration?.businessName || "",
    a2pEin: p.a2p_registration?.ein || "",
    einCertificatePath: p.a2p_registration?.einCertificatePath || null,
    einCertificateName: p.a2p_registration?.einCertificateName || null,
    einCertificateType: p.a2p_registration?.einCertificateType || null,
    einCertificateUploadedAt: p.a2p_registration?.einCertificateUploadedAt || null,
    stripeCustomerId: p.stripe_customer_id,
    totalDeposited: p.total_deposited || 0,
  };
}

function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "T2S-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function campaignToRecord(c: Campaign): CampaignRecord {
  return {
    id: c.id, userId: c.user_id, name: c.name, audience: c.audience, sent: c.sent,
    replies: c.replies, failed: c.failed, status: c.status, message: c.message || "",
    createdAt: c.created_at, logs: c.logs || [],
  };
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function subStatusBadge(status?: string) {
  switch (status) {
    case "active": return { label: "Active", cls: "bg-emerald-900 text-emerald-300" };
    case "canceling": return { label: "Canceling", cls: "bg-amber-900 text-amber-300" };
    case "past_due": return { label: "Past Due", cls: "bg-red-900 text-red-300" };
    default: return { label: "Inactive", cls: "bg-zinc-700 text-zinc-400" };
  }
}

function a2pStatusBadge(status?: string) {
  switch (status) {
    case "completed": return { label: "Approved", cls: "bg-emerald-900 text-emerald-300" };
    case "campaign_approved":
    case "campaign_pending":
    case "brand_pending":
    case "brand_approved": return { label: "Pending", cls: "bg-amber-900 text-amber-300" };
    case "brand_failed":
    case "campaign_failed": return { label: "Failed", cls: "bg-red-900 text-red-300" };
    default: return { label: "Not Started", cls: "bg-zinc-700 text-zinc-400" };
  }
}

export default function AdminPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "active" | "inactive" | "paused">("all");
  const [message, setMessage] = useState("");
  const [txSort, setTxSort] = useState<"newest" | "oldest" | "largest">("newest");
  const [txFilter, setTxFilter] = useState<"all" | "charge" | "fund_add" | "credit_add" | "number_purchase">("all");

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createUserError, setCreateUserError] = useState("");
  const [deleteUserError, setDeleteUserError] = useState("");
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  const [bulkCreditAmount, setBulkCreditAmount] = useState("50");
  const [globalMessageCost, setGlobalMessageCost] = useState(0.012);
  const [globalNumberCost, setGlobalNumberCost] = useState(1.0);
  const [globalSubscriptionPrice, setGlobalSubscriptionPrice] = useState(39.99);
  const [visitorAlerts, setVisitorAlerts] = useState(true);

  // Traffic analytics
  const [trafficToday, setTrafficToday] = useState(0);
  const [trafficWeek, setTrafficWeek] = useState(0);
  const [trafficMonth, setTrafficMonth] = useState(0);
  const [trafficTotal, setTrafficTotal] = useState(0);
  const [trafficByDay, setTrafficByDay] = useState<{ date: string; views: number; unique: number }[]>([]);
  const [trafficByState, setTrafficByState] = useState<Record<string, number>>({});
  const [newViewers, setNewViewers] = useState(0);
  const [returningViewers, setReturningViewers] = useState(0);

  // Support chat
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<string | null>(null);
  const [supportReplyInput, setSupportReplyInput] = useState("");
  const supportChatEndRef = React.useRef<HTMLDivElement>(null);

  // New-chat initiation modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [newChatUserId, setNewChatUserId] = useState<string | null>(null);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [newChatSending, setNewChatSending] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/"); return; }

      const myProfile = await fetchProfile(session.user.id);
      if (!myProfile || myProfile.role !== "admin") { router.replace("/dashboard"); return; }
      setAdminUserId(session.user.id);

      const [profiles, dbCampaigns] = await Promise.all([
        fetchAllProfiles(),
        fetchAllCampaigns(),
      ]);

      const accts = profiles.map(profileToAccount);
      setAccounts(accts);
      setCampaigns(dbCampaigns.map(campaignToRecord));

      // Load contact counts per user
      const counts: Record<string, number> = {};
      await Promise.all(accts.map(async (a) => {
        const contacts = await fetchContacts(a.id);
        counts[a.id] = contacts.length;
      }));
      setContactCounts(counts);

      if (accts.length > 0) setSelectedId(accts[0].id);

      // Load visitor alerts preference
      if (myProfile.visitor_alerts !== undefined) {
        setVisitorAlerts(myProfile.visitor_alerts !== false);
      }

      // Load traffic analytics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [todayRes, weekRes, monthRes, totalRes] = await Promise.all([
        supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("page_views").select("id", { count: "exact", head: true }),
      ]);
      setTrafficToday(todayRes.count || 0);
      setTrafficWeek(weekRes.count || 0);
      setTrafficMonth(monthRes.count || 0);
      setTrafficTotal(totalRes.count || 0);

      // Daily breakdown for last 14 days
      const days: { date: string; views: number; unique: number }[] = [];
      const { data: recentViews } = await supabase
        .from("page_views")
        .select("created_at, ip_hash")
        .gte("created_at", new Date(now.getTime() - 14 * 86400000).toISOString())
        .order("created_at", { ascending: true });

      if (recentViews) {
        const dayMap = new Map<string, { views: number; ips: Set<string> }>();
        for (const v of recentViews) {
          const d = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!dayMap.has(d)) dayMap.set(d, { views: 0, ips: new Set() });
          const entry = dayMap.get(d)!;
          entry.views++;
          entry.ips.add(v.ip_hash || "");
        }
        for (const [date, { views, ips }] of dayMap) {
          days.push({ date, views, unique: ips.size });
        }
      }
      setTrafficByDay(days);

      // Compute new vs returning viewers (last 14 days window)
      if (recentViews && recentViews.length > 0) {
        const ipsInWindow = new Set(recentViews.map((v) => v.ip_hash).filter(Boolean));
        const windowStart = new Date(now.getTime() - 14 * 86400000).toISOString();
        // Find IPs that were seen BEFORE the window (returning visitors)
        const { data: priorViews } = await supabase
          .from("page_views")
          .select("ip_hash")
          .lt("created_at", windowStart)
          .not("ip_hash", "is", null);
        const priorIps = new Set((priorViews || []).map((v) => v.ip_hash));
        let newCount = 0;
        let returningCount = 0;
        for (const ip of ipsInWindow) {
          if (priorIps.has(ip)) returningCount++;
          else newCount++;
        }
        setNewViewers(newCount);
        setReturningViewers(returningCount);
      }

      // Load traffic by US state
      const { data: regionViews } = await supabase
        .from("page_views")
        .select("region, country")
        .eq("country", "US")
        .not("region", "is", null);
      if (regionViews) {
        const stateMap: Record<string, number> = {};
        for (const rv of regionViews) {
          if (rv.region) {
            stateMap[rv.region] = (stateMap[rv.region] || 0) + 1;
          }
        }
        setTrafficByState(stateMap);
      }

      // Load support messages
      const { data: supportMsgs } = await supabase
        .from("support_messages")
        .select("id, user_id, sender_role, message, created_at")
        .order("created_at", { ascending: true });

      if (supportMsgs && supportMsgs.length > 0) {
        const threadMap = new Map<string, SupportThread>();
        for (const msg of supportMsgs) {
          if (!threadMap.has(msg.user_id)) {
            const acct = accts.find((a) => a.id === msg.user_id);
            threadMap.set(msg.user_id, {
              userId: msg.user_id,
              userName: acct ? `${acct.firstName} ${acct.lastName}` : "Unknown User",
              userEmail: acct?.email || "",
              lastMessage: msg.message,
              lastMessageAt: msg.created_at,
              unreadCount: 0,
              messages: [],
            });
          }
          const thread = threadMap.get(msg.user_id)!;
          thread.messages.push({ id: msg.id, sender_role: msg.sender_role, message: msg.message, created_at: msg.created_at });
          thread.lastMessage = msg.message;
          thread.lastMessageAt = msg.created_at;
          if (msg.sender_role === "user") thread.unreadCount++;
        }
        const threads = [...threadMap.values()].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setSupportThreads(threads);
      }

      setMounted(true);
    };
    loadData();
  }, [router]);

  // Realtime subscription for support messages (admin sees all)
  useEffect(() => {
    if (!mounted) return;
    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        const msg = payload.new as { id: string; user_id: string; sender_role: string; message: string; created_at: string };
        setSupportThreads((prev) => {
          const existing = prev.find((t) => t.userId === msg.user_id);
          if (existing) {
            return prev.map((t) =>
              t.userId === msg.user_id
                ? {
                    ...t,
                    messages: [...t.messages, { id: msg.id, sender_role: msg.sender_role, message: msg.message, created_at: msg.created_at }],
                    lastMessage: msg.message,
                    lastMessageAt: msg.created_at,
                    unreadCount: msg.sender_role === "user" ? t.unreadCount + 1 : t.unreadCount,
                  }
                : t
            ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          } else {
            // New thread from a user we haven't seen
            const acct = accounts.find((a) => a.id === msg.user_id);
            return [
              {
                userId: msg.user_id,
                userName: acct ? `${acct.firstName} ${acct.lastName}` : "Unknown User",
                userEmail: acct?.email || "",
                lastMessage: msg.message,
                lastMessageAt: msg.created_at,
                unreadCount: msg.sender_role === "user" ? 1 : 0,
                messages: [{ id: msg.id, sender_role: msg.sender_role, message: msg.message, created_at: msg.created_at }],
              },
              ...prev,
            ];
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mounted, accounts]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId) || null,
    [accounts, selectedId]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acct) => {
      const matchesSearch = `${acct.firstName} ${acct.lastName} ${acct.email} ${acct.phone}`
        .toLowerCase().includes(search.toLowerCase());
      if (userFilter === "active") return matchesSearch && acct.subscriptionStatus === "active" && !acct.paused;
      if (userFilter === "inactive") return matchesSearch && acct.subscriptionStatus !== "active";
      if (userFilter === "paused") return matchesSearch && acct.paused;
      return matchesSearch;
    });
  }, [accounts, search, userFilter]);

  const passwordChecks = useMemo(() => getPasswordChecks(newUserForm.password), [newUserForm.password]);
  const passwordStrongEnough = passwordChecks.minLength && passwordChecks.upper && passwordChecks.number;

  // ── Computed metrics ──
  const totalRevenue = useMemo(() => accounts.reduce((sum, a) => sum + (a.totalDeposited || 0), 0), [accounts]);
  const mrr = useMemo(() => accounts.filter((a) => a.subscriptionStatus === "active" || a.subscriptionStatus === "canceling").reduce((sum, a) => sum + (a.plan.price || 39.99), 0), [accounts]);
  const activeSubscribers = useMemo(() => accounts.filter((a) => a.subscriptionStatus === "active" || a.subscriptionStatus === "canceling").length, [accounts]);
  const totalMessagesSent = useMemo(() => campaigns.reduce((s, c) => s + c.sent, 0), [campaigns]);
  const totalFailed = useMemo(() => campaigns.reduce((s, c) => s + c.failed, 0), [campaigns]);
  const totalReplies = useMemo(() => campaigns.reduce((s, c) => s + c.replies, 0), [campaigns]);
  const totalNumbers = useMemo(() => accounts.reduce((s, a) => s + (a.ownedNumbers?.length || 0), 0), [accounts]);
  const totalContacts = useMemo(() => Object.values(contactCounts).reduce((s, c) => s + c, 0), [contactCounts]);
  const deliveryRate = useMemo(() => {
    const total = totalMessagesSent + totalFailed;
    return total > 0 ? ((totalMessagesSent / total) * 100).toFixed(1) : "0.0";
  }, [totalMessagesSent, totalFailed]);

  const recentSignups = useMemo(() => {
    return [...accounts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [accounts]);

  const allTransactions = useMemo(() => {
    const items = accounts.flatMap((a) =>
      (a.usageHistory || []).map((item) => ({
        ...item,
        userId: a.id,
        userName: `${a.firstName} ${a.lastName}`,
        userEmail: a.email,
      }))
    );
    if (txFilter !== "all") {
      const filtered = items.filter((i) => i.type === txFilter);
      if (txSort === "newest") return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (txSort === "oldest") return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return filtered.sort((a, b) => b.amount - a.amount);
    }
    if (txSort === "newest") return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (txSort === "oldest") return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return items.sort((a, b) => b.amount - a.amount);
  }, [accounts, txSort, txFilter]);

  const txTotals = useMemo(() => {
    const deposits = allTransactions.filter((t) => t.type === "fund_add" || t.type === "credit_add").reduce((s, t) => s + t.amount, 0);
    const charges = allTransactions.filter((t) => t.type === "charge" || t.type === "number_purchase").reduce((s, t) => s + t.amount, 0);
    return { deposits, charges, net: deposits - charges };
  }, [allTransactions]);

  const selectedThread = useMemo(() => supportThreads.find((t) => t.userId === selectedThreadUserId) || null, [supportThreads, selectedThreadUserId]);

  // Auto-scroll support chat
  useEffect(() => {
    if (selectedThread && supportChatEndRef.current) {
      supportChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedThread?.messages.length]);

  const handleSendSupportReply = async () => {
    if (!supportReplyInput.trim() || !selectedThreadUserId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from("support_messages").insert({
      user_id: selectedThreadUserId,
      sender_role: "admin",
      message: supportReplyInput.trim(),
    });
    setSupportReplyInput("");
  };

  const handleInitiateChat = async () => {
    if (!newChatUserId || !newChatMessage.trim()) return;
    setNewChatSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setNewChatSending(false); return; }

    await supabase.from("support_messages").insert({
      user_id: newChatUserId,
      sender_role: "admin",
      message: newChatMessage.trim(),
    });

    // Realtime sub will add the thread; select it immediately for UX
    setSelectedThreadUserId(newChatUserId);
    setShowNewChatModal(false);
    setNewChatUserId(null);
    setNewChatMessage("");
    setNewChatSearch("");
    setNewChatSending(false);
    setMessage("✅ Chat initiated!");
  };

  const refreshAccount = async (accountId: string) => {
    const profiles = await fetchAllProfiles();
    setAccounts(profiles.map(profileToAccount));
  };

  const resetCreateUserModal = () => {
    setShowCreateUserModal(false);
    setCreateUserError("");
    setShowPassword(false);
    setNewUserForm({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  };

  const closeDeleteUserModal = () => {
    setShowDeleteUserModal(false);
    setDeleteUserError("");
  };

  const handleAddCredits = async (accountId: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("❌ Enter a valid credit amount");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;

    const entry: UsageHistoryItem = {
      id: `admin_${Date.now()}`, type: "credit_add", amount,
      description: "Admin added credits", createdAt: new Date().toISOString(),
    };

    await updateProfile(accountId, {
      credits: Number((acct.credits + amount).toFixed(3)),
      wallet_balance: Number(((acct.walletBalance || 0) + amount).toFixed(2)),
      usage_history: addUsageEntry(acct.usageHistory || [], entry),
    });

    await refreshAccount(accountId);
    setMessage("✅ Credits added");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleRemoveCredits = async (accountId: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("❌ Enter a valid credit amount");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;

    const entry: UsageHistoryItem = {
      id: `admin_${Date.now()}`, type: "credit_remove", amount,
      description: "Admin removed credits", createdAt: new Date().toISOString(),
    };

    await updateProfile(accountId, {
      credits: Math.max(0, Number((acct.credits - amount).toFixed(3))),
      wallet_balance: Math.max(0, Number(((acct.walletBalance || 0) - amount).toFixed(2))),
      usage_history: addUsageEntry(acct.usageHistory || [], entry),
    });

    await refreshAccount(accountId);
    setMessage("✅ Credits removed");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const togglePause = async (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return;
    await updateProfile(id, { paused: !acct.paused });
    await refreshAccount(id);
    setMessage(acct.paused ? "✅ Account unpaused" : "✅ Account paused");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const toggleFreeSubscription = async (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return;
    const next = !acct.freeSubscription;
    // When granting, also flip subscription_status to "active" so all
    // downstream UI (badges, gating) reflects it immediately. When revoking,
    // drop to "inactive" unless they have a real Stripe sub — Stripe will
    // re-sync from the next webhook.
    const update: Record<string, unknown> = { free_subscription: next };
    if (next) update.subscription_status = "active";
    else if (acct.subscriptionStatus === "active" && !acct.stripeCustomerId) {
      update.subscription_status = "inactive";
    }
    await updateProfile(id, update);
    await refreshAccount(id);
    setMessage(next ? "✅ Free subscription granted" : "✅ Free subscription revoked");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const toggleAiPlan = async (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return;
    const next = !acct.aiPlan;
    await updateProfile(id, { ai_plan: next });
    await refreshAccount(id);
    setMessage(next ? "✅ AI plan activated" : "✅ AI plan deactivated");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const toggleFreeAiPlan = async (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return;
    const next = !acct.freeAiPlan;
    const update: Record<string, unknown> = { free_ai_plan: next };
    if (next) update.ai_plan = true;
    await updateProfile(id, update);
    await refreshAccount(id);
    setMessage(next ? "✅ Free AI plan granted" : "✅ Free AI plan revoked");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const createNewUser = async () => {
    setCreateUserError("");
    if (!newUserForm.firstName.trim()) return setCreateUserError("First name is required.");
    if (!newUserForm.lastName.trim()) return setCreateUserError("Last name is required.");
    if (!newUserForm.email.trim()) return setCreateUserError("Email is required.");
    if (!isValidEmail(newUserForm.email.trim())) return setCreateUserError("Enter a valid email address.");
    const emailExists = accounts.some((a) => a.email.trim().toLowerCase() === newUserForm.email.trim().toLowerCase());
    if (emailExists) return setCreateUserError("A user with that email already exists.");
    if (!newUserForm.phone.trim()) return setCreateUserError("Phone number is required.");
    if (newUserForm.phone.replace(/\D/g, "").length < 10) return setCreateUserError("Enter a valid 10-digit phone number.");
    if (!newUserForm.password.trim()) return setCreateUserError("Password is required.");
    if (!passwordStrongEnough) return setCreateUserError("Password must be at least 8 characters and include 1 uppercase letter and 1 number.");
    if (!newUserForm.confirmPassword.trim()) return setCreateUserError("Confirm password is required.");
    if (newUserForm.password !== newUserForm.confirmPassword) return setCreateUserError("Passwords do not match.");
    setCreateUserError("Admin user creation requires server-side setup. Have the user sign up at the login page, then manage them here.");
  };

  const handleDeleteSelectedUser = async () => {
    if (!selectedAccount) return setDeleteUserError("No user selected.");
    if (selectedAccount.role === "admin") return setDeleteUserError("Admin accounts cannot be deleted from this screen.");

    setDeleteUserError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return setDeleteUserError("Session expired. Please re-login.");
    }

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetUserId: selectedAccount.id }),
      });
      const result = await res.json();
      if (!result.success) {
        return setDeleteUserError(result.error || "Failed to delete user.");
      }

      setAccounts((prev) => prev.filter((a) => a.id !== selectedAccount.id));
      closeDeleteUserModal();
      setMessage(`✅ ${selectedAccount.firstName} ${selectedAccount.lastName} deleted`);
      window.setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setDeleteUserError(err instanceof Error ? err.message : "Network error.");
    }
  };

  const handlePromoteToManager = async (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;
    const newRole = acct.role === "manager" ? "user" : "manager";
    await updateProfile(accountId, { role: newRole } as Partial<Profile>);
    await refreshAccount(accountId);
    setMessage(newRole === "manager" ? `✅ ${acct.firstName} promoted to Manager` : `✅ ${acct.firstName} demoted to User`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveGlobalSettings = async () => {
    let updated = 0;
    for (const acct of accounts) {
      await updateProfile(acct.id, {
        plan: { ...acct.plan, messageCost: globalMessageCost, price: globalSubscriptionPrice },
      } as Partial<Profile>);
      updated++;
    }
    const profiles = await fetchAllProfiles();
    setAccounts(profiles.map(profileToAccount));
    setMessage(`✅ Global pricing updated for ${updated} users — $${globalSubscriptionPrice}/mo, $${globalMessageCost}/msg`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveUserPricing = async (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;
    await updateProfile(accountId, {
      plan: { ...acct.plan, messageCost: acct.plan.messageCost, price: acct.plan.price },
    } as Partial<Profile>);
    setMessage(`✅ ${acct.firstName}'s pricing updated — $${acct.plan.price}/mo, $${acct.plan.messageCost}/msg`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const exportUsersCSV = () => {
    const headers = "FirstName,LastName,Email,Phone,Wallet,Subscription,10DLC,Numbers,Contacts,JoinDate";
    const csv = accounts.map((a) =>
      `${a.firstName},${a.lastName},${a.email},${a.phone},${a.walletBalance?.toFixed(2) || "0.00"},${a.subscriptionStatus || "inactive"},${a.a2pStatus},${a.ownedNumbers?.length || 0},${contactCounts[a.id] || 0},${new Date(a.createdAt).toLocaleDateString()}`
    ).join("\n");
    const blob = new Blob([`${headers}\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `text2sale-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    // Show nothing until auth + role check completes — prevents non-admins from seeing any admin UI
    return <main className="min-h-screen bg-zinc-950" />;
  }

  const campaignOwner = (userId: string) => {
    const acct = accounts.find((a) => a.id === userId);
    return acct ? `${acct.firstName} ${acct.lastName}` : "Unknown";
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="text-2xl font-light text-zinc-500">|</span>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-300">Admin</h1>
            </div>
            <p className="mt-1 text-zinc-400">
              {accounts.length} users · {activeSubscribers} subscribed · {totalNumbers} numbers · {totalContacts.toLocaleString()} contacts
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push("/")} className="rounded-2xl border border-zinc-700 px-6 py-3 hover:bg-zinc-900">Home</button>
            <button onClick={() => router.push("/dashboard")} className="rounded-2xl bg-violet-600 px-6 py-3 hover:bg-violet-700">Dashboard</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex border-b border-zinc-800">
          {(["overview", "users", "campaigns", "analytics", "transactions", "numbers", "support", "settings"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 font-medium transition ${
                activeTab === tab ? "border-b-4 border-violet-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ═══════════════ OVERVIEW ═══════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Top KPIs */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Monthly Revenue (MRR)</div>
                <div className="mt-2 text-4xl font-bold text-emerald-400">{formatCurrency(mrr)}</div>
                <div className="mt-1 text-xs text-zinc-500">{activeSubscribers} active subscribers</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Total Deposited</div>
                <div className="mt-2 text-4xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="mt-1 text-xs text-zinc-500">Lifetime platform deposits</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Messages Sent</div>
                <div className="mt-2 text-4xl font-bold text-violet-400">{totalMessagesSent.toLocaleString()}</div>
                <div className="mt-1 text-xs text-zinc-500">{deliveryRate}% delivery rate · {totalFailed} failed</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Platform Contacts</div>
                <div className="mt-2 text-4xl font-bold text-sky-400">{totalContacts.toLocaleString()}</div>
                <div className="mt-1 text-xs text-zinc-500">{totalReplies} campaign replies</div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Recent Signups */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Recent Signups</h3>
                  <button onClick={() => setActiveTab("users")} className="text-xs text-violet-400 hover:text-violet-300">View all</button>
                </div>
                <div className="space-y-3">
                  {recentSignups.map((a) => {
                    const sub = subStatusBadge(a.subscriptionStatus);
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-2xl bg-zinc-800 p-4">
                        <div>
                          <div className="font-medium">{a.firstName} {a.lastName}</div>
                          <div className="text-xs text-zinc-400">{a.email}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sub.cls}`}>{sub.label}</span>
                          <span className="text-xs text-zinc-500">{timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-5">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="mb-4 text-lg font-bold">User Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-emerald-400">{accounts.filter((a) => a.subscriptionStatus === "active").length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Active</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-zinc-400">{accounts.filter((a) => a.subscriptionStatus === "inactive" || !a.subscriptionStatus).length}</div>
                      <div className="mt-1 text-xs text-zinc-400">No Subscription</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-amber-400">{accounts.filter((a) => a.subscriptionStatus === "canceling").length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Canceling</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-red-400">{accounts.filter((a) => a.paused).length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Paused</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                  <h3 className="mb-4 text-lg font-bold">10DLC Registration</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-emerald-400">{accounts.filter((a) => a.a2pStatus === "completed").length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Approved</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-amber-400">{accounts.filter((a) => ["brand_pending", "brand_approved", "campaign_pending", "campaign_approved"].includes(a.a2pStatus || "")).length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Pending</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-3xl font-bold text-zinc-400">{accounts.filter((a) => !a.a2pStatus || a.a2pStatus === "not_started").length}</div>
                      <div className="mt-1 text-xs text-zinc-400">Not Started</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Website Traffic */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Website Traffic</h3>
                <span className="text-xs text-zinc-500">Last 14 days</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                  <div className="text-2xl font-bold text-violet-400">{trafficToday.toLocaleString()}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">Today</div>
                </div>
                <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                  <div className="text-2xl font-bold text-sky-400">{trafficWeek.toLocaleString()}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">This Week</div>
                </div>
                <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{trafficMonth.toLocaleString()}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">30 Days</div>
                </div>
                <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                  <div className="text-2xl font-bold">{trafficTotal.toLocaleString()}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">All Time</div>
                </div>
              </div>

              {/* New vs Returning Viewers */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-emerald-400">{newViewers.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-zinc-400">New Viewers</div>
                    </div>
                    <div className="text-3xl">🆕</div>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-500">First-time visitors in the last 14 days</div>
                </div>
                <div className="rounded-2xl border border-sky-800/40 bg-sky-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-sky-400">{returningViewers.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-zinc-400">Returning Viewers</div>
                    </div>
                    <div className="text-3xl">🔁</div>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-500">Visitors who&apos;ve been here before</div>
                </div>
              </div>
              {trafficByDay.length > 0 && (
                <div>
                  <div className="mb-3 text-xs text-zinc-500 uppercase tracking-wide">Daily Views</div>
                  <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
                    {trafficByDay.map((d) => {
                      const maxViews = Math.max(...trafficByDay.map((x) => x.views), 1);
                      const pct = (d.views / maxViews) * 100;
                      return (
                        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                          <div className="text-[9px] text-zinc-500">{d.views}</div>
                          <div
                            className="w-full rounded-t bg-violet-600 transition-all min-h-[4px]"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                            title={`${d.date}: ${d.views} views, ${d.unique} unique`}
                          />
                          <div className="text-[8px] text-zinc-600 truncate w-full text-center">{d.date.replace(/\s/g, "\n")}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-zinc-400">Date</th>
                          <th className="px-3 py-2 text-right text-zinc-400">Views</th>
                          <th className="px-3 py-2 text-right text-zinc-400">Unique</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {[...trafficByDay].reverse().map((d) => (
                          <tr key={d.date} className="hover:bg-zinc-800/50">
                            <td className="px-3 py-2">{d.date}</td>
                            <td className="px-3 py-2 text-right text-violet-400">{d.views}</td>
                            <td className="px-3 py-2 text-right text-sky-400">{d.unique}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {trafficByDay.length === 0 && (
                <div className="text-center text-sm text-zinc-500 py-6">No traffic data yet. Views will appear as visitors land on your site.</div>
              )}
            </div>

            {/* US Visitor Map */}
            <USMapChart stateData={trafficByState} />
          </div>
        )}

        {/* ═══════════════ USERS ═══════════════ */}
        {activeTab === "users" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              <div className="mb-4 flex justify-between">
                <h2 className="text-2xl font-bold">Users ({filteredAccounts.length})</h2>
                <div className="flex gap-3">
                  <button onClick={exportUsersCSV} className="rounded-2xl border border-zinc-700 px-5 py-2 text-sm">Export</button>
                  <button onClick={() => { setCreateUserError(""); setShowCreateUserModal(true); }} className="rounded-2xl bg-violet-600 px-6 py-2">+ New</button>
                </div>
              </div>

              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
                className="mb-3 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />

              <div className="mb-4 flex gap-2">
                {(["all", "active", "inactive", "paused"] as const).map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${userFilter === f ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="max-h-[560px] space-y-3 overflow-y-auto">
                {filteredAccounts.map((acct) => {
                  const sub = subStatusBadge(acct.subscriptionStatus);
                  return (
                    <div key={acct.id} onClick={() => setSelectedId(acct.id)}
                      className={`cursor-pointer rounded-2xl p-4 transition ${selectedId === acct.id ? "border border-violet-600 bg-violet-900/30" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{acct.firstName} {acct.lastName}</span>
                          {acct.role === "admin" && <span className="rounded-full bg-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-300">ADMIN</span>}
                          {acct.role === "manager" && <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] font-medium text-amber-300">MGR</span>}
                        </div>
                        <div className="flex gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sub.cls}`}>{sub.label}</span>
                          {acct.freeSubscription && <span className="rounded-full bg-emerald-900 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">FREE</span>}
                          {acct.aiPlan && <span className="rounded-full bg-cyan-900 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300">AI</span>}
                          {acct.freeAiPlan && <span className="rounded-full bg-emerald-900 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">FREE AI</span>}
                          {acct.paused && <span className="rounded-full bg-red-900 px-2.5 py-0.5 text-[10px] font-medium text-red-300">PAUSED</span>}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">{acct.email}</div>
                      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                        <span>{formatCurrency(acct.walletBalance || 0)}</span>
                        <span>{acct.ownedNumbers?.length || 0} numbers</span>
                        <span>{contactCounts[acct.id] || 0} contacts</span>
                        <span>{timeAgo(acct.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredAccounts.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">No users found.</div>
                )}
              </div>
            </div>

            {/* User Detail Panel */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              {selectedAccount ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedAccount.firstName} {selectedAccount.lastName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                          selectedAccount.role === "admin" ? "bg-violet-900 text-violet-300" :
                          selectedAccount.role === "manager" ? "bg-amber-900 text-amber-300" : "bg-zinc-700 text-zinc-300"
                        }`}>{selectedAccount.role?.toUpperCase() || "USER"}</span>
                        {(() => { const s = subStatusBadge(selectedAccount.subscriptionStatus); return <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${s.cls}`}>Sub: {s.label}</span>; })()}
                        {selectedAccount.freeSubscription && <span className="rounded-full bg-emerald-900 px-3 py-0.5 text-xs font-medium text-emerald-300">FREE (Comp)</span>}
                        {(() => { const a = a2pStatusBadge(selectedAccount.a2pStatus); return <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${a.cls}`}>10DLC: {a.label}</span>; })()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/dashboard?impersonate=${selectedAccount.id}`)}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm hover:bg-sky-700 flex items-center gap-1.5">
                        <span>👁️</span> View as User
                      </button>
                      {selectedAccount.role !== "admin" && (
                        <button onClick={() => handlePromoteToManager(selectedAccount.id)}
                          className={`rounded-xl px-4 py-2 text-sm ${selectedAccount.role === "manager" ? "border border-amber-600 text-amber-300 hover:bg-amber-900/30" : "bg-amber-600 hover:bg-amber-700"}`}>
                          {selectedAccount.role === "manager" ? "Demote" : "Make Manager"}
                        </button>
                      )}
                      {selectedAccount.role !== "admin" && (
                        <button onClick={() => { setDeleteUserError(""); setShowDeleteUserModal(true); }}
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm hover:bg-red-700">Delete</button>
                      )}
                    </div>
                  </div>

                  {/* Manager info */}
                  {selectedAccount.role === "manager" && (
                    <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
                      <div className="text-sm font-medium text-amber-300">Team Manager</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Code: <span className="font-mono font-bold text-white">{selectedAccount.referralCode}</span>
                        {" · "}{accounts.filter((a) => a.managerId === selectedAccount.id).length} team members
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedAccount.walletBalance || 0)}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">Wallet</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold">{selectedAccount.ownedNumbers?.length || 0}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">Numbers</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold">{contactCounts[selectedAccount.id] || 0}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">Contacts</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                      <div className="text-2xl font-bold">{campaigns.filter((c) => c.userId === selectedAccount.id).length}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">Campaigns</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Email</div>
                      <div className="mt-1 text-sm font-medium">{selectedAccount.email}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Phone</div>
                      <div className="mt-1 text-sm font-medium">{selectedAccount.phone}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Joined</div>
                      <div className="mt-1 text-sm font-medium">{new Date(selectedAccount.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Msg Cost</div>
                      <div className="mt-1 text-sm font-medium">${selectedAccount.plan.messageCost}/msg</div>
                    </div>
                  </div>

                  {/* Phone Numbers */}
                  {(selectedAccount.ownedNumbers?.length || 0) > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Phone Numbers</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedAccount.ownedNumbers?.map((n) => (
                          <span key={n.id} className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-mono">{n.number} <span className="text-zinc-500">{n.alias || ""}</span></span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 10DLC / EIN Details */}
                  {(selectedAccount.a2pStatus && selectedAccount.a2pStatus !== "not_started") && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">10DLC / EIN</div>
                        {(() => { const a = a2pStatusBadge(selectedAccount.a2pStatus); return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${a.cls}`}>{a.label}</span>; })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedAccount.a2pBusinessName && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Business</div>
                            <div className="mt-0.5 font-medium">{selectedAccount.a2pBusinessName}</div>
                          </div>
                        )}
                        {selectedAccount.a2pEin && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-zinc-500">EIN</div>
                            <div className="mt-0.5 font-mono">{selectedAccount.a2pEin}</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">EIN Certificate</div>
                        {selectedAccount.einCertificatePath ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-3 py-2.5">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-emerald-400">📄</span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{selectedAccount.einCertificateName || "certificate"}</div>
                                {selectedAccount.einCertificateUploadedAt && (
                                  <div className="text-[11px] text-zinc-500">
                                    Uploaded {new Date(selectedAccount.einCertificateUploadedAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!adminUserId) return;
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  const res = await fetch("/api/ein-certificate-url", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                                    },
                                    body: JSON.stringify({ userId: selectedAccount.id }),
                                  });
                                  const json = await res.json();
                                  if (json.success && json.url) {
                                    window.open(json.url, "_blank");
                                  } else {
                                    alert(json.error || "Could not generate download link");
                                  }
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Download failed");
                                }
                              }}
                              className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                            >
                              <span>⬇</span> Download
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-zinc-700 px-3 py-3 text-xs text-zinc-500">
                            User has not uploaded an EIN certificate yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Credit Management */}
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input type="number" value={bulkCreditAmount} onChange={(e) => setBulkCreditAmount(e.target.value)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" placeholder="Amount" />
                    <button onClick={() => handleAddCredits(selectedAccount.id, Number(bulkCreditAmount))}
                      className="rounded-2xl bg-emerald-600 px-8 py-3 hover:bg-emerald-700">+ Add</button>
                    <button onClick={() => handleRemoveCredits(selectedAccount.id, Number(bulkCreditAmount))}
                      className="rounded-2xl bg-red-600 px-8 py-3 hover:bg-red-700">- Remove</button>
                  </div>

                  <button onClick={() => togglePause(selectedAccount.id)}
                    className={`w-full rounded-2xl py-3.5 font-medium ${selectedAccount.paused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                    {selectedAccount.paused ? "Unpause Account" : "Pause Account"}
                  </button>

                  {/* Free subscription toggle — grants paid-feature access
                      without requiring a Stripe subscription. */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/50 px-5 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">Free Subscription</div>
                      <div className="text-xs text-zinc-400">
                        {selectedAccount.freeSubscription
                          ? "User has comp access — Stripe will not override."
                          : "Grant this user full paid features at no cost."}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFreeSubscription(selectedAccount.id)}
                      role="switch"
                      aria-checked={!!selectedAccount.freeSubscription}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        selectedAccount.freeSubscription ? "bg-emerald-500" : "bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          selectedAccount.freeSubscription ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* AI Plan toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/50 px-5 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        AI Plan
                        {selectedAccount.aiPlan && <span className="ml-2 rounded-full bg-cyan-900 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300">ACTIVE</span>}
                        {selectedAccount.freeAiPlan && <span className="ml-1 rounded-full bg-emerald-900 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">FREE</span>}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {selectedAccount.aiPlan
                          ? "AI auto-reply and appointment booking are enabled."
                          : "Enable AI features ($59.99/mo plan) for this user."}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAiPlan(selectedAccount.id)}
                      role="switch"
                      aria-checked={!!selectedAccount.aiPlan}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        selectedAccount.aiPlan ? "bg-cyan-500" : "bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          selectedAccount.aiPlan ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Free AI Plan toggle */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/50 px-5 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">Free AI Plan</div>
                      <div className="text-xs text-zinc-400">
                        {selectedAccount.freeAiPlan
                          ? "User has free AI access — no $59.99/mo charge."
                          : "Grant this user AI features at no cost."}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFreeAiPlan(selectedAccount.id)}
                      role="switch"
                      aria-checked={!!selectedAccount.freeAiPlan}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        selectedAccount.freeAiPlan ? "bg-emerald-500" : "bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          selectedAccount.freeAiPlan ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <textarea value={selectedAccount.workflowNote || ""}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setAccounts((prev) => prev.map((a) => a.id === selectedAccount.id ? { ...a, workflowNote: val } : a));
                      await updateProfile(selectedAccount.id, { workflow_note: val });
                    }}
                    placeholder="Admin notes about this user..."
                    className="h-24 w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm" />

                  {/* Recent Transactions */}
                  {selectedAccount.usageHistory.length > 0 && (
                    <div>
                      <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Recent Transactions</div>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {[...selectedAccount.usageHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-2.5 text-xs">
                            <span className="text-zinc-300">{tx.description}</span>
                            <div className="flex items-center gap-3">
                              <span className={tx.type.includes("add") || tx.type === "fund_add" ? "text-emerald-400" : "text-red-400"}>
                                {tx.type.includes("add") || tx.type === "fund_add" ? "+" : "-"}{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-zinc-600">{timeAgo(tx.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-zinc-500">Select a user to view details</div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ CAMPAIGNS ═══════════════ */}
        {activeTab === "campaigns" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Campaigns ({campaigns.length})</h2>
              <div className="text-sm text-zinc-400">
                {totalMessagesSent.toLocaleString()} sent · {totalFailed.toLocaleString()} failed · {totalReplies.toLocaleString()} replies
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Campaign</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Owner</th>
                    <th className="px-5 py-4 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">Status</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Audience</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Sent</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Failed</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Replies</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-zinc-400">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {campaigns.map((c) => {
                    const total = c.sent + c.failed;
                    const rate = total > 0 ? ((c.sent / total) * 100).toFixed(0) : "—";
                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/50">
                        <td className="px-5 py-4 font-medium">{c.name}</td>
                        <td className="px-5 py-4 text-zinc-400">{campaignOwner(c.userId)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                            c.status === "Completed" ? "bg-emerald-900 text-emerald-300" :
                            c.status === "Sending" ? "bg-sky-900 text-sky-300" :
                            c.status === "Paused" ? "bg-amber-900 text-amber-300" :
                            c.status === "Scheduled" ? "bg-purple-900 text-purple-300" :
                            "bg-zinc-700 text-zinc-400"
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-right">{c.audience}</td>
                        <td className="px-5 py-4 text-right text-emerald-400">{c.sent}</td>
                        <td className="px-5 py-4 text-right text-red-400">{c.failed}</td>
                        <td className="px-5 py-4 text-right text-sky-400">{c.replies}</td>
                        <td className="px-5 py-4 text-right">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {campaigns.length === 0 && (
                <div className="px-5 py-8 text-center text-zinc-500">No campaigns found.</div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ ANALYTICS ═══════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <div className="text-6xl font-bold text-violet-400">{accounts.length}</div>
                <div className="mt-2 text-zinc-400">Total Users</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <div className="text-6xl font-bold text-emerald-400">{totalMessagesSent.toLocaleString()}</div>
                <div className="mt-2 text-zinc-400">Messages Sent</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <div className="text-6xl font-bold">{deliveryRate}%</div>
                <div className="mt-2 text-zinc-400">Delivery Rate</div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <div className="text-6xl font-bold text-amber-400">{totalReplies.toLocaleString()}</div>
                <div className="mt-2 text-zinc-400">Replies</div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
                <h3 className="mb-6 text-xl font-bold">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-800 p-5">
                    <div>
                      <div className="text-sm text-zinc-400">Subscription Revenue (MRR)</div>
                      <div className="mt-1 text-xs text-zinc-500">{activeSubscribers} active subscribers</div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(mrr)}</div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-800 p-5">
                    <div>
                      <div className="text-sm text-zinc-400">Number Revenue (MRR)</div>
                      <div className="mt-1 text-xs text-zinc-500">{totalNumbers} numbers × $1.00/mo</div>
                    </div>
                    <div className="text-2xl font-bold text-sky-400">{formatCurrency(totalNumbers * 1)}</div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-800 p-5">
                    <div>
                      <div className="text-sm text-zinc-400">Message Revenue (est.)</div>
                      <div className="mt-1 text-xs text-zinc-500">{totalMessagesSent.toLocaleString()} msgs × $0.012 avg</div>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">{formatCurrency(totalMessagesSent * 0.012)}</div>
                  </div>
                  <hr className="border-zinc-700" />
                  <div className="flex items-center justify-between px-2">
                    <div className="text-sm font-medium text-zinc-300">Total MRR (est.)</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(mrr + totalNumbers)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
                <h3 className="mb-6 text-xl font-bold">Top Users by Wallet Balance</h3>
                <div className="space-y-3">
                  {[...accounts].sort((a, b) => (b.walletBalance || 0) - (a.walletBalance || 0)).slice(0, 8).map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between rounded-2xl bg-zinc-800 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-bold text-zinc-500">{i + 1}</span>
                        <div>
                          <div className="text-sm font-medium">{a.firstName} {a.lastName}</div>
                          <div className="text-[10px] text-zinc-500">{contactCounts[a.id] || 0} contacts · {a.ownedNumbers?.length || 0} numbers</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-emerald-400">{formatCurrency(a.walletBalance || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TRANSACTIONS ═══════════════ */}
        {activeTab === "transactions" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold">Transactions ({allTransactions.length})</h2>
              <div className="flex flex-wrap gap-3">
                <select value={txFilter} onChange={(e) => setTxFilter(e.target.value as typeof txFilter)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
                  <option value="all">All Types</option>
                  <option value="fund_add">Deposits</option>
                  <option value="charge">Charges</option>
                  <option value="credit_add">Admin Credits</option>
                  <option value="number_purchase">Number Purchases</option>
                </select>
                <select value={txSort} onChange={(e) => setTxSort(e.target.value as typeof txSort)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="largest">Largest First</option>
                </select>
              </div>
            </div>

            {/* Totals */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                <div className="text-xs text-zinc-500">Total Deposits</div>
                <div className="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(txTotals.deposits)}</div>
              </div>
              <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                <div className="text-xs text-zinc-500">Total Charges</div>
                <div className="mt-1 text-2xl font-bold text-red-400">{formatCurrency(txTotals.charges)}</div>
              </div>
              <div className="rounded-2xl bg-zinc-800 p-4 text-center">
                <div className="text-xs text-zinc-500">Net</div>
                <div className="mt-1 text-2xl font-bold">{formatCurrency(txTotals.net)}</div>
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-800">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-400">User</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-400">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase text-zinc-400">Type</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-400">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase text-zinc-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {allTransactions.slice(0, 200).map((item, i) => (
                    <tr key={`${item.id}_${i}`} className="hover:bg-zinc-800/50">
                      <td className="px-5 py-3">{item.userName}</td>
                      <td className="px-5 py-3 text-zinc-300">{item.description}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.type === "fund_add" ? "bg-emerald-900 text-emerald-300" :
                          item.type === "credit_add" ? "bg-sky-900 text-sky-300" :
                          item.type === "number_purchase" ? "bg-violet-900 text-violet-300" :
                          "bg-zinc-700 text-zinc-400"
                        }`}>{item.type.replace(/_/g, " ")}</span>
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${item.type.includes("add") || item.type === "fund_add" ? "text-emerald-400" : "text-red-400"}`}>
                        {item.type.includes("add") || item.type === "fund_add" ? "+" : "-"}{formatCurrency(item.amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allTransactions.length === 0 && (
                <div className="px-5 py-8 text-center text-zinc-500">No transactions found.</div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ NUMBERS ═══════════════ */}
        {activeTab === "numbers" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Phone Numbers ({totalNumbers})</h2>
              <div className="text-sm text-zinc-400">{totalNumbers} numbers × $1.00/mo = {formatCurrency(totalNumbers)}/mo revenue</div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">User</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Number</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Alias</th>
                    <th className="px-5 py-4 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">Subscription</th>
                    <th className="px-5 py-4 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">10DLC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {accounts
                    .flatMap((a) => (a.ownedNumbers || []).map((n) => ({
                      ...n, userName: `${a.firstName} ${a.lastName}`, userEmail: a.email,
                      subStatus: a.subscriptionStatus, a2pStatus: a.a2pStatus,
                    })))
                    .map((n, i) => {
                      const sub = subStatusBadge(n.subStatus);
                      const a2p = a2pStatusBadge(n.a2pStatus);
                      return (
                        <tr key={`${n.id}_${i}`} className="hover:bg-zinc-800/50">
                          <td className="px-5 py-4">
                            <div className="font-medium">{n.userName}</div>
                            <div className="text-xs text-zinc-500">{n.userEmail}</div>
                          </td>
                          <td className="px-5 py-4 font-mono">{n.number}</td>
                          <td className="px-5 py-4 text-zinc-400">{n.alias || "—"}</td>
                          <td className="px-5 py-4 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sub.cls}`}>{sub.label}</span></td>
                          <td className="px-5 py-4 text-center"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${a2p.cls}`}>{a2p.label}</span></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {totalNumbers === 0 && (
                <div className="px-5 py-8 text-center text-zinc-500">No phone numbers found.</div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ SETTINGS ═══════════════ */}
        {/* ═══════════════ SUPPORT ═══════════════ */}
        {activeTab === "support" && (
          <div className="flex h-[calc(100vh-280px)] gap-6">
            {/* Thread list */}
            <div className="w-80 shrink-0 overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Support Chats</h2>
                    <p className="text-xs text-zinc-500">{supportThreads.length} conversation{supportThreads.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700"
                    title="Start a chat with a user"
                  >
                    + New Chat
                  </button>
                </div>
              </div>
              {supportThreads.length === 0 && (
                <div className="p-8 text-center text-sm text-zinc-500">No support messages yet</div>
              )}
              {supportThreads.map((thread) => (
                <button
                  key={thread.userId}
                  onClick={() => { setSelectedThreadUserId(thread.userId); setSupportThreads((prev) => prev.map((t) => t.userId === thread.userId ? { ...t, unreadCount: 0 } : t)); }}
                  className={`w-full border-b border-zinc-800 p-4 text-left transition hover:bg-zinc-800 ${
                    selectedThreadUserId === thread.userId ? "bg-zinc-800" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate">{thread.userName}</span>
                    {thread.unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold">{thread.unreadCount}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 truncate">{thread.userEmail}</div>
                  <div className="mt-1 text-xs text-zinc-400 truncate">{thread.lastMessage}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">{timeAgo(thread.lastMessageAt)}</div>
                </button>
              ))}
            </div>

            {/* Chat panel */}
            <div className="flex flex-1 flex-col rounded-3xl border border-zinc-800 bg-zinc-900">
              {!selectedThread ? (
                <div className="flex flex-1 items-center justify-center text-zinc-500">
                  <div className="text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <div className="text-lg font-medium">Select a conversation</div>
                    <div className="text-sm text-zinc-600 mt-1">Choose a user from the list to view their messages</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                    <div>
                      <div className="font-semibold">{selectedThread.userName}</div>
                      <div className="text-xs text-zinc-500">{selectedThread.userEmail}</div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard?impersonate=${selectedThread.userId}`)}
                      className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium hover:bg-zinc-700"
                    >
                      View Dashboard
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {selectedThread.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          msg.sender_role === "admin"
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-800 text-zinc-100"
                        }`}>
                          {msg.sender_role === "user" && (
                            <div className="text-[10px] font-semibold text-violet-400 mb-0.5">{selectedThread.userName}</div>
                          )}
                          <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                          <div className={`text-[10px] mt-1 ${msg.sender_role === "admin" ? "text-violet-200" : "text-zinc-500"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={supportChatEndRef} />
                  </div>

                  {/* Reply input */}
                  <div className="border-t border-zinc-800 p-4">
                    <div className="flex gap-3">
                      <input
                        value={supportReplyInput}
                        onChange={(e) => setSupportReplyInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendSupportReply(); } }}
                        placeholder="Type a reply..."
                        className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSendSupportReply}
                        disabled={!supportReplyInput.trim()}
                        className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-8 text-2xl font-bold">Platform Settings</h2>
            <div className="space-y-8">
              <div>
                <label className="mb-2 block text-sm">Default Subscription Price (monthly)</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">$</span>
                  <input type="number" step="0.01" value={globalSubscriptionPrice} onChange={(e) => setGlobalSubscriptionPrice(parseFloat(e.target.value) || 0)}
                    className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
                  <span className="text-sm text-zinc-500">/month</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Sets the subscription price for all users. Customize per-user below.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm">Default Message Cost (per segment)</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">$</span>
                  <input type="number" step="0.001" value={globalMessageCost} onChange={(e) => setGlobalMessageCost(parseFloat(e.target.value) || 0)}
                    className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
                  <span className="text-sm text-zinc-500">/msg</span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm">Default Phone Number Cost (monthly)</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">$</span>
                  <input type="number" step="0.01" value={globalNumberCost} onChange={(e) => setGlobalNumberCost(parseFloat(e.target.value) || 0)}
                    className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
                  <span className="text-sm text-zinc-500">/month</span>
                </div>
              </div>
              <button onClick={handleSaveGlobalSettings} className="w-full rounded-2xl bg-violet-600 px-8 py-4 hover:bg-violet-700">
                Save Global Settings
              </button>

              <hr className="border-zinc-800" />

              {/* Visitor Alerts */}
              <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold">🔔 Visitor Alerts</h4>
                    <p className="mt-1 text-sm text-zinc-400">Get a text message when someone visits your site (max 1 alert every 5 min).</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !visitorAlerts;
                      setVisitorAlerts(newVal);
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session?.user) {
                        await supabase.from("profiles").update({ visitor_alerts: newVal }).eq("id", session.user.id);
                      }
                      setMessage(newVal ? "✅ Visitor alerts turned ON" : "✅ Visitor alerts turned OFF");
                      setTimeout(() => setMessage(""), 3000);
                    }}
                    className={`relative h-8 w-14 rounded-full transition-colors ${visitorAlerts ? "bg-violet-600" : "bg-zinc-600"}`}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${visitorAlerts ? "left-7" : "left-1"}`} />
                  </button>
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  Alerts include visitor location, page visited, and time. Sent from your first owned number to your admin phone.
                </div>
              </div>

              <hr className="border-zinc-800" />

              <h3 className="text-xl font-bold">Per-User Pricing</h3>
              <p className="text-sm text-zinc-400">Set custom message cost for individual users.</p>
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {accounts.map((acct) => (
                  <div key={acct.id} className="flex items-center gap-3 rounded-xl bg-zinc-800 p-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{acct.firstName} {acct.lastName}</span>
                      <span className="ml-2 text-xs text-zinc-500">{acct.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] text-zinc-500">$/month</label>
                        <input type="number" step="0.01" value={acct.plan.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setAccounts((prev) => prev.map((a) => a.id === acct.id ? { ...a, plan: { ...a.plan, price: val } } : a));
                          }}
                          className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-zinc-500">$/msg</label>
                        <input type="number" step="0.001" value={acct.plan.messageCost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setAccounts((prev) => prev.map((a) => a.id === acct.id ? { ...a, plan: { ...a.plan, messageCost: val } } : a));
                          }}
                          className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
                      </div>
                      <button onClick={() => handleSaveUserPricing(acct.id)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-700">Save</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-900 p-8">
            <h3 className="mb-6 text-2xl font-bold">Create New User</h3>
            <input placeholder="First Name" value={newUserForm.firstName} onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <input placeholder="Last Name" value={newUserForm.lastName} onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <input placeholder="Email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <input placeholder="Phone" value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: formatPhoneNumber(e.target.value) })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={newUserForm.confirmPassword} onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })} className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="mb-4 text-sm text-violet-300 hover:text-violet-200">
              {showPassword ? "Hide Passwords" : "Show Passwords"}
            </button>
            <div className="mb-6 rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4 text-sm">
              <div className="mb-2 font-semibold text-white">Password rules</div>
              <div className={passwordChecks.minLength ? "text-emerald-300" : "text-zinc-400"}>&#10003; At least 8 characters</div>
              <div className={passwordChecks.upper ? "text-emerald-300" : "text-zinc-400"}>&#10003; At least 1 uppercase letter</div>
              <div className={passwordChecks.number ? "text-emerald-300" : "text-zinc-400"}>&#10003; At least 1 number</div>
            </div>
            {createUserError && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{createUserError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={resetCreateUserModal} className="flex-1 rounded-2xl border border-zinc-700 py-4">Cancel</button>
              <button onClick={createNewUser} className="flex-1 rounded-2xl bg-violet-600 py-4">Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal — admin initiates chat with a user */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Start a Chat</h3>
              <button
                onClick={() => { setShowNewChatModal(false); setNewChatUserId(null); setNewChatMessage(""); setNewChatSearch(""); }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <label className="mb-1 block text-sm text-zinc-400">Select a user</label>
            <input
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="mb-3 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm focus:border-violet-500 focus:outline-none"
            />

            <div className="mb-4 max-h-60 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950">
              {accounts
                .filter((a) => a.role !== "admin")
                .filter((a) => {
                  const q = newChatSearch.toLowerCase();
                  if (!q) return true;
                  return (
                    `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
                    (a.email || "").toLowerCase().includes(q)
                  );
                })
                .slice(0, 20)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setNewChatUserId(a.id)}
                    className={`w-full border-b border-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-800 ${
                      newChatUserId === a.id ? "bg-violet-600/20" : ""
                    }`}
                  >
                    <div className="text-sm font-medium">{a.firstName} {a.lastName}</div>
                    <div className="text-xs text-zinc-500">{a.email}</div>
                  </button>
                ))}
              {accounts.filter((a) => a.role !== "admin").length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">No users found</div>
              )}
            </div>

            <label className="mb-1 block text-sm text-zinc-400">Message</label>
            <textarea
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              placeholder="Hi! Just wanted to check in…"
              rows={4}
              className="mb-6 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm focus:border-violet-500 focus:outline-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewChatModal(false); setNewChatUserId(null); setNewChatMessage(""); setNewChatSearch(""); }}
                className="flex-1 rounded-2xl border border-zinc-700 py-3 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateChat}
                disabled={!newChatUserId || !newChatMessage.trim() || newChatSending}
                className="flex-1 rounded-2xl bg-violet-600 py-3 text-sm font-medium disabled:opacity-50"
              >
                {newChatSending ? "Sending..." : "Send & Open Chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteUserModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 p-8">
            <h3 className="mb-3 text-2xl font-bold text-red-400">Delete Account</h3>
            <p className="mb-4 text-sm leading-7 text-zinc-300">
              You are about to permanently delete <span className="font-semibold text-white">{selectedAccount.firstName} {selectedAccount.lastName}</span>.
            </p>
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              This removes the user from the platform.
            </div>
            {deleteUserError && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{deleteUserError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={closeDeleteUserModal} className="flex-1 rounded-2xl border border-zinc-700 py-4">Cancel</button>
              <button onClick={handleDeleteSelectedUser} className="flex-1 rounded-2xl bg-red-600 py-4 hover:bg-red-700">Delete User</button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`fixed bottom-8 right-8 rounded-2xl px-6 py-4 shadow-2xl text-sm font-medium ${
          message.startsWith("❌") ? "bg-red-950 text-red-200 ring-1 ring-red-800" : "bg-emerald-950 text-emerald-200 ring-1 ring-emerald-800"
        }`}>
          {message}
        </div>
      )}
    </main>
  );
}
