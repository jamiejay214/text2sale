import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireAdmin } from "@/lib/auth-guard";
import { certificateMetadata, EIN_CERTIFICATE_BUCKET, getEINCertificate } from "@/lib/ein-certificate-storage";

const privateHeaders = { "Cache-Control": "private, no-store" };

// Only the authenticated document owner or the verified Text2Sale owner may read a certificate.
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const { userId, metadataOnly, view } = await req.json();
    if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json({ success: false, error: "A valid userId is required." }, { status: 400 });
    }
    if (auth.user.id !== userId) {
      const forbidden = await requireAdmin(auth.user);
      if (forbidden) return forbidden;
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const stored = await getEINCertificate(admin, userId);
    const certificate = stored ? certificateMetadata(stored) : null;
    if (metadataOnly === true) return NextResponse.json({ success: true, certificate }, { headers: privateHeaders });
    if (!stored) return NextResponse.json({ success: false, error: "No EIN certificate has been uploaded yet." }, { status: 404, headers: privateHeaders });
    const { data, error } = await admin.storage.from(EIN_CERTIFICATE_BUCKET)
      .createSignedUrl(stored.path, 300, view === true ? undefined : { download: stored.name });
    if (error || !data?.signedUrl) return NextResponse.json({ success: false, error: "Could not open the certificate. Please try again." }, { status: 500, headers: privateHeaders });
    return NextResponse.json({ success: true, url: data.signedUrl, ...certificate }, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not load the certificate. Please try again." }, { status: 500, headers: privateHeaders });
  }
}
