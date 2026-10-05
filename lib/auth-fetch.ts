// Client-side fetch wrapper that attaches the Supabase session Bearer token
// to every request. Use this for any call to an API route that now requires
// authentication (anything in app/api/* with `// CLIENT UPDATE NEEDED`).

import { supabase } from "@/lib/supabase";

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init?.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Read the current tab URL per request; never share impersonation across tabs.
  if (typeof window !== "undefined" && input.startsWith("/api/") && !input.startsWith("/api/team")) {
    const target = new URLSearchParams(window.location.search).get("impersonate");
    if (target) headers.set("x-workspace-id", target);
  }
  return fetch(input, { ...init, headers });
}
