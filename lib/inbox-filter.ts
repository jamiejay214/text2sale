// Inbox tabs. Each tab is filtered in the database, not over the 50 rows on
// screen, so a reply is found no matter how many campaign texts went out
// after it.
//
//   All texts   every conversation
//   Inbox       leads who replied (opt-outs don't count)
//   Unread      replies nobody has opened yet
//   AI handled  the AI replied, or AI is switched on for the conversation
//   Archived    archived in this browser, or the lead opted out

import type { Conversation } from "./types";

export type InboxFilter = "all" | "inbox" | "unread" | "ai" | "archived";

export const CONVERSATION_COLUMNS =
  "id,user_id,contact_id,preview,unread,last_message_at,starred,created_at,from_number,ai_enabled,agent_enabled,ai_skipped_reason,replied_at,ai_replied_at";

// Joins the lead so opted-out (DNC) conversations can be kept out of, or
// shown in, a tab by the database.
const WITH_CONTACT = `${CONVERSATION_COLUMNS},contacts!inner(dnc)`;

export const AI_HANDLED = "ai_replied_at.not.is.null,ai_enabled.is.true,agent_enabled.is.true";

// Archived ids live in the browser and travel in the request URL, so they go
// in batches. Past the exclusion cap, the page itself hides the rest.
export const ARCHIVED_BATCH = 150;
export const MAX_ARCHIVED_LOOKUP = 1_000;

export type FilterStep =
  | { op: "not"; column: string; operator: "is" | "in"; value: unknown }
  | { op: "eq"; column: string; value: unknown }
  | { op: "gt"; column: string; value: number }
  | { op: "in"; column: string; values: string[] }
  | { op: "or"; filters: string };

export type TabQuery = { select: string; steps: FilterStep[] };

function batches<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * The queries behind one tab. Every tab is a single query except Archived,
 * which merges opted-out leads with the browser's archived ids.
 */
export function tabQueries(filter: InboxFilter, archivedIds: readonly string[] = []): TabQuery[] {
  if (filter === "all") return [{ select: CONVERSATION_COLUMNS, steps: [] }];

  if (filter === "archived") {
    return [
      { select: WITH_CONTACT, steps: [{ op: "eq", column: "contacts.dnc", value: true }] },
      ...batches(archivedIds.slice(0, MAX_ARCHIVED_LOOKUP), ARCHIVED_BATCH).map((ids) => ({
        select: CONVERSATION_COLUMNS,
        steps: [{ op: "in", column: "id", values: ids }] as FilterStep[],
      })),
    ];
  }

  const steps: FilterStep[] = [{ op: "not", column: "contacts.dnc", operator: "is", value: true }];
  const hidden = archivedIds.slice(0, ARCHIVED_BATCH);
  if (hidden.length) steps.push({ op: "not", column: "id", operator: "in", value: `(${hidden.join(",")})` });
  if (filter === "inbox") steps.push({ op: "not", column: "replied_at", operator: "is", value: null });
  if (filter === "unread") steps.push({ op: "gt", column: "unread", value: 0 });
  if (filter === "ai") steps.push({ op: "or", filters: AI_HANDLED });
  return [{ select: WITH_CONTACT, steps }];
}

/** Whether a loaded conversation still belongs in a tab (after local edits). */
export function belongsInTab(
  conversation: Pick<Conversation, "id" | "unread" | "replied_at" | "ai_replied_at" | "ai_enabled" | "agent_enabled">,
  filter: InboxFilter,
  isArchived: boolean,
): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return isArchived;
  if (isArchived) return false;
  if (filter === "inbox") return !!conversation.replied_at;
  if (filter === "unread") return conversation.unread > 0;
  return !!(conversation.ai_replied_at || conversation.ai_enabled || conversation.agent_enabled);
}

/** Merges the Archived tab's queries: newest first, each conversation once. */
export function mergeNewestFirst<T extends { id: string; last_message_at: string }>(lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const row of list) byId.set(row.id, row);
  return Array.from(byId.values()).sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at));
}

