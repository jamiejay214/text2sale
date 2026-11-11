import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUserId, teamDatabase } from "@/lib/workspace-auth";
import { MMS_BUCKET, MMS_MAX_BYTES, ownsPicture, pictureType } from "@/lib/mms";

export async function POST(req: NextRequest) {
  const userId = await getWorkspaceUserId(req);
  if (!userId) return NextResponse.json({error:"Unauthorized"},{status:401});
  if (Number(req.headers.get("content-length")) > MMS_MAX_BYTES + 10_000) return NextResponse.json({error:"Picture must be under 300 KB."},{status:413});
  try {
    const form = await req.formData();
    const file = form.get("picture");
    if (!(file instanceof File) || !file.size || file.size > MMS_MAX_BYTES) return NextResponse.json({error:"Choose a JPG, PNG or GIF under 300 KB."},{status:400});
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = pictureType(bytes);
    if (!type) return NextResponse.json({error:"Only JPG, PNG and GIF pictures are supported."},{status:400});
    const path = `${userId}/${crypto.randomUUID()}.${type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "gif"}`;
    const {error} = await teamDatabase().storage.from(MMS_BUCKET).upload(path,bytes,{contentType:type,upsert:false});
    if (error) throw error;
    return NextResponse.json({path});
  } catch { return NextResponse.json({error:"Picture could not be uploaded. Please try again."},{status:500}); }
}

export async function GET(req: NextRequest) {
  const userId = await getWorkspaceUserId(req);
  if (!userId) return NextResponse.json({error:"Unauthorized"},{status:401});
  const path = req.nextUrl.searchParams.get("path");
  if (!ownsPicture(path,userId)) return NextResponse.json({error:"Picture access denied."},{status:403});
  const {data,error} = await teamDatabase().storage.from(MMS_BUCKET).createSignedUrl(path,3600);
  if (error) return NextResponse.json({error:"Picture unavailable."},{status:404});
  return NextResponse.json({url:data.signedUrl},{headers:{"Cache-Control":"private, no-store"}});
}
