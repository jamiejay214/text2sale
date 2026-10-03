import { NextRequest, NextResponse, after } from "next/server";
import { authenticate, requireSameUser } from "@/lib/auth-guard";
import { advanceUser, createServiceClient, PROFILE_COLUMNS, type ProfileRow, type Registration } from "@/lib/messaging-driver";
import { validateBusinessDetails } from "@/lib/business-details";
import { isEntitled, isMessagingStatus, type MessagingStatus } from "@/lib/messaging-status";
import { assignNumberToCampaign } from "@/lib/telnyx-10dlc";
import { getUniqueSlug, toSlug } from "@/lib/business-site";
import { publishSiteConfig } from "@/lib/site-config";

// ── Start texting activation ───────────────────────────────────────────────
//
// The customer submits their business details once. This route validates and
// saves them, then hands over to the activation driver
// (lib/messaging-driver.ts), which builds the website, registers the business
// with Telnyx, files the campaign, buys a number and switches texting on.
// None of that waits on the browser.
//
// This route used to run the registration itself and the dashboard polled it
// in a loop, so closing the tab stalled the account and a second click could
// file a duplicate campaign. Now there is one owner of progress, and every
// action here either records the customer's input or asks the driver to take
// a turn — which is safe to repeat, because the driver is lease-protected.

// The driver can do real work (domain registration, site checks) in one turn.
export const maxDuration = 60;

/** A customer can start (or re-start) registration this many times unaided. */
const MAX_BRAND_SUBMISSIONS = 3;

const IN_FLIGHT: MessagingStatus[] = [
  "BUSINESS_SUBMITTED",
  "BRAND_PENDING",
  "BRAND_APPROVED",
  "CAMPAIGN_PENDING",
  "CAMPAIGN_APPROVED",
  "NUMBER_ASSIGNED",
  "AWAITING_PAYMENT",
  "ACTIVE",
];

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  try {
    const db = createServiceClient();
    const body = await req.json();
    const { userId: bodyUserId, action } = body;

    if (!bodyUserId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;

    const { data } = await db.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).single();
    if (!data) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }
    const profile = data as unknown as ProfileRow;
    const status: MessagingStatus = isMessagingStatus(profile.messaging_status) ? profile.messaging_status : "NOT_STARTED";
    const reg = (profile.a2p_registration || {}) as Registration;

    // ── Save details and start ──
    if (action === "register_brand") {
      // Pay first. Registering a brand and a campaign costs money on our
      // Telnyx account, so it only starts for an account that is paying.
      // The dashboard hides the button, but a hidden button isn't a gate —
      // the old wizard let anyone skip the subscription step and submit.
      if (!isEntitled(profile)) {
        return NextResponse.json(
          {
            success: false,
            needsSubscription: true,
            error: "Start your subscription to activate texting. Your details are safe — you can submit them as soon as you're subscribed.",
          },
          { status: 402 }
        );
      }

      if (IN_FLIGHT.includes(status)) {
        return NextResponse.json({
          success: true,
          alreadyInProgress: true,
          status,
          message: status === "ACTIVE" ? "Texting is already active on your account." : "Your activation is already in progress.",
        });
      }

      const v = validateBusinessDetails(body);
      if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });
      const d = v.value;

      // A brand that was approved and whose campaign was then rejected is
      // reused rather than bought again — unless the details that identify
      // the business changed, which the carriers would treat as a new brand.
      const sameBrand =
        !!reg.brandRegistrationSid &&
        !!reg.campaignSid &&
        status === "REJECTED" &&
        String(reg.businessName || "").toLowerCase() === d.businessName.toLowerCase() &&
        String(reg.ein || "").replace(/\D/g, "") === d.ein.replace(/\D/g, "") &&
        String(reg.businessAddress || "").toLowerCase() === d.businessAddress.toLowerCase() &&
        String(reg.businessZip || "") === d.businessZip;

      // Each new brand costs a fee, so cap how many a customer can trigger on
      // their own. Past the cap a human decides.
      if (!sameBrand && (reg.brandSubmissions ?? 0) >= MAX_BRAND_SUBMISSIONS) {
        return NextResponse.json(
          {
            success: false,
            error: "We've already submitted your business several times. Please contact support and we'll sort it out with you.",
          },
          { status: 429 }
        );
      }

      // ── Website ──
      let customDomain = profile.custom_domain;
      let domainRequest: Registration["domainRequest"] = null;
      let website = "";
      let websiteMode: "hosted" | "own" = "hosted";
      let siteLiveAt = reg.siteLiveAt ?? null;
      const w = d.website;

      if (w.mode === "own") {
        websiteMode = "own";
        website = w.url;
        if (reg.websiteMode !== "own" || reg.website !== w.url) siteLiveAt = null;
      } else if ("domainRequest" in w) {
        domainRequest = { ...w.domainRequest, requestedAt: new Date().toISOString() };
        if (customDomain !== w.domainRequest.domain) {
          customDomain = null; // the driver registers it (after payment) and sets it
          siteLiveAt = null;
        }
      } else if ("customDomain" in w) {
        customDomain = w.customDomain;
        if (profile.custom_domain !== w.customDomain) siteLiveAt = null;
      } else if (!customDomain && !reg.domainRequest) {
        return NextResponse.json(
          { success: false, error: "Choose your website address — carriers need a real website for your business." },
          { status: 400 }
        );
      } else {
        domainRequest = reg.domainRequest ?? null;
      }

      if (customDomain && customDomain !== profile.custom_domain) {
        const { data: taken } = await db
          .from("profiles")
          .select("id")
          .eq("custom_domain", customDomain)
          .neq("id", userId)
          .maybeSingle();
        if (taken) {
          return NextResponse.json(
            { success: false, error: "That domain is already connected to another account." },
            { status: 409 }
          );
        }
      }

      const slug =
        profile.business_slug ||
        (await getUniqueSlug(db, toSlug(d.businessName) || `site-${userId.slice(0, 6)}`, userId));

      const now = new Date().toISOString();
      const siteConfig = publishSiteConfig(reg.siteConfig, {
        businessName: d.businessName,
        industry: d.industry,
        description: d.businessDescription,
        logoUrl: null,
      });
      const next: Registration = {
        ...reg,
        // Brand and campaign state: carried over when reusing the brand,
        // cleared otherwise.
        brandRegistrationSid: sameBrand ? reg.brandRegistrationSid : null,
        brandStatus: sameBrand ? reg.brandStatus : null,
        brandIdentityStatus: sameBrand ? reg.brandIdentityStatus : null,
        campaignSid: null,
        campaignStatus: null,
        customerProfileSid: null,
        trustProductSid: null,
        messagingServiceSid: process.env.TELNYX_MESSAGING_PROFILE_ID || null,
        businessName: d.businessName,
        businessType: d.businessType,
        ein: d.ein,
        businessAddress: d.businessAddress,
        businessCity: d.businessCity,
        businessState: d.businessState,
        businessZip: d.businessZip,
        businessCountry: "US",
        contactFirstName: profile.first_name || "",
        contactLastName: profile.last_name || "",
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        website,
        websiteMode,
        domainRequest,
        siteLiveAt,
        industry: d.industry,
        desiredAreaCode: d.areaCode ?? reg.desiredAreaCode ?? null,
        useCase: "MIXED",
        description: "",
        sampleMessages: [],
        messageFlow: "",
        optInMessage: "",
        optOutMessage: "",
        helpMessage: "",
        hasEmbeddedLinks: true,
        hasEmbeddedPhone: true,
        siteConfig,
        siteVerifiedVersion: 0,
        awaiting: null,
        adminAlert: null,
        errors: [],
        updatedAt: now,
        status: "brand_pending",
      };

      const { error: saveErr } = await db
        .from("profiles")
        .update({
          industry: d.industry,
          business_description: d.businessDescription || null,
          business_slug: slug,
          custom_domain: customDomain,
          messaging_status: "BUSINESS_SUBMITTED",
          messaging_status_at: now,
          messaging_error: null,
          messaging_attempts: 0,
          messaging_next_attempt_at: now,
          a2p_registration: next,
        })
        .eq("id", userId);
      if (saveErr) {
        console.error("[register-10dlc] save failed:", saveErr.message);
        return NextResponse.json({ success: false, error: "We couldn't save your details. Please try again." }, { status: 500 });
      }

      // Take the first turn right away so the customer sees movement (a
      // domain registered, a brand submitted) instead of waiting for the next
      // cron tick — but after responding, so the request itself stays quick.
      after(async () => {
        try {
          await advanceUser(db, userId, { force: true });
        } catch (e) {
          console.error("[register-10dlc] first turn failed:", e);
        }
      });

      return NextResponse.json({
        success: true,
        status: "BUSINESS_SUBMITTED",
        message: "Got it — we're building your website and submitting your business now. Nothing else needed from you.",
      });
    }

    // ── Compatibility actions ──
    //
    // The Settings screen and older clients still call these. They no longer
    // do the work themselves; they ask the driver to take a turn and report
    // where the account stands.
    if (action === "create_campaign" || action === "check_campaign") {
      if (status === "NOT_STARTED") {
        return NextResponse.json({ success: false, error: "No registration has been started yet" }, { status: 400 });
      }
      await advanceUser(db, userId, { force: true });
      const { data: after1 } = await db
        .from("profiles")
        .select("messaging_status, messaging_error, a2p_registration")
        .eq("id", userId)
        .single();
      const now = (isMessagingStatus(after1?.messaging_status) ? after1!.messaging_status : status) as MessagingStatus;
      const r = (after1?.a2p_registration || {}) as Registration;

      if (now === "REJECTED") {
        return NextResponse.json(
          { success: false, error: after1?.messaging_error || "Registration was rejected", brandStatus: r.brandStatus, campaignStatus: r.campaignStatus },
          { status: 400 }
        );
      }
      const brandDone = !["BUSINESS_SUBMITTED", "BRAND_PENDING"].includes(now);
      if (action === "create_campaign" && !brandDone) {
        return NextResponse.json(
          { success: false, error: `Brand is not approved yet. Status: ${r.brandStatus || "pending"}`, brandStatus: r.brandStatus },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        status: now,
        brandStatus: r.brandStatus,
        campaignStatus: r.campaignStatus,
        completed: now === "NUMBER_ASSIGNED" || now === "ACTIVE",
        message: now === "ACTIVE" ? "Texting is active." : "Your activation is moving along — we'll finish it automatically.",
      });
    }

    // ── Assign a single number to the existing campaign ──
    if (action === "assign_number") {
      if (!reg.campaignSid) {
        return NextResponse.json({ success: false, error: "No campaign registered" }, { status: 400 });
      }
      const { phoneNumber } = body;
      if (!phoneNumber) {
        return NextResponse.json({ success: false, error: "Missing phoneNumber" }, { status: 400 });
      }
      const e164 = phoneNumber.startsWith("+") ? phoneNumber : `+1${String(phoneNumber).replace(/\D/g, "")}`;
      const result = await assignNumberToCampaign(e164, reg.campaignSid);
      if (!result.assigned) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
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
