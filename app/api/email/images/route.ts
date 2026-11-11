import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { authenticateWorkspace, teamDatabase } from "@/lib/workspace-auth";
import { isEntitled } from "@/lib/messaging-status";

const LIMIT = 4_000_000;
export async function POST(req: NextRequest) {
  const auth = await authenticateWorkspace(req);
  if (!auth.ok) return auth.response;
  const db = teamDatabase();
  const {data: profile,error} = await db.from("profiles").select("paused,subscription_status,free_subscription").eq("id",auth.user.id).maybeSingle();
  if (error) return NextResponse.json({error:"Could not verify your workspace."},{status:503});
  if (!profile || profile.paused || !isEntitled(profile)) return NextResponse.json({error:"An active workspace is required to upload email images."},{status:403});
  if (Number(req.headers.get("content-length")) > LIMIT + 12_000) return NextResponse.json({error:"Image exceeds the upload limit."},{status:413});
  const form = await req.formData().catch(()=>null);
  const file = form?.get("image");
  if (!(file instanceof File) || !file.size || file.size > LIMIT) return NextResponse.json({error:"Choose a JPG, PNG or WebP image."},{status:400});
  let jpg: Buffer;
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:32_000_000,failOn:"error"});
    if (!["jpeg","png","webp"].includes((await input.metadata()).format || "")) throw new Error("type");
    jpg = await input.rotate().resize({width:1440,height:2000,fit:"inside",withoutEnlargement:true}).flatten({background:"#ffffff"}).jpeg({quality:88,mozjpeg:true}).toBuffer();
  } catch { return NextResponse.json({error:"This image could not be read. Choose a JPG, PNG or WebP."},{status:400}); }
  const bucket = db.storage.from("email-campaign-images");
  const path = auth.user.id + "/" + crypto.randomUUID() + ".jpg";
  const uploaded = await bucket.upload(path,jpg,{contentType:"image/jpeg",cacheControl:"31536000",upsert:false});
  if (uploaded.error) return NextResponse.json({error:"Could not store the picture. Try again."},{status:503});
  return NextResponse.json({url:bucket.getPublicUrl(path).data.publicUrl});
}
