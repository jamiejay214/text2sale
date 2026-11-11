export const INDEXNOW_KEY = "99f160275c8887f99c5c56fa8dbca05f";

export async function submitToIndexNow(url: string): Promise<number> {
  const endpoint = new URL("https://api.indexnow.org/indexnow");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", INDEXNOW_KEY);
  const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  return response.status;
}
