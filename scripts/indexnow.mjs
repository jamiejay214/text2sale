// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
// Naver and other participating engines share submissions). Run it after a
// deploy that adds or changes pages:
//
//   node scripts/indexnow.mjs
//
// The key is public by design: engines verify ownership by fetching
// https://text2sale.com/<key>.txt, which lives in /public.

const HOST = "text2sale.com";
const KEY = "99f160275c8887f99c5c56fa8dbca05f";

const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then((r) => {
  if (!r.ok) throw new Error(`sitemap.xml returned ${r.status}`);
  return r.text();
});
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (urlList.length === 0) throw new Error("No URLs found in sitemap.xml");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
});

// 200 and 202 both mean accepted; 202 means the key is still being verified.
console.log(`Submitted ${urlList.length} URLs: HTTP ${res.status} ${res.statusText}`);
if (res.status >= 400) {
  console.error(await res.text());
  process.exit(1);
}
