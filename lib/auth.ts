import { supabase } from "./supabase";
import { fetchProfile } from "./supabase-data";
import type { Profile } from "./types";

export type { Profile };

export const DEFAULT_PLAN = {
  name: "Text2Sale Package",
  price: 39.99,
  messageCost: 0.012,
};

export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return fetchProfile(session.user.id);
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  const profile = await fetchProfile(data.user.id);

  if (profile?.paused) {
    await supabase.auth.signOut();
    return { success: false as const, message: "This account is paused. Contact support." };
  }

  return { success: true as const, user: profile };
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
    email: input.email.trim(),
    password: input.password,
    options: {
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

  // If email confirmation is enabled, there's no session yet.
  // Auto sign-in after signup to get a session.
  if (!data.session) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });

    if (signInError || !signInData.session) {
      return {
        success: false as const,
        message: "Account created but sign-in failed. Please confirm your email or try logging in.",
      };
    }
  }

  // Small delay to let the trigger create the profile
  await new Promise((r) => setTimeout(r, 500));

  const session = await getSession();
  if (!session?.user) {
    return { success: false as const, message: "Account created. Please log in." };
  }

  const profile = await fetchProfile(session.user.id);
  return { success: true as const, user: profile };
}

export async function logoutUser() {
  await supabase.auth.signOut();
}
