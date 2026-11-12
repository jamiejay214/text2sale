import { createHash } from "node:crypto";
import {campaignSegmentPreview} from "@/lib/campaign-segment-preview";
import {countSegments} from "@/lib/sms-text";
import {customerSmsRate} from "@/lib/sms-pricing";
import {normalizeImportPhone} from "@/lib/workspace-input";
import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  validateSequence,
  renderCampaignMessage,
  sequenceTimes,
  waveStart,
} from "@/lib/campaign-sequence";
import { foldToGsm, hasNonGsmChars } from "@/lib/sms-text";
import { campaignFirstMessage } from "@/lib/opt-out";
import { enqueueSequence } from "@/lib/campaign-enqueue";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  try {
    const input = await req.json();
    if (
      typeof input.campaignId !== "string" ||
      !["assigned", "all", "upload"].includes(input.audience) ||
      (input.audience === "upload" && (typeof input.uploadId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.uploadId)))
    ) {
      return NextResponse.json(
        { error: "Choose a campaign and audience." },
        { status: 400 },
      );
    }
    let startsAt = input.startsAt ? Date.parse(input.startsAt) : Date.now();
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
        .select("paused, subscription_status, free_subscription, owned_numbers, opt_out_settings, plan")
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
    if (input.audience === "upload") {
      const { data: batch, error } = await db.from("csv_uploads").select("id").eq("id",input.uploadId).eq("user_id",auth.user.id).eq("campaign_ready",true).maybeSingle();
      if (error || !batch) return NextResponse.json({error:"This CSV is unavailable for campaign sending."},{status:error ? 503 : 404});
      if (campaign.status === "Scheduled" && campaign.scheduled_at) startsAt = Math.max(startsAt, Date.parse(campaign.scheduled_at));
    }
    const revision=createHash("sha256").update(JSON.stringify({name:campaign.name,steps:campaign.steps,message:campaign.message,numbers:campaign.selected_numbers,quiet:campaign.quiet_hours_enabled,omit:campaign.omit_first_opt_out,...(input.audience==="upload"?{upload:input.uploadId,status:campaign.status,at:campaign.scheduled_at}:{})})).digest("hex");
    if(input.expectedRevision && input.expectedRevision!==revision)return NextResponse.json({error:"Campaign changed after review. Review it again before launching."},{status:409});
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
        query = query.eq("campaign_id", campaign.id);
      if (input.audience === "upload") query = query.eq("upload_batch_id",input.uploadId);
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
    // One sequence per phone number: the same person imported twice must
    // not be texted (and charged) twice.
    const blockedPhones=new Set<string>();
    for(let offset=0;;offset+=1000){const {data,error}=await db.from("contacts").select("phone").eq("user_id",auth.user.id).eq("dnc",true).order("id").range(offset,offset+999);if(error)return NextResponse.json({error:"Could not check suppression. Nothing queued."},{status:503});for(const c of data||[])blockedPhones.add(normalizeImportPhone(c.phone));if(!data||data.length<1000)break;}
    const seenPhones = new Set<string>();
    const uniqueContacts = contacts.filter((contact) => {
      const phone = normalizeImportPhone(String(contact.phone || ""));
      if (phone.length < 10 || blockedPhones.has(phone) || seenPhones.has(phone)) return false;
      seenPhones.add(phone);
      return true;
    });
    contacts.length = 0;
    contacts.push(...uniqueContacts);
    if (!contacts.length)
      return NextResponse.json(
        { error: "No eligible contacts in this audience." },
        { status: 400 },
      );
    let rows;
    try {
      rows = contacts.flatMap((contact, index) => {
        const times = sequenceTimes(steps, waveStart(startsAt, index));
        return steps.map((step, stepIndex) => {
          const rendered = renderCampaignMessage(step.message, contact);
          return {
            contact_id: contact.id,
            body: foldToGsm(
              stepIndex === 0
                ? campaignFirstMessage(rendered, profile.opt_out_settings, campaign.omit_first_opt_out === true)
                : rendered,
            ),
            from_number: numbers[index % numbers.length],
            scheduled_at: times[stepIndex],
            step_index: stepIndex,
            delay_minutes: step.delayMinutes,
          };
        });
      });
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
    if(rows.some(row=>/\{[^}]+\}/.test(row.body)))return NextResponse.json({error:"A message has an unresolved personalization field. Correct the template before launch."},{status:400});
    if (rows.some((row) => hasNonGsmChars(row.body)))
      return NextResponse.json(
        {
          error:
            "A message contains unsupported SMS characters. Update the template or contact field before launching.",
        },
        { status: 400 },
      );
    if(input.dryRun===true){
      const segments=rows.reduce((n,row)=>n+countSegments(row.body),0);
      let minSegments = Infinity, maxSegments = 0;
      if(input.audience === "upload") {
        for(const contact of contacts) for(const step of steps) {
          const estimate=campaignSegmentPreview(step.message,"",contact);
          minSegments=Math.min(minSegments,estimate.segments);
          maxSegments=Math.max(maxSegments,estimate.maxSegments);
        }
      }
      return NextResponse.json({...(input.audience==="upload"?{minSegments,maxSegments}:{}),revision,paused:campaign.status==="Paused",recipients:contacts.length,messages:rows.length,segments,estimatedCost:Number((segments*customerSmsRate(profile.plan)).toFixed(2)),samples:rows.slice(0,Math.min(steps.length,3)).map(r=>({body:r.body,scheduledAt:r.scheduled_at})),note:"Estimate uses rendered sample spin choices. Personalization, alternate spin text and replies can change actual usage. Quiet hours may delay sending; follow-ups stop on replies."});
    }
    if (input.audience === "upload") {
      if (input.expectedRevision !== revision) return NextResponse.json({error:"Review this upload before queueing."},{status:409});
      const {data,error}=await db.rpc("queue_csv_campaign",{p_user:auth.user.id,p_campaign:campaign.id,p_upload:input.uploadId,p_rows:rows});
      if (error) return NextResponse.json({error:error.code==="P0001"?error.message:"Could not confirm the queue. Check this upload before trying again."},{status:error.code==="P0001"?409:503});
      return NextResponse.json(data);
    }
    const queued = await enqueueSequence(db, {
      userId: auth.user.id,
      campaignId: campaign.id,
      rows,
      startsAt: new Date(startsAt).toISOString(),
      resume: input.resume === true,
      audience: contacts.length,
      previousStatus: campaign.status ?? null,
    });
    if (!queued.ok) return NextResponse.json({ error: queued.message }, { status: queued.status });
    const data = queued.data;
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json(
      { error: "Could not schedule this campaign. Please try again." },
      { status: 500 },
    );
  }
}
