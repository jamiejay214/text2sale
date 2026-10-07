import { getSession } from "./auth";
import { supabase } from "./supabase";
import { fetchProfile } from "./supabase-data";
import { isOwnerEmail } from "./owner";

export async function checkAdminAccess(): Promise<"signed-out" | "denied" | "authorized"> {
  const session = await getSession();
  if (!session) return "signed-out";
  // Verify against Auth, not local storage or an email supplied by the form.
  const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
  if (error) {
    if (error.status === 401 || error.status === 403) return "signed-out";
    throw new Error("Could not verify your session. Please try again.");
  }
  if (!user?.email_confirmed_at || !isOwnerEmail(user.email)) return "denied";
  const profile = await fetchProfile(user.id, { throwOnError: true });
  return profile?.role === "admin" && !profile.paused ? "authorized" : "denied";
}
