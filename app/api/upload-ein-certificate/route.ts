import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticate, requireSameUser } from "@/lib/auth-guard";

// CLIENT UPDATE NEEDED: dashboard must send Authorization header

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const form = await req.formData();
    const bodyUserId = form.get("userId");
    const file = form.get("file");

    if (typeof bodyUserId !== "string" || !bodyUserId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    }
    const forbid = requireSameUser(auth.user.id, bodyUserId);
    if (forbid) return forbid;
    const userId = auth.user.id;
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Upload a PDF, PNG, JPG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "File exceeds 10MB limit." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const storagePath = `${userId}/ein-${Date.now()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from("ein-certificates")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 });
    }

    // Merge into existing a2p_registration JSON
    const { data: profile } = await admin
      .from("profiles")
      .select("a2p_registration")
      .eq("id", userId)
      .single();

    const existing = (profile?.a2p_registration as Record<string, unknown> | null) || {};
    const prevPath = typeof existing.einCertificatePath === "string" ? existing.einCertificatePath : null;

    const updated = {
      ...existing,
      einCertificatePath: storagePath,
      einCertificateName: file.name,
      einCertificateType: file.type,
      einCertificateUploadedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ a2p_registration: updated })
      .eq("id", userId);

    if (updateErr) {
      // Clean up the newly uploaded file if we couldn't record it
      await admin.storage.from("ein-certificates").remove([storagePath]);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Best-effort remove of the previous certificate
    if (prevPath && prevPath !== storagePath) {
      await admin.storage.from("ein-certificates").remove([prevPath]);
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      name: file.name,
      type: file.type,
      uploadedAt: updated.einCertificateUploadedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
