import { supabase } from "./supabase";
import { fetchProfile } from "./supabase-data";
import type { Profile } from "./types";
import { waitForSession } from "./request-timeout";

export type { Profile };

export const DEFAULT_PLAN = {
  name: "Text2Sale",
  price: 39.99,
  messageCost: 0.015,
};

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function getSession() {
  const { data, error } = await waitForSession(supabase.auth.getSession());
  if (error) throw error;
  return data.session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return fetchProfile(session.user.id);
}

export async function loginUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { success: false as const, message: error.message };
    }

    // Authentication succeeded. Profile/paused/role checks belong to the
    // destination's loading state, where database failures can be retried
    // without asking for a password again. Do not turn a slow profile query
    // into a misleading failed login.
    return { success: true as const, user: data.user };
  } catch {
    return { success: false as const, message: "Could not reach sign-in. Check your connection and try again." };
  }
}

export async function checkDuplicatePhone(phone: string): Promise<boolean> {
  // The previous version queried profiles directly. RLS lets unauthenticated
  // (anon) callers see only their own row — which during signup is none —
  // so the count always came back 0 and the precheck silently passed,
  // letting the request hit Supabase's signup endpoint where the
  // handle_new_user trigger would catch the duplicate and bury the real
  // error under "Database error saving new user" (a HTTP 500 that breaks
  // the UX badly). We now call a SECURITY DEFINER RPC that runs at the
  // function's owner (postgres), so the lookup actually finds the row
  // regardless of who's calling.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return false;
  const { data, error } = await supabase.rpc("phone_in_use", { check_phone: digits });
  if (error) return false;
  return data === true;
}

export async function signupUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}) {
  // Check for duplicate phone number before creating auth user
  const phoneDuplicate = await checkDuplicatePhone(input.phone);
  if (phoneDuplicate) {
    return {
      success: false as const,
      message: "An account with this phone number already exists. Please log in instead.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: formatPhoneNumber(input.phone),
        referral_code: input.referralCode?.trim() || "",
      },
    },
  });

  if (error) {
    // Friendly translation of Supabase's terse error messages. Supabase
    // wraps the trigger's "phone already exists" exception in a generic
    // "Database error saving new user" 500 — without this mapping the
    // user just sees that opaque sentence and assumes the app is broken.
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered") || (msg.includes("unique") && msg.includes("email"))) {
      return { success: false as const, message: "An account with this email already exists. Please log in instead." };
    }
    if (msg.includes("phone")) {
      return { success: false as const, message: "An account with this phone number already exists. Please log in instead." };
    }
    if (msg.includes("database error saving new user") || msg.includes("unexpected_failure")) {
      // Trigger fired and rejected the row — most common cause is a
      // duplicate phone that slipped past the client-side check (e.g.
      // race on simultaneous tabs). Surface the most likely culprit.
      return { success: false as const, message: "An account with this phone number or email already exists. Please log in instead." };
    }
    return { success: false as const, message: error.message };
  }

  if (!data.user) {
    return { success: false as const, message: "Signup failed. Please try again." };
  }

  // Supabase may return a user with a fake id when email already exists (no error thrown).
  // Detect this by checking if identities array is empty.
  if (data.user.identities && data.user.identities.length === 0) {
    return { success: false as const, message: "An account with this email already exists. Please log in instead." };
  }

  // Confirmation is a successful signup, not a failed login.
  if (!data.session) {
    return { success: true as const, requiresEmailConfirmation: true as const, user: null };
  }

  // Small delay to let the trigger create the profile
  await new Promise((r) => setTimeout(r, 500));

  const session = await getSession();
  if (!session?.user) {
    return { success: false as const, message: "Account created. Please log in." };
  }

  const profile = await fetchProfile(session.user.id);
  return { success: true as const, requiresEmailConfirmation: false as const, user: profile };
}

export async function logoutUser() {
  await supabase.auth.signOut();
}
