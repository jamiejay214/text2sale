import { supabase } from "./supabase";
import type {
  Profile,
  Contact,
  Campaign,
  Conversation,
  Message,
  UsageHistoryItem,
  OwnedNumber,
} from "./types";

// ============================================================
// PROFILE
// ============================================================

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, "id" | "created_at">>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error || !data) return null;
  return data as Profile;
}

// ============================================================
// CONTACTS
// ============================================================

export async function fetchContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Contact[];
}

export async function insertContact(
  contact: Omit<Contact, "id" | "created_at">
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .insert(contact)
    .select()
    .single();
  if (error || !data) return null;
  return data as Contact;
}

export async function updateContact(
  contactId: string,
  updates: Partial<Omit<Contact, "id" | "user_id" | "created_at">>
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", contactId)
    .select()
    .single();
  if (error || !data) return null;
  return data as Contact;
}

export async function deleteContact(contactId: string): Promise<boolean> {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId);
  return !error;
}

// ============================================================
// CAMPAIGNS
// ============================================================

export async function fetchCampaigns(userId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Campaign[];
}

export async function insertCampaign(
  campaign: Omit<Campaign, "id" | "created_at">
): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert(campaign)
    .select()
    .single();
  if (error || !data) return null;
  return data as Campaign;
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<Omit<Campaign, "id" | "user_id" | "created_at">>
): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", campaignId)
    .select()
    .single();
  if (error || !data) return null;
  return data as Campaign;
}

export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId);
  return !error;
}

// ============================================================
// CONVERSATIONS & MESSAGES
// ============================================================

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });
  if (error || !data) return [];
  return data as Conversation[];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as Message[];
}

export async function insertMessage(
  message: Omit<Message, "id" | "created_at">
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert(message)
    .select()
    .single();
  if (error || !data) return null;
  return data as Message;
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Omit<Conversation, "id" | "user_id" | "created_at">>
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId)
    .select()
    .single();
  if (error || !data) return null;
  return data as Conversation;
}

// ============================================================
// ADMIN
// ============================================================

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Profile[];
}

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Campaign[];
}

// ============================================================
// HELPERS
// ============================================================

export function addUsageEntry(
  currentHistory: UsageHistoryItem[],
  entry: UsageHistoryItem
): UsageHistoryItem[] {
  return [entry, ...currentHistory];
}

export function addOwnedNumber(
  currentNumbers: OwnedNumber[],
  num: OwnedNumber
): OwnedNumber[] {
  return [num, ...currentNumbers];
}
