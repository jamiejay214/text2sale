import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Issues a time-limited signed URL for an uploaded EIN certificate.
// The caller must be an authenticated admin OR the owner of the certificate.
export async function POST(req: NextRequest) {
  try {
    const { userId, requestingUserId } = (await req.json()) as {
      userId?: string;
      requestingUserId?: string;
    };

    if (!userId || !requestingUserId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or requestingUserId" },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorize: requester must be admin, or requesting their own certificate
    const { data: requester } = await admin
      .from("profiles")
      .select("role")
      .eq("id", requestingUserId)
      .single();

    const isAdmin = requester?.role === "admin";
    if (!isAdmin && requestingUserId !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Look up path
    const { data: profile } = await admin
      .from("profiles")
      .select("a2p_registration")
      .eq("id", userId)
      .single();

    const reg = (profile?.a2p_registration as Record<string, unknown> | null) || {};
    const path = typeof reg.einCertificatePath === "string" ? reg.einCertificatePath : null;
    const name = typeof reg.einCertificateName === "string" ? reg.einCertificateName : "ein-certificate";

    if (!path) {
      return NextResponse.json(
        { success: false, error: "No certificate on file." },
        { status: 404 }
      );
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("ein-certificates")
      .createSignedUrl(path, 300, { download: name });

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { success: false, error: signErr?.message || "Could not sign URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: signed.signedUrl,
      name,
      type: reg.einCertificateType || null,
      uploadedAt: reg.einCertificateUploadedAt || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
