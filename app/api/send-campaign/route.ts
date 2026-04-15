import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { campaignId, userId, fromNumbers, messageTemplate, campaignName } = await req.json();

    const numbers: string[] = Array.isArray(fromNumbers)
      ? fromNumbers
      : fromNumbers
        ? [fromNumbers]
        : [];

    if (!campaignId || !userId || numbers.length === 0 || !messageTemplate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let contactsQuery = supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, email, city, state, address, zip, lead_source, quote, policy_id, timeline, household_size, date_of_birth, age, notes, campaign")
      .eq("user_id", userId)
      .eq("dnc", false);

    if (campaignName) {
      contactsQuery = contactsQuery.eq("campaign", campaignName);
    }

    const { data: contacts, error: contactsErr } = await contactsQuery;

    if (contactsErr || !contacts || contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: "No eligible contacts found" },
        { status: 404 }
      );
    }

    // Normalize from numbers to E.164
    const fromList = numbers.map((num: string) => {
      const digits = num.replace(/\D/g, "");
      return `+${digits.startsWith("1") ? digits : `1${digits}`}`;
    });

    let sent = 0;
    let failed = 0;
    const deferred = 0;
    let paused = false;
    const replies = 0;
    const errors: string[] = [];

    // Process contacts in parallel chunks. Sequential sends were ~4 round
    // trips per contact (Telnyx + 2-3 Supabase) — at ~250ms each that's a
    // full second per contact. With CHUNK=25 we get ~25× throughput while
    // staying well under serverless concurrency / Telnyx burst limits.
    const CHUNK = 25;

    const processOne = async (contact: typeof contacts[number], idx: number) => {
      const fromNumber = fromList[idx % fromList.length];
      try {
        const personalizedBody = messageTemplate
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
          .replace(/\{notes\}/gi, contact.notes || "");

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
          throw new Error(data.errors[0]?.detail || "Send failed");
        }

        sent++;

        // Best-effort writes — kicked off in parallel and not awaited
        // individually. We await them at the chunk boundary below.
        const writes: Promise<unknown>[] = [];

        if (campaignName && !contact.campaign) {
          writes.push(
            (async () => {
              await supabase.from("contacts").update({ campaign: campaignName }).eq("id", contact.id);
            })()
          );
        }

        writes.push(
          (async () => {
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("contact_id", contact.id)
              .eq("user_id", userId)
              .single();

            if (!existingConv) {
              const { data: newConv } = await supabase
                .from("conversations")
                .insert({
                  user_id: userId,
                  contact_id: contact.id,
                  preview: personalizedBody.slice(0, 100),
                  unread: 0,
                  last_message_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (newConv) {
                await supabase.from("messages").insert({
                  conversation_id: newConv.id,
                  direction: "outbound",
                  body: personalizedBody,
                  status: "sent",
                });
              }
            } else {
              await Promise.all([
                supabase
                  .from("conversations")
                  .update({
                    preview: personalizedBody.slice(0, 100),
                    last_message_at: new Date().toISOString(),
                  })
                  .eq("id", existingConv.id),
                supabase.from("messages").insert({
                  conversation_id: existingConv.id,
                  direction: "outbound",
                  body: personalizedBody,
                  status: "sent",
                }),
              ]);
            }
          })()
        );

        await Promise.all(writes);
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : "Send failed";
        errors.push(`${contact.phone}: ${msg}`);
      }
    };

    for (let i = 0; i < contacts.length; i += CHUNK) {
      // Pause check between chunks — gives the user a few-second response
      // when they hit Pause mid-send.
      if (i > 0) {
        const { data: liveCampaign } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();
        if (liveCampaign?.status === "Paused") {
          paused = true;
          break;
        }
      }

      const slice = contacts.slice(i, i + CHUNK);
      await Promise.all(slice.map((c, j) => processOne(c, i + j)));
    }

    // Keep the first few distinct error messages on the log so the user can
    // actually see *why* a campaign failed instead of just a count.
    const distinctErrors = Array.from(new Set(errors)).slice(0, 5);
    const errorSummary = distinctErrors.length > 0
      ? ` — ${distinctErrors.join(" | ")}`
      : "";
    const logs = [{
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
      attempted: sent + failed,
      success: sent,
      failed,
      notes: paused
        ? `Paused after ${sent} sent, ${failed} failed (${contacts.length - sent - failed} skipped)`
        : failed > 0
          ? `${failed} errors${errorSummary}`
          : "All sent successfully",
    }];

    // If the user paused mid-send, leave the campaign in "Paused" status so
    // they can resume/relaunch. Otherwise mark it completed.
    await supabase
      .from("campaigns")
      .update({
        status: paused ? "Paused" : "Completed",
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
      sent,
      failed,
      deferred,
      total: contacts.length,
      errors: errors.slice(0, 10),
      message: paused
        ? `Campaign paused — ${sent} sent before stop`
        : deferred > 0
          ? `${deferred} contact(s) skipped due to quiet hours (9 PM - 8 AM)`
          : undefined,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Campaign send error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
