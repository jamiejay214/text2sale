"use client";

// ─────────────────────────────────────────────────────────────────────────
// Universal site tracker — runs on every page from app/layout.tsx.
//
// Captures: visitor_id (2yr cookie) + session_id (30min sliding) + UTMs +
// referrer→channel + device/browser/OS + screen/viewport + language/tz.
// Also: outbound clicks (where they went AFTER us), form-field focuses
// (lead intent — they almost converted), scroll milestones, CTA clicks.
//
// Privacy: we NEVER capture form input VALUES (only field names). IP is
// hashed server-side in /api/track-view (existing behavior).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";

const VISITOR_COOKIE = "t2s_vid";
const SESSION_COOKIE = "t2s_sid";
const VISITOR_TTL_DAYS = 730; // 2 years
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 min

function uuid(): string {
  // RFC4122 v4 — uses crypto.getRandomValues, no dependency
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const exp = new Date(Date.now() + days * 86400e3).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

function getOrCreateVisitorId(): { id: string; isNew: boolean } {
  const existing = getCookie(VISITOR_COOKIE);
  if (existing) return { id: existing, isNew: false };
  const id = uuid();
  setCookie(VISITOR_COOKIE, id, VISITOR_TTL_DAYS);
  return { id, isNew: true };
}

function getOrCreateSessionId(): { id: string; isNew: boolean } {
  const raw = getCookie(SESSION_COOKIE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id: string; last: number };
      if (Date.now() - parsed.last < SESSION_IDLE_MS) {
        // refresh sliding window
        setCookie(SESSION_COOKIE, JSON.stringify({ id: parsed.id, last: Date.now() }), 1);
        return { id: parsed.id, isNew: false };
      }
    } catch {}
  }
  const id = uuid();
  setCookie(SESSION_COOKIE, JSON.stringify({ id, last: Date.now() }), 1);
  return { id, isNew: true };
}

function parseUA(ua: string): { device: string; browser: string; os: string } {
  const isMobile = /Mobile|Android.*Mobile|iPhone|iPod/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const device = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";

  let os = "Other";
  if (/iPhone|iPad|iPod|iOS/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { device, browser, os };
}

function beacon(url: string, body: object) {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {}
  // fallback: fire-and-forget fetch with keepalive
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

export default function Tracker() {
  useEffect(() => {
    // Skip on admin/internal routes to keep the dashboard out of the data
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/command") || path.startsWith("/dashboard") || path.startsWith("/api/")) return;

    const visitor = getOrCreateVisitorId();
    const session = getOrCreateSessionId();
    const ua = navigator.userAgent || "";
    const { device, browser, os } = parseUA(ua);

    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get("utm_source") || params.get("ref") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
    };

    const payload = {
      path,
      page_title: document.title || "",
      referrer: document.referrer || "",
      visitor_id: visitor.id,
      session_id: session.id,
      is_new_visitor: visitor.isNew,
      is_new_session: session.isNew,
      is_entry: session.isNew, // first page of session = entry
      utm,
      screen: { w: window.screen?.width || 0, h: window.screen?.height || 0 },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      device,
      browser,
      os,
      language: navigator.language || "",
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    };

    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});

    // ─── Outbound click capture ─────────────────────────────────────────
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!target) return;

      const href = target.href || "";
      if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;

      let toDomain = "";
      try {
        toDomain = new URL(href, window.location.origin).hostname;
      } catch {
        return;
      }
      const isOutbound = toDomain && toDomain !== window.location.hostname;

      if (isOutbound) {
        beacon("/api/track-exit", {
          visitor_id: visitor.id,
          session_id: session.id,
          from_path: window.location.pathname,
          to_url: href,
          to_domain: toDomain,
        });
      }

      // CTA click intent — buttons/links tagged with [data-cta] or with
      // recognizable CTA copy (lower-cased substring match).
      const cta = target.getAttribute("data-cta") || "";
      const text = (target.textContent || "").trim().toLowerCase();
      const isCta = cta || /sign up|get started|start free|try free|buy now|book a call|contact|demo/i.test(text);
      if (isCta) {
        beacon("/api/track-intent", {
          visitor_id: visitor.id,
          session_id: session.id,
          path: window.location.pathname,
          kind: "cta_click",
          detail: (cta || text).slice(0, 80),
        });
      }
    };
    document.addEventListener("click", onClick, true);

    // ─── Form-field focus = lead intent ─────────────────────────────────
    const seenFields = new Set<string>();
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      const input = t as HTMLInputElement;
      if (input.type === "hidden" || input.type === "submit" || input.type === "button") return;
      const name = input.name || input.id || input.placeholder || input.type || "field";
      const key = `${window.location.pathname}::${name}`;
      if (seenFields.has(key)) return;
      seenFields.add(key);
      beacon("/api/track-intent", {
        visitor_id: visitor.id,
        session_id: session.id,
        path: window.location.pathname,
        kind: seenFields.size === 1 ? "form_start" : "form_field",
        detail: name.slice(0, 60),
      });
    };
    document.addEventListener("focus", onFocus, true);

    // ─── Scroll milestones ──────────────────────────────────────────────
    const milestones = [50, 90];
    const fired = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = (window.scrollY + window.innerHeight) / (doc.scrollHeight || 1);
      const pct = Math.round(scrolled * 100);
      for (const m of milestones) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          beacon("/api/track-intent", {
            visitor_id: visitor.id,
            session_id: session.id,
            path: window.location.pathname,
            kind: `scroll_${m}`,
            detail: String(pct),
          });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ─── Engagement time on pagehide ────────────────────────────────────
    const startedAt = Date.now();
    const onLeave = () => {
      const engagement_ms = Date.now() - startedAt;
      const doc = document.documentElement;
      const maxScroll = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / (doc.scrollHeight || 1)) * 100));
      beacon("/api/track-intent", {
        visitor_id: visitor.id,
        session_id: session.id,
        path: window.location.pathname,
        kind: "engagement",
        detail: String(maxScroll),
        value: String(engagement_ms),
      });
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focus", onFocus, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, []);

  return null;
}
