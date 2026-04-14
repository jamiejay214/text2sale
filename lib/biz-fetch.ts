import { createClient } from "@supabase/supabase-js";

export type BusinessProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_slug: string | null;
  business_description: string | null;
  business_logo_url: string | null;
  a2p_registration: {
    businessName?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessZip?: string;
    contactEmail?: string;
    contactPhone?: string;
  } | null;
};

export async function fetchBusiness(slug: string): Promise<BusinessProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, business_slug, business_description, business_logo_url, a2p_registration"
    )
    .eq("business_slug", slug)
    .maybeSingle();

  return (data as BusinessProfile) || null;
}

export function getBusinessName(biz: BusinessProfile): string {
  return (
    biz.a2p_registration?.businessName ||
    `${biz.first_name || ""} ${biz.last_name || ""}`.trim() ||
    "Business"
  );
}

export function getBusinessContact(biz: BusinessProfile) {
  const reg = biz.a2p_registration || {};
  return {
    email: reg.contactEmail || biz.email || "",
    phone: reg.contactPhone || biz.phone || "",
    address: [reg.businessAddress, reg.businessCity, reg.businessState, reg.businessZip]
      .filter(Boolean)
      .join(", "),
  };
}
