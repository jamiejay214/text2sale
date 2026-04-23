import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { shouldAiSkipReply } from "@/lib/ai-decline-check";
import { verifyTelnyxSignature, allowUnverifiedInDev } from "@/lib/telnyx-verify";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";

// Telnyx sends inbound SMS as POST webhook
export async function POST(req: NextRequest) {
  try {
    // Verify Telnyx signature before trusting any payload field. Without this,
    // anyone can POST to /api/incoming-sms and spoof inbound messages (creating
    // conversations, triggering AI replies that debit the target's wallet).
    const rawBody = await req.text();
    const sig = req.headers.get("telnyx-signature-ed25519") || "";
    const sigTs = req.headers.get("telnyx-timestamp") || "";
    const verified = await verifyTelnyxSignature(rawBody, sig, sigTs);
    if (!verified && !allowUnverifiedInDev("incoming-sms")) {
      console.warn("[incoming-sms] signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const payload = JSON.parse(rawBody);
    const event = payload.data;

    if (!event) {
      return NextResponse.json({ status: "ok" });
    }

    // Webhook dedupe. Telnyx retries webhooks on any 5xx / network error,
    // which would double-process inbound messages — creating two
    // conversation rows, firing two opt-out replies, debiting two AI
    // auto-replies. Track the event id in telnyx_events and drop any
    // replay. Missing table → skip dedupe (log only) so we don't stop
    // processing; migration should create the table.
    const telnyxEventId: string | undefined = event.id;
    if (telnyxEventId) {
      const { error: dupeErr } = await supabase
        .from("telnyx_events")
        .insert({ event_id: telnyxEventId });
      if (dupeErr) {
        // 23505 is Postgres unique_violation → we've already processed this event.
        // Any other error (42P01 relation does not exist, etc) we log and continue.
        if ((dupeErr as { code?: string }).code === "23505") {
          console.log(`[incoming-sms] skipping duplicate Telnyx event ${telnyxEventId}`);
          return NextResponse.json({ status: "ok", deduped: true });
        }
        if ((dupeErr as { code?: string }).code !== "42P01") {
          console.warn("[incoming-sms] telnyx_events insert error:", dupeErr);
        }
      }
    }

    // Handle delivery receipts (message.finalized)
    if (event.event_type === "message.finalized") {
      return handleDeliveryReceipt(event.payload);
    }

    // Only process inbound SMS
    if (event.event_type !== "message.received") {
      return NextResponse.json({ status: "ok" });
    }

    const eventPayload = event.payload;
    const from = eventPayload?.from?.phone_number || "";
    const to = eventPayload?.to?.[0]?.phone_number || "";
    const body = eventPayload?.text || "";

    if (!from || !body) {
      return NextResponse.json({ status: "ok" });
    }

    // Normalize the incoming number for lookup
    const fromDigits = from.replace(/\D/g, "");
    const fromNormalized = fromDigits.startsWith("1") ? fromDigits.slice(1) : fromDigits;
    const fromFormatted = `(${fromNormalized.slice(0, 3)}) ${fromNormalized.slice(3, 6)}-${fromNormalized.slice(6)}`;

    // Normalize the `to` number (the user's 10DLC number that received the message)
    const toDigitsRaw = to.replace(/\D/g, "");
    const toNormalized = toDigitsRaw.startsWith("1") ? toDigitsRaw.slice(1) : toDigitsRaw;
    const toFormattedIn = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    // Step 1: Identify which user owns the receiving number — indexed lookup
    // on the denormalized owned_phone_numbers table. Previously we pulled
    // every profile and did an O(n) scan in JS, which gets slower as users
    // grow; this is a single index hit (~5ms).
    let owningUserId: string | null = null;
    const { data: ownership } = await supabase
      .from("owned_phone_numbers")
      .select("user_id")
      .eq("digits", toNormalized)
      .maybeSingle();
    if (ownership?.user_id) {
      owningUserId = ownership.user_id as string;
    } else {
      // Fallback — older accounts might have numbers only on profiles.owned_numbers.
      // This keeps routing working while the backfill catches up. Every time
      // we hit this path we self-heal by inserting into owned_phone_numbers so
      // the next inbound for this line takes the fast path. Without this the
      // fallback quietly gets worse as user count grows.
      console.warn(`[incoming-sms] slow-path lookup for ${toNormalized} — backfill triggered`);
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, owned_numbers")
        .not("owned_numbers", "is", null);
      if (owners) {
        for (const p of owners) {
          const nums = (p.owned_numbers as Array<{ number?: string }> | null) || [];
          const match = nums.some((n) => {
            const d = (n.number || "").replace(/\D/g, "");
            const norm = d.startsWith("1") ? d.slice(1) : d;
            return norm && norm === toNormalized;
          });
          if (match) {
            owningUserId = p.id;
            // Self-heal: push the denormalized row so next time we hit the
            // fast path. Ignore duplicates (someone else may have just done it).
            supabase
              .from("owned_phone_numbers")
              .upsert({ user_id: p.id, digits: toNormalized }, { onConflict: "digits" })
              .then(({ error }) => {
                if (error) console.error("[incoming-sms] backfill upsert failed:", error.message);
              });
            break;
          }
        }
      }
    }

    // Step 2: Find an existing contact for the sender, scoped to the owning user when known.
    // NOTE: Supabase's .or() filter treats parentheses as grouping syntax, so a phone like
    // "(954) 805-7882" silently breaks the query. Use .in() with all common variants instead.
    const phoneVariants = [
      fromFormatted,                        // (954) 805-7882
      fromNormalized,                       // 9548057882
      `1${fromNormalized}`,                 // 19548057882
      `+1${fromNormalized}`,                // +19548057882
      `${fromNormalized.slice(0, 3)}-${fromNormalized.slice(3, 6)}-${fromNormalized.slice(6)}`, // 954-805-7882
      `${fromNormalized.slice(0, 3)}.${fromNormalized.slice(3, 6)}.${fromNormalized.slice(6)}`, // 954.805.7882
      from,                                 // whatever Telnyx sent
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    let contactQuery = supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, phone")
      .in("phone", phoneVariants);
    if (owningUserId) contactQuery = contactQuery.eq("user_id", owningUserId);
    const { data: contacts } = await contactQuery.limit(1);

    let contact: { id: string; user_id: string; first_name?: string; last_name?: string; phone?: string } | null =
      contacts && contacts.length > 0 ? contacts[0] : null;

    // Step 3: If no contact exists but we know the owning user, auto-create one so the reply is captured.
    if (!contact && owningUserId) {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          user_id: owningUserId,
          first_name: "",
          last_name: "",
          phone: fromFormatted,
          email: "",
          lead_source: "inbound_sms",
          tags: ["inbound"],
          notes: `Auto-created from inbound SMS to ${toFormattedIn} on ${new Date().toISOString()}`,
          dnc: false,
        })
        .select("id, user_id, first_name, last_name, phone")
        .single();
      if (newContact) contact = newContact;
    }

    if (!contact) {
      // No owning user found and no matching contact — nothing we can route this to.
      console.warn("Inbound SMS dropped: no owning user for", to, "and no matching contact for", from);
      return NextResponse.json({ status: "ok" });
    }

    const bodyUpper = body.trim().toUpperCase();

    // Fetch user's opt-out settings
    const { data: profile } = await supabase
      .from("profiles")
      .select("opt_out_settings")
      .eq("id", contact.user_id)
      .single();

    const optSettings = profile?.opt_out_settings || {
      keywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
      optInKeywords: ["START", "SUBSCRIBE", "UNSTOP", "YES"],
      autoReplyMessage: "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.",
      optInReplyMessage: "You have been re-subscribed. Reply STOP to unsubscribe.",
      confirmOptOut: true,
      autoMarkDnc: true,
      includeCompanyName: true,
      companyName: "",
    };

    // CTIA / carrier-mandated opt-out keywords. These MUST be honored regardless
    // of what the user has configured — failing to honor STOP/END/QUIT/CANCEL/
    // UNSUBSCRIBE is a fast path to 10DLC suspension. Merge them with the user's
    // custom list so custom keywords still work, but the mandatory five always do.
    const MANDATORY_STOP = ["STOP", "END", "QUIT", "CANCEL", "UNSUBSCRIBE"];
    const MANDATORY_HELP = ["HELP", "INFO"];
    const MANDATORY_START = ["START", "UNSTOP", "YES"];

    const stopKeywords = Array.from(
      new Set([...(optSettings.keywords || []), ...MANDATORY_STOP].map((k) => String(k).toUpperCase()))
    );
    const startKeywords = Array.from(
      new Set([...(optSettings.optInKeywords || []), ...MANDATORY_START].map((k) => String(k).toUpperCase()))
    );

    const isOptOut = stopKeywords.includes(bodyUpper);
    const isOptIn = startKeywords.includes(bodyUpper);
    const isHelp = MANDATORY_HELP.includes(bodyUpper);

    // HELP is also carrier-mandated. Auto-reply with company + support info.
    // We do NOT mark DNC or change subscription state.
    if (isHelp) {
      const companyName = optSettings.companyName || "Text2Sale";
      const helpMsg = `${companyName}: Reply STOP to unsubscribe. For support, contact us at support@text2sale.com. Msg&data rates may apply.`;
      await sendTelnyxReply(to, from, helpMsg);
      // still record the inbound message below
    }

    if (isOptOut) {
      // Always mark DNC on mandatory-opt-out keywords, regardless of the user's
      // autoMarkDnc toggle — that toggle can't override carrier rules.
      await supabase.from("contacts").update({ dnc: true }).eq("id", contact.id);
      // Always send a confirmation reply so the carrier sees compliance.
      let replyMsg = optSettings.autoReplyMessage || "You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.";
      if (optSettings.includeCompanyName && optSettings.companyName) {
        replyMsg += ` — ${optSettings.companyName}`;
      }
      await sendTelnyxReply(to, from, replyMsg);
      return NextResponse.json({ status: "ok" });
    }

    if (isOptIn) {
      await supabase.from("contacts").update({ dnc: false }).eq("id", contact.id);
      if (optSettings.confirmOptOut) {
        let replyMsg = optSettings.optInReplyMessage || "You have been re-subscribed. Reply STOP to unsubscribe.";
        if (optSettings.includeCompanyName && optSettings.companyName) {
          replyMsg += ` — ${optSettings.companyName}`;
        }
        await sendTelnyxReply(to, from, replyMsg);
      }
      return NextResponse.json({ status: "ok" });
    }

    // Find or create conversation.
    // Use .limit(1) (not .single()) so we still match when duplicate conversations
    // exist — otherwise .single() errors out and we silently create yet another one.
    // Reuse the most recently-active conversation for this contact so every inbound
    // message from the same number lands in the same thread.
    const { data: existingConvs } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .order("last_message_at", { ascending: false })
      .limit(1);

    let conversation: { id: string } | null =
      existingConvs && existingConvs.length > 0 ? existingConvs[0] : null;

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          user_id: contact.user_id,
          contact_id: contact.id,
          preview: body.slice(0, 100),
          unread: 1,
          last_message_at: new Date().toISOString(),
          // Stick the conversation to whichever of the user's numbers received
          // this message — replies will default to going out on the same line.
          from_number: toFormattedIn,
        })
        .select("id")
        .single();
      conversation = newConv;
    } else {
      // Backfill from_number on older conversations that don't have it set yet.
      const { data: existing } = await supabase
        .from("conversations")
        .select("from_number")
        .eq("id", conversation.id)
        .single();
      const update: Record<string, unknown> = {
        preview: body.slice(0, 100),
        unread: 1,
        last_message_at: new Date().toISOString(),
      };
      if (!existing?.from_number) update.from_number = toFormattedIn;
      await supabase.from("conversations").update(update).eq("id", conversation.id);
    }

    if (conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        direction: "inbound",
        body,
        status: "received",
      });

      // Stop any "ghost-chase" workflows this contact is in — they responded,
      // so the drip should halt. Only cancels steps that opted into
      // cancel_on_reply (manual user-scheduled messages stay put).
      await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("contact_id", contact.id)
        .eq("status", "pending")
        .eq("cancel_on_reply", true);

      // Update campaign reply count
      const { data: campaignContact } = await supabase
        .from("contacts")
        .select("campaign")
        .eq("id", contact.id)
        .single();

      if (campaignContact?.campaign) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("id, replies")
          .eq("name", campaignContact.campaign)
          .eq("user_id", contact.user_id)
          .single();

        if (campaign) {
          await supabase
            .from("campaigns")
            .update({ replies: (campaign.replies || 0) + 1 })
            .eq("id", campaign.id);
        }
      }
    }

    // AI Auto-Reply — triggers if EITHER:
    //   1. Full AI is on (ai_auto_reply on profile) → replies to ALL conversations
    //   2. Per-conversation AI is on (ai_enabled on conversation) → replies to just this one
    if (conversation) {
      try {
        const { data: aiProfile } = await supabase
          .from("profiles")
          .select("ai_plan, ai_auto_reply, wallet_balance")
          .eq("id", contact.user_id)
          .single();

        // Check per-conversation AI flag
        const { data: convData } = await supabase
          .from("conversations")
          .select("ai_enabled")
          .eq("id", conversation.id)
          .single();

        const globalAi = aiProfile?.ai_plan && aiProfile?.ai_auto_reply;
        const perConvAi = aiProfile?.ai_plan && convData?.ai_enabled;

        // Context-aware decline filter.
        //
        // A bare "No" means very different things depending on where we are
        // in the conversation:
        //   - First reply after our initial outreach: lead isn't interested.
        //     Skip the AI so we don't look tone-deaf chasing a hard no.
        //   - Reply to a qualifying question ("do you take any medications?",
        //     "what's your situation?"): "No" / "Lost coverage" / etc. is
        //     legitimate context a human agent would run with. Let the AI
        //     handle it and book the appointment.
        //
        // Formal opt-outs (STOP, UNSUBSCRIBE, CANCEL, END, QUIT) are already
        // matched earlier in this webhook and mark DNC, so they never reach
        // this branch.
        const { count: inboundCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("direction", "inbound");

        const isFirstInbound = (inboundCount ?? 0) <= 1;
        if (isFirstInbound && shouldAiSkipReply(body)) {
          // Flag the conversation so the dashboard can show a "AI skipped —
          // looks like a decline" chip. Otherwise the UI gives no signal
          // that the AI made a deliberate choice not to reply.
          await supabase
            .from("conversations")
            .update({ ai_skipped_reason: "decline_response" })
            .eq("id", conversation.id);
          return NextResponse.json({ status: "ok", aiSkipped: "decline_response" });
        }

        // Fresh inbound from an engaged lead — clear any stale skip flag so
        // it doesn't linger past the point it was relevant.
        await supabase
          .from("conversations")
          .update({ ai_skipped_reason: null })
          .eq("id", conversation.id);

        if (aiProfile?.ai_plan && (globalAi || perConvAi)) {
          const balance = Number(aiProfile.wallet_balance) || 0;
          if (balance >= 0.025) {
            // Fire-and-forget — don't block the webhook response
            const origin = req.headers.get("x-forwarded-proto") === "https"
              ? `https://${req.headers.get("host")}`
              : `http://${req.headers.get("host")}`;
            // Use the internal-webhook shared secret instead of a user
            // JWT — webhooks don't have one. /api/ai-reply accepts this
            // via authenticateOrInternal(). If the secret isn't set in
            // env, the AI auto-reply just won't fire (intended — don't
            // want anonymous access to ai-reply).
            const internalSecret = process.env.INTERNAL_WEBHOOK_SECRET;
            if (internalSecret) {
              fetch(`${origin}/api/ai-reply`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Internal-Webhook": internalSecret,
                  "X-Acting-User": contact.user_id,
                },
                body: JSON.stringify({
                  userId: contact.user_id,
                  conversationId: conversation.id,
                  contactId: contact.id,
                  sendReply: true,
                }),
              }).catch((err) => console.error("AI auto-reply fire-and-forget error:", err));
            } else {
              console.warn(
                "[incoming-sms] AI auto-reply skipped — set INTERNAL_WEBHOOK_SECRET env var to enable."
              );
            }
          }
        }
      } catch (err) {
        console.error("AI auto-reply check error:", err);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Incoming SMS webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

// Helper to send reply via Telnyx
async function sendTelnyxReply(from: string, to: string, text: string) {
  await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from, to, text, type: "SMS",
      ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
    }),
  });
}

// Handle Telnyx delivery receipts (message.finalized)
async function handleDeliveryReceipt(eventPayload: Record<string, unknown>) {
  try {
    const toArr = eventPayload?.to as Array<{ phone_number?: string; status?: string }> | undefined;
    const to = toArr?.[0]?.phone_number || "";
    const telnyxStatus = toArr?.[0]?.status || "";

    if (!to || !telnyxStatus) {
      return NextResponse.json({ status: "ok" });
    }

    // Map Telnyx status: delivered, sent, sending_failed, delivery_failed, delivery_unconfirmed
    const mappedStatus = telnyxStatus === "delivered" ? "delivered"
      : (telnyxStatus === "sending_failed" || telnyxStatus === "delivery_failed") ? "failed"
      : "sent";

    const toDigits = to.replace(/\D/g, "");
    const toNormalized = toDigits.startsWith("1") ? toDigits.slice(1) : toDigits;
    const toFormatted = `(${toNormalized.slice(0, 3)}) ${toNormalized.slice(3, 6)}-${toNormalized.slice(6)}`;

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .or(`phone.eq.${toFormatted},phone.eq.+1${toNormalized},phone.eq.${toDigits},phone.eq.${to}`);

    if (!contacts || contacts.length === 0) return NextResponse.json({ status: "ok" });

    const { data: conversation } = await supabase
      .from("conversations").select("id").eq("contact_id", contacts[0].id).single();

    if (!conversation) return NextResponse.json({ status: "ok" });

    const { data: message } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (message) {
      const errors = (eventPayload?.errors as Array<{ code?: string }>) || [];
      const updateData: Record<string, unknown> = { status: mappedStatus };
      if (errors.length > 0) updateData.error_code = errors[0]?.code || "";
      await supabase.from("messages").update(updateData).eq("id", message.id);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Delivery receipt error:", error);
    return NextResponse.json({ status: "ok" });
  }
}
