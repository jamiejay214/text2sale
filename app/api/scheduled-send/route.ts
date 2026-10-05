import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferTimezone, isQuietHours } from "@/lib/quiet-hours";
import { sanitizeForSms, countSegments } from "@/lib/sms-text";
import { requireSameUser } from "@/lib/auth-guard";
import { renderCampaignMessage } from "@/lib/campaign-sequence";
import { customerSmsRate } from "@/lib/sms-pricing";
import { EIN_CERTIFICATE_REQUIRED_MESSAGE, hasEINCertificate } from "@/lib/ein-certificate-storage";

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
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { userId: bodyUserId, contactId, body, fromNumber, scheduledAt } = await req.json();

    if (!bodyUserId || typeof contactId !== "string" || typeof body !== "string" ||
        !body.trim() || body.length > 5000 || typeof fromNumber !== "string" ||
        typeof scheduledAt !== "string" || !Number.isFinite(Date.parse(scheduledAt)) ||
        Date.parse(scheduledAt) <= Date.now()) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!(await hasEINCertificate(supabase, userId))) {
      return NextResponse.json(
        { success: false, error: EIN_CERTIFICATE_REQUIRED_MESSAGE, einCertificateRequired: true },
        { status: 412 }
      );
    }

    const fromDigits = fromNumber.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (fromDigits.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid sending number" }, { status: 400 });
    }
    const [contactResult, numberResult] = await Promise.all([
      supabase.from("contacts").select("id, dnc").eq("id", contactId).eq("user_id", userId).maybeSingle(),
      supabase.from("owned_phone_numbers").select("user_id").eq("digits", fromDigits).eq("user_id", userId).limit(1),
    ]);
    if (contactResult.error || numberResult.error) {
      return NextResponse.json({ success: false, error: "Could not verify the recipient and sending number" }, { status: 503 });
    }
    if (!contactResult.data || !numberResult.data?.length) {
      return NextResponse.json({ success: false, error: "The contact and sending number must belong to your account" }, { status: 403 });
    }
    if (contactResult.data.dnc) {
      return NextResponse.json({ success: false, error: "This contact has opted out" }, { status: 400 });
    }

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
export async function GET(req: NextRequest) {
  // Gate behind CRON_SECRET like the other cron routes so a random caller can't
  // drive the send loop. Fail closed if the secret isn't configured.
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) {
    console.error("[scheduled-send] CRON_SECRET not configured — refusing to run");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      await supabase.rpc("reconcile_campaign_sequences");
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
      const plan = (data?.plan as { messageCost?: number | null } | null) || null;
      const cost = customerSmsRate(plan);
      costCache.set(userId, cost);
      return cost;
    };

    const certificateCache = new Map<string, boolean>();
    const canSendMessages = async (userId: string): Promise<boolean> => {
      if (certificateCache.has(userId)) return certificateCache.get(userId)!;
      const allowed = await hasEINCertificate(supabase, userId);
      certificateCache.set(userId, allowed);
      return allowed;
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

    const processMessage = async (msg: (typeof pendingMessages)[number]) => {
      // Track what we actually debited for this row so that if the send
      // later throws (Telnyx error/network), the catch block can refund the
      // exact amount instead of leaving the user over-charged.
      let chargedAmount = Number(msg.charged_amount || 0);
      let possiblySent = false;
      let providerAccepted = false;
      let providerId: string | null = null;
      try {
        const {data:current,error:stateError}=await supabase.from("scheduled_messages").select("status,dispatch_started_at").eq("id",msg.id).single();
        if (stateError) throw new Error("Could not verify message status");
        if (current?.dispatch_started_at) possiblySent = true;
        if (current?.status !== "pending" || current.dispatch_started_at) return;
        if (msg.campaign_run_id) {
          const {data:campaign}=await supabase.from("campaigns").select("status").eq("id",msg.campaign_id).single();
          if (!campaign || !["Sending","Scheduled"].includes(campaign.status)) {
            await supabase.from("scheduled_messages").update({processing_at:null}).eq("id",msg.id);
            return;
          }
        }

        if (!(await canSendMessages(msg.user_id))) {
          await supabase
            .from("scheduled_messages")
            .update({ processing_at: null, last_error: EIN_CERTIFICATE_REQUIRED_MESSAGE })
            .eq("id", msg.id);
          return;
        }

        const { data: contact } = await supabase
          .from("contacts").select("*").eq("id", msg.contact_id).eq("user_id", msg.user_id).single();

        if (!contact || !contact.phone) throw new Error("Contact not found");

        // Ownership may change between enrollment and delivery (for example a released number).
        const fromDigits = String(msg.from_number).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
        const { data: numbers, error: ownershipError } = await supabase.from("owned_phone_numbers")
          .select("user_id").eq("digits", fromDigits).eq("user_id", msg.user_id).limit(1);
        if (ownershipError || !numbers?.length) throw new Error("Sending number is no longer available to this account");

        // Respect DNC — if the contact has been marked DNC since scheduling,
        // cancel the step instead of sending.
        if (contact.dnc) {
          await supabase.from("scheduled_messages").update({ status: "cancelled" }).eq("id", msg.id);
          return;
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
            return;
          }
        }

        const toNumber = normalizePhone(contact.phone);
        const fromNumber = normalizePhone(msg.from_number);

        // Sanitize typographic characters (smart quotes, em-dash, ellipsis)
        // before Telnyx sees the body. A single curly apostrophe forces
        // UCS-2 encoding (70 chars/seg instead of 160) and silently doubles
        // the bill on any drip that was drafted in macOS/iOS.
        const sanitizedBody = sanitizeForSms(renderCampaignMessage(msg.body, contact));

        // Debit the wallet atomically BEFORE we actually send so we never
        // over-deliver. If the user's balance is too low, park the message
        // in 'failed' with a clear reason. Charge per segment because a
        // 200-char drip is 2 GSM-7 segments and Telnyx bills us twice.
        const cost = await getMessageCost(msg.user_id);
        const segments = Math.max(1, countSegments(sanitizedBody));
        const debitAmount = Number((cost * segments).toFixed(4));
        const { data: newBal, error: decErr } = await supabase.rpc("reserve_scheduled_message", {
          p_message_id: msg.id,
          p_amount: debitAmount,
        });
        if (decErr || newBal === null) {
          skippedNoFunds++;
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          return;
        }
        // Debit succeeded — remember it so a later send failure can refund.
        chargedAmount = Number(msg.charged_amount ?? debitAmount);

        // Send via Telnyx (include messaging_profile_id for 10DLC).
        const telnyxPayload: Record<string, string> = {
          from: fromNumber,
          to: toNumber,
          text: sanitizedBody,
          type: "SMS",
        };
        if (messagingProfileId) telnyxPayload.messaging_profile_id = messagingProfileId;

        // Persist dispatch intent before contacting the provider. An uncertain
        // outcome is held for review, never automatically resent on a stale lease.
        const {data:dispatch,error:dispatchError}=await supabase.from("scheduled_messages")
          .update({dispatch_started_at:new Date().toISOString()}).eq("id",msg.id)
          .eq("status","pending").is("dispatch_started_at",null).select("id").maybeSingle();
        if (dispatchError || !dispatch) throw new Error("Message was cancelled or dispatch could not be reserved");
        possiblySent = true;
        const res = await fetch("https://api.telnyx.com/v2/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(telnyxPayload),
          signal: AbortSignal.timeout(15_000),
        });
        const data = await res.json();

        if (data.errors || !res.ok) {
          possiblySent = res.status >= 500;
          throw new Error(data.errors?.[0]?.detail || "Send failed");
        }
        const telnyxId = data?.data?.id || null;
        providerId = telnyxId;
        providerAccepted = true;
        const {error:acceptError}=await supabase.rpc("accept_scheduled_message",{p_message_id:msg.id,p_provider_id:telnyxId});
        if (acceptError) throw new Error("Provider accepted the message; could not record completion");

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
              preview: sanitizedBody.slice(0, 100),
              unread: 0,
              last_message_at: new Date().toISOString(),
              from_number: msg.from_number,
            })
            .select().single();
          if (newConv) {
            await supabase.from("messages").insert({
              conversation_id: newConv.id,
              direction: "outbound",
              body: sanitizedBody,
              status: "sent",
              from_number: msg.from_number,
              telnyx_message_id: telnyxId,
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
            telnyx_message_id: telnyxId,
          });
        }

        // Tick the campaign's `sent` counter if this step came from a workflow.
        if (msg.campaign_id && !msg.campaign_run_id) {
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
        // If we already debited the wallet for this message but the send
        // never completed (Telnyx error or thrown fetch), refund the exact
        // amount so the user is never charged for an unsent message. The
        // idempotency key keyed on the row id makes a double-run a no-op.
        if (chargedAmount > 0 && !possiblySent) {
          await supabase.rpc("credit_wallet", {
            p_user_id: msg.user_id,
            p_amount: chargedAmount,
            p_idempotency_key: `refund_sched_${msg.id}`,
            p_description: "Refund — scheduled message failed to send",
          });
        }
        await supabase.from("scheduled_messages").update({
          status:providerAccepted ? "sent" : "failed",provider_message_id:providerId,
          last_error:possiblySent ? "Provider outcome requires review; this message will not be automatically retried." : (err instanceof Error ? err.message : "Send failed"),
        }).eq("id",msg.id);
      } finally {
        const {data:state}=await supabase.from("scheduled_messages").select("status").eq("id",msg.id).single();
        if (chargedAmount > 0 && !possiblySent && ["failed","cancelled"].includes(state?.status)) {
          await supabase.rpc("credit_wallet",{p_user_id:msg.user_id,p_amount:chargedAmount,p_idempotency_key:`refund_sched_${msg.id}`,p_description:"Refund — scheduled message not sent"});
        }
        if (msg.campaign_run_id) {
          if (state?.status === "failed" || state?.status === "cancelled") {
            await supabase.from("scheduled_messages").update({status:"cancelled"})
              .eq("campaign_run_id",msg.campaign_run_id).eq("contact_id",msg.contact_id).eq("status","pending");
          }
        }
      }
    };
    // Bounded concurrency keeps the cron inside its execution budget.
    let cursor=0;
    const stopStartingAt=Date.now()+40_000;
    await Promise.all(Array.from({length:8},async()=>{
      while(cursor<pendingMessages.length && Date.now()<stopStartingAt) {
        const msg=pendingMessages[cursor++];
        await processMessage(msg);
      }
    }));
    if (cursor<pendingMessages.length) {
      await supabase.from("scheduled_messages").update({processing_at:null})
        .in("id",pendingMessages.slice(cursor).map((m: {id:string})=>m.id)).is("dispatch_started_at",null);
    }
    await supabase.rpc("reconcile_campaign_sequences");

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
