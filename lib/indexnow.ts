import { SITE_URL } from "@/lib/site-pages";

// IndexNow notifies Bing, Yandex, Seznam, Naver and the other participating
// engines when URLs change. Engines verify ownership by fetching the key file
// at the site root (public/<key>.txt), so the key itself is public.
export const INDEXNOW_KEY = "99f160275c8887f99c5c56fa8dbca05f";

export async function submitToIndexNow(urlList: string[]): Promise<{ status: number; body: string }> {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });
  return { status: res.status, body: await res.text() };
}
