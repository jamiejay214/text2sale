import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

// Twilio Trust Hub policy SID for secondary customer profiles
const CUSTOMER_PROFILE_POLICY_SID = "RNdfbf3fae0e1107f8aded0e7cead80bf5";
// Twilio Trust Hub policy SID for A2P messaging trust products
const A2P_TRUST_PRODUCT_POLICY_SID = "RN806dd6cd175f314e1f96a9727ee271f4";

type A2PAction =
  | "register_brand"
  | "check_brand_status"
  | "register_campaign"
  | "check_campaign_status"
  | "add_phone_number";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId } = body as { action: A2PAction; userId: string };

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    switch (action) {
      case "register_brand":
        return handleRegisterBrand(client, body);

      case "check_brand_status":
        return handleCheckBrandStatus(client, body);

      case "register_campaign":
        return handleRegisterCampaign(client, body);

      case "check_campaign_status":
        return handleCheckCampaignStatus(client, body);

      case "add_phone_number":
        return handleAddPhoneNumber(client, body);

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("A2P registration error:", errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

// ============================================================
// Step 1: Register Brand (Customer Profile + Trust Product + Brand)
// ============================================================
async function handleRegisterBrand(client: ReturnType<typeof twilio>, body: Record<string, unknown>) {
  const {
    businessName, businessType, ein,
    businessAddress, businessCity, businessState, businessZip, businessCountry,
    website,
    contactFirstName, contactLastName, contactEmail, contactPhone,
  } = body as Record<string, string>;

  // Validate required fields
  if (!businessName || !contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
    return NextResponse.json({
      success: false,
      error: "Missing required business or contact information",
    }, { status: 400 });
  }

  // Map businessType to Twilio's expected values
  const businessTypeMap: Record<string, string> = {
    sole_proprietor: "Sole Proprietorship",
    partnership: "Partnership",
    corporation: "Corporation",
    llc: "Limited Liability Corporation",
    non_profit: "Non-profit Corporation",
  };

  // 1. Create Secondary Customer Profile
  const customerProfile = await client.trusthub.v1.customerProfiles.create({
    friendlyName: `${businessName} - A2P Profile`,
    email: contactEmail,
    policySid: CUSTOMER_PROFILE_POLICY_SID,
  });

  // 2. Create EndUser with business information
  const businessEndUser = await client.trusthub.v1.endUsers.create({
    friendlyName: `${businessName} - Business Info`,
    type: "customer_profile_business_information",
    attributes: {
      business_name: businessName,
      business_type: businessTypeMap[businessType] || "Corporation",
      business_registration_number: ein || undefined,
      business_identity: ein ? "direct_customer" : "direct_customer",
      business_industry: "COMMUNICATION",
      business_regions_of_operation: "USA_AND_CANADA",
      website_url: website || undefined,
      social_media_profile_urls: "",
    },
  });

  // 3. Attach business EndUser to profile
  await client.trusthub.v1
    .customerProfiles(customerProfile.sid)
    .customerProfilesEntityAssignments.create({
      objectSid: businessEndUser.sid,
    });

  // 4. Create authorized representative EndUser
  const repEndUser = await client.trusthub.v1.endUsers.create({
    friendlyName: `${contactFirstName} ${contactLastName} - Auth Rep`,
    type: "authorized_representative_1",
    attributes: {
      first_name: contactFirstName,
      last_name: contactLastName,
      email: contactEmail,
      phone_number: contactPhone,
      business_title: "Owner",
      job_position: "Director",
    },
  });

  // 5. Attach representative to profile
  await client.trusthub.v1
    .customerProfiles(customerProfile.sid)
    .customerProfilesEntityAssignments.create({
      objectSid: repEndUser.sid,
    });

  // 6. Create address
  const address = await client.addresses.create({
    friendlyName: `${businessName} Address`,
    customerName: businessName,
    street: businessAddress || "123 Main St",
    city: businessCity || "New York",
    region: businessState || "NY",
    postalCode: businessZip || "10001",
    isoCountry: businessCountry || "US",
  });

  // 7. Create supporting document with address
  const supportingDoc = await client.trusthub.v1.supportingDocuments.create({
    friendlyName: `${businessName} - Address Doc`,
    type: "customer_profile_address",
    attributes: {
      address_sids: address.sid,
    },
  });

  // 8. Attach supporting document
  await client.trusthub.v1
    .customerProfiles(customerProfile.sid)
    .customerProfilesEntityAssignments.create({
      objectSid: supportingDoc.sid,
    });

  // 9. Submit customer profile for review
  await client.trusthub.v1
    .customerProfiles(customerProfile.sid)
    .update({ status: "pending-review" });

  // 10. Create A2P Trust Product
  const trustProduct = await client.trusthub.v1.trustProducts.create({
    friendlyName: `${businessName} - A2P Trust Product`,
    policySid: A2P_TRUST_PRODUCT_POLICY_SID,
  });

  // 11. Create A2P messaging profile EndUser
  const a2pEndUser = await client.trusthub.v1.endUsers.create({
    friendlyName: `${businessName} - A2P Messaging Profile`,
    type: "us_a2p_messaging_profile_information",
    attributes: {
      company_type: businessTypeMap[businessType] || "Corporation",
      stock_exchange: "NONE",
      stock_ticker: "NONE",
    },
  });

  // 12. Attach A2P EndUser to trust product
  await client.trusthub.v1
    .trustProducts(trustProduct.sid)
    .trustProductsEntityAssignments.create({
      objectSid: a2pEndUser.sid,
    });

  // 13. Attach customer profile to trust product
  await client.trusthub.v1
    .trustProducts(trustProduct.sid)
    .trustProductsEntityAssignments.create({
      objectSid: customerProfile.sid,
    });

  // 14. Submit trust product for review
  await client.trusthub.v1
    .trustProducts(trustProduct.sid)
    .update({ status: "pending-review" });

  // 15. Create Brand Registration
  const brandRegistration = await client.messaging.v1.brandRegistrations.create({
    customerProfileBundleSid: customerProfile.sid,
    a2PProfileBundleSid: trustProduct.sid,
  });

  // 16. Create Messaging Service for this user
  const messagingService = await client.messaging.v1.services.create({
    friendlyName: `${businessName} - Text2Sale`,
    inboundRequestUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://text2sale.com"}/api/incoming-sms`,
    inboundMethod: "POST",
  });

  return NextResponse.json({
    success: true,
    customerProfileSid: customerProfile.sid,
    trustProductSid: trustProduct.sid,
    brandRegistrationSid: brandRegistration.sid,
    brandStatus: brandRegistration.status,
    messagingServiceSid: messagingService.sid,
  });
}

// ============================================================
// Step 2: Check Brand Registration Status
// ============================================================
async function handleCheckBrandStatus(client: ReturnType<typeof twilio>, body: Record<string, unknown>) {
  const { brandRegistrationSid } = body as { brandRegistrationSid: string };

  if (!brandRegistrationSid) {
    return NextResponse.json({ success: false, error: "Missing brandRegistrationSid" }, { status: 400 });
  }

  const brand = await client.messaging.v1
    .brandRegistrations(brandRegistrationSid)
    .fetch();

  return NextResponse.json({
    success: true,
    brandStatus: brand.status,
    brandScore: brand.brandScore,
    identityStatus: brand.identityStatus,
  });
}

// ============================================================
// Step 3: Register A2P Campaign
// ============================================================
async function handleRegisterCampaign(client: ReturnType<typeof twilio>, body: Record<string, unknown>) {
  const {
    messagingServiceSid, brandRegistrationSid,
    useCase, description, sampleMessages,
    messageFlow, optInMessage, optOutMessage, helpMessage,
    hasEmbeddedLinks, hasEmbeddedPhone,
  } = body as {
    messagingServiceSid: string;
    brandRegistrationSid: string;
    useCase: string;
    description: string;
    sampleMessages: string[];
    messageFlow: string;
    optInMessage: string;
    optOutMessage: string;
    helpMessage: string;
    hasEmbeddedLinks: boolean;
    hasEmbeddedPhone: boolean;
  };

  if (!messagingServiceSid || !brandRegistrationSid || !description) {
    return NextResponse.json({
      success: false,
      error: "Missing required campaign fields",
    }, { status: 400 });
  }

  const campaign = await client.messaging.v1
    .services(messagingServiceSid)
    .usAppToPerson.create({
      brandRegistrationSid,
      description,
      messageFlow: messageFlow || "End users opt-in by signing up on our website and providing their phone number.",
      messageSamples: sampleMessages?.length >= 2
        ? sampleMessages
        : ["Hi {firstName}, thanks for signing up!", "Your appointment reminder is coming up."],
      usAppToPersonUsecase: useCase || "MIXED",
      hasEmbeddedLinks: hasEmbeddedLinks ?? true,
      hasEmbeddedPhone: hasEmbeddedPhone ?? false,
      optInMessage: optInMessage || "You have opted in to receive messages. Reply STOP to unsubscribe.",
      optOutMessage: optOutMessage || "You have been unsubscribed. Reply START to re-subscribe.",
      helpMessage: helpMessage || "Reply HELP for assistance or STOP to unsubscribe.",
      optInKeywords: ["START", "SUBSCRIBE", "YES"],
      optOutKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
      helpKeywords: ["HELP", "INFO"],
    });

  return NextResponse.json({
    success: true,
    campaignSid: campaign.sid,
    campaignStatus: campaign.campaignStatus,
  });
}

// ============================================================
// Step 4: Check Campaign Status
// ============================================================
async function handleCheckCampaignStatus(client: ReturnType<typeof twilio>, body: Record<string, unknown>) {
  const { messagingServiceSid, campaignSid } = body as {
    messagingServiceSid: string;
    campaignSid: string;
  };

  if (!messagingServiceSid || !campaignSid) {
    return NextResponse.json({ success: false, error: "Missing SIDs" }, { status: 400 });
  }

  const campaign = await client.messaging.v1
    .services(messagingServiceSid)
    .usAppToPerson(campaignSid)
    .fetch();

  return NextResponse.json({
    success: true,
    campaignStatus: campaign.campaignStatus,
    campaignId: campaign.campaignId,
    errors: campaign.errors || [],
  });
}

// ============================================================
// Step 5: Add Phone Number to Messaging Service
// ============================================================
async function handleAddPhoneNumber(client: ReturnType<typeof twilio>, body: Record<string, unknown>) {
  const { messagingServiceSid, phoneNumberSid } = body as {
    messagingServiceSid: string;
    phoneNumberSid: string;
  };

  if (!messagingServiceSid || !phoneNumberSid) {
    return NextResponse.json({ success: false, error: "Missing SIDs" }, { status: 400 });
  }

  const result = await client.messaging.v1
    .services(messagingServiceSid)
    .phoneNumbers.create({ phoneNumberSid });

  return NextResponse.json({
    success: true,
    phoneNumberSid: result.sid,
  });
}
