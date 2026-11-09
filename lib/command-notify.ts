// Push an operator alert into the Command Center. Inserts one row into
// command_notifications; the per-minute DB cron pushes it to the owner's
// registered devices. event_key is unique, so retries never double-notify.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

export type CommandKind = "low_balance" | "payment" | "approved" | "rejected" | "platform" | "signup" | "visit" | "support" | "test";

export async function notifyCommand(
  db: Db,
  n: { eventKey: string; kind: CommandKind; title: string; body: string; url?: string },
): Promise<void> {
  try {
    await db
      .from("command_notifications")
      .upsert(
        {
          event_key: n.eventKey,
          kind: n.kind,
          title: n.title.slice(0, 120),
          body: n.body.slice(0, 300),
          url: n.url || "/command?biz=text2sale",
        },
        { onConflict: "event_key", ignoreDuplicates: true },
      );
  } catch {
    // Best-effort: a missed operator alert must never break the money path.
  }
}
