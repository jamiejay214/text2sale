import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/messaging-driver";
import { siteBase, siteUrls } from "@/lib/business-site";
import {
  normalizeSiteConfig,
  publishSiteConfig,
  type BusinessSiteConfig,
} from "@/lib/site-config";
import type { A2PRegistration } from "@/lib/types";

type Registration = Partial<A2PRegistration> & Record<string, unknown>;

type SiteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  custom_domain: string | null;
  business_slug: string | null;
  business_description: string | null;
  business_logo_url: string | null;
  messaging_status: string | null;
  a2p_registration: Registration | null;
};

const COLUMNS =
  "id, first_name, last_name, email, phone, industry, custom_domain, business_slug, business_description, business_logo_url, messaging_status, a2p_registration";

function businessName(profile: SiteProfile) {
  return (
    profile.a2p_registration?.businessName ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Your business"
  );
}

function seed(profile: SiteProfile) {
  return {
    businessName: businessName(profile),
    industry: profile.industry || profile.a2p_registration?.industry,
    description: profile.business_description,
    logoUrl: profile.business_logo_url,
  };
}

function payload(profile: SiteProfile, config: BusinessSiteConfig) {
  const slug = profile.business_slug || "";
  const base = slug ? siteBase({ customDomain: profile.custom_domain, slug }) : null;
  const urls = base ? siteUrls(base) : null;
  const reg = profile.a2p_registration;
  const domainReady = !!profile.custom_domain;
  const live = !!reg?.siteLiveAt && !!domainReady;
  const carrierSubmitted = !!reg?.brandRegistrationSid;
  const messagingApproved = ["CAMPAIGN_APPROVED", "NUMBER_ASSIGNED", "ACTIVE"].includes(
    profile.messaging_status || "",
  );

  return {
    success: true,
    businessName: businessName(profile),
    contact: {
      phone: reg?.contactPhone || profile.phone || "",
      email: reg?.contactEmail || profile.email || "",
      address: [reg?.businessAddress, reg?.businessCity, reg?.businessState, reg?.businessZip]
        .filter(Boolean)
        .join(", "),
    },
    config,
    domain: profile.custom_domain,
    requestedDomain: reg?.domainRequest?.domain || null,
    slug: profile.business_slug,
    previewUrl: slug ? `https://text2sale.com/biz/${slug}` : null,
    liveUrl: domainReady ? `https://${profile.custom_domain}` : null,
    urls,
    status: {
      businessDetails: !!reg?.businessName && !!reg?.ein && !!reg?.businessAddress,
      domain: domainReady,
      published: !!config.publishedAt,
      pagesVerified: live && (reg?.siteVerifiedVersion || 0) >= 2,
      carrierSubmitted,
      messagingApproved,
      awaitingDomainFunds:
        profile.messaging_status === "AWAITING_PAYMENT" && reg?.awaiting === "domain",
    },
  };
}

async function profileFor(userId: string): Promise<SiteProfile | null> {
  const { data } = await createServiceClient()
    .from("profiles")
    .select(COLUMNS)
    .eq("id", userId)
    .single();
  return (data as SiteProfile | null) || null;
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const profile = await profileFor(auth.user.id);
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  return NextResponse.json(payload(profile, normalizeSiteConfig(profile.a2p_registration?.siteConfig, seed(profile))));
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const profile = await profileFor(auth.user.id);
  if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const normalized = normalizeSiteConfig(body.config, seed(profile));
  const alreadyPublished = !!profile.a2p_registration?.siteConfig?.publishedAt;
  const setupSubmitted =
    alreadyPublished ||
    !!profile.custom_domain ||
    !!profile.a2p_registration?.domainRequest ||
    !!profile.a2p_registration?.website;
  // Messaging Setup is the only publish step. Before setup, this remains a
  // draft; afterward every edit stays public automatically. Do not trust a
  // client-provided publishedAt value to publish an unconfigured website.
  const config = setupSubmitted
    ? publishSiteConfig(normalized, seed(profile))
    : { ...normalized, publishedAt: null, updatedAt: new Date().toISOString() };
  const registration = { ...(profile.a2p_registration || {}), siteConfig: config };
  const { error } = await createServiceClient()
    .from("profiles")
    .update({ a2p_registration: registration, business_description: config.subheadline })
    .eq("id", auth.user.id);
  if (error) {
    console.error("[business-site] save failed:", error.message);
    return NextResponse.json({ success: false, error: "The website could not be saved. Try again." }, { status: 500 });
  }

  const updated = await profileFor(auth.user.id);
  return NextResponse.json(payload(updated || { ...profile, a2p_registration: registration }, config));
}
