import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferTimezone, isQuietHours } from "@/lib/quiet-hours";
import { sanitizeForSms } from "@/lib/sms-text";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

// Give the route the full Pro-plan budget so a 10k send doesn't hit the
// default 60s cap mid-run. At CHUNK=100 with PIPE=2, 10k takes roughly
// 90-120 s — well inside 300.
export const maxDuration = 300;

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Per-chunk parallelism. Every contact costs ~4 round-trips (Telnyx +
// Supabase) ≈ 250 ms each, so serial would be 1 s/contact. Bursting 100
// Telnyx sends in parallel per chunk is still well within 10DLC MPS
// limits and roughly doubles throughput over the old 50.
const CHUNK = 100;

// How many chunks can have their Telnyx sends + DB writes in flight at
// once. With PIPE=2 a 10k campaign finishes ~2× faster than strict
// sequential chunks, and wallet decrements are still serialized inside
// each chunk so we can't double-bill.
const PIPE = 2;

type CampaignContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  zip: string | null;
  lead_source: string | null;
  quote: string | null;
  policy_id: string | null;
  timeline: string | null;
  household_size: string | null;
  date_of_birth: string | null;
  age: string | null;
  notes: string | null;
  campaign: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { campaignId, userId: bodyUserId, fromNumbers, messageTemplate, campaignName, stepIndex = 0, totalSteps = 1, importedSinceIso } = await req.json();

    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    const numbers: string[] = Array.isArray(fromNumbers)
      ? fromNumbers
      : fromNumbers
        ? [fromNumbers]
        : [];

    if (!campaignId || numbers.length === 0 || !messageTemplate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify each fromNumber is owned by this user. Blocks a malicious caller
    // from blasting SMS from another tenant's 10DLC number (which would bill
    // that tenant's wallet via the ownership lookup in send logic and poison
    // their sender reputation).
    {
      const normDigits = numbers.map((n) => {
        const d = n.replace(/\D/g, "");
        return d.startsWith("1") ? d.slice(1) : d;
      });
      const { data: owned } = await supabase
        .from("owned_phone_numbers")
        .select("digits")
        .eq("user_id", userId)
        .in("digits", normDigits);
      const ownedSet = new Set((owned || []).map((r) => r.digits));
      const unauthorized = normDigits.filter((d) => !ownedSet.has(d));
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { success: false, error: "Forbidden: one or more fromNumbers are not owned by this user" },
          { status: 403 }
        );
      }
    }

    // ── Idempotency guard ────────────────────────────────────────────────────
    // For the FIRST step (stepIndex 0): atomically flip Draft/Scheduled/Paused
    // → Sending. If another request already flipped it (double-click, CSV
    // auto-fire + manual launch, page refresh mid-send), the UPDATE matches 0
    // rows and we return 409 immediately instead of blasting every contact a
    // second time.
    //
    // For subsequent steps (stepIndex > 0): the campaign is already "Sending"
    // (first step flipped it). Just verify that status so we don't allow a
    // duplicate first-step call to sneak through as a "step 2" re-send.
    if (stepIndex === 0) {
      const { data: lockResult, error: lockError } = await supabase
        .from("campaigns")
        .update({ status: "Sending" })
        .eq("id", campaignId)
        .eq("user_id", userId)
        .in("status", ["Draft", "Scheduled", "Paused"])
        .select("id")
        .single();

      if (lockError || !lockResult) {
        // Campaign is already Sending or Completed — reject the duplicate.
        const { data: current } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();
        const currentStatus = (current as { status?: string } | null)?.status ?? "unknown";
        return NextResponse.json(
          {
            success: false,
            error: `Campaign is already ${currentStatus}. Refresh the page to see the current status.`,
            alreadySending: true,
          },
          { status: 409 }
        );
      }
    } else {
      // Steps 2+ require the campaign to already be "Sending".
      const { data: current } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .single();
      if (!current || current.status !== "Sending") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot send step ${stepIndex + 1}: campaign is not in Sending state.`,
            alreadySending: true,
          },
          { status: 409 }
        );
      }
    }

    // --- Load contacts (paginated past Supabase's 1000-row cap) ------------
    const PAGE_SIZE = 1000;
    let contacts: CampaignContact[] = [];
    for (let page = 0; page < 50; page++) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let contactsQuery = supabase
        .from("contacts")
        .select("id, first_name, last_name, phone, email, city, state, address, zip, lead_source, quote, policy_id, timeline, household_size, date_of_birth, age, notes, campaign")
        .eq("user_id", userId)
        .eq("dnc", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (campaignName) {
        contactsQuery = contactsQuery.eq("campaign", campaignName);
      }

      // Scope to contacts created at/after this timestamp. The CSV
      // "Import & Send" flow passes this so a second Import & Send against
      // the same campaign only targets the NEW upload's contacts instead of
      // re-texting everyone who ever imported under that campaign name.
      // Older manual launches omit this and keep their full-campaign behavior.
      if (typeof importedSinceIso === "string" && importedSinceIso) {
        contactsQuery = contactsQuery.gte("created_at", importedSinceIso);
      }

      const { data: pageData, error: contactsErr } = await contactsQuery;
      if (contactsErr) {
        return NextResponse.json(
          { success: false, error: `Contacts query failed: ${contactsErr.message}` },
          { status: 500 }
        );
      }
      if (!pageData || pageData.length === 0) break;
      contacts = contacts.concat(pageData as CampaignContact[]);
      if (pageData.length < PAGE_SIZE) break;
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: "No eligible contacts found" },
        { status: 404 }
      );
    }

    // O(1) lookup by contact id — used later for campaign-assign checks.
    // Without this, a 10k send was doing 10k linear scans inside the loop
    // (quadratic). Cheap up-front cost, huge savings at scale.
    const contactById = new Map<string, CampaignContact>();
    for (const c of contacts) contactById.set(c.id, c);

    // --- Pre-fetch all existing conversations for this user ----------------
    // Previously we looked up the conversation per contact inside processOne,
    // which meant 1 query × 10,000 contacts. One indexed scan up-front is
    // dramatically faster at scale.
    const convByContact = new Map<string, string>();
    {
      let cPage = 0;
      while (cPage < 50) {
        const fromIdx = cPage * PAGE_SIZE;
        const toIdx = fromIdx + PAGE_SIZE - 1;
        const { data: convRows } = await supabase
          .from("conversations")
          .select("id, contact_id")
          .eq("user_id", userId)
          .range(fromIdx, toIdx);
        if (!convRows || convRows.length === 0) break;
        for (const c of convRows as Array<{ id: string; contact_id: string }>) {
          if (c.contact_id && !convByContact.has(c.contact_id)) {
            convByContact.set(c.contact_id, c.id);
          }
        }
        if (convRows.length < PAGE_SIZE) break;
        cPage++;
      }
    }

    // --- Pull per-message cost + quiet hours config once ------------------
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("wallet_balance, plan, quiet_hours_enabled, quiet_hours_start_hour, quiet_hours_end_hour")
      .eq("id", userId)
      .single();
    const planObj = (profileRow?.plan as Record<string, unknown> | null) || null;
    const messageCost = Number((planObj?.messageCost as number) ?? 0.012);
    let walletBalance = Number(profileRow?.wallet_balance ?? 0);

    // Per-campaign quiet hours can override the profile default (null = inherit).
    // Guards against sending during TCPA-prohibited windows in the contact's
    // local time (derived from state). Users that disable this are explicitly
    // opting out — the UI warns them it's on them to stay compliant.
    const { data: campaignRow } = await supabase
      .from("campaigns")
      .select("quiet_hours_enabled, quiet_hours_start_hour, quiet_hours_end_hour")
      .eq("id", campaignId)
      .single();

    const quietEnabled =
      campaignRow?.quiet_hours_enabled ?? profileRow?.quiet_hours_enabled ?? true;
    const quietStart =
      campaignRow?.quiet_hours_start_hour ?? profileRow?.quiet_hours_start_hour ?? 21;
    const quietEnd =
      campaignRow?.quiet_hours_end_hour ?? profileRow?.quiet_hours_end_hour ?? 8;

    // Normalize from numbers to E.164
    const fromList = numbers.map((num: string) => {
      const digits = num.replace(/\D/g, "");
      return `+${digits.startsWith("1") ? digits : `1${digits}`}`;
    });

    let sent = 0;
    let failed = 0;
    let deferred = 0;
    let paused = false;
    let outOfFunds = false;
    const replies = 0;
    const errors: string[] = [];

    // --- Per-chunk processor ----------------------------------------------
    type ChunkResult = {
      contactId: string;
      personalized: string;
      success: boolean;
      deferred?: boolean;
      error?: string;
    };

    const sendOne = async (
      contact: CampaignContact,
      idx: number
    ): Promise<ChunkResult> => {
      const fromNumber = fromList[idx % fromList.length];
      // Sanitize smart quotes / em-dash / ellipsis AFTER template substitution
      // so typographic characters from contact fields also get normalized. A
      // single curly apostrophe forces UCS-2 (70 chars/segment), often
      // doubling segment count on a 10k blast.
      const personalizedBody = sanitizeForSms(
        messageTemplate
          .replace(/\{firstName\}/gi, contact.first_name || "")
          .replace(/\{lastName\}/gi, contact.last_name || "")
          .replace(/\{phone\}/gi, contact.phone || "")
          .replace(/\{email\}/gi, contact.email || "")
          .replace(/\{city\}/gi, contact.city || "")
          .replace(/\{state\}/gi, contact.state || "")
          .replace(/\{address\}/gi, contact.address || "")
          .replace(/\{zip\}/gi, contact.zip || "")
          .replace(/\{leadSource\}/gi, contact.lead_source || "")
          .replace(/\{quote\}/gi, contact.quote || "")
          .replace(/\{policyId\}/gi, contact.policy_id || "")
          .replace(/\{timeline\}/gi, contact.timeline || "")
          .replace(/\{householdSize\}/gi, contact.household_size || "")
          .replace(/\{dateOfBirth\}/gi, contact.date_of_birth || "")
          .replace(/\{age\}/gi, contact.age || "")
          .replace(/\{notes\}/gi, contact.notes || "")
      );

      // Quiet hours check — if this contact is inside their local TCPA-blocked
      // window right now, defer by marking the send as "deferred" and writing
      // a scheduled_messages row for the next legal window. The cron will pick
      // it up later. If quiet hours are disabled by the user, send immediately.
      if (quietEnabled) {
        const tz = inferTimezone(contact.state || undefined);
        if (isQuietHours(tz, quietStart, quietEnd)) {
          return {
            contactId: contact.id,
            personalized: personalizedBody,
            success: false,
            deferred: true,
          };
        }
      }

      try {
        const toDigits = contact.phone.replace(/\D/g, "");
        const toE164 = `+${toDigits.startsWith("1") ? toDigits : `1${toDigits}`}`;

        const res = await fetch("https://api.telnyx.com/v2/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromNumber,
            to: toE164,
            text: personalizedBody,
            type: "SMS",
            ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
          }),
        });

        const data = await res.json();
        if (data.errors) {
          return {
            contactId: contact.id,
            personalized: personalizedBody,
            success: false,
            error: data.errors[0]?.detail || "Send failed",
          };
        }
        return { contactId: contact.id, personalized: personalizedBody, success: true };
      } catch (err: unknown) {
        return {
          contactId: contact.id,
          personalized: personalizedBody,
          success: false,
          error: err instanceof Error ? err.message : "Send failed",
        };
      }
    };

    // When in quiet hours, schedule delivery for 9am in America/New_York — a
    // safe default that covers the bulk of US business hours. We keep the
    // scheduling naive (single timestamp, not per-timezone) because the cron
    // that fires these rows re-checks quiet hours against each contact at
    // send-time, so anything still in a quiet window gets deferred again.
    const deferScheduleAt = (() => {
      const d = new Date();
      d.setUTCHours(d.getUTCHours() + 12); // ~12h out covers US evening deferrals
      return d.toISOString();
    })();

    // Per-chunk processor. Pulled out so we can run PIPE of them
    // concurrently below. Returns what happened in this chunk so the
    // outer loop can roll up totals / detect pause + out-of-funds.
    const processChunk = async (chunkOffset: number): Promise<{
      sentCount: number;
      failedCount: number;
      deferredCount: number;
      chunkErrors: string[];
      ranOutOfFunds: boolean;
      newBalance: number | null;
    }> => {
      const slice = contacts.slice(chunkOffset, chunkOffset + CHUNK);
      const results = await Promise.all(slice.map((c, j) => sendOne(c, chunkOffset + j)));

      const successful = results.filter((r) => r.success);
      const deferredResults = results.filter((r) => r.deferred);
      const chunkSentCount = successful.length;
      const chunkDeferred = deferredResults.length;
      const chunkFailed = results.length - chunkSentCount - chunkDeferred;
      const chunkErrors: string[] = [];
      for (const r of results) {
        if (!r.success && !r.deferred && r.error) chunkErrors.push(`${r.contactId}: ${r.error}`);
      }

      // Queue quiet-hours deferrals into scheduled_messages so the cron
      // retries them once the window opens. Fire-and-forget — a failed
      // insert here just means the contact gets skipped this run.
      if (chunkDeferred > 0) {
        const rows = deferredResults.map((r) => ({
          user_id: userId,
          contact_id: r.contactId,
          body: r.personalized,
          from_number: fromList[0],
          scheduled_at: deferScheduleAt,
          status: "pending",
          campaign_id: campaignId,
          cancel_on_reply: false,
        }));
        supabase.from("scheduled_messages").insert(rows).then(({ error }) => {
          if (error) console.error("quiet-hours defer insert failed:", error.message);
        });
      }

      if (chunkSentCount === 0) {
        return {
          sentCount: 0,
          failedCount: chunkFailed,
          deferredCount: chunkDeferred,
          chunkErrors,
          ranOutOfFunds: false,
          newBalance: null,
        };
      }

      // Atomic wallet decrement — safe to call in parallel across chunks
      // because the RPC is SECURITY DEFINER + Postgres row-locked.
      const chunkCost = Number((chunkSentCount * messageCost).toFixed(4));
      const { data: newBal, error: decErr } = await supabase.rpc("decrement_wallet", {
        p_user_id: userId,
        p_amount: chunkCost,
      });
      const ranOutOfFunds = !!decErr || newBal === null;

      // Batch DB writes for successful sends.
      const existingConvMsgs: Array<Record<string, unknown>> = [];
      const newConvRows: Array<Record<string, unknown>> = [];
      const newConvBodies = new Map<string, string>();
      const convIdsToTouch: string[] = [];
      const previewByConvId = new Map<string, string>();
      const campaignAssigns: string[] = [];

      for (const r of successful) {
        const existingConvId = convByContact.get(r.contactId);
        if (existingConvId) {
          existingConvMsgs.push({
            conversation_id: existingConvId,
            direction: "outbound",
            body: r.personalized,
            status: "sent",
          });
          convIdsToTouch.push(existingConvId);
          previewByConvId.set(existingConvId, r.personalized.slice(0, 100));
        } else {
          newConvRows.push({
            user_id: userId,
            contact_id: r.contactId,
            preview: r.personalized.slice(0, 100),
            unread: 0,
            last_message_at: new Date().toISOString(),
          });
          newConvBodies.set(r.contactId, r.personalized);
        }

        if (campaignName) {
          const c = contactById.get(r.contactId);
          if (c && !c.campaign) campaignAssigns.push(r.contactId);
        }
      }

      let insertedConvs: Array<{ id: string; contact_id: string }> = [];
      if (newConvRows.length > 0) {
        const { data: convData } = await supabase
          .from("conversations")
          .insert(newConvRows)
          .select("id, contact_id");
        if (convData) {
          insertedConvs = convData as Array<{ id: string; contact_id: string }>;
          for (const row of insertedConvs) {
            if (row.contact_id) convByContact.set(row.contact_id, row.id);
          }
        }
      }

      const newConvMsgs = insertedConvs.map((c) => ({
        conversation_id: c.id,
        direction: "outbound" as const,
        body: newConvBodies.get(c.contact_id) || "",
        status: "sent" as const,
      }));

      const writes: Promise<unknown>[] = [];
      if (existingConvMsgs.length > 0) {
        writes.push(Promise.resolve(supabase.from("messages").insert(existingConvMsgs)));
      }
      if (newConvMsgs.length > 0) {
        writes.push(Promise.resolve(supabase.from("messages").insert(newConvMsgs)));
      }

      const touchedIds = Array.from(new Set(convIdsToTouch));
      for (const cid of touchedIds) {
        writes.push(
          Promise.resolve(
            supabase
              .from("conversations")
              .update({
                preview: previewByConvId.get(cid) || "",
                last_message_at: new Date().toISOString(),
                // Sending a campaign message means the last message is now
                // outbound — clear the unread badge so the rep's inbox only
                // highlights conversations that still need attention.
                unread: 0,
              })
              .eq("id", cid)
          )
        );
      }

      if (campaignName && campaignAssigns.length > 0) {
        writes.push(
          Promise.resolve(
            supabase
              .from("contacts")
              .update({ campaign: campaignName })
              .in("id", campaignAssigns)
          )
        );
      }

      await Promise.all(writes);

      return {
        sentCount: chunkSentCount,
        failedCount: chunkFailed,
        deferredCount: chunkDeferred,
        chunkErrors,
        ranOutOfFunds,
        newBalance: ranOutOfFunds ? null : Number(newBal),
      };
    };

    // --- Main loop --------------------------------------------------------
    // Run PIPE chunks concurrently per wave. For a 10k send with CHUNK=100
    // and PIPE=2, that's 50 waves of 2 parallel chunks — typically ~90-120s.
    //
    // Pause and out-of-funds are checked BEFORE every chunk inside the wave,
    // not just once per wave. Without per-chunk pause, a user who clicks Pause
    // mid-wave would still see up to CHUNK*PIPE (200) more messages fire
    // because the next check wouldn't run until after the wave finished. Cheap
    // cost — one single-row read per chunk.
    let lastPauseCheck = 0;
    const PAUSE_CHECK_MS = 1500; // throttle the DB round-trip so 100-chunk waves aren't 100 reads

    const checkPaused = async (): Promise<boolean> => {
      const now = Date.now();
      if (now - lastPauseCheck < PAUSE_CHECK_MS) return false;
      lastPauseCheck = now;
      const { data: liveCampaign } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaignId)
        .single();
      return liveCampaign?.status === "Paused";
    };

    for (let waveStart = 0; waveStart < contacts.length; waveStart += CHUNK * PIPE) {
      if (await checkPaused()) {
        paused = true;
        break;
      }

      // Stop before firing a wave we can't afford. One chunk might barely
      // fit; the atomic decrement is still the real source of truth.
      if (walletBalance < messageCost) {
        outOfFunds = true;
        break;
      }

      const chunkOffsets: number[] = [];
      for (let p = 0; p < PIPE; p++) {
        const off = waveStart + p * CHUNK;
        if (off < contacts.length) chunkOffsets.push(off);
      }

      const waveResults = await Promise.all(chunkOffsets.map((off) => processChunk(off)));

      for (const r of waveResults) {
        sent += r.sentCount;
        failed += r.failedCount;
        deferred += r.deferredCount;
        errors.push(...r.chunkErrors);
        if (r.ranOutOfFunds) {
          outOfFunds = true;
          walletBalance = 0;
        } else if (r.newBalance !== null) {
          walletBalance = r.newBalance;
        }
      }

      // Per-wave progress write so the dashboard's polling/realtime can drive
      // a live progress bar. Fire-and-forget — if this write is slow we don't
      // want to stall the next wave waiting on it. audience is written every
      // time so the client knows the denominator even if the initial launch
      // request undercounted (e.g. contacts added mid-send).
      supabase
        .from("campaigns")
        .update({ sent, failed, audience: contacts.length })
        .eq("id", campaignId)
        .then(({ error }) => {
          if (error) console.error("progress update failed:", error.message);
        });

      if (outOfFunds) break;

      // Re-check pause between waves too, so a click mid-long-wave is still honored.
      if (await checkPaused()) {
        paused = true;
        break;
      }
    }

    // Keep the first few distinct error messages on the log so the user can
    // actually see *why* a campaign failed instead of just a count.
    const distinctErrors = Array.from(new Set(errors)).slice(0, 5);
    const errorSummary = distinctErrors.length > 0
      ? ` — ${distinctErrors.join(" | ")}`
      : "";
    const deferredNote = deferred > 0 ? `, ${deferred} deferred for quiet hours` : "";
    const logs = [{
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
      attempted: sent + failed + deferred,
      success: sent,
      failed,
      deferred,
      notes: paused
        ? `Paused after ${sent} sent, ${failed} failed${deferredNote} (${contacts.length - sent - failed - deferred} skipped)`
        : outOfFunds
          ? `Out of funds after ${sent} sent${deferredNote} (wallet hit 0)`
          : failed > 0
            ? `${failed} errors${deferredNote}${errorSummary}`
            : deferred > 0
              ? `All sent or deferred — ${sent} sent, ${deferred} queued for quiet hours`
              : "All sent successfully",
    }];

    // If the user paused mid-send, leave the campaign in "Paused" status so
    // they can resume/relaunch. Out-of-funds halts the campaign too.
    // For multi-step campaigns, only finalize to Completed on the LAST step —
    // earlier steps leave the campaign as "Sending" so subsequent steps can
    // pass the idempotency guard.
    const isLastStep = stepIndex >= totalSteps - 1;
    const finalStatus = paused || outOfFunds ? "Paused" : isLastStep ? "Completed" : "Sending";
    await supabase
      .from("campaigns")
      .update({
        status: finalStatus,
        audience: contacts.length,
        sent,
        failed,
        replies,
        logs,
      })
      .eq("id", campaignId);

    return NextResponse.json({
      success: true,
      paused,
      outOfFunds,
      sent,
      failed,
      deferred,
      total: contacts.length,
      walletBalance,
      errors: errors.slice(0, 10),
      message: paused
        ? `Campaign paused — ${sent} sent before stop`
        : outOfFunds
          ? `Campaign stopped — wallet balance ran out after ${sent} messages`
          : deferred > 0
            ? `${sent} sent, ${deferred} deferred for quiet hours (will auto-send after ${quietEnd}:00 local)`
            : undefined,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Campaign send error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
