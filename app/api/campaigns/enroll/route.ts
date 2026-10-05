import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  validateSequence,
  renderCampaignMessage,
  sequenceTimes,
} from "@/lib/campaign-sequence";
import { sanitizeForSms, hasNonGsmChars } from "@/lib/sms-text";
import { withFirstMessageOptOut } from "@/lib/opt-out";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  try {
    const input = await req.json();
    if (
      typeof input.campaignId !== "string" ||
      !["assigned", "all"].includes(input.audience)
    ) {
      return NextResponse.json(
        { error: "Choose a campaign and audience." },
        { status: 400 },
      );
    }
    const startsAt = input.startsAt ? Date.parse(input.startsAt) : Date.now();
    if (!Number.isFinite(startsAt) || startsAt < Date.now() - 60_000)
      return NextResponse.json(
        { error: "Choose a valid start time." },
        { status: 400 },
      );
    if (
      input.importedSinceIso &&
      !Number.isFinite(Date.parse(input.importedSinceIso))
    )
      return NextResponse.json(
        { error: "Invalid import filter." },
        { status: 400 },
      );
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [
      { data: campaign, error: campaignError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      db
        .from("campaigns")
        .select("*")
        .eq("id", input.campaignId)
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      db
        .from("profiles")
        .select("paused, subscription_status, free_subscription, owned_numbers, opt_out_settings")
        .eq("id", auth.user.id)
        .single(),
    ]);
    if (campaignError || profileError)
      return NextResponse.json(
        { error: "Could not load your campaign. Please try again." },
        { status: 503 },
      );
    if (!campaign)
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    if (
      profile?.paused ||
      !profile ||
      (!profile.free_subscription &&
        !["active", "canceling"].includes(profile.subscription_status))
    )
      return NextResponse.json(
        { error: "An active subscription is required." },
        { status: 403 },
      );
    let steps;
    try {
      steps = validateSequence(
        campaign.steps?.length
          ? campaign.steps
          : [{ message: campaign.message, delayMinutes: 0 }],
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid sequence" },
        { status: 400 },
      );
    }
    const numbers: unknown = campaign.selected_numbers?.length
      ? campaign.selected_numbers
      : (profile.owned_numbers || []).map((n: { number: string }) => n.number);
    if (
      !Array.isArray(numbers) ||
      !numbers.length ||
      numbers.some((n) => typeof n !== "string")
    )
      return NextResponse.json(
        { error: "Choose a sending number first." },
        { status: 400 },
      );
    const digits = numbers.map((n) =>
      String(n)
        .replace(/\D/g, "")
        .replace(/^1(?=\d{10}$)/, ""),
    );
    const { data: owned, error: numberError } = await db
      .from("owned_phone_numbers")
      .select("digits")
      .eq("user_id", auth.user.id)
      .in("digits", digits);
    if (
      numberError ||
      digits.some((n) => !owned?.some((row) => row.digits === n))
    )
      return NextResponse.json(
        {
          error:
            "One of the sending numbers is no longer available to your account.",
        },
        { status: 403 },
      );
    const contacts: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = db
        .from("contacts")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("dnc", false)
        .order("id")
        .range(offset, offset + 999);
      if (input.audience === "assigned")
        query = query.eq("campaign", campaign.name);
      if (input.importedSinceIso)
        query = query.gte("created_at", input.importedSinceIso);
      const { data, error } = await query;
      if (error)
        return NextResponse.json(
          { error: "Could not load the campaign audience." },
          { status: 503 },
        );
      contacts.push(...(data || []));
      if (contacts.length * steps.length > 100_000)
        return NextResponse.json(
          {
            error:
              "This sequence exceeds 100,000 scheduled messages. Split the audience into smaller batches.",
          },
          { status: 400 },
        );
      if (!data || data.length < 1000) break;
    }
    if (!contacts.length)
      return NextResponse.json(
        { error: "No eligible contacts in this audience." },
        { status: 400 },
      );
    const times = sequenceTimes(steps, startsAt);
    let rows;
    try {
      rows = contacts.flatMap((contact, index) =>
        steps.map((step, stepIndex) => {
          const rendered = renderCampaignMessage(step.message, contact);
          return {
            contact_id: contact.id,
            body: sanitizeForSms(
              stepIndex === 0
                ? withFirstMessageOptOut(rendered, profile.opt_out_settings)
                : rendered,
            ),
            from_number: numbers[index % numbers.length],
            scheduled_at: times[stepIndex],
            step_index: stepIndex,
            delay_minutes: step.delayMinutes,
          };
        }),
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Add opt-out instructions to the first message before launching.",
        },
        { status: 400 },
      );
    }
    if (rows.some((row) => hasNonGsmChars(row.body)))
      return NextResponse.json(
        {
          error:
            "A message contains unsupported SMS characters. Update the template or contact field before launching.",
        },
        { status: 400 },
      );
    const { data, error } = await db.rpc("enqueue_campaign_sequence", {
      p_user_id: auth.user.id,
      p_campaign_id: campaign.id,
      p_messages: rows,
      p_starts_at: new Date(startsAt).toISOString(),
      p_resume: input.resume === true,
    });
    if (error) {
      console.error("[campaign enrollment]", error.code);
      return NextResponse.json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "Campaign scheduling is not ready. Contact support; no new sequence was committed.",
        },
        { status: error.code === "P0001" ? 409 : 503 },
      );
    }
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json(
      { error: "Could not schedule this campaign. Please try again." },
      { status: 500 },
    );
  }
}
