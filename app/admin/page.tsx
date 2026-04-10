"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchAllProfiles, fetchAllCampaigns, updateProfile,
  addUsageEntry, fetchProfile,
} from "@/lib/supabase-data";
import type { Profile, Campaign, UsageHistoryItem, OwnedNumber } from "@/lib/types";

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
  teamCode?: string;
  managerId?: string | null;
  referralCode?: string;
};

type CampaignRecord = {
  id: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: string;
  logs: { id: string; createdAt: string; success: number; failed: number; attempted: number; notes: string }[];
};

type AdminTab = "users" | "campaigns" | "analytics" | "transactions" | "numbers" | "settings";

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
    teamCode: p.team_code || "", managerId: p.manager_id, referralCode: p.referral_code || "",
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
    id: c.id, name: c.name, audience: c.audience, sent: c.sent,
    replies: c.replies, failed: c.failed, status: c.status, logs: c.logs || [],
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

export default function AdminPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filterCredits] = useState<"all" | "low">("all");
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }

      // Check if user is admin
      const myProfile = await fetchProfile(session.user.id);
      if (!myProfile || myProfile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const [profiles, dbCampaigns] = await Promise.all([
        fetchAllProfiles(),
        fetchAllCampaigns(),
      ]);

      const accts = profiles.map(profileToAccount);
      setAccounts(accts);
      setCampaigns(dbCampaigns.map(campaignToRecord));

      if (accts.length > 0) setSelectedId(accts[0].id);
      setMounted(true);
    };

    loadData();
  }, [router]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId) || null,
    [accounts, selectedId]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acct) => {
      const matchesSearch = `${acct.firstName} ${acct.lastName} ${acct.email} ${acct.phone}`
        .toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterCredits === "all" || (filterCredits === "low" && acct.credits < 50);
      return matchesSearch && matchesFilter;
    });
  }, [accounts, search, filterCredits]);

  const passwordChecks = useMemo(() => getPasswordChecks(newUserForm.password), [newUserForm.password]);
  const passwordStrongEnough = passwordChecks.minLength && passwordChecks.upper && passwordChecks.number;

  const refreshAccount = async (accountId: string) => {
    const profiles = await fetchAllProfiles();
    const accts = profiles.map(profileToAccount);
    setAccounts(accts);
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

  const handleImpersonate = () => {
    if (!selectedAccount) return;
    setMessage(`View-as mode not available with Supabase Auth. Use the user's login.`);
    window.setTimeout(() => setMessage(""), 3000);
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
  };

  const createNewUser = async () => {
    setCreateUserError("");

    if (!newUserForm.firstName.trim()) return setCreateUserError("First name is required.");
    if (!newUserForm.lastName.trim()) return setCreateUserError("Last name is required.");
    if (!newUserForm.email.trim()) return setCreateUserError("Email is required.");
    if (!isValidEmail(newUserForm.email.trim())) return setCreateUserError("Enter a valid email address.");

    const emailExists = accounts.some(
      (a) => a.email.trim().toLowerCase() === newUserForm.email.trim().toLowerCase()
    );
    if (emailExists) return setCreateUserError("A user with that email already exists.");

    if (!newUserForm.phone.trim()) return setCreateUserError("Phone number is required.");
    if (newUserForm.phone.replace(/\D/g, "").length < 10) return setCreateUserError("Enter a valid 10-digit phone number.");
    if (!newUserForm.password.trim()) return setCreateUserError("Password is required.");
    if (!passwordStrongEnough) return setCreateUserError("Password must be at least 8 characters and include 1 uppercase letter and 1 number.");
    if (!newUserForm.confirmPassword.trim()) return setCreateUserError("Confirm password is required.");
    if (newUserForm.password !== newUserForm.confirmPassword) return setCreateUserError("Passwords do not match.");

    // Note: Admin creating users via Supabase Auth requires service_role key (server-side).
    // For now, instruct the user to sign up themselves, then admin promotes them.
    setCreateUserError("Admin user creation requires server-side setup. Have the user sign up at the login page, then manage them here.");
  };

  const handleDeleteSelectedUser = () => {
    if (!selectedAccount) return setDeleteUserError("No user selected.");
    if (selectedAccount.role === "admin") return setDeleteUserError("Admin accounts cannot be deleted from this screen.");
    setDeleteUserError("User deletion requires server-side admin API. Pause the account instead.");
  };

  const handlePromoteToManager = async (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;

    const newRole = acct.role === "manager" ? "user" : "manager";

    await updateProfile(accountId, { role: newRole } as Partial<Profile>);
    await refreshAccount(accountId);
    setMessage(newRole === "manager" ? `✅ ${acct.firstName} promoted to Manager — their referral code is now their team code` : `✅ ${acct.firstName} demoted to User`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveGlobalSettings = async () => {
    // Apply global pricing to ALL users
    let updated = 0;
    for (const acct of accounts) {
      await updateProfile(acct.id, {
        plan: { ...acct.plan, messageCost: globalMessageCost },
      } as Partial<Profile>);
      updated++;
    }
    const profiles = await fetchAllProfiles();
    setAccounts(profiles.map(profileToAccount));
    setMessage(`✅ Global pricing updated for ${updated} users — $${globalMessageCost}/msg`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const handleSaveUserPricing = async (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    if (!acct) return;
    await updateProfile(accountId, {
      plan: { ...acct.plan, messageCost: acct.plan.messageCost },
    } as Partial<Profile>);
    setMessage(`✅ ${acct.firstName}'s pricing updated — $${acct.plan.messageCost}/msg`);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const exportUsersCSV = () => {
    const csv = accounts
      .map((a) => `${a.firstName},${a.lastName},${a.email},${a.phone},${a.credits}`)
      .join("\n");
    const blob = new Blob([`FirstName,LastName,Email,Phone,Credits\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text2sale-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-screen-2xl items-center justify-center px-8 py-10">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-zinc-300">
            Loading admin portal...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter">Admin Portal</h1>
            <p className="text-zinc-400">Full control over your texting platform</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/")}
              className="rounded-2xl border border-zinc-700 px-6 py-3 hover:bg-zinc-900"
            >
              Home
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl bg-violet-600 px-6 py-3 hover:bg-violet-700"
            >
              User Dashboard
            </button>
          </div>
        </div>

        <div className="mb-8 flex border-b border-zinc-800">
          {["users", "campaigns", "analytics", "transactions", "numbers", "settings"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as AdminTab)}
                className={`px-8 py-4 font-medium transition ${
                  activeTab === tab
                    ? "border-b-4 border-violet-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {activeTab === "users" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              <div className="mb-6 flex justify-between">
                <h2 className="text-2xl font-bold">Users ({accounts.length})</h2>

                <div className="flex gap-3">
                  <button onClick={exportUsersCSV} className="rounded-2xl border border-zinc-700 px-5 py-2 text-sm">
                    Export CSV
                  </button>
                  <button
                    onClick={() => { setCreateUserError(""); setShowCreateUserModal(true); }}
                    className="rounded-2xl bg-violet-600 px-6 py-2"
                  >
                    + New User
                  </button>
                </div>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="mb-6 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
              />

              <div className="max-h-[620px] space-y-3 overflow-y-auto">
                {filteredAccounts.map((acct) => (
                  <div
                    key={acct.id}
                    onClick={() => setSelectedId(acct.id)}
                    className={`cursor-pointer rounded-2xl p-5 transition ${
                      selectedId === acct.id
                        ? "border border-violet-600 bg-violet-900/30"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{acct.firstName} {acct.lastName}</span>
                        {acct.role === "admin" && <span className="rounded-full bg-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-300">ADMIN</span>}
                        {acct.role === "manager" && <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] font-medium text-amber-300">MGR</span>}
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs ${
                        acct.paused ? "bg-red-900 text-red-300" : "bg-emerald-900 text-emerald-300"
                      }`}>
                        {acct.paused ? "PAUSED" : "ACTIVE"}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">{acct.email}</div>
                    <div className="mt-3 flex gap-6 text-sm">
                      <div>{acct.credits} credits</div>
                      <div>${acct.walletBalance?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                ))}

                {filteredAccounts.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                    No users found.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              {selectedAccount ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">
                        {selectedAccount.firstName} {selectedAccount.lastName}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                          selectedAccount.role === "admin" ? "bg-violet-900 text-violet-300" :
                          selectedAccount.role === "manager" ? "bg-amber-900 text-amber-300" :
                          "bg-zinc-700 text-zinc-300"
                        }`}>
                          {selectedAccount.role?.toUpperCase() || "USER"}
                        </span>
                        {selectedAccount.role === "manager" && selectedAccount.referralCode && (
                          <span className="rounded-full bg-zinc-800 px-3 py-0.5 text-xs text-zinc-400">
                            Code: <span className="font-mono font-semibold text-white">{selectedAccount.referralCode}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {selectedAccount.role !== "admin" && (
                        <button
                          onClick={() => handlePromoteToManager(selectedAccount.id)}
                          className={`rounded-2xl px-6 py-2 ${
                            selectedAccount.role === "manager"
                              ? "border border-amber-600 text-amber-300 hover:bg-amber-900/30"
                              : "bg-amber-600 hover:bg-amber-700"
                          }`}
                        >
                          {selectedAccount.role === "manager" ? "Demote to User" : "Make Manager"}
                        </button>
                      )}
                      {selectedAccount.role !== "admin" && (
                        <button
                          onClick={() => { setDeleteUserError(""); setShowDeleteUserModal(true); }}
                          className="rounded-2xl bg-red-600 px-6 py-2 hover:bg-red-700"
                        >
                          Delete Account
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team members managed by this user */}
                  {selectedAccount.role === "manager" && (
                    <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
                      <div className="text-sm font-medium text-amber-300">Team Manager</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Team/Referral code: <span className="font-mono font-bold text-white">{selectedAccount.referralCode}</span>
                        {" — "}Share this code with team members so they can join.
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Members: {accounts.filter((a) => a.managerId === selectedAccount.id).length} user(s) on this team
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl bg-zinc-800 p-4">
                      <span className="text-zinc-500">Credits</span>
                      <div className="text-3xl font-bold text-emerald-400">{selectedAccount.credits}</div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4">
                      <span className="text-zinc-500">Wallet</span>
                      <div className="text-3xl font-bold">${selectedAccount.walletBalance?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                    <input
                      type="number"
                      value={bulkCreditAmount}
                      onChange={(e) => setBulkCreditAmount(e.target.value)}
                      className="rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                    />
                    <button
                      onClick={() => handleAddCredits(selectedAccount.id, Number(bulkCreditAmount))}
                      className="rounded-2xl bg-emerald-600 px-8 py-3"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => handleRemoveCredits(selectedAccount.id, Number(bulkCreditAmount))}
                      className="rounded-2xl bg-red-600 px-8 py-3"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-sm text-zinc-400">Email</div>
                      <div className="mt-2 font-medium">{selectedAccount.email}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <div className="text-sm text-zinc-400">Phone</div>
                      <div className="mt-2 font-medium">{selectedAccount.phone}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => togglePause(selectedAccount.id)}
                    className={`w-full rounded-2xl py-4 font-medium ${
                      selectedAccount.paused ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  >
                    {selectedAccount.paused ? "Unpause Account" : "Pause Account"}
                  </button>

                  <textarea
                    value={selectedAccount.workflowNote || ""}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setAccounts((prev) =>
                        prev.map((a) => a.id === selectedAccount.id ? { ...a, workflowNote: val } : a)
                      );
                      await updateProfile(selectedAccount.id, { workflow_note: val });
                    }}
                    placeholder="Workflow / support notes"
                    className="h-32 w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-5"
                  />
                </div>
              ) : (
                <div className="py-20 text-center text-zinc-500">Select a user</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-6 text-2xl font-bold">All Campaigns</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {campaigns.map((c) => (
                <div key={c.id} className="rounded-2xl bg-zinc-800 p-6">
                  <div className="text-lg font-bold">{c.name}</div>
                  <div className="mt-6 grid grid-cols-2 gap-y-4 text-sm">
                    <div>Audience</div><div className="font-medium">{c.audience}</div>
                    <div>Sent</div><div className="font-medium">{c.sent}</div>
                    <div>Failed</div><div className="font-medium text-red-400">{c.failed}</div>
                    <div>Replies</div><div className="font-medium text-emerald-400">{c.replies}</div>
                  </div>
                </div>
              ))}

              {campaigns.length === 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-zinc-500">
                  No campaigns found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold text-violet-400">{accounts.length}</div>
              <div className="mt-2 text-zinc-400">Total Users</div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold text-emerald-400">
                {campaigns.reduce((s, c) => s + c.sent, 0).toLocaleString()}
              </div>
              <div className="mt-2 text-zinc-400">Total Messages Sent</div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold">
                {(() => {
                  const sent = campaigns.reduce((s, c) => s + c.sent, 0);
                  const failed = campaigns.reduce((s, c) => s + c.failed, 0);
                  const total = sent + failed;
                  return total > 0 ? ((sent / total) * 100).toFixed(1) : "0";
                })()}%
              </div>
              <div className="mt-2 text-zinc-400">Avg Delivery Rate</div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold text-amber-400">
                {campaigns.reduce((s, c) => s + c.replies, 0).toLocaleString()}
              </div>
              <div className="mt-2 text-zinc-400">Total Replies</div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-6 text-2xl font-bold">All Platform Transactions</h2>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-left">User</th>
                    <th className="px-6 py-4 text-left">Type</th>
                    <th className="px-6 py-4 text-left">Amount</th>
                    <th className="px-6 py-4 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.flatMap((a) => (a.usageHistory || []).map((item) => ({ ...item, userName: a.firstName }))).map((item, i) => (
                    <tr key={`${item.id}_${i}`} className="border-t border-zinc-700">
                      <td className="px-6 py-4">{item.userName}</td>
                      <td className="px-6 py-4">{item.description}</td>
                      <td className="px-6 py-4 font-medium">
                        {item.type.includes("add") || item.type === "fund_add" ? "+" : "-"}${item.amount}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}

                  {accounts.flatMap((a) => a.usageHistory || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "numbers" && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-6 text-2xl font-bold">All Owned Numbers</h2>
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-left">User</th>
                  <th className="px-6 py-4 text-left">Number</th>
                  <th className="px-6 py-4 text-left">Alias</th>
                </tr>
              </thead>
              <tbody>
                {accounts
                  .flatMap((a) => (a.ownedNumbers || []).map((n) => ({ ...n, user: `${a.firstName} ${a.lastName}` })))
                  .map((n, i) => (
                    <tr key={`${n.id}_${i}`} className="border-t border-zinc-700">
                      <td className="px-6 py-4">{n.user}</td>
                      <td className="px-6 py-4 font-mono">{n.number}</td>
                      <td className="px-6 py-4">{n.alias || "—"}</td>
                    </tr>
                  ))}
                {accounts.flatMap((a) => a.ownedNumbers || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">No phone numbers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="mb-8 text-2xl font-bold">Platform Settings</h2>
            <div className="space-y-8">
              <div>
                <label className="mb-2 block text-sm">Default Message Cost (per segment)</label>
                <input type="number" step="0.001" value={globalMessageCost} onChange={(e) => setGlobalMessageCost(parseFloat(e.target.value) || 0)}
                  className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
                <p className="mt-1 text-xs text-zinc-500">This sets the default for new users. Use per-user pricing below to customize.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm">Default Phone Number Cost</label>
                <input type="number" step="0.01" value={globalNumberCost} onChange={(e) => setGlobalNumberCost(parseFloat(e.target.value) || 0)}
                  className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3" />
              </div>
              <button onClick={handleSaveGlobalSettings} className="w-full rounded-2xl bg-violet-600 px-8 py-4 hover:bg-violet-700">
                Save Global Settings
              </button>

              <hr className="border-zinc-800" />

              <h3 className="text-xl font-bold">Per-User Pricing</h3>
              <p className="text-sm text-zinc-400">Set custom message cost and number cost for individual users. Leave blank to use global defaults.</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {accounts.map((acct) => (
                  <div key={acct.id} className="flex items-center gap-3 rounded-xl bg-zinc-800 p-4">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{acct.firstName} {acct.lastName}</span>
                      <span className="ml-2 text-xs text-zinc-500">{acct.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">$/msg</label>
                        <input type="number" step="0.001"
                          value={acct.plan.messageCost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setAccounts((prev) => prev.map((a) => a.id === acct.id ? { ...a, plan: { ...a.plan, messageCost: val } } : a));
                          }}
                          className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none" />
                      </div>
                      <button
                        onClick={() => handleSaveUserPricing(acct.id)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-700">
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
              <div className={passwordChecks.minLength ? "text-emerald-300" : "text-zinc-400"}>• At least 8 characters</div>
              <div className={passwordChecks.upper ? "text-emerald-300" : "text-zinc-400"}>• At least 1 uppercase letter</div>
              <div className={passwordChecks.number ? "text-emerald-300" : "text-zinc-400"}>• At least 1 number</div>
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

      {showDeleteUserModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 p-8">
            <h3 className="mb-3 text-2xl font-bold text-red-400">Delete Account</h3>
            <p className="mb-4 text-sm leading-7 text-zinc-300">
              You are about to permanently delete{" "}
              <span className="font-semibold text-white">{selectedAccount.firstName} {selectedAccount.lastName}</span>.
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
