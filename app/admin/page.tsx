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

type AccountRecord = {
  id: string;
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
  plan: { name: string; price: number; messageCost: number };
  createdAt: string;
  walletBalance?: number;
  ownedNumbers?: { id: string; number: string; alias: string }[];
  role?: "user" | "admin";
};

type Campaign = {
  id: string;
  name: string;
  audience: number;
  sent: number;
  replies: number;
  failed: number;
  status: string;
  logs: {
    id: string;
    createdAt: string;
    success: number;
    failed: number;
    attempted: number;
    notes: string;
  }[];
};

type AdminTab =
  | "users"
  | "campaigns"
  | "analytics"
  | "transactions"
  | "numbers"
  | "settings";

type NewUserForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

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

function loadAccountsFromStorage(): AccountRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_accounts");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCampaignsFromStorage(): Campaign[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("textalot_campaigns");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AdminPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

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
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [bulkCreditAmount, setBulkCreditAmount] = useState("50");
  const [globalMessageCost, setGlobalMessageCost] = useState(0.012);
  const [globalNumberCost, setGlobalNumberCost] = useState(1.0);

  useEffect(() => {
    setMounted(true);

    const loadedAccounts = loadAccountsFromStorage();
    const loadedCampaigns = loadCampaignsFromStorage();

    setAccounts(loadedAccounts);
    setCampaigns(loadedCampaigns);

    if (loadedAccounts.length > 0) {
      setSelectedId((current) => current || loadedAccounts[0].id);
    }
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId) || null,
    [accounts, selectedId]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acct) => {
      const matchesSearch = `${acct.firstName} ${acct.lastName} ${acct.email} ${acct.phone}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filterCredits === "all" || (filterCredits === "low" && acct.credits < 50);

      return matchesSearch && matchesFilter;
    });
  }, [accounts, search, filterCredits]);

  const passwordChecks = useMemo(
    () => getPasswordChecks(newUserForm.password),
    [newUserForm.password]
  );

  const passwordStrongEnough =
    passwordChecks.minLength && passwordChecks.upper && passwordChecks.number;

  const saveAccounts = (updated: AccountRecord[]) => {
    setAccounts(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("textalot_accounts", JSON.stringify(updated));

      const currentRaw = localStorage.getItem("textalot_current_user");
      if (currentRaw) {
        try {
          const currentUser = JSON.parse(currentRaw) as AccountRecord;
          const refreshed = updated.find((user) => user.id === currentUser.id);
          if (refreshed) {
            localStorage.setItem("textalot_current_user", JSON.stringify(refreshed));
          } else {
            localStorage.removeItem("textalot_current_user");
          }
        } catch {
          localStorage.removeItem("textalot_current_user");
        }
      }
    }
  };

  const resetCreateUserModal = () => {
    setShowCreateUserModal(false);
    setCreateUserError("");
    setShowPassword(false);
    setNewUserForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
  };

  const closeDeleteUserModal = () => {
    setShowDeleteUserModal(false);
    setDeleteUserError("");
  };

  const handleImpersonate = () => {
    if (!selectedAccount || typeof window === "undefined") return;
    localStorage.setItem("textalot_current_user", JSON.stringify(selectedAccount));
    setMessage(`✅ Impersonating ${selectedAccount.firstName} ${selectedAccount.lastName}`);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleAddCredits = (accountId: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("❌ Enter a valid credit amount");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const updated = accounts.map((account) => {
      if (account.id !== accountId) return account;

      const entry: UsageHistoryItem = {
        id: `admin_${Date.now()}`,
        type: "credit_add",
        amount,
        description: "Admin added credits",
        createdAt: new Date().toISOString(),
      };

      return {
        ...account,
        credits: Number((account.credits + amount).toFixed(3)),
        walletBalance: Number(((account.walletBalance || 0) + amount).toFixed(2)),
        usageHistory: [entry, ...(account.usageHistory || [])],
      };
    });

    saveAccounts(updated);
    setMessage("✅ Credits added");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleRemoveCredits = (accountId: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("❌ Enter a valid credit amount");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }

    const updated = accounts.map((account) => {
      if (account.id !== accountId) return account;

      const entry: UsageHistoryItem = {
        id: `admin_${Date.now()}`,
        type: "credit_remove",
        amount,
        description: "Admin removed credits",
        createdAt: new Date().toISOString(),
      };

      return {
        ...account,
        credits: Math.max(0, Number((account.credits - amount).toFixed(3))),
        walletBalance: Math.max(
          0,
          Number(((account.walletBalance || 0) - amount).toFixed(2))
        ),
        usageHistory: [entry, ...(account.usageHistory || [])],
      };
    });

    saveAccounts(updated);
    setMessage("✅ Credits removed");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const togglePause = (id: string) => {
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, paused: !a.paused } : a
    );
    saveAccounts(updated);
  };

  const createNewUser = () => {
    setCreateUserError("");

    if (!newUserForm.firstName.trim()) {
      setCreateUserError("First name is required.");
      return;
    }

    if (!newUserForm.lastName.trim()) {
      setCreateUserError("Last name is required.");
      return;
    }

    if (!newUserForm.email.trim()) {
      setCreateUserError("Email is required.");
      return;
    }

    if (!isValidEmail(newUserForm.email.trim())) {
      setCreateUserError("Enter a valid email address.");
      return;
    }

    const emailExists = accounts.some(
      (account) =>
        account.email.trim().toLowerCase() === newUserForm.email.trim().toLowerCase()
    );

    if (emailExists) {
      setCreateUserError("A user with that email already exists.");
      return;
    }

    if (!newUserForm.phone.trim()) {
      setCreateUserError("Phone number is required.");
      return;
    }

    if (newUserForm.phone.replace(/\D/g, "").length < 10) {
      setCreateUserError("Enter a valid 10-digit phone number.");
      return;
    }

    if (!newUserForm.password.trim()) {
      setCreateUserError("Password is required.");
      return;
    }

    if (!passwordStrongEnough) {
      setCreateUserError(
        "Password must be at least 8 characters and include 1 uppercase letter and 1 number."
      );
      return;
    }

    if (!newUserForm.confirmPassword.trim()) {
      setCreateUserError("Confirm password is required.");
      return;
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      setCreateUserError("Passwords do not match.");
      return;
    }

    const now = new Date().toISOString();

    const newAccount: AccountRecord = {
      id: `user_${Date.now()}`,
      firstName: newUserForm.firstName.trim(),
      lastName: newUserForm.lastName.trim(),
      phone: formatPhoneNumber(newUserForm.phone),
      email: newUserForm.email.trim(),
      password: newUserForm.password,
      credits: 500,
      verified: true,
      paused: false,
      workflowNote: "",
      usageHistory: [
        {
          id: `usage_${Date.now()}`,
          type: "credit_add",
          amount: 500,
          description: "Initial starter credits",
          createdAt: now,
        },
      ],
      plan: { name: "Starter", price: 39.99, messageCost: 0.012 },
      createdAt: now,
      walletBalance: 50,
      ownedNumbers: [],
      role: "user",
    };

    const updated = [newAccount, ...accounts];
    saveAccounts(updated);
    setSelectedId(newAccount.id);
    resetCreateUserModal();
    setMessage("✅ New user created");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleDeleteSelectedUser = () => {
    if (!selectedAccount) {
      setDeleteUserError("No user selected.");
      return;
    }

    if (selectedAccount.role === "admin") {
      setDeleteUserError("Admin accounts cannot be deleted from this screen.");
      return;
    }

    let currentUserId = "";

    if (typeof window !== "undefined") {
      const currentRaw = localStorage.getItem("textalot_current_user");
      if (currentRaw) {
        try {
          const currentUser = JSON.parse(currentRaw) as AccountRecord;
          currentUserId = currentUser.id;
        } catch {
          currentUserId = "";
        }
      }
    }

    if (currentUserId && currentUserId === selectedAccount.id) {
      setDeleteUserError(
        "You cannot delete the account currently stored as the active session."
      );
      return;
    }

    const updated = accounts.filter((account) => account.id !== selectedAccount.id);
    saveAccounts(updated);
    setSelectedId(updated[0]?.id || "");
    closeDeleteUserModal();
    setMessage("✅ User deleted");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const exportUsersCSV = () => {
    const csv = accounts
      .map((a) => `${a.firstName},${a.lastName},${a.email},${a.phone},${a.credits}`)
      .join("\n");

    const blob = new Blob([`FirstName,LastName,Email,Phone,Credits\n${csv}`], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "textalot-users.csv";
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
                  <button
                    onClick={exportUsersCSV}
                    className="rounded-2xl border border-zinc-700 px-5 py-2 text-sm"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setCreateUserError("");
                      setShowCreateUserModal(true);
                    }}
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
                      <div className="font-semibold">
                        {acct.firstName} {acct.lastName}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs ${
                          acct.paused
                            ? "bg-red-900 text-red-300"
                            : "bg-emerald-900 text-emerald-300"
                        }`}
                      >
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
                    <h3 className="text-2xl font-bold">
                      {selectedAccount.firstName} {selectedAccount.lastName}
                    </h3>
                    <div className="flex gap-3">
                      <button
                        onClick={handleImpersonate}
                        className="rounded-2xl bg-violet-600 px-6 py-2"
                      >
                        Impersonate
                      </button>
                      {selectedAccount.role !== "admin" && (
                        <button
                          onClick={() => {
                            setDeleteUserError("");
                            setShowDeleteUserModal(true);
                          }}
                          className="rounded-2xl bg-red-600 px-6 py-2 hover:bg-red-700"
                        >
                          Delete Account
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl bg-zinc-800 p-4">
                      <span className="text-zinc-500">Credits</span>
                      <div className="text-3xl font-bold text-emerald-400">
                        {selectedAccount.credits}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-zinc-800 p-4">
                      <span className="text-zinc-500">Wallet</span>
                      <div className="text-3xl font-bold">
                        ${selectedAccount.walletBalance?.toFixed(2) || "0.00"}
                      </div>
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
                      onClick={() =>
                        handleAddCredits(selectedAccount.id, Number(bulkCreditAmount))
                      }
                      className="rounded-2xl bg-emerald-600 px-8 py-3"
                    >
                      Add
                    </button>
                    <button
                      onClick={() =>
                        handleRemoveCredits(selectedAccount.id, Number(bulkCreditAmount))
                      }
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
                    onChange={(e) => {
                      const updated = accounts.map((a) =>
                        a.id === selectedAccount.id
                          ? { ...a, workflowNote: e.target.value }
                          : a
                      );
                      saveAccounts(updated);
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
                    <div>Audience</div>
                    <div className="font-medium">{c.audience}</div>

                    <div>Sent</div>
                    <div className="font-medium">{c.sent}</div>

                    <div>Failed</div>
                    <div className="font-medium text-red-400">{c.failed}</div>

                    <div>Replies</div>
                    <div className="font-medium text-emerald-400">{c.replies}</div>
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
              <div className="text-6xl font-bold text-emerald-400">12.4k</div>
              <div className="mt-2 text-zinc-400">Messages Sent Today</div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold">94.8%</div>
              <div className="mt-2 text-zinc-400">Avg Delivery Rate</div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="text-6xl font-bold text-amber-400">$2,847</div>
              <div className="mt-2 text-zinc-400">Revenue This Month</div>
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
                  {accounts.flatMap((a) => a.usageHistory || []).map((item, i) => (
                    <tr key={`${item.id}_${i}`} className="border-t border-zinc-700">
                      <td className="px-6 py-4">
                        {
                          accounts.find((acc) =>
                            (acc.usageHistory || []).some((u) => u.id === item.id)
                          )?.firstName
                        }
                      </td>
                      <td className="px-6 py-4">{item.description}</td>
                      <td className="px-6 py-4 font-medium">
                        {item.type.includes("add") ? "+" : "-"}${item.amount}
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
                  .flatMap((a) =>
                    (a.ownedNumbers || []).map((n) => ({
                      ...n,
                      user: `${a.firstName} ${a.lastName}`,
                    }))
                  )
                  .map((n, i) => (
                    <tr key={`${n.id}_${i}`} className="border-t border-zinc-700">
                      <td className="px-6 py-4">{n.user}</td>
                      <td className="px-6 py-4 font-mono">{n.number}</td>
                      <td className="px-6 py-4">{n.alias || "—"}</td>
                    </tr>
                  ))}

                {accounts.flatMap((a) => a.ownedNumbers || []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                      No phone numbers found.
                    </td>
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
                <label className="mb-2 block text-sm">Message Cost (per segment)</label>
                <input
                  type="number"
                  value={globalMessageCost}
                  onChange={(e) => setGlobalMessageCost(parseFloat(e.target.value))}
                  className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Phone Number Cost</label>
                <input
                  type="number"
                  value={globalNumberCost}
                  onChange={(e) => setGlobalNumberCost(parseFloat(e.target.value))}
                  className="w-48 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
                />
              </div>

              <button className="mt-8 w-full rounded-2xl bg-violet-600 px-8 py-4">
                Save Global Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-900 p-8">
            <h3 className="mb-6 text-2xl font-bold">Create New User</h3>

            <input
              placeholder="First Name"
              value={newUserForm.firstName}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, firstName: e.target.value })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <input
              placeholder="Last Name"
              value={newUserForm.lastName}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, lastName: e.target.value })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <input
              placeholder="Email"
              value={newUserForm.email}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, email: e.target.value })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <input
              placeholder="Phone"
              value={newUserForm.phone}
              onChange={(e) =>
                setNewUserForm({
                  ...newUserForm,
                  phone: formatPhoneNumber(e.target.value),
                })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={newUserForm.password}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, password: e.target.value })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={newUserForm.confirmPassword}
              onChange={(e) =>
                setNewUserForm({
                  ...newUserForm,
                  confirmPassword: e.target.value,
                })
              }
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-3"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="mb-4 text-sm text-violet-300 hover:text-violet-200"
            >
              {showPassword ? "Hide Passwords" : "Show Passwords"}
            </button>

            <div className="mb-6 rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4 text-sm">
              <div className="mb-2 font-semibold text-white">Password rules</div>
              <div
                className={passwordChecks.minLength ? "text-emerald-300" : "text-zinc-400"}
              >
                • At least 8 characters
              </div>
              <div
                className={passwordChecks.upper ? "text-emerald-300" : "text-zinc-400"}
              >
                • At least 1 uppercase letter
              </div>
              <div
                className={passwordChecks.number ? "text-emerald-300" : "text-zinc-400"}
              >
                • At least 1 number
              </div>
            </div>

            {createUserError ? (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {createUserError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={resetCreateUserModal}
                className="flex-1 rounded-2xl border border-zinc-700 py-4"
              >
                Cancel
              </button>
              <button
                onClick={createNewUser}
                className="flex-1 rounded-2xl bg-violet-600 py-4"
              >
                Create User
              </button>
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
              <span className="font-semibold text-white">
                {selectedAccount.firstName} {selectedAccount.lastName}
              </span>
              .
            </p>

            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              This removes the user from the admin list and local account storage.
            </div>

            {deleteUserError ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {deleteUserError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={closeDeleteUserModal}
                className="flex-1 rounded-2xl border border-zinc-700 py-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedUser}
                className="flex-1 rounded-2xl bg-red-600 py-4 hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed bottom-8 right-8 rounded-2xl bg-emerald-900 px-6 py-4 text-emerald-200 shadow-2xl">
          {message}
        </div>
      )}
    </main>
  );
}