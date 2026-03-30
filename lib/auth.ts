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

export async function signupUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}) {
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
    return { success: false as const, message: error.message };
  }

  if (!data.user) {
    return { success: false as const, message: "Signup failed. Please try again." };
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
