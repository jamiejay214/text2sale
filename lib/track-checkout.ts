export type VerifiedCheckout = {
  verified: boolean; trackable: boolean; eventId: string; value: number; currency: string;
};
type Pixel = (...args: unknown[]) => void;
const reported = new Set<string>();

/** Returns false while the pixel is unavailable; the caller can retry. */
export function trackCheckout(checkout: VerifiedCheckout, pixel: Pixel | undefined, storage: Storage): boolean {
  if (!checkout.verified || !checkout.trackable || !checkout.eventId ||
      !Number.isFinite(checkout.value) || checkout.value <= 0 || checkout.currency !== "USD") return true;
  const key = `text2sale:purchase:${checkout.eventId}`;
  if (reported.has(key)) return true;
  try { if (storage.getItem(key)) return true; } catch { /* restricted storage */ }
  if (typeof pixel !== "function") return false;
  pixel("track", "Purchase", { value: checkout.value, currency: checkout.currency }, { eventID: checkout.eventId });
  reported.add(key);
  try { storage.setItem(key, "1"); } catch { /* in-memory protection remains */ }
  return true;
}
