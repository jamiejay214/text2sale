import { authenticateWorkspace as authenticate } from "@/lib/workspace-auth";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSameUser } from "@/lib/auth-guard";
import { certificateBytesMatch, certificateContentType, certificateFileProblem } from "@/lib/ein-certificate";
import { certificateStorageName, EIN_CERTIFICATE_BUCKET, getEINCertificate } from "@/lib/ein-certificate-storage";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const form = await req.formData();
    const userId = form.get("userId");
    if (typeof userId !== "string" || !userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    const forbidden = requireSameUser(auth.user.id, userId);
    if (forbidden) return forbidden;
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "Choose your EIN confirmation letter." }, { status: 400 });
    const problem = certificateFileProblem(file);
    if (problem) return NextResponse.json({ success: false, error: problem }, { status: 400 });
    const type = certificateContentType(file)!;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!certificateBytesMatch(bytes, type)) return NextResponse.json({ success: false, error: "The file contents do not match its format. Choose a PDF or supported image." }, { status: 400 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const previous = await getEINCertificate(admin, userId);
    const name = certificateStorageName(file.name, type);
    const path = `${userId}/ein-${Date.now()}-${randomUUID()}--${name}`;
    const bucket = admin.storage.from(EIN_CERTIFICATE_BUCKET);
    const { error } = await bucket.upload(path, bytes, { contentType: type, cacheControl: "0", upsert: false });
    if (error) return NextResponse.json({ success: false, error: "Your certificate could not be saved. Please try again." }, { status: 500 });

    // A failed replacement keeps the previous file. Remove only after a successful upload.
    // The registration state is untouched, so background activation cannot erase the document.
    if (previous) await bucket.remove([previous.path]).catch(() => undefined);
    const uploadedAt = new Date().toISOString();
    const certificate = { name, type, size: file.size, uploadedAt };
    return NextResponse.json({ success: true, certificate, ...certificate }, { headers: privateHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Your certificate could not be saved. Please try again." }, { status: 500, headers: privateHeaders });
  }
}
