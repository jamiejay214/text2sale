"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UsageHistoryItem = {
  id: string;
  type: "charge" | "credit_add" | "credit_remove" | "fund_add" | "number_purchase";
  amount: number;
  description: string;
  createdAt: string;
  status?: "succeeded" | "failed";
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
  logs?: {
    id: string;
    createdAt: string;
    attempted: number;
    success: number;
    failed: number;
    notes: string;
  }[];
};

type OwnedNumber = {
  id: string;
  number: string;
  alias: string;
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

type AccountRecord = {
  id: string;
  role?: "user" | "admin";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  referralCode?: string;
  credits: number;
  verified: boolean;
  paused: boolean;
  workflowNote?: string;
  usageHistory: UsageHistoryItem[];
  plan: {
    name: string;
    price: number;
    messageCost: number;
  };
  createdAt: string;
  walletBalance?: number;
  ownedNumbers?: OwnedNumber[];
};

type DashboardTab =
  | "overview"
  | "conversations"
  | "campaigns"
  | "contacts"
  | "numbers"
  | "billing"
  | "activity";

type NewCampaignForm = {
  name: string;
  message: string;
};

function loadCurrentUser(): AccountRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("textalot_current_user");
    return raw ? (JSON.parse(raw) as AccountRecord) : null;
  } catch {
    return null;
  }
}

function loadAccounts(): AccountRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_accounts");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCampaigns(): CampaignRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_campaigns");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadContacts(): ContactRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_contacts");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadConversations(): ConversationRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_conversations");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCurrentUser(user: AccountRecord | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    localStorage.removeItem("textalot_current_user");
    return;
  }

  localStorage.setItem("textalot_current_user", JSON.stringify(user));
}

function saveAccounts(accounts: AccountRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("textalot_accounts", JSON.stringify(accounts));
}

function saveCampaigns(campaigns: CampaignRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("textalot_campaigns", JSON.stringify(campaigns));
}

function saveContacts(contacts: ContactRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("textalot_contacts", JSON.stringify(contacts));
}

function saveConversations(conversations: ConversationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("textalot_conversations", JSON.stringify(conversations));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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

function buildDemoContacts(): ContactRecord[] {
  const now = new Date().toISOString();

  return [
    {
      id: "contact_demo_1",
      firstName: "Aldophus",
      lastName: "Green",
      phone: "(912) 542-2316",
      email: "aldophusgreen37@gmail.com",
      city: "Augusta",
      state: "GA",
      address: "241 N Main St",
      zip: "30901",
      tags: ["Lead", "DNC Review"],
      notes: "Asked for PPO quote. Wants morning follow-up.",
      dnc: false,
      campaign: "Georgia Warm Leads",
      createdAt: now,
      leadSource: "Website Lead",
      quote: "$0 Deductible PPO",
      policyId: "",
      timeline: "Follow up tomorrow",
      householdSize: "1",
      dateOfBirth: "12/11/1974",
      age: "51",
    },
    {
      id: "contact_demo_2",
      firstName: "Frank",
      lastName: "Spencer",
      phone: "(404) 555-8821",
      email: "frank.spencer@example.com",
      city: "Atlanta",
      state: "GA",
      address: "187 Peachtree Ave",
      zip: "30303",
      tags: ["Marketplace"],
      notes: "Asked about premium comparison.",
      dnc: false,
      campaign: "Recent Upload",
      createdAt: now,
      leadSource: "Facebook Lead",
      quote: "",
      policyId: "",
      timeline: "Call back Friday",
      householdSize: "3",
      dateOfBirth: "08/04/1985",
      age: "40",
    },
    {
      id: "contact_demo_3",
      firstName: "Wendell",
      lastName: "Phillips",
      phone: "(305) 555-7744",
      email: "wendell@example.com",
      city: "Miami",
      state: "FL",
      address: "918 Biscayne Blvd",
      zip: "33132",
      tags: ["Follow Up"],
      notes: "Mentioned doctor network concern.",
      dnc: false,
      campaign: "Florida Leads",
      createdAt: now,
      leadSource: "Inbound Form",
      quote: "",
      policyId: "",
      timeline: "Waiting on spouse info",
      householdSize: "2",
      dateOfBirth: "03/15/1978",
      age: "48",
    },
    {
      id: "contact_demo_4",
      firstName: "Briana",
      lastName: "Ebron",
      phone: "(786) 555-1133",
      email: "briana@example.com",
      city: "Hollywood",
      state: "FL",
      address: "78 Surf Rd",
      zip: "33019",
      tags: ["Not Interested"],
      notes: "Requested fewer texts.",
      dnc: false,
      campaign: "Old Leads",
      createdAt: now,
      leadSource: "Purchased Lead",
      quote: "",
      policyId: "",
      timeline: "",
      householdSize: "1",
      dateOfBirth: "11/22/1990",
      age: "35",
    },
  ];
}

function buildDemoConversations(): ConversationRecord[] {
  const today = new Date();
  const minutesAgo = (mins: number) => new Date(today.getTime() - mins * 60 * 1000).toISOString();

  return [
    {
      id: "conv_demo_1",
      contactId: "contact_demo_1",
      preview: "Yes",
      unread: 1,
      lastMessageAt: minutesAgo(1),
      starred: true,
      messages: [
        {
          id: "msg_1",
          direction: "outbound",
          body: "How's it going Aldophus, may I send you a quick quote for a $0 deductible PPO plan from leading companies in Ga?",
          createdAt: minutesAgo(4),
          status: "delivered",
        },
        {
          id: "msg_2",
          direction: "inbound",
          body: "Yes",
          createdAt: minutesAgo(1),
          status: "received",
        },
      ],
    },
    {
      id: "conv_demo_2",
      contactId: "contact_demo_2",
      preview: "AUTO REPLY------ THIS IS FRAN...",
      unread: 1,
      lastMessageAt: minutesAgo(3),
      messages: [
        {
          id: "msg_3",
          direction: "outbound",
          body: "Frank, are you still looking for better health coverage options this month?",
          createdAt: minutesAgo(8),
          status: "delivered",
        },
        {
          id: "msg_4",
          direction: "inbound",
          body: "AUTO REPLY------ THIS IS FRANK. Please text later.",
          createdAt: minutesAgo(3),
          status: "received",
        },
      ],
    },
    {
      id: "conv_demo_3",
      contactId: "contact_demo_3",
      preview: "Can I call you at this number",
      unread: 1,
      lastMessageAt: minutesAgo(10),
      messages: [
        {
          id: "msg_5",
          direction: "outbound",
          body: "I found a plan option that may lower your monthly cost.",
          createdAt: minutesAgo(16),
          status: "delivered",
        },
        {
          id: "msg_6",
          direction: "inbound",
          body: "Can I call you at this number",
          createdAt: minutesAgo(10),
          status: "received",
        },
      ],
    },
    {
      id: "conv_demo_4",
      contactId: "contact_demo_4",
      preview: "Not briana stop texting this num...",
      unread: 1,
      lastMessageAt: minutesAgo(17),
      messages: [
        {
          id: "msg_7",
          direction: "outbound",
          body: "Briana, did you still want me to send over PPO options?",
          createdAt: minutesAgo(21),
          status: "delivered",
        },
        {
          id: "msg_8",
          direction: "inbound",
          body: "Not briana stop texting this number",
          createdAt: minutesAgo(17),
          status: "received",
        },
      ],
    },
  ];
}

export default function DashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AccountRecord | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [message, setMessage] = useState("");
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>({
    name: "",
    message: "",
  });
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [composerText, setComposerText] = useState("");

  useEffect(() => {
    setMounted(true);

    const user = loadCurrentUser();
    if (!user) {
      router.replace("/");
      return;
    }

    if (user.paused) {
      router.replace("/");
      return;
    }

    const loadedAccounts = loadAccounts();
    const loadedCampaigns = loadCampaigns();
    let loadedContacts = loadContacts();
    let loadedConversations = loadConversations();

    if (loadedContacts.length === 0) {
      loadedContacts = buildDemoContacts();
      saveContacts(loadedContacts);
    }

    if (loadedConversations.length === 0) {
      loadedConversations = buildDemoConversations();
      saveConversations(loadedConversations);
    }

    const freshUser =
      loadedAccounts.find((account) => account.id === user.id) ?? user;

    setCurrentUser(freshUser);
    setAccounts(loadedAccounts);
    setCampaigns(loadedCampaigns);
    setContacts(loadedContacts);
    setConversations(loadedConversations);

    if (loadedConversations.length > 0) {
      setSelectedConversationId(loadedConversations[0].id);
    }

    if (
      loadedAccounts.length > 0 &&
      loadedAccounts.some((account) => account.id === freshUser.id)
    ) {
      saveCurrentUser(freshUser);
    }
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

  const handleLogout = () => {
    saveCurrentUser(null);
    router.push("/");
  };

  const handleAddFunds = (amount: number) => {
    if (!currentUser) return;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const entry: UsageHistoryItem = {
      id: `fund_${Date.now()}`,
      type: "fund_add",
      amount,
      description: "User added wallet funds",
      createdAt: new Date().toISOString(),
      status: "succeeded",
    };

    const updatedUser: AccountRecord = {
      ...currentUser,
      walletBalance: Number(((currentUser.walletBalance || 0) + amount).toFixed(2)),
      usageHistory: [entry, ...(currentUser.usageHistory || [])],
    };

    const updatedAccounts = accounts.map((account) =>
      account.id === currentUser.id ? updatedUser : account
    );

    setCurrentUser(updatedUser);
    setAccounts(updatedAccounts);
    saveAccounts(updatedAccounts);
    saveCurrentUser(updatedUser);

    setMessage(`✅ Added ${formatCurrency(amount)} to wallet`);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleCreateCampaign = () => {
    if (!newCampaignForm.name.trim()) {
      setMessage("❌ Campaign name is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    if (!newCampaignForm.message.trim()) {
      setMessage("❌ Campaign message is required");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const newCampaign: CampaignRecord = {
      id: `campaign_${Date.now()}`,
      name: newCampaignForm.name.trim(),
      audience: contacts.filter((contact) => !contact.dnc).length,
      sent: 0,
      replies: 0,
      failed: 0,
      status: "Draft",
      message: newCampaignForm.message.trim(),
      logs: [],
    };

    const updatedCampaigns = [newCampaign, ...campaigns];
    setCampaigns(updatedCampaigns);
    saveCampaigns(updatedCampaigns);

    setNewCampaignForm({
      name: "",
      message: "",
    });

    setMessage("✅ Campaign created");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleCreateDemoContacts = () => {
    const starterContacts = buildDemoContacts();
    setContacts(starterContacts);
    saveContacts(starterContacts);
    setMessage("✅ Demo contacts loaded");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleCreateDemoNumber = () => {
    if (!currentUser) return;

    const walletBalance = currentUser.walletBalance || 0;
    if (walletBalance < 1) {
      setMessage("❌ Add funds before buying a number");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const newNumber: OwnedNumber = {
      id: `num_${Date.now()}`,
      number: "(888) 555-10" + Math.floor(Math.random() * 90 + 10),
      alias: `Sales Line ${((currentUser.ownedNumbers?.length || 0) + 1).toString()}`,
    };

    const purchaseEntry: UsageHistoryItem = {
      id: `number_${Date.now()}`,
      type: "number_purchase",
      amount: 1,
      description: "Purchased phone number",
      createdAt: new Date().toISOString(),
      status: "succeeded",
    };

    const updatedUser: AccountRecord = {
      ...currentUser,
      walletBalance: Number((walletBalance - 1).toFixed(2)),
      ownedNumbers: [newNumber, ...(currentUser.ownedNumbers || [])],
      usageHistory: [purchaseEntry, ...(currentUser.usageHistory || [])],
    };

    const updatedAccounts = accounts.map((account) =>
      account.id === currentUser.id ? updatedUser : account
    );

    setCurrentUser(updatedUser);
    setAccounts(updatedAccounts);
    saveAccounts(updatedAccounts);
    saveCurrentUser(updatedUser);

    setMessage("✅ Number purchased");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setComposerText("");

    const updated = conversations.map((conversation) =>
      conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation
    );

    setConversations(updated);
    saveConversations(updated);
  };

  const handleSendConversationMessage = () => {
    if (!selectedConversation || !composerText.trim()) {
      setMessage("❌ Type a message first");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const now = new Date().toISOString();

    const newMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      direction: "outbound",
      body: composerText.trim(),
      createdAt: now,
      status: "sent",
    };

    const updatedConversations = conversations.map((conversation) => {
      if (conversation.id !== selectedConversation.id) return conversation;

      return {
        ...conversation,
        preview: composerText.trim(),
        lastMessageAt: now,
        messages: [...conversation.messages, newMessage],
      };
    });

    setConversations(updatedConversations);
    saveConversations(updatedConversations);
    setComposerText("");
    setMessage("✅ Message queued");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleUpdateSelectedContactField = (
    field: keyof ContactRecord,
    value: string
  ) => {
    if (!selectedContact) return;

    const updatedContacts = contacts.map((contact) =>
      contact.id === selectedContact.id ? { ...contact, [field]: value } : contact
    );

    setContacts(updatedContacts);
    saveContacts(updatedContacts);
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-screen-2xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-violet-300">
              Text2Sale Dashboard
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Welcome back, {currentUser.firstName}
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
            "activity",
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Credits</div>
                <div className="mt-3 text-4xl font-bold text-emerald-400">
                  {currentUser.credits}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Wallet Balance</div>
                <div className="mt-3 text-4xl font-bold">
                  {formatCurrency(currentUser.walletBalance || 0)}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Delivery Rate</div>
                <div className="mt-3 text-4xl font-bold text-sky-400">
                  {deliveryRate.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Owned Numbers</div>
                <div className="mt-3 text-4xl font-bold text-violet-400">
                  {currentUser.ownedNumbers?.length || 0}
                </div>
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
                    onClick={handleCreateDemoNumber}
                    className="rounded-2xl border border-zinc-700 px-5 py-4 text-left hover:bg-zinc-800"
                  >
                    Buy Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conversations" && (
          <div className="grid min-h-[72vh] gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
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

              <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
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

            <div className="flex min-h-[72vh] flex-col rounded-3xl border border-zinc-800 bg-zinc-900">
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
                    <div className="mb-2 flex items-center gap-5 text-xs text-zinc-500">
                      <span>Segments: {Math.max(1, Math.ceil(composerText.length / 160 || 1))}</span>
                      <span>Encoding: SMS</span>
                      <span>
                        Cost:{" "}
                        {formatCurrency(
                          Math.max(1, Math.ceil(composerText.length / 160 || 1)) *
                            (currentUser.plan.messageCost || 0)
                        )}
                      </span>
                      <span>Type: SMS</span>
                    </div>

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder="Insert text here ..."
                        className="h-28 w-full resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-zinc-500"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-zinc-400">
                          <input type="checkbox" checked readOnly className="accent-green-500" />
                          Enter sends message.
                        </label>

                        <div className="flex items-center gap-3">
                          <button className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800">
                            Attach
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
                <div className="max-h-[72vh] overflow-y-auto pr-1">
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
                      <input
                        value={(selectedContact.tags || []).join(", ")}
                        onChange={(e) =>
                          handleUpdateSelectedContactField("tags", e.target.value)
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3"
                      />
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

                <textarea
                  placeholder="Write your message..."
                  value={newCampaignForm.message}
                  onChange={(e) =>
                    setNewCampaignForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="h-40 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                  Characters: {newCampaignForm.message.length} • Segments:{" "}
                  {Math.max(1, Math.ceil(newCampaignForm.message.length / 160))}
                </div>

                <button
                  onClick={handleCreateCampaign}
                  className="w-full rounded-2xl bg-violet-600 py-4 hover:bg-violet-700"
                >
                  Create Campaign
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Campaigns</h2>
                <span className="text-sm text-zinc-400">{userCampaigns.length} total</span>
              </div>

              <div className="space-y-4">
                {userCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-800/60 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-semibold">{campaign.name}</div>
                        <div className="text-sm text-zinc-400">
                          Status: {campaign.status}
                        </div>
                      </div>
                      <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                        Audience {campaign.audience}
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
                ))}

                {userCampaigns.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    No campaigns yet.
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
                  Manage uploaded leads and campaign contacts.
                </p>
              </div>

              <button
                onClick={handleCreateDemoContacts}
                className="rounded-2xl bg-violet-600 px-5 py-3 hover:bg-violet-700"
              >
                Reload Demo Contacts
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <div className="grid grid-cols-6 bg-zinc-800 px-5 py-4 text-sm font-medium text-zinc-300">
                <div>Name</div>
                <div>Phone</div>
                <div>Email</div>
                <div>Location</div>
                <div>Campaign</div>
                <div>Status</div>
              </div>

              <div className="divide-y divide-zinc-800">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-6 px-5 py-4 text-sm text-zinc-200"
                  >
                    <div>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div>{contact.phone}</div>
                    <div>{contact.email || "—"}</div>
                    <div>
                      {[contact.city, contact.state].filter(Boolean).join(", ") || "—"}
                    </div>
                    <div>{contact.campaign || "—"}</div>
                    <div>{contact.dnc ? "DNC" : "Active"}</div>
                  </div>
                ))}

                {contacts.length === 0 && (
                  <div className="px-5 py-8 text-center text-zinc-500">
                    No contacts found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "numbers" && (
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Phone Numbers</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Buy and manage sending numbers for campaigns.
              </p>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="text-sm text-zinc-400">Number cost</div>
                <div className="mt-2 text-3xl font-bold">$1.00</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Wallet balance: {formatCurrency(currentUser.walletBalance || 0)}
                </div>

                <button
                  onClick={handleCreateDemoNumber}
                  className="mt-5 w-full rounded-2xl bg-violet-600 py-4 hover:bg-violet-700"
                >
                  Buy Number
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Owned Numbers</h2>

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
                    No phone numbers yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Billing</h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-zinc-800 p-5">
                  <div className="text-sm text-zinc-400">Plan</div>
                  <div className="mt-2 text-2xl font-bold">{currentUser.plan.name}</div>
                  <div className="mt-2 text-zinc-400">
                    {formatCurrency(currentUser.plan.price)} per month
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-800 p-5">
                  <div className="text-sm text-zinc-400">Message Cost</div>
                  <div className="mt-2 text-2xl font-bold">
                    {formatCurrency(currentUser.plan.messageCost)}
                  </div>
                  <div className="mt-2 text-zinc-400">Per outbound text segment</div>
                </div>

                <div className="rounded-2xl bg-zinc-800 p-5">
                  <div className="text-sm text-zinc-400">Wallet Balance</div>
                  <div className="mt-2 text-2xl font-bold">
                    {formatCurrency(currentUser.walletBalance || 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Add Funds</h2>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => handleAddFunds(25)}
                  className="rounded-2xl bg-violet-600 px-5 py-4 hover:bg-violet-700"
                >
                  Add $25
                </button>
                <button
                  onClick={() => handleAddFunds(50)}
                  className="rounded-2xl border border-zinc-700 px-5 py-4 hover:bg-zinc-800"
                >
                  Add $50
                </button>
                <button
                  onClick={() => handleAddFunds(100)}
                  className="rounded-2xl border border-zinc-700 px-5 py-4 hover:bg-zinc-800"
                >
                  Add $100
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                This is local demo billing for now. Real Stripe or payment integration
                comes next.
              </div>
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
      </div>

      {message && (
        <div className="fixed bottom-8 right-8 rounded-2xl bg-emerald-900 px-6 py-4 text-emerald-200 shadow-2xl">
          {message}
        </div>
      )}
    </main>
  );
}