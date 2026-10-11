/** UI hints only. Server routes also verify the authenticated user's profile role. */
export const OWNER_EMAIL = "johnsonhealthquotes@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}

/**
 * Calling (power dialer, browser phone, AI receptionist) is limited to the
 * owner's account while Text2Sale focuses on texting. Forwarding calls to a
 * cell phone stays on for everyone, so a lead calling back still gets through.
 */
export function canUseCalling(email: string | null | undefined): boolean {
  return isOwnerEmail(email);
}
