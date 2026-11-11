// Manual recovery for one published change, including a deleted page.
const [input, ...extra] = process.argv.slice(2);
if (!input || extra.length) throw new Error("Usage: node scripts/indexnow.mjs <changed-url>");
const url = new URL(input);
if (url.origin !== "https://text2sale.com" || url.username || url.password || url.hash) {
  throw new Error("Supply a canonical https://text2sale.com URL");
}
const endpoint = new URL("https://api.indexnow.org/indexnow");
endpoint.searchParams.set("url", url.href);
endpoint.searchParams.set("key", "99f160275c8887f99c5c56fa8dbca05f");
const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
console.log(url.href, response.status);
if (![200, 202].includes(response.status)) process.exitCode = 1;
