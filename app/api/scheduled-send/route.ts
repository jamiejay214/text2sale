import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferTimezone, isQuietHours } from "@/lib/quiet-hours";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+${digits.startsWith("1") ? digits : `1${digits}`}`;
}

// POST - Schedule a message (save to DB for later sending)
export async function POST(req: NextRequest) {
  try {
    const { userId, contactId, body, fromNumber, scheduledAt } = await req.json();

    if (!userId || !contactId || !body || !fromNumber || !scheduledAt) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert({
        user_id: userId, contact_id: contactId, body,
        from_number: fromNumber, scheduled_at: scheduledAt, status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, scheduledMessage: data });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Schedule message error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

// Cron jobs can occasionally run twice (Vercel retries, slow previous run,
// deployments) so this route MUST be idempotent. We atomically "claim" a
// batch of due messages via a SECURITY DEFINER RPC that uses FOR UPDATE
// SKIP LOCKED, setting processing_at. Any other invocation running at the
// same time gets a disjoint set of rows. Stuck leases older than 5 minutes
// are auto-reclaimed on the next run.
export const maxDuration = 60;
const CLAIM_BATCH = 200;

// GET - Cron entrypoint. Fires due scheduled messages. Called every minute
// from vercel.json. Debits the wallet per message (same atomic RPC as
// send-campaign) so follow-up drips stay honest with the live balance.
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingMessages, error: fetchErr } = await supabase.rpc(
      "claim_scheduled_messages",
      { p_limit: CLAIM_BATCH }
    );

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    // Cache each user's message cost once per run — it almost never changes
    // mid-minute and this saves a profile read per pending message.
    const costCache = new Map<string, number>();
    const getMessageCost = async (userId: string): Promise<number> => {
      if (costCache.has(userId)) return costCache.get(userId)!;
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single();
      const plan = (data?.plan as Record<string, unknown> | null) || null;
      const cost = Number((plan?.messageCost as number) ?? 0.012);
      costCache.set(userId, cost);
      return cost;
    };

    let sent = 0;
    let failed = 0;
    let skippedNoFunds = 0;

    // Cache quiet hours per user so we don't re-read profiles for each msg.
    type QhCfg = { enabled: boolean; start: number; end: number };
    const qhCache = new Map<string, QhCfg>();
    const getQh = async (userId: string): Promise<QhCfg> => {
      const cached = qhCache.get(userId);
      if (cached) return cached;
      const { data } = await supabase
        .from("profiles")
        .select("quiet_hours_enabled, quiet_hours_start_hour, quiet_hours_end_hour")
        .eq("id", userId)
        .single();
      const cfg: QhCfg = {
        enabled: data?.quiet_hours_enabled ?? true,
        start: data?.quiet_hours_start_hour ?? 21,
        end: data?.quiet_hours_end_hour ?? 8,
      };
      qhCache.set(userId, cfg);
      return cfg;
    };

    let deferred = 0;

    for (const msg of pendingMessages) {
      try {
        const { data: contact } = await supabase
          .from("contacts").select("id, phone, dnc, state").eq("id", msg.contact_id).single();

        if (!contact || !contact.phone) throw new Error("Contact not found");

        // Respect DNC — if the contact has been marked DNC since scheduling,
        // cancel the step instead of sending.
        if (contact.dnc) {
          await supabase.from("scheduled_messages").update({ status: "cancelled" }).eq("id", msg.id);
          continue;
        }

        // Respect quiet hours. If the contact's local time is inside the
        // user's blocked window, release the lease (processing_at=null) and
        // bump scheduled_at forward 30 minutes so the next cron retries. We
        // don't indefinitely defer — the window check will let it through
        // once the local time clears.
        const qh = await getQh(msg.user_id);
        if (qh.enabled) {
          const tz = inferTimezone(contact.state || undefined);
          if (isQuietHours(tz, qh.start, qh.end)) {
            const retryAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            await supabase
              .from("scheduled_messages")
              .update({ processing_at: null, scheduled_at: retryAt })
              .eq("id", msg.id);
            deferred++;
            continue;
          }
        }

        const toNumber = normalizePhone(contact.phone);
        const fromNumber = normalizePhone(msg.from_number);

        // Debit the wallet atomically BEFORE we actually send so we never
        // over-deliver. If the user's balance is too low, park the message
        // in 'failed' with a clear reason.
        const cost = await getMessageCost(msg.user_id);
        const { data: newBal, error: decErr } = await supabase.rpc("decrement_wallet", {
          p_user_id: msg.user_id,
          p_amount: Number(cost.toFixed(4)),
        });
        if (decErr || newBal === null) {
          skippedNoFunds++;
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          continue;
        }

        // Send via Telnyx (include messaging_profile_id for 10DLC).
        const telnyxPayload: Record<string, string> = {
          from: fromNumber,
          to: toNumber,
          text: msg.body,
          type: "SMS",
        };
        if (messagingProfileId) telnyxPayload.messaging_profile_id = messagingProfileId;

        const res = await fetch("https://api.telnyx.com/v2/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(telnyxPayload),
        });
        const data = await res.json();

        if (data.errors) {
          throw new Error(data.errors[0]?.detail || "Send failed");
        }

        await supabase.from("scheduled_messages").update({ status: "sent" }).eq("id", msg.id);

        // Create/update conversation, keeping from_number pinned so inbound
        // replies land on the right 10DLC line.
        const { data: existingConv } = await supabase
          .from("conversations").select("id, from_number")
          .eq("contact_id", msg.contact_id).eq("user_id", msg.user_id).maybeSingle();

        if (!existingConv) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              user_id: msg.user_id,
              contact_id: msg.contact_id,
              preview: msg.body.slice(0, 100),
              unread: 0,
              last_message_at: new Date().toISOString(),
              from_number: msg.from_number,
            })
            .select().single();
          if (newConv) {
            await supabase.from("messages").insert({
              conversation_id: newConv.id,
              direction: "outbound",
              body: msg.body,
              status: "sent",
              from_number: msg.from_number,
            });
          }
        } else {
          const update: Record<string, unknown> = {
            preview: msg.body.slice(0, 100),
            last_message_at: new Date().toISOString(),
          };
          if (!existingConv.from_number) update.from_number = msg.from_number;
          await supabase.from("conversations").update(update).eq("id", existingConv.id);
          await supabase.from("messages").insert({
            conversation_id: existingConv.id,
            direction: "outbound",
            body: msg.body,
            status: "sent",
            from_number: msg.from_number,
          });
        }

        // Tick the campaign's `sent` counter if this step came from a workflow.
        if (msg.campaign_id) {
          const { data: camp } = await supabase
            .from("campaigns")
            .select("sent")
            .eq("id", msg.campaign_id)
            .single();
          if (camp) {
            await supabase
              .from("campaigns")
              .update({ sent: (camp.sent || 0) + 1 })
              .eq("id", msg.campaign_id);
          }
        }

        sent++;
      } catch (err: unknown) {
        failed++;
        console.error(`Scheduled send failed for ${msg.id}:`, err instanceof Error ? err.message : err);
        await supabase.from("scheduled_messages").update({ status: "failed" }).eq("id", msg.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingMessages.length,
      sent,
      failed,
      deferred,
      skippedNoFunds,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Process scheduled messages error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
