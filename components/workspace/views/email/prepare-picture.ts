// Resize large desktop originals before posting to the serverless upload route.
export async function preparePicture(file: File): Promise<Blob> {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP picture.");
  if (file.size > 20_000_000) throw new Error("Choose an image smaller than 20 MB.");
  if (file.size <= 4_000_000) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1,1440 / bitmap.width,2000 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(bitmap.width * scale));
    canvas.height = Math.max(1,Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not resize this picture.");
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b && b.size <= 4_000_000 ? resolve(b) : reject(new Error("Could not resize this picture.")),"image/jpeg",0.9));
  } finally { bitmap.close(); }
}
