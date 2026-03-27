export type UsageHistoryItem = {
  id: string;
  type: "charge" | "credit_add" | "credit_remove";
  amount: number;
  description: string;
  createdAt: string;
};

export type StoredUser = {
  id: string;
  role: "user" | "admin";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
};

export const STORAGE_KEYS = {
  accounts: "textalot_accounts",
  currentUser: "textalot_current_user",
} as const;

export const DEFAULT_PLAN = {
  name: "Text2Sale Core Plan",
  price: 39.99,
  messageCost: 0.012,
};

function hasWindow() {
  return typeof window !== "undefined";
}

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function getStoredUsers(): StoredUser[] {
  if (!hasWindow()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accounts);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredUsers(users: StoredUser[]) {
  if (!hasWindow()) return;
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(users));
}

export function getCurrentUser(): StoredUser | null {
  if (!hasWindow()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: StoredUser | null) {
  if (!hasWindow()) return;

  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

export function syncCurrentUserFromAccounts() {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const users = getStoredUsers();
  const freshUser = users.find((user) => user.id === currentUser.id) ?? null;

  if (!freshUser) {
    setCurrentUser(null);
    return null;
  }

  setCurrentUser(freshUser);
  return freshUser;
}

export function ensureSeedAdmin() {
  if (!hasWindow()) return;

  const users = getStoredUsers();
  const existingAdmin = users.find((user) => user.role === "admin");

  if (existingAdmin) return;

  const adminUser: StoredUser = {
    id: "acct_admin_demo",
    role: "admin",
    firstName: "Jamie",
    lastName: "Admin",
    email: "admin@text2sale.local",
    phone: "(954) 000-0000",
    password: "admin123",
    referralCode: "",
    credits: 5000,
    verified: true,
    paused: false,
    workflowNote: "Seed admin account",
    usageHistory: [
      {
        id: `usage_${Date.now()}`,
        type: "credit_add",
        amount: 5000,
        description: "Initial admin test credits",
        createdAt: new Date().toISOString(),
      },
    ],
    plan: DEFAULT_PLAN,
    createdAt: new Date().toISOString(),
  };

  saveStoredUsers([adminUser, ...users]);
}

export function loginUser(email: string, password: string) {
  const users = getStoredUsers();

  const foundUser = users.find(
    (user) =>
      user.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      user.password === password
  );

  if (!foundUser) {
    return {
      success: false as const,
      message: "Invalid email or password.",
    };
  }

  if (foundUser.paused) {
    return {
      success: false as const,
      message: "This account is paused. Contact support.",
    };
  }

  setCurrentUser(foundUser);

  return {
    success: true as const,
    user: foundUser,
  };
}

export function signupUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}) {
  const users = getStoredUsers();

  const alreadyExists = users.some(
    (user) => user.email.trim().toLowerCase() === input.email.trim().toLowerCase()
  );

  if (alreadyExists) {
    return {
      success: false as const,
      message: "An account with that email already exists.",
    };
  }

  const newUser: StoredUser = {
    id: `acct_${Date.now()}`,
    role: "user",
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phone: formatPhoneNumber(input.phone),
    password: input.password,
    referralCode: input.referralCode?.trim() || "",
    credits: 0,
    verified: false,
    paused: false,
    workflowNote: "",
    usageHistory: [],
    plan: DEFAULT_PLAN,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [newUser, ...users];
  saveStoredUsers(updatedUsers);
  setCurrentUser(newUser);

  return {
    success: true as const,
    user: newUser,
  };
}

export function logoutUser() {
  setCurrentUser(null);
}