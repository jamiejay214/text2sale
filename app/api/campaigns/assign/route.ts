import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "@/lib/auth-guard";
import {
  renderCampaignMessage,
  sequenceTimes,
  validateSequence,
} from "@/lib/campaign-sequence";
import { withFirstMessageOptOut } from "@/lib/opt-out";
import { hasNonGsmChars, sanitizeForSms } from "@/lib/sms-text";

type CampaignRow = {
  id: string;
  name: string;
  status: "Draft" | "Sending" | "Completed" | "Paused" | "Scheduled";
  message: string;
  steps?: unknown[] | null;
  selected_numbers?: string[] | null;
  scheduled_at?: string | null;
};

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  try {
    const input = (await req.json()) as {
      campaignId?: unknown;
      contactIds?: unknown;
    };
    const contactIds = Array.from(
      new Set(
        Array.isArray(input.contactIds)
          ? input.contactIds.filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            )
          : [],
      ),
    );
    if (
      typeof input.campaignId !== "string" ||
      !contactIds.length ||
      contactIds.length > 1000
    ) {
      return NextResponse.json(
        { error: "Choose a campaign and between 1 and 1,000 leads." },
        { status: 400 },
      );
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const [{ data: campaignData, error: campaignError }, { data: profile, error: profileError }] =
      await Promise.all([
        db
          .from("campaigns")
          .select("*")
          .eq("id", input.campaignId)
          .eq("user_id", auth.user.id)
          .maybeSingle(),
        db
          .from("profiles")
          .select(
            "paused, subscription_status, free_subscription, owned_numbers, opt_out_settings",
          )
          .eq("id", auth.user.id)
          .single(),
      ]);

    if (campaignError || profileError) {
      return NextResponse.json(
        { error: "Could not load that campaign. Try again." },
        { status: 503 },
      );
    }
    const campaign = campaignData as CampaignRow | null;
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    if (campaign.status === "Completed") {
      return NextResponse.json(
        { error: "Choose a draft, scheduled, sending, or paused campaign." },
        { status: 400 },
      );
    }
    if (
      !profile ||
      profile.paused ||
      (!profile.free_subscription &&
        !["active", "canceling"].includes(profile.subscription_status))
    ) {
      return NextResponse.json(
        { error: "An active account and subscription are required." },
        { status: 403 },
      );
    }

    const { data: contacts, error: contactsError } = await db
      .from("contacts")
      .select("*")
      .eq("user_id", auth.user.id)
      .in("id", contactIds);
    if (contactsError) {
      return NextResponse.json(
        { error: "Could not verify the selected leads." },
        { status: 503 },
      );
    }
    const eligible = (contacts || []).filter((contact) => !contact.dnc);
    if (!eligible.length) {
      return NextResponse.json(
        { error: "Every selected lead is opted out or unavailable." },
        { status: 400 },
      );
    }

    const eligibleIds = eligible.map((contact) => String(contact.id));
    const { error: assignmentError } = await db
      .from("contacts")
      .update({ campaign: campaign.name })
      .eq("user_id", auth.user.id)
      .in("id", eligibleIds);
    if (assignmentError) {
      return NextResponse.json(
        { error: "The selected leads could not be added to the campaign." },
        { status: 503 },
      );
    }

    const { count: audience } = await db
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("campaign", campaign.name)
      .eq("dnc", false);
    if (typeof audience === "number") {
      await db.from("campaigns").update({ audience }).eq("id", campaign.id);
    }

    const active = ["Sending", "Scheduled", "Paused"].includes(campaign.status);
    if (!active) {
      return NextResponse.json({
        success: true,
        campaign: campaign.name,
        assigned: eligible.length,
        skipped: contactIds.length - eligible.length,
        enrolled: 0,
        message: `${eligible.length} lead${eligible.length === 1 ? "" : "s"} added to ${campaign.name}. They will start when you launch the campaign.`,
      });
    }

    const { data: latestRun } = await db
      .from("scheduled_messages")
      .select("campaign_run_id")
      .eq("campaign_id", campaign.id)
      .not("campaign_run_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const runId = latestRun?.campaign_run_id as string | null | undefined;
    if (!runId) {
      return NextResponse.json({
        success: true,
        campaign: campaign.name,
        assigned: eligible.length,
        skipped: contactIds.length - eligible.length,
        enrolled: 0,
        message: `${eligible.length} lead${eligible.length === 1 ? "" : "s"} added to ${campaign.name}. Open Campaigns to launch the flow.`,
      });
    }

    const { data: alreadyScheduled } = await db
      .from("scheduled_messages")
      .select("contact_id")
      .eq("campaign_run_id", runId)
      .in("contact_id", eligibleIds);
    const scheduledIds = new Set(
      (alreadyScheduled || []).map((row) => String(row.contact_id)),
    );
    const enrollContacts = eligible.filter(
      (contact) => !scheduledIds.has(String(contact.id)),
    );
    if (!enrollContacts.length) {
      return NextResponse.json({
        success: true,
        campaign: campaign.name,
        assigned: eligible.length,
        skipped: contactIds.length - eligible.length,
        enrolled: 0,
        message: `The selected leads are already in ${campaign.name}.`,
      });
    }

    const assignedWithWarning = (warning: string) =>
      NextResponse.json({
        success: true,
        campaign: campaign.name,
        assigned: eligible.length,
        skipped: contactIds.length - eligible.length,
        enrolled: 0,
        warning,
        message: `${eligible.length} lead${eligible.length === 1 ? "" : "s"} added to ${campaign.name}.`,
      });

    let steps;
    try {
      steps = validateSequence(
        campaign.steps?.length
          ? campaign.steps
          : [{ message: campaign.message, delayMinutes: 0 }],
      );
    } catch (error) {
      return assignedWithWarning(
        `${error instanceof Error ? error.message : "The campaign flow is invalid."} The lead assignment was saved, but the active flow did not start.`,
      );
    }

    const numbers: unknown = campaign.selected_numbers?.length
      ? campaign.selected_numbers
      : (profile.owned_numbers || []).map((number: { number: string }) => number.number);
    if (!Array.isArray(numbers) || !numbers.length) {
      return assignedWithWarning(
        "The lead assignment was saved, but the active flow needs a sending number before it can start.",
      );
    }
    const digits = numbers.map((number) =>
      String(number).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
    );
    const { data: ownedNumbers } = await db
      .from("owned_phone_numbers")
      .select("digits")
      .eq("user_id", auth.user.id)
      .in("digits", digits);
    if (digits.some((digitsValue) => !ownedNumbers?.some((row) => row.digits === digitsValue))) {
      return assignedWithWarning(
        "The lead assignment was saved, but one of the campaign's sending numbers is no longer available.",
      );
    }

    const scheduledStart = campaign.scheduled_at
      ? Date.parse(campaign.scheduled_at)
      : Number.NaN;
    const startsAt =
      campaign.status === "Scheduled" && Number.isFinite(scheduledStart)
        ? Math.max(Date.now(), scheduledStart)
        : Date.now();
    const times = sequenceTimes(steps, startsAt);
    let messages;
    try {
      messages = enrollContacts.flatMap((contact, contactIndex) =>
        steps.map((step, stepIndex) => {
          const rendered = renderCampaignMessage(step.message, contact);
          return {
            user_id: auth.user.id,
            contact_id: contact.id,
            body: sanitizeForSms(
              stepIndex === 0
                ? withFirstMessageOptOut(rendered, profile.opt_out_settings)
                : rendered,
            ),
            from_number: numbers[contactIndex % numbers.length],
            scheduled_at: times[stepIndex],
            status: "pending",
            campaign_id: campaign.id,
            cancel_on_reply: true,
            campaign_run_id: runId,
            campaign_step_index: stepIndex,
            campaign_delay_minutes: step.delayMinutes,
          };
        }),
      );
    } catch (error) {
      return assignedWithWarning(
        `${error instanceof Error ? error.message : "Set a first-message opt-out before adding leads."} The lead assignment was saved, but the active flow did not start.`,
      );
    }
    if (messages.some((message) => hasNonGsmChars(message.body))) {
      return assignedWithWarning(
        "The lead assignment was saved, but the campaign contains unsupported SMS characters, so the active flow did not start.",
      );
    }
    const { error: enqueueError } = await db
      .from("scheduled_messages")
      .insert(messages);
    if (enqueueError) {
      return NextResponse.json({
        success: true,
        campaign: campaign.name,
        assigned: eligible.length,
        skipped: contactIds.length - eligible.length,
        enrolled: 0,
        warning: "The leads were assigned, but the active flow could not start. Open Campaigns and resume it.",
        message: `${eligible.length} lead${eligible.length === 1 ? "" : "s"} added to ${campaign.name}.`,
      });
    }

    const flowState = campaign.status === "Paused" ? "queued for when it resumes" : "started";
    return NextResponse.json({
      success: true,
      campaign: campaign.name,
      assigned: eligible.length,
      skipped: contactIds.length - eligible.length,
      enrolled: enrollContacts.length,
      message: `${eligible.length} lead${eligible.length === 1 ? "" : "s"} added to ${campaign.name}; ${enrollContacts.length === 1 ? "its" : "their"} flow ${flowState}.`,
    });
  } catch (error) {
    console.error("[campaign assign]", error);
    return NextResponse.json(
      { error: "The leads could not be added. Try again." },
      { status: 500 },
    );
  }
}
