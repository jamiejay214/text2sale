import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const telnyxApiKey = process.env.TELNYX_API_KEY!;
const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID!;

async function telnyxFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.telnyx.com${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${telnyxApiKey}`,
      ...options?.headers,
    },
  });
  return res.json();
}

// Map business type to Telnyx entity type
// Note: SOLE_PROPRIETOR is NOT a valid entityType in Telnyx brand API.
// Sole proprietors with an EIN should register as PRIVATE_PROFIT.
// Generate a URL-safe slug from a business name
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Ensure slug is unique, appending -2, -3, etc. if needed
async function getUniqueSlug(
  supabase: ReturnType<typeof createClient<any, any, any>>,
  base: string,
  userId: string
): Promise<string> {
  let slug = base;
  let suffix = 1;
  while (true) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("business_slug", slug)
      .neq("id", userId)
      .maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

function toEntityType(businessType: string): string {
  switch (businessType) {
    case "sole_proprietor": return "PRIVATE_PROFIT";
    case "partnership": return "PRIVATE_PROFIT";
    case "corporation": return "PRIVATE_PROFIT";
    case "llc": return "PRIVATE_PROFIT";
    case "non_profit": return "NON_PROFIT";
    default: return "PRIVATE_PROFIT";
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }

    // Get current profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("a2p_registration, owned_numbers, first_name, last_name, email, phone")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // ── Step 1: Register Brand ──
    if (action === "register_brand") {
      const {
        businessName, businessType, ein, businessAddress, businessCity,
        businessState, businessZip, website, contactEmail, contactPhone,
        hasWebsite, buildPage, businessDescription,
      } = body;

      if (!ein || !businessName) {
        return NextResponse.json({ success: false, error: "EIN and business name are required" }, { status: 400 });
      }

      // If the user has no website and opted to auto-generate one, create a public biz page
      // and use that URL for the 10DLC brand registration.
      let finalWebsite = website;
      if (hasWebsite === "no" && buildPage) {
        const base = toSlug(businessName);
        if (!base) {
          return NextResponse.json(
            { success: false, error: "Could not generate a page slug from your business name. Please use letters/numbers." },
            { status: 400 }
          );
        }
        const slug = await getUniqueSlug(supabase, base, userId);
        const origin = req.headers.get("origin") || "https://text2sale.com";
        finalWebsite = `${origin.replace(/\/$/, "")}/biz/${slug}`;

        await supabase
          .from("profiles")
          .update({
            business_slug: slug,
            business_description: businessDescription || null,
          })
          .eq("id", userId);
      }

      const entityType = toEntityType(businessType);

      // Register brand with Telnyx
      const cleanEin = ein.replace(/\D/g, "");
      const brandPayload: Record<string, unknown> = {
        entityType,
        displayName: businessName,
        companyName: businessName,
        ein: cleanEin,
        einIssuingCountry: "US",
        phone: `+1${(contactPhone || profile.phone || "").replace(/\D/g, "").replace(/^1/, "")}`,
        street: businessAddress,
        city: businessCity,
        state: businessState,
        postalCode: businessZip,
        country: "US",
        email: contactEmail || profile.email,
        vertical: "INSURANCE",
        website: finalWebsite || "https://text2sale.com",
      };
      // Include first/last name for all registrations
      if (profile.first_name) brandPayload.firstName = profile.first_name;
      if (profile.last_name) brandPayload.lastName = profile.last_name;

      console.log("10DLC brand payload:", JSON.stringify(brandPayload, null, 2));

      const brandData = await telnyxFetch("/v2/10dlc/brand", {
        method: "POST",
        body: JSON.stringify(brandPayload),
      });

      if (brandData.errors) {
        const errMsg = brandData.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join(", ");
        // Save failed state
        await supabase.from("profiles").update({
          a2p_registration: {
            ...(profile.a2p_registration || {}),
            status: "brand_failed",
            errors: [errMsg],
            updatedAt: new Date().toISOString(),
            businessName, businessType, ein, businessAddress, businessCity,
            businessState, businessZip, businessCountry: "US", website: finalWebsite,
            contactFirstName: profile.first_name, contactLastName: profile.last_name,
            contactEmail: contactEmail || profile.email, contactPhone: contactPhone || profile.phone,
          },
        }).eq("id", userId);

        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
      }

      const brandId = brandData.brandId;

      // Save brand info to profile
      await supabase.from("profiles").update({
        a2p_registration: {
          status: "brand_pending",
          brandRegistrationSid: brandId,
          brandStatus: brandData.status,
          customerProfileSid: null,
          trustProductSid: null,
          messagingServiceSid: messagingProfileId,
          campaignSid: null,
          campaignStatus: null,
          businessName, businessType, ein,
          businessAddress, businessCity, businessState, businessZip, businessCountry: "US",
          website: finalWebsite || "https://text2sale.com/#sms-program",
          contactFirstName: profile.first_name,
          contactLastName: profile.last_name,
          contactEmail: contactEmail || profile.email,
          contactPhone: contactPhone || profile.phone,
          useCase: "MIXED",
          description: "",
          sampleMessages: [],
          messageFlow: "",
          optInMessage: "",
          optOutMessage: "",
          helpMessage: "",
          hasEmbeddedLinks: true,
          hasEmbeddedPhone: false,
          errors: [],
          updatedAt: new Date().toISOString(),
        },
      }).eq("id", userId);

      // Wait a moment then check brand status
      await new Promise((r) => setTimeout(r, 5000));
      const brandCheck = await telnyxFetch(`/10dlc/brand/${brandId}`);
      const brandStatus = brandCheck.status;

      if (brandStatus === "OK") {
        // Brand approved immediately — proceed to campaign
        await supabase.from("profiles").update({
          a2p_registration: {
            ...((await supabase.from("profiles").select("a2p_registration").eq("id", userId).single()).data?.a2p_registration || {}),
            status: "brand_approved",
            brandStatus: "OK",
            updatedAt: new Date().toISOString(),
          },
        }).eq("id", userId);

        return NextResponse.json({
          success: true,
          brandId,
          brandStatus: "OK",
          message: "Brand approved! Creating campaign...",
          nextAction: "create_campaign",
        });
      }

      return NextResponse.json({
        success: true,
        brandId,
        brandStatus,
        message: "Brand registration submitted. Checking status...",
      });
    }

    // ── Step 2: Create Campaign ──
    if (action === "create_campaign") {
      const reg = profile.a2p_registration;
      if (!reg?.brandRegistrationSid) {
        return NextResponse.json({ success: false, error: "No brand registered yet" }, { status: 400 });
      }

      const brandId = reg.brandRegistrationSid;

      // Check brand status first
      const brandCheck = await telnyxFetch(`/10dlc/brand/${brandId}`);
      if (brandCheck.status !== "OK") {
        return NextResponse.json({
          success: false,
          error: `Brand is not approved yet. Status: ${brandCheck.status}`,
          brandStatus: brandCheck.status,
        }, { status: 400 });
      }

      const usecase = "MIXED";
      const subUsecases = ["MARKETING", "CUSTOMER_CARE"];

      const businessName = reg.businessName || "Text2Sale User";
      const contactEmail = reg.contactEmail || profile.email;
      const contactPhone = reg.contactPhone || profile.phone;
      const websiteUrl = reg.website || "https://text2sale.com";

      // Create campaign with full 10DLC compliance
      const campaignData = await telnyxFetch("/v2/10dlc/campaignBuilder", {
        method: "POST",
        body: JSON.stringify({
          brandId,
          usecase,
          subUsecases,
          description: `${businessName} uses Text2Sale to send marketing promotions, appointment reminders, follow-up messages, and customer service notifications via SMS to customers and leads who have voluntarily opted in to receive text messages.`,
          messageFlow: `Consumers opt in to receive SMS messages by voluntarily providing their phone number through the business website at ${websiteUrl} or through an in-person paper sign-up form. The opt-in form clearly discloses: (1) the types of messages they will receive, (2) that message frequency varies, (3) that message and data rates may apply, (4) instructions to reply STOP to opt out, (5) instructions to reply HELP for help, and (6) a link to the privacy policy at https://text2sale.com/privacy-policy. Consent to receive messages is not a condition of any purchase. Written consent with timestamp is recorded before any messages are sent.`,
          helpMessage: `${businessName}: For help, contact us at ${contactEmail} or call ${contactPhone}. Msg frequency varies. Msg&data rates may apply. Reply STOP to opt out.`,
          helpKeywords: "HELP,INFO",
          optinMessage: `${businessName}: You are now subscribed to receive text messages. Msg frequency varies. Msg&data rates may apply. Reply HELP for help. Reply STOP to unsubscribe. Privacy policy: https://text2sale.com/privacy-policy`,
          optinKeywords: "START,SUBSCRIBE,YES",
          optoutMessage: `${businessName}: You have been unsubscribed and will no longer receive text messages. Reply START to re-subscribe. Contact ${contactEmail} for questions.`,
          optoutKeywords: "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
          sample1: `Hi Sarah, ${businessName} here! We have new health coverage options that could save you money this enrollment period. Reply for details or visit ${websiteUrl}. Reply STOP to unsubscribe. Msg&data rates may apply.`,
          sample2: `Hi John, this is ${businessName}. Your account has been updated and your new policy documents are ready to view. If you have any questions, reply to this message or call us at ${contactPhone}. Reply STOP to opt out. Msg&data rates may apply.`,
          embeddedLink: true,
          embeddedPhone: false,
          numberPool: false,
          ageGated: false,
          directLending: false,
          subscriberOptin: true,
          subscriberOptout: true,
          subscriberHelp: true,
          termsAndConditions: true,
        }),
      });

      if (campaignData.errors) {
        const errMsg = campaignData.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join(", ");
        await supabase.from("profiles").update({
          a2p_registration: { ...reg, status: "campaign_failed", campaignStatus: "FAILED", errors: [errMsg], updatedAt: new Date().toISOString() },
        }).eq("id", userId);
        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
      }

      const campaignId = campaignData.campaignId;

      await supabase.from("profiles").update({
        a2p_registration: {
          ...reg,
          status: "campaign_pending",
          campaignSid: campaignId,
          campaignStatus: campaignData.campaignStatus || "TCR_PENDING",
          useCase: usecase,
          description: campaignData.description,
          sampleMessages: [campaignData.sample1, campaignData.sample2].filter(Boolean),
          messageFlow: campaignData.messageFlow,
          optInMessage: campaignData.optinMessage,
          optOutMessage: campaignData.optoutMessage,
          helpMessage: campaignData.helpMessage,
          errors: [],
          updatedAt: new Date().toISOString(),
        },
      }).eq("id", userId);

      return NextResponse.json({
        success: true,
        campaignId,
        campaignStatus: campaignData.campaignStatus,
        message: "Campaign created! Waiting for approval...",
        nextAction: "check_campaign",
      });
    }

    // ── Step 3: Check campaign status & assign numbers ──
    if (action === "check_campaign") {
      const reg = profile.a2p_registration;
      if (!reg?.campaignSid) {
        return NextResponse.json({ success: false, error: "No campaign created yet" }, { status: 400 });
      }

      const campaignCheck = await telnyxFetch(`/10dlc/campaign/${reg.campaignSid}`);
      const status = campaignCheck.campaignStatus;
      const failures = campaignCheck.failureReasons;

      if (status === "TCR_FAILED" || campaignCheck.submissionStatus === "FAILED") {
        const errMsg = failures?.map((f: { description: string }) => f.description).join(", ") || "Campaign registration failed";
        await supabase.from("profiles").update({
          a2p_registration: { ...reg, status: "campaign_failed", campaignStatus: status, errors: [errMsg], updatedAt: new Date().toISOString() },
        }).eq("id", userId);
        return NextResponse.json({ success: false, error: errMsg, campaignStatus: status }, { status: 400 });
      }

      if (status === "TCR_PENDING") {
        return NextResponse.json({ success: true, campaignStatus: status, message: "Campaign is pending TCR approval. This can take a few minutes." });
      }

      // TCR_ACCEPTED — try to assign phone numbers
      if (status === "TCR_ACCEPTED") {
        const ownedNumbers = profile.owned_numbers || [];
        const assigned: string[] = [];
        const pendingAssignment: string[] = [];

        for (const num of ownedNumbers) {
          const rawNumber = num.number.replace(/[^\d+]/g, "");
          const e164 = rawNumber.startsWith("+") ? rawNumber : `+1${rawNumber.replace(/\D/g, "")}`;

          const assignResult = await telnyxFetch("/v2/10dlc/phone_number_campaigns", {
            method: "POST",
            body: JSON.stringify({
              phoneNumber: e164,
              campaignId: reg.campaignSid,
            }),
          });

          if (assignResult.errors) {
            // Campaign might still be processing
            pendingAssignment.push(num.number);
          } else {
            assigned.push(num.number);
          }
        }

        const allAssigned = assigned.length > 0 && pendingAssignment.length === 0;
        const newStatus = allAssigned ? "completed" : "campaign_approved";

        await supabase.from("profiles").update({
          a2p_registration: {
            ...reg,
            status: newStatus,
            campaignStatus: status,
            errors: [],
            updatedAt: new Date().toISOString(),
          },
        }).eq("id", userId);

        return NextResponse.json({
          success: true,
          campaignStatus: status,
          assigned,
          pendingAssignment,
          completed: allAssigned,
          message: allAssigned
            ? "10DLC registration complete! Your numbers are ready to send."
            : `Campaign approved. ${assigned.length} number(s) assigned, ${pendingAssignment.length} pending.`,
        });
      }

      return NextResponse.json({ success: true, campaignStatus: status, message: `Campaign status: ${status}` });
    }

    // ── Assign a single number to existing campaign ──
    if (action === "assign_number") {
      const reg = profile.a2p_registration;
      if (!reg?.campaignSid) {
        return NextResponse.json({ success: false, error: "No campaign registered" }, { status: 400 });
      }

      const { phoneNumber } = body;
      if (!phoneNumber) {
        return NextResponse.json({ success: false, error: "Missing phoneNumber" }, { status: 400 });
      }

      const e164 = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber.replace(/\D/g, "")}`;

      const result = await telnyxFetch("/v2/10dlc/phone_number_campaigns", {
        method: "POST",
        body: JSON.stringify({
          phoneNumber: e164,
          campaignId: reg.campaignSid,
        }),
      });

      if (result.errors) {
        const errMsg = result.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join(", ");
        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: `Number ${phoneNumber} assigned to campaign` });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("10DLC registration error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
