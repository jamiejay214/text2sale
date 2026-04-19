import { supabase } from "./supabase";
import type {
  Profile,
  Contact,
  Campaign,
  Conversation,
  Message,
  UsageHistoryItem,
  OwnedNumber,
  MessageTemplate,
  ScheduledMessage,
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
  // Supabase caps queries at 1000 rows by default. Paginate to fetch all.
  const PAGE_SIZE = 1000;
  let all: Contact[] = [];
  let page = 0;
  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error || !data) break;
    all = all.concat(data as Contact[]);
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // safety: cap at 50k contacts
  }
  return all;
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
  if (error) {
    console.error("Delete contact error:", error.message);
    return false;
  }
  return true;
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
  // Supabase caps queries at 1000 rows by default. Paginate to fetch all.
  const PAGE_SIZE = 1000;
  let all: Conversation[] = [];
  let page = 0;
  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .range(from, to);
    if (error || !data) break;
    all = all.concat(data as Conversation[]);
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // safety cap
  }
  return all;
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

// Batch-fetch every message for a user in one round-trip, grouped by
// conversation_id. Replaces the N+1 pattern the dashboard used to run on
// mount (one fetchMessages() per conversation × thousands of conversations
// = a 30s+ load). We page through in chunks of 1000 because Supabase caps
// single-query results at that size.
//
// Messages rows don't carry user_id — we filter by the set of conversation
// IDs we already loaded, which keeps RLS simple and stays on an indexed
// column.
export async function fetchAllMessagesForUser(
  conversationIds: string[]
): Promise<Map<string, Message[]>> {
  const grouped = new Map<string, Message[]>();
  if (conversationIds.length === 0) return grouped;

  // Split IDs into chunks so the URL stays under Postgres/Supabase limits
  // even for users with tens of thousands of conversations.
  const ID_CHUNK = 300;
  const PAGE = 1000;

  for (let i = 0; i < conversationIds.length; i += ID_CHUNK) {
    const ids = conversationIds.slice(i, i + ID_CHUNK);
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data as Message[]) {
        const arr = grouped.get(row.conversation_id) || [];
        arr.push(row);
        grouped.set(row.conversation_id, arr);
      }
      if (data.length < PAGE) break;
      offset += PAGE;
      if (offset > 50_000) break; // safety cap — ~50k msgs per chunk
    }
  }
  return grouped;
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

export async function insertConversation(
  conversation: Omit<Conversation, "id" | "created_at">
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .insert(conversation)
    .select()
    .single();
  if (error || !data) return null;
  return data as Conversation;
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
  return fetchContacts(memberId);
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
  return fetchConversations(memberId);
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

export function removeOwnedNumber(
  currentNumbers: OwnedNumber[],
  numberId: string
): OwnedNumber[] {
  return currentNumbers.filter((n) => n.id !== numberId);
}

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

export async function fetchTemplates(userId: string): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as MessageTemplate[];
}

export async function insertTemplate(
  template: Omit<MessageTemplate, "id" | "created_at">
): Promise<MessageTemplate | null> {
  const { data, error } = await supabase
    .from("message_templates")
    .insert(template)
    .select()
    .single();
  if (error || !data) return null;
  return data as MessageTemplate;
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<Pick<MessageTemplate, "name" | "body" | "category">>
): Promise<MessageTemplate | null> {
  const { data, error } = await supabase
    .from("message_templates")
    .update(updates)
    .eq("id", templateId)
    .select()
    .single();
  if (error || !data) return null;
  return data as MessageTemplate;
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId);
  return !error;
}

// ============================================================
// SCHEDULED MESSAGES
// ============================================================

export async function fetchScheduledMessages(userId: string): Promise<ScheduledMessage[]> {
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });
  if (error || !data) return [];
  return data as ScheduledMessage[];
}

export async function insertScheduledMessage(
  msg: Omit<ScheduledMessage, "id" | "created_at">
): Promise<ScheduledMessage | null> {
  const { data, error } = await supabase
    .from("scheduled_messages")
    .insert(msg)
    .select()
    .single();
  if (error || !data) return null;
  return data as ScheduledMessage;
}

export async function cancelScheduledMessage(msgId: string): Promise<boolean> {
  const { error } = await supabase
    .from("scheduled_messages")
    .update({ status: "cancelled" })
    .eq("id", msgId);
  return !error;
}
