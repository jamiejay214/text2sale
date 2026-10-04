import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EINCertificate } from "./ein-certificate";

export const EIN_CERTIFICATE_BUCKET = "ein-certificates";
export type StoredEINCertificate = EINCertificate & { path: string };

export async function requirePrivateCertificateBucket(admin: SupabaseClient) {
  const { data, error } = await admin.storage.getBucket(EIN_CERTIFICATE_BUCKET);
  if (error || !data || data.public) throw new Error("Private document storage is unavailable. Please try again later.");
  return admin.storage.from(EIN_CERTIFICATE_BUCKET);
}

/** Storage is the source of truth. Activation updates its own registration JSON independently. */
export async function getEINCertificate(admin: SupabaseClient, userId: string): Promise<StoredEINCertificate | null> {
  const bucket = await requirePrivateCertificateBucket(admin);
  const { data, error } = await bucket.list(userId, {
    limit: 1, search: "ein-", sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error("Could not check your EIN certificate. Please try again.");
  const file = data?.find((entry) => entry.id && !entry.name.includes("/"));
  if (!file) return null;
  const path = `${userId}/${file.name}`;
  const separator = file.name.indexOf("--");
  let name = separator >= 0 ? file.name.slice(separator + 2) : "EIN certificate";

  // Keep names for certificates uploaded through the previous endpoint.
  // Read only: never merge stale registration JSON back into an active setup.
  if (separator < 0) {
    const { data: profile } = await admin.from("profiles").select("a2p_registration").eq("id", userId).single();
    const registration = profile?.a2p_registration;
    if (registration?.einCertificatePath === path && typeof registration.einCertificateName === "string") name = registration.einCertificateName;
  }
  return { path, name, type: file.metadata?.mimetype || null, size: file.metadata?.size ?? null, uploadedAt: file.created_at };
}

export function certificateMetadata({ name, type, size, uploadedAt }: StoredEINCertificate): EINCertificate {
  return { name, type, size, uploadedAt };
}

export function certificateStorageName(name: string, type: string): string {
  const extension = ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[type];
  const base = name.replace(/\.[^.]*$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9 _.-]/g, "").trim().slice(0, 100) || "EIN certificate";
  return `${base}.${extension}`;
}


export async function hasEINCertificate(admin: SupabaseClient, userId: string): Promise<boolean> {
  return !!(await getEINCertificate(admin, userId));
}

export const EIN_CERTIFICATE_REQUIRED_MESSAGE =
  "Upload your EIN certificate in Messaging Setup before sending messages.";
