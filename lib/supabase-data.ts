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
// TEAM / MANAGER
// ============================================================

export async function fetchTeamMembers(managerId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Profile[];
}

export async function fetchTeamMemberContacts(memberId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", memberId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Contact[];
}

export async function fetchTeamMemberCampaigns(memberId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", memberId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Campaign[];
}

export async function fetchTeamMemberConversations(memberId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", memberId)
    .order("last_message_at", { ascending: false });
  if (error || !data) return [];
  return data as Conversation[];
}

export async function joinTeamByCode(userId: string, code: string): Promise<{ success: boolean; managerName?: string; error?: string }> {
  // Find the manager/admin with this referral code
  const { data: manager, error: managerErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, referral_code, role")
    .eq("referral_code", code)
    .in("role", ["manager", "admin"])
    .single();

  if (managerErr || !manager) {
    return { success: false, error: "Invalid team code. Make sure the code belongs to a manager." };
  }

  if (manager.id === userId) {
    return { success: false, error: "You can't join your own team." };
  }

  // Set the user's manager_id
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ manager_id: manager.id })
    .eq("id", userId);

  if (updateErr) {
    return { success: false, error: "Failed to join team." };
  }

  return { success: true, managerName: `${manager.first_name} ${manager.last_name}` };
}

export async function leaveTeam(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ manager_id: null })
    .eq("id", userId);
  return !error;
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
