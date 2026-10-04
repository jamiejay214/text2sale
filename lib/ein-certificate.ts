export const EIN_CERTIFICATE_MAX_BYTES = 4 * 1024 * 1024;
export const EIN_CERTIFICATE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

export type EINCertificate = {
  name: string;
  type: string | null;
  size: number | null;
  uploadedAt: string | null;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
};

export function certificateContentType(file: Pick<File, "name" | "type">): string | null {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (type && type !== "application/octet-stream") return Object.values(MIME_BY_EXTENSION).includes(type) ? type : null;
  return MIME_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() || ""] || null;
}

export function certificateFileProblem(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!certificateContentType(file)) return "Choose a PDF, PNG, JPG, or WebP file.";
  if (file.size === 0) return "This file is empty. Choose your EIN confirmation letter.";
  if (file.size > EIN_CERTIFICATE_MAX_BYTES) return "Choose a file smaller than 4 MB.";
  return null;
}

export function certificateBytesMatch(bytes: Uint8Array, type: string): boolean {
  const startsWith = (values: number[]) => values.every((value, index) => bytes[index] === value);
  if (type === "application/pdf") return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (type === "image/png") return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/jpeg") return startsWith([0xff, 0xd8, 0xff]);
  if (type === "image/webp") return startsWith([0x52, 0x49, 0x46, 0x46]) && [0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index + 8] === value);
  return false;
}
