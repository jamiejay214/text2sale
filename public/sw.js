// Command Center service worker — registered with scope "/command" only, so
// it never touches the public marketing site. Network-first so live analytics
// stay fresh, with an offline fallback to the cached shell.
const CACHE = "command-center-v2";
const SHELL = "/command";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return; // never cache live data

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match(SHELL)))
    );
    return;
  }

  // static assets: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ── Web Push ────────────────────────────────────────────────────────────────
// A new TrustedQuotes lead (or any alert) arrives here even when the app is
// closed, and pops a notification on the iPhone home screen.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_e) { d = {}; }
  const title = d.title || "New lead";
  const options = {
    body: d.body || "",
    icon: "/command-icon?size=192",
    badge: "/command-icon?size=192",
    tag: d.tag || "lead",
    renotify: true,
    requireInteraction: false,
    data: { url: d.url || "/command" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/command";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Focus the already-open app if we have it, otherwise open it.
      for (const c of list) {
        if (c.url.includes("/command") && "focus" in c) {
          if ("navigate" in c) { try { c.navigate(target); } catch (_e) {} }
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
