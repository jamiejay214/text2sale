/* ─────────────────────────────────────────────────────────────────────
 *  Text2Sale cross-site analytics tracker.
 *  Install on AI Business Growth & Trusted Quotes (or any site you own).
 *
 *    <script src="https://text2sale.com/t2s.js" data-site="abg" defer></script>
 *
 *  data-site is one of: "abg" | "tq" | "text2sale"
 *  Sends: page views, UTMs, channel, device/browser/OS, outbound clicks,
 *  scroll milestones, form-field focuses, CTA clicks, engagement time.
 *  Privacy: never sends form input VALUES — only field names.
 * ───────────────────────────────────────────────────────────────────── */
(function () {
  if (window.__t2sLoaded) return;
  window.__t2sLoaded = true;

  var self = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var SITE = (self && self.getAttribute && self.getAttribute("data-site")) || "text2sale";
  var ORIGIN = "https://text2sale.com";
  // If served from a non-prod host (preview), allow override.
  try {
    if (self && self.src) {
      var u = new URL(self.src);
      ORIGIN = u.origin;
    }
  } catch (e) {}

  var VCK = "t2s_vid", SCK = "t2s_sid";
  var V_TTL = 730, S_IDLE = 30 * 60 * 1000;

  function uuid() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = "";
    for (var i = 0; i < 16; i++) h += b[i].toString(16).padStart(2, "0");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function getCk(n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; }
  function setCk(n, v, d) { var e = new Date(Date.now() + d * 86400e3).toUTCString(); document.cookie = n + "=" + encodeURIComponent(v) + "; expires=" + e + "; path=/; SameSite=Lax"; }

  function getVid() {
    var v = getCk(VCK);
    if (v) return { id: v, isNew: false };
    var n = uuid();
    setCk(VCK, n, V_TTL);
    return { id: n, isNew: true };
  }
  function getSid() {
    var raw = getCk(SCK);
    if (raw) try {
      var p = JSON.parse(raw);
      if (Date.now() - p.last < S_IDLE) { setCk(SCK, JSON.stringify({ id: p.id, last: Date.now() }), 1); return { id: p.id, isNew: false }; }
    } catch (e) {}
    var id = uuid();
    setCk(SCK, JSON.stringify({ id: id, last: Date.now() }), 1);
    return { id: id, isNew: true };
  }
  function parseUA(ua) {
    var device = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "tablet" : /Mobile|Android.*Mobile|iPhone|iPod/i.test(ua) ? "mobile" : "desktop";
    var browser = "Other";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    var os = "Other";
    if (/iPhone|iPad|iPod|iOS/.test(ua)) os = "iOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/CrOS/.test(ua)) os = "ChromeOS";
    else if (/Linux/.test(ua)) os = "Linux";
    return { device: device, browser: browser, os: os };
  }
  // text/plain → simple request → no CORS preflight; server parses JSON anyway
  function beacon(path, body) {
    body.site = SITE;
    try {
      var data = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ORIGIN + path, new Blob([data], { type: "text/plain" }));
        return;
      }
    } catch (e) {}
    try {
      fetch(ORIGIN + path, { method: "POST", body: JSON.stringify(body), keepalive: true, headers: { "content-type": "text/plain" } }).catch(function () {});
    } catch (e) {}
  }

  function init() {
    var v = getVid(), s = getSid();
    var ua = navigator.userAgent || "";
    var info = parseUA(ua);
    var qp = new URLSearchParams(location.search);
    var utm = {
      source: qp.get("utm_source") || qp.get("ref") || "",
      medium: qp.get("utm_medium") || "",
      campaign: qp.get("utm_campaign") || "",
      content: qp.get("utm_content") || "",
      term: qp.get("utm_term") || "",
    };
    beacon("/api/track-view", {
      path: location.pathname,
      referrer: document.referrer || "",
      page_title: document.title || "",
      visitor_id: v.id,
      session_id: s.id,
      is_new_visitor: v.isNew,
      is_new_session: s.isNew,
      is_entry: s.isNew,
      utm: utm,
      screen: { w: screen.width || 0, h: screen.height || 0 },
      viewport: { w: innerWidth, h: innerHeight },
      device: info.device,
      browser: info.browser,
      os: info.os,
      language: navigator.language || "",
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    });

    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!t || !t.href) return;
      if (t.href.indexOf("javascript:") === 0 || t.href.indexOf("#") === 0) return;
      var d = "";
      try { d = new URL(t.href, location.origin).hostname; } catch (e) { return; }
      if (d && d !== location.hostname) {
        beacon("/api/track-exit", { visitor_id: v.id, session_id: s.id, from_path: location.pathname, to_url: t.href, to_domain: d });
      }
      var cta = t.getAttribute("data-cta") || "";
      var text = (t.textContent || "").trim().toLowerCase();
      if (cta || /sign up|get started|start free|try free|buy now|book a call|contact|demo/i.test(text)) {
        beacon("/api/track-intent", { visitor_id: v.id, session_id: s.id, path: location.pathname, kind: "cta_click", detail: (cta || text).slice(0, 80) });
      }
    }, true);

    var seen = {};
    document.addEventListener("focus", function (e) {
      var t = e.target;
      if (!t) return;
      var tag = (t.tagName || "").toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      if (t.type === "hidden" || t.type === "submit" || t.type === "button") return;
      var name = t.name || t.id || t.placeholder || t.type || "field";
      var key = location.pathname + "::" + name;
      if (seen[key]) return;
      seen[key] = true;
      var n = Object.keys(seen).length;
      beacon("/api/track-intent", { visitor_id: v.id, session_id: s.id, path: location.pathname, kind: n === 1 ? "form_start" : "form_field", detail: name.slice(0, 60) });
    }, true);

    var fired = {};
    function checkScroll() {
      var doc = document.documentElement;
      var pct = Math.round(((scrollY + innerHeight) / (doc.scrollHeight || 1)) * 100);
      [50, 90].forEach(function (m) {
        if (pct >= m && !fired[m]) { fired[m] = true; beacon("/api/track-intent", { visitor_id: v.id, session_id: s.id, path: location.pathname, kind: "scroll_" + m, detail: String(pct) }); }
      });
    }
    addEventListener("scroll", checkScroll, { passive: true });

    var startedAt = Date.now();
    function leave() {
      var doc = document.documentElement;
      var maxScroll = Math.min(100, Math.round(((scrollY + innerHeight) / (doc.scrollHeight || 1)) * 100));
      beacon("/api/track-intent", { visitor_id: v.id, session_id: s.id, path: location.pathname, kind: "engagement", detail: String(maxScroll), value: String(Date.now() - startedAt) });
    }
    addEventListener("pagehide", leave);
    addEventListener("beforeunload", leave);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
