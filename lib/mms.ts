export const MMS_PRICE = 0.35;
export const MMS_BUCKET = "message-pictures";
export const MMS_MAX_BYTES = 300_000;

export function pictureType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)) return "image/gif";
  return null;
}
export function ownsPicture(path: unknown, userId: string): path is string {
  return typeof path === "string" && new RegExp(`^${userId}/[a-f0-9-]{36}\\.(jpg|png|gif)$`).test(path);
}
