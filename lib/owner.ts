/** UI hints only. Server routes also verify the authenticated user's profile role. */
export const OWNER_EMAIL = "johnsonhealthquotes@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}
